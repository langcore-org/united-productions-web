#!/usr/bin/env python3
"""
Google Drive MCP Server with Workspace-based Service Account authentication.

This MCP server provides tools to read files from Google Drive using
Service Account credentials fetched from Supabase per workspace.

Environment Variables:
    SUPABASE_URL: Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY: Service role key for Supabase
    GOOGLE_CREDENTIALS_ENCRYPTION_KEY: Key to decrypt service account credentials
"""

import os
import sys
import json
import logging
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path

from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MCP Server instance
server = Server("gdrive")

# Cache for Drive services per workspace
_drive_services: Dict[str, Any] = {}

# Supabase client (lazy loaded)
_supabase_client = None


def get_supabase_client():
    """Get or create Supabase client."""
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    try:
        from supabase import create_client
    except ImportError:
        raise ImportError("supabase package not installed. Run: pip install supabase")

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

    _supabase_client = create_client(url, key)
    logger.info("Supabase client initialized")
    return _supabase_client


def get_workspace_credentials(workspace_id: str) -> dict:
    """Fetch Service Account credentials from Supabase for a workspace."""
    supabase = get_supabase_client()
    encryption_key = os.environ.get(
        "GOOGLE_CREDENTIALS_ENCRYPTION_KEY",
        "dev-encryption-key-32chars!!"
    )

    # Call RPC function to get decrypted credentials
    result = supabase.rpc(
        "get_workspace_service_account",
        {"p_workspace_id": workspace_id, "p_encryption_key": encryption_key}
    ).execute()

    if not result.data:
        raise ValueError(f"No service account configured for workspace {workspace_id}")

    return json.loads(result.data)


def get_drive_service(workspace_id: str):
    """Get or create Google Drive service client for a workspace."""
    global _drive_services

    if workspace_id in _drive_services:
        return _drive_services[workspace_id]

    # Fetch credentials from Supabase
    credentials_info = get_workspace_credentials(workspace_id)

    # Create credentials object from dict
    # Use full drive scope to support both read and write operations
    credentials = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=[
            "https://www.googleapis.com/auth/drive",
        ]
    )

    # Build Drive API client
    drive_service = build("drive", "v3", credentials=credentials)
    _drive_services[workspace_id] = drive_service
    logger.info(f"Google Drive service initialized for workspace {workspace_id}")

    return drive_service


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF."""
    try:
        import fitz  # PyMuPDF

        pdf_doc = fitz.open(stream=content, filetype="pdf")
        text_parts = []

        for page_num in range(pdf_doc.page_count):
            page = pdf_doc[page_num]
            text_parts.append(page.get_text())

        pdf_doc.close()
        return "\n\n".join(text_parts)
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise


async def read_file_content(workspace_id: str, file_id: str) -> str:
    """Read file content from Google Drive."""
    drive = get_drive_service(workspace_id)

    # Get file metadata
    file_meta = drive.files().get(
        fileId=file_id,
        fields="id, name, mimeType, size",
        supportsAllDrives=True
    ).execute()

    mime_type = file_meta.get("mimeType", "")
    file_name = file_meta.get("name", "")

    logger.info(f"Reading file: {file_name} ({mime_type})")

    # Handle Google Workspace files (export)
    if mime_type == "application/vnd.google-apps.document":
        # Google Docs -> plain text
        response = drive.files().export(fileId=file_id, mimeType="text/plain").execute()
        return response.decode("utf-8") if isinstance(response, bytes) else response

    elif mime_type == "application/vnd.google-apps.spreadsheet":
        # Google Sheets -> CSV
        response = drive.files().export(fileId=file_id, mimeType="text/csv").execute()
        return response.decode("utf-8") if isinstance(response, bytes) else response

    elif mime_type == "application/vnd.google-apps.presentation":
        # Google Slides -> plain text
        response = drive.files().export(fileId=file_id, mimeType="text/plain").execute()
        return response.decode("utf-8") if isinstance(response, bytes) else response

    else:
        # Regular files - download content
        response = drive.files().get_media(fileId=file_id, supportsAllDrives=True).execute()

        if mime_type == "application/pdf":
            # Extract text from PDF
            return extract_text_from_pdf(response)

        elif mime_type.startswith("text/") or mime_type in [
            "application/json",
            "application/xml",
            "application/javascript",
        ]:
            # Text-based files
            return response.decode("utf-8") if isinstance(response, bytes) else response

        else:
            return f"[Binary file: {file_name}, type: {mime_type}, size: {file_meta.get('size', 'unknown')} bytes]"


async def search_files(workspace_id: str, query: str, folder_id: Optional[str] = None) -> list:
    """Search for files in Google Drive."""
    drive = get_drive_service(workspace_id)

    # Build search query
    search_query = f"name contains '{query}' and trashed = false"

    if folder_id:
        search_query = f"'{folder_id}' in parents and {search_query}"

    results = drive.files().list(
        q=search_query,
        pageSize=20,
        fields="files(id, name, mimeType, modifiedTime, size)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
    ).execute()

    return results.get("files", [])


async def list_folder(workspace_id: str, folder_id: Optional[str] = None) -> list:
    """List files in a folder."""
    drive = get_drive_service(workspace_id)

    # Default to root if not specified
    if not folder_id:
        folder_id = "root"

    query = f"'{folder_id}' in parents and trashed = false"

    results = drive.files().list(
        q=query,
        pageSize=50,
        fields="files(id, name, mimeType, modifiedTime, size)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        orderBy="folder, name",
    ).execute()

    return results.get("files", [])


async def upload_file(
    workspace_id: str,
    folder_id: str,
    file_name: str,
    content: str,
    mime_type: str = "text/plain",
    convert_to_google_doc: bool = True  # Default: convert to Google Docs
) -> dict:
    """Upload a file to Google Drive.

    If convert_to_google_doc is True (default), text files will be converted
    to Google Docs format for better collaboration and editing in Google Drive.
    """
    from googleapiclient.http import MediaInMemoryUpload

    drive = get_drive_service(workspace_id)

    # Determine source mime type based on file extension
    ext = file_name.lower().split(".")[-1] if "." in file_name else ""

    # For Google Docs conversion, we need to upload as a format Google can convert
    # HTML preserves formatting best, plain text is also supported
    source_mime_map = {
        "md": "text/plain",      # Markdown as plain text
        "json": "application/json",
        "csv": "text/csv",
        "html": "text/html",
        "xml": "application/xml",
        "txt": "text/plain",
    }

    # Extensions that should NOT be converted to Google Docs
    no_convert_extensions = {"json", "csv", "xml"}

    # Determine if we should convert this file
    should_convert = (
        convert_to_google_doc
        and ext not in no_convert_extensions
        and mime_type in ["text/plain", "text/markdown", "text/html", ""]
    )

    # Set source mime type for upload
    if mime_type == "text/plain" or mime_type == "":
        source_mime_type = source_mime_map.get(ext, "text/plain")
    else:
        source_mime_type = mime_type

    # Prepare file metadata
    file_metadata = {
        "name": file_name if not should_convert else file_name.rsplit(".", 1)[0],  # Remove extension for Google Docs
        "parents": [folder_id],
    }

    # If converting to Google Docs, set the target mimeType
    if should_convert:
        file_metadata["mimeType"] = "application/vnd.google-apps.document"
        logger.info(f"Converting to Google Docs: {file_name}")

    # Create media upload from content
    content_bytes = content.encode("utf-8") if isinstance(content, str) else content
    media = MediaInMemoryUpload(content_bytes, mimetype=source_mime_type, resumable=True)

    # Upload file
    logger.info(f"Uploading file: {file_name} to folder {folder_id}")
    file = drive.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, name, webViewLink, mimeType",
        supportsAllDrives=True,
    ).execute()

    logger.info(f"File uploaded: {file.get('name')} (ID: {file.get('id')}, type: {file.get('mimeType')})")
    return file


# Register MCP tools
@server.list_tools()
async def list_tools():
    """List available tools."""
    return [
        Tool(
            name="gdrive_read_file",
            description="Read the content of a file from Google Drive. Supports Google Docs, Sheets, PDFs, and text files. The workspace_id determines which Google Drive to access.",
            inputSchema={
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "The workspace ID (UUID) that owns the Google Drive connection"
                    },
                    "file_id": {
                        "type": "string",
                        "description": "The Google Drive file ID"
                    }
                },
                "required": ["workspace_id", "file_id"]
            }
        ),
        Tool(
            name="gdrive_search",
            description="Search for files in Google Drive by name. The workspace_id determines which Google Drive to access.",
            inputSchema={
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "The workspace ID (UUID) that owns the Google Drive connection"
                    },
                    "query": {
                        "type": "string",
                        "description": "Search query (matches file names)"
                    },
                    "folder_id": {
                        "type": "string",
                        "description": "Optional: Limit search to a specific folder"
                    }
                },
                "required": ["workspace_id", "query"]
            }
        ),
        Tool(
            name="gdrive_list_folder",
            description="List files in a Google Drive folder. The workspace_id determines which Google Drive to access.",
            inputSchema={
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "The workspace ID (UUID) that owns the Google Drive connection"
                    },
                    "folder_id": {
                        "type": "string",
                        "description": "Folder ID (optional, uses root if not specified)"
                    }
                },
                "required": ["workspace_id"]
            }
        ),
        Tool(
            name="gdrive_upload_file",
            description="Upload/create a file in Google Drive. Use this to save reports, documents, and other output files. The workspace_id determines which Google Drive to access.",
            inputSchema={
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "description": "The workspace ID (UUID) that owns the Google Drive connection"
                    },
                    "folder_id": {
                        "type": "string",
                        "description": "The folder ID where the file will be created"
                    },
                    "file_name": {
                        "type": "string",
                        "description": "Name of the file to create (e.g., 'report.md', 'data.csv')"
                    },
                    "content": {
                        "type": "string",
                        "description": "The text content of the file"
                    },
                    "mime_type": {
                        "type": "string",
                        "description": "Optional MIME type (auto-detected from extension if not provided)"
                    }
                },
                "required": ["workspace_id", "folder_id", "file_name", "content"]
            }
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """Handle tool calls."""
    try:
        # All tools require workspace_id
        workspace_id = arguments.get("workspace_id")
        if not workspace_id:
            return [TextContent(type="text", text="Error: workspace_id is required")]

        if name == "gdrive_read_file":
            file_id = arguments.get("file_id")
            if not file_id:
                return [TextContent(type="text", text="Error: file_id is required")]

            content = await read_file_content(workspace_id, file_id)
            return [TextContent(type="text", text=content)]

        elif name == "gdrive_search":
            query = arguments.get("query")
            if not query:
                return [TextContent(type="text", text="Error: query is required")]

            folder_id = arguments.get("folder_id")
            files = await search_files(workspace_id, query, folder_id)

            if not files:
                return [TextContent(type="text", text=f"No files found matching '{query}'")]

            result = f"Found {len(files)} files:\n\n"
            for f in files:
                size = f.get("size", "N/A")
                result += f"- {f['name']}\n  ID: {f['id']}\n  Type: {f['mimeType']}\n  Size: {size}\n\n"

            return [TextContent(type="text", text=result)]

        elif name == "gdrive_list_folder":
            folder_id = arguments.get("folder_id")
            files = await list_folder(workspace_id, folder_id)

            if not files:
                return [TextContent(type="text", text="Folder is empty or not accessible")]

            result = f"Files in folder ({len(files)} items):\n\n"
            for f in files:
                icon = "📁" if f["mimeType"] == "application/vnd.google-apps.folder" else "📄"
                result += f"{icon} {f['name']}\n   ID: {f['id']}\n\n"

            return [TextContent(type="text", text=result)]

        elif name == "gdrive_upload_file":
            folder_id = arguments.get("folder_id")
            file_name = arguments.get("file_name")
            content = arguments.get("content")
            mime_type = arguments.get("mime_type", "text/plain")

            if not folder_id or not file_name or not content:
                return [TextContent(type="text", text="Error: folder_id, file_name, and content are required")]

            result = await upload_file(workspace_id, folder_id, file_name, content, mime_type)
            response = f"✅ File created: {result.get('name')} (ID: {result.get('id')})\n"
            response += f"Size: {result.get('size', 'N/A')} bytes\n"
            if result.get('webViewLink'):
                response += f"View: {result.get('webViewLink')}"

            return [TextContent(type="text", text=response)]

        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

    except HttpError as e:
        error_msg = f"Google Drive API error: {e.resp.status} - {e.reason}"
        logger.error(error_msg)
        return [TextContent(type="text", text=error_msg)]

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        logger.exception(error_msg)
        return [TextContent(type="text", text=error_msg)]


async def run_server():
    """Run the MCP server (async)."""
    logger.info("Starting Google Drive MCP Server (workspace-based auth)...")

    # Validate environment
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    encryption_key = os.environ.get("GOOGLE_CREDENTIALS_ENCRYPTION_KEY")

    if supabase_url and supabase_key:
        logger.info("Supabase credentials configured for workspace-based auth")
    else:
        logger.warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")

    if encryption_key:
        logger.info("Encryption key configured")
    else:
        logger.warning("GOOGLE_CREDENTIALS_ENCRYPTION_KEY not set, using default")

    # Run server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main():
    """Entry point for poetry script."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
