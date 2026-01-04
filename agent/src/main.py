import os
import json
import asyncio
import logging
import secrets
import string
import re
from typing import Optional, AsyncGenerator, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from dotenv import load_dotenv

from src.models import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamResponse,
    Choice,
    Message,
    Usage,
    StreamChoice,
    SessionListResponse,
    ToolListResponse,
    ToolMetadataResponse,
    ToolConfigurationResponse,
    ToolConfigurationRequest,
    MCPServerConfigRequest,
    MCPServerInfoResponse,
    MCPServersListResponse,
    MCPConnectionRequest,
    MCPToolCallRequest,
)
from src.claude_cli import ClaudeCodeCLI
from src.message_adapter import MessageAdapter
from src.auth import verify_api_key, security, validate_claude_code_auth, get_claude_code_auth_info
from src.parameter_validator import ParameterValidator, CompatibilityReporter
from src.session_manager import session_manager
from src.tool_manager import tool_manager
from src.mcp_client import mcp_client, MCPServerConfig
from src.session_buffer import session_buffer, SessionStatus
from src.background_session import background_session_manager, BackgroundSession
from src.rate_limiter import (
    limiter,
    rate_limit_exceeded_handler,
    rate_limit_endpoint,
)
from src.constants import CLAUDE_MODELS, CLAUDE_TOOLS

# Load environment variables
load_dotenv()

# Configure logging based on debug mode
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() in ("true", "1", "yes", "on")
VERBOSE = os.getenv("VERBOSE", "false").lower() in ("true", "1", "yes", "on")

# Set logging level based on debug/verbose mode
log_level = logging.DEBUG if (DEBUG_MODE or VERBOSE) else logging.INFO
logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Global variable to store runtime-generated API key
runtime_api_key = None


def generate_secure_token(length: int = 32) -> str:
    """Generate a secure random token for API authentication."""
    alphabet = string.ascii_letters + string.digits + "-_"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def prompt_for_api_protection() -> Optional[str]:
    """
    Interactively ask user if they want API key protection.
    Returns the generated token if user chooses protection, None otherwise.
    """
    # Don't prompt if API_KEY is already set via environment variable
    if os.getenv("API_KEY"):
        return None

    print("\n" + "=" * 60)
    print("🔐 API Endpoint Security Configuration")
    print("=" * 60)
    print("Would you like to protect your API endpoint with an API key?")
    print("This adds a security layer when accessing your server remotely.")
    print("")

    while True:
        try:
            choice = input("Enable API key protection? (y/N): ").strip().lower()

            if choice in ["", "n", "no"]:
                print("✅ API endpoint will be accessible without authentication")
                print("=" * 60)
                return None

            elif choice in ["y", "yes"]:
                token = generate_secure_token()
                print("")
                print("🔑 API Key Generated!")
                print("=" * 60)
                print(f"API Key: {token}")
                print("=" * 60)
                print("📋 IMPORTANT: Save this key - you'll need it for API calls!")
                print("   Example usage:")
                print(f'   curl -H "Authorization: Bearer {token}" \\')
                print("        http://localhost:8000/v1/models")
                print("=" * 60)
                return token

            else:
                print("Please enter 'y' for yes or 'n' for no (or press Enter for no)")

        except (EOFError, KeyboardInterrupt):
            print("\n✅ Defaulting to no authentication")
            return None


# Initialize Claude CLI
claude_cli = ClaudeCodeCLI(
    timeout=int(os.getenv("MAX_TIMEOUT", "600000")), cwd=os.getenv("CLAUDE_CWD")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify Claude Code authentication and CLI on startup."""
    logger.info("Verifying Claude Code authentication and CLI...")

    # Validate authentication first
    auth_valid, auth_info = validate_claude_code_auth()

    if not auth_valid:
        logger.error("❌ Claude Code authentication failed!")
        for error in auth_info.get("errors", []):
            logger.error(f"  - {error}")
        logger.warning("Authentication setup guide:")
        logger.warning("  1. For Anthropic API: Set ANTHROPIC_API_KEY")
        logger.warning("  2. For Bedrock: Set CLAUDE_CODE_USE_BEDROCK=1 + AWS credentials")
        logger.warning("  3. For Vertex AI: Set CLAUDE_CODE_USE_VERTEX=1 + GCP credentials")
    else:
        logger.info(f"✅ Claude Code authentication validated: {auth_info['method']}")

    # Verify Claude Agent SDK with timeout for graceful degradation
    try:
        logger.info("Testing Claude Agent SDK connection...")
        # Use asyncio.wait_for to enforce timeout (30 seconds)
        cli_verified = await asyncio.wait_for(claude_cli.verify_cli(), timeout=30.0)

        if cli_verified:
            logger.info("✅ Claude Agent SDK verified successfully")
        else:
            logger.warning("⚠️  Claude Agent SDK verification returned False")
            logger.warning("The server will start, but requests may fail.")
    except asyncio.TimeoutError:
        logger.warning("⚠️  Claude Agent SDK verification timed out (30s)")
        logger.warning("This may indicate network issues or SDK configuration problems.")
        logger.warning("The server will start, but first request may be slow.")
    except Exception as e:
        logger.error(f"⚠️  Claude Agent SDK verification failed: {e}")
        logger.warning("The server will start, but requests may fail.")
        logger.warning("Check that Claude Code CLI is properly installed and authenticated.")

    # Log debug information if debug mode is enabled
    if DEBUG_MODE or VERBOSE:
        logger.debug("🔧 Debug mode enabled - Enhanced logging active")
        logger.debug("🔧 Environment variables:")
        logger.debug(f"   DEBUG_MODE: {DEBUG_MODE}")
        logger.debug(f"   VERBOSE: {VERBOSE}")
        logger.debug(f"   PORT: {os.getenv('PORT', '8000')}")
        cors_origins_val = os.getenv("CORS_ORIGINS", '["*"]')
        logger.debug(f"   CORS_ORIGINS: {cors_origins_val}")
        logger.debug(f"   MAX_TIMEOUT: {os.getenv('MAX_TIMEOUT', '600000')}")
        logger.debug(f"   CLAUDE_CWD: {os.getenv('CLAUDE_CWD', 'Not set')}")
        logger.debug("🔧 Available endpoints:")
        logger.debug("   POST /v1/chat/completions - Main chat endpoint")
        logger.debug("   GET  /v1/models - List available models")
        logger.debug("   POST /v1/debug/request - Debug request validation")
        logger.debug("   GET  /v1/auth/status - Authentication status")
        logger.debug("   GET  /health - Health check")
        logger.debug(
            f"🔧 API Key protection: {'Enabled' if (os.getenv('API_KEY') or runtime_api_key) else 'Disabled'}"
        )

    # Start session cleanup task
    session_manager.start_cleanup_task()

    # Register Google Drive MCP server if Supabase credentials are configured
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    encryption_key = os.getenv("GOOGLE_CREDENTIALS_ENCRYPTION_KEY", "dev-encryption-key-32chars!!")

    if supabase_url and supabase_key and mcp_client.is_available():
        logger.info("Registering Google Drive MCP server (workspace-based auth)...")

        # Get the path to the gdrive server script
        import sys
        gdrive_server_module = "src.mcp_servers.gdrive.server"

        gdrive_config = MCPServerConfig(
            name="gdrive",
            command=sys.executable,
            args=["-m", gdrive_server_module],
            env={
                "SUPABASE_URL": supabase_url,
                "SUPABASE_SERVICE_ROLE_KEY": supabase_key,
                "GOOGLE_CREDENTIALS_ENCRYPTION_KEY": encryption_key,
            },
            description="Google Drive file access via workspace-based Service Account",
            enabled=True,
        )
        mcp_client.register_server(gdrive_config)
        logger.info("✅ Google Drive MCP server registered (will connect on first use)")
    elif (supabase_url or supabase_key) and not mcp_client.is_available():
        logger.warning("⚠️  Supabase credentials set but MCP SDK not available")
    else:
        logger.info("Google Drive MCP not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set)")

    yield

    # Cleanup on shutdown
    logger.info("Shutting down...")

    # Disconnect MCP servers
    for server_name in mcp_client.list_connected_servers():
        try:
            await mcp_client.disconnect_server(server_name)
            logger.info(f"Disconnected MCP server: {server_name}")
        except Exception as e:
            logger.warning(f"Error disconnecting MCP server {server_name}: {e}")

    session_manager.shutdown()


# Create FastAPI app
app = FastAPI(
    title="Claude Code OpenAI API Wrapper",
    description="OpenAI-compatible API for Claude Code",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
cors_origins = json.loads(os.getenv("CORS_ORIGINS", '["*"]'))
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting error handler
if limiter:
    app.state.limiter = limiter
    app.add_exception_handler(429, rate_limit_exceeded_handler)

# Add debug logging middleware
from starlette.middleware.base import BaseHTTPMiddleware


class DebugLoggingMiddleware(BaseHTTPMiddleware):
    """ASGI-compliant middleware for logging request/response details when debug mode is enabled."""

    async def dispatch(self, request: Request, call_next):
        if not (DEBUG_MODE or VERBOSE):
            return await call_next(request)

        # Log request details
        start_time = asyncio.get_event_loop().time()

        # Log basic request info
        logger.debug(f"🔍 Incoming request: {request.method} {request.url}")
        logger.debug(f"🔍 Headers: {dict(request.headers)}")

        # For POST requests, try to log body (but don't break if we can't)
        body_logged = False
        if request.method == "POST" and request.url.path.startswith("/v1/"):
            try:
                # Only attempt to read body if it's reasonable size and content-type
                content_length = request.headers.get("content-length")
                if content_length and int(content_length) < 100000:  # Less than 100KB
                    body = await request.body()
                    if body:
                        try:
                            import json as json_lib

                            parsed_body = json_lib.loads(body.decode())
                            logger.debug(
                                f"🔍 Request body: {json_lib.dumps(parsed_body, indent=2)}"
                            )
                            body_logged = True
                        except:
                            logger.debug(f"🔍 Request body (raw): {body.decode()[:500]}...")
                            body_logged = True
            except Exception as e:
                logger.debug(f"🔍 Could not read request body: {e}")

        if not body_logged and request.method == "POST":
            logger.debug("🔍 Request body: [not logged - streaming or large payload]")

        # Process the request
        try:
            response = await call_next(request)

            # Log response details
            end_time = asyncio.get_event_loop().time()
            duration = (end_time - start_time) * 1000  # Convert to milliseconds

            logger.debug(f"🔍 Response: {response.status_code} in {duration:.2f}ms")

            return response

        except Exception as e:
            end_time = asyncio.get_event_loop().time()
            duration = (end_time - start_time) * 1000

            logger.debug(f"🔍 Request failed after {duration:.2f}ms: {e}")
            raise


# Add the debug middleware
app.add_middleware(DebugLoggingMiddleware)


# Custom exception handler for 422 validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors with detailed debugging information."""

    # Log the validation error details
    logger.error(f"❌ Request validation failed for {request.method} {request.url}")
    logger.error(f"❌ Validation errors: {exc.errors()}")

    # Create detailed error response
    error_details = []
    for error in exc.errors():
        location = " -> ".join(str(loc) for loc in error.get("loc", []))
        error_details.append(
            {
                "field": location,
                "message": error.get("msg", "Unknown validation error"),
                "type": error.get("type", "validation_error"),
                "input": error.get("input"),
            }
        )

    # If debug mode is enabled, include the raw request body
    debug_info = {}
    if DEBUG_MODE or VERBOSE:
        try:
            body = await request.body()
            if body:
                debug_info["raw_request_body"] = body.decode()
        except:
            debug_info["raw_request_body"] = "Could not read request body"

    error_response = {
        "error": {
            "message": "Request validation failed - the request body doesn't match the expected format",
            "type": "validation_error",
            "code": "invalid_request_error",
            "details": error_details,
            "help": {
                "common_issues": [
                    "Missing required fields (model, messages)",
                    "Invalid field types (e.g. messages should be an array)",
                    "Invalid role values (must be 'system', 'user', or 'assistant')",
                    "Invalid parameter ranges (e.g. temperature must be 0-2)",
                ],
                "debug_tip": "Set DEBUG_MODE=true or VERBOSE=true environment variable for more detailed logging",
            },
        }
    }

    # Add debug info if available
    if debug_info:
        error_response["error"]["debug"] = debug_info

    return JSONResponse(status_code=422, content=error_response)


def extract_tool_info(block) -> Optional[tuple]:
    """
    Extract tool name and input from any block format.
    Returns (tool_name, tool_input) or None if not a tool block.

    This unified function handles all SDK formats:
    - ToolUseBlock objects
    - Dict with type="tool_use"
    """
    # Get block type efficiently
    block_type = getattr(block, "type", None) if hasattr(block, "type") else block.get("type") if isinstance(block, dict) else None
    block_class = type(block).__name__

    if block_type == "tool_use" or block_class == "ToolUseBlock":
        tool_name = getattr(block, "name", None) or (block.get("name") if isinstance(block, dict) else None)
        tool_input = getattr(block, "input", None) or (block.get("input") if isinstance(block, dict) else {})
        return (tool_name, tool_input)

    return None


def extract_text_content(block) -> Optional[str]:
    """
    Extract text content from any block format.
    Returns text string or None if not a text block.
    """
    # Handle TextBlock objects
    if hasattr(block, "text"):
        return block.text
    # Handle dict format
    if isinstance(block, dict) and block.get("type") == "text":
        return block.get("text", "")
    return None


def get_content_blocks(chunk: Dict[str, Any]) -> Optional[list]:
    """
    Extract content blocks from chunk in any format.
    Returns list of blocks or None.
    """
    # New format: {"content": [...]}
    if "content" in chunk and isinstance(chunk["content"], list):
        return chunk["content"]
    # Old format: {"type": "assistant", "message": {"content": [...]}}
    if chunk.get("type") == "assistant" and "message" in chunk:
        message = chunk["message"]
        if isinstance(message, dict) and "content" in message:
            content = message["content"]
            if isinstance(content, list):
                return content
    return None


async def generate_streaming_response(
    request: ChatCompletionRequest, request_id: str, claude_headers: Optional[Dict[str, Any]] = None
) -> AsyncGenerator[str, None]:
    """Generate SSE formatted streaming response with background execution support."""
    session_id = request.session_id or request_id

    # Log session ID resolution for debugging session mixing issues
    logger.info(
        f"🔑 Session ID resolved: request.session_id={request.session_id}, "
        f"request_id={request_id}, final_session_id={session_id}"
    )

    # Check if session is already running (reconnection case)
    if background_session_manager.is_session_running(session_id):
        logger.info(f"🔄 Reconnecting to running session {session_id}")
        # Subscribe to existing session's events
        async for event_str in background_session_manager.subscribe(session_id):
            yield event_str
        return

    # Mark session as running and clear old buffer
    session_buffer.set_session_running(session_id)
    session_buffer.clear_buffer(session_id)

    # Create an event queue for this session
    event_queue: asyncio.Queue = asyncio.Queue()

    # Create the background task that runs the completion
    async def run_completion_task():
        """Background task that runs the completion and queues events."""
        try:
            async for event_str in _generate_completion_events(request, request_id, session_id, claude_headers):
                await event_queue.put(event_str)
            await event_queue.put(None)  # Signal completion
        except asyncio.CancelledError:
            # Task was cancelled (e.g., by stop request)
            logger.info(f"Background task for session {session_id} was cancelled")
            await event_queue.put(None)
            raise
        except Exception as e:
            logger.error(f"Background task error for session {session_id}: {e}")
            await event_queue.put(None)

    # Start the background task with a strong reference to prevent GC
    task = asyncio.create_task(run_completion_task())
    task.add_done_callback(lambda t: logger.info(f"Task for session {session_id} finished: cancelled={t.cancelled()}, exception={t.exception() if not t.cancelled() else None}"))

    # Register task with manager to prevent garbage collection
    background_session_manager.register_task(task, session_id)

    # Register with background manager for reconnection support (thread-safe)
    session = await background_session_manager.register_session(
        session_id=session_id,
        task=task,
        event_queue=event_queue,
    )

    try:
        # Stream events to client
        while True:
            try:
                event_str = await asyncio.wait_for(event_queue.get(), timeout=30.0)
                if event_str is None:
                    break
                yield event_str
            except asyncio.TimeoutError:
                # Send keep-alive
                yield ": keep-alive\n\n"
    except asyncio.CancelledError:
        # Client disconnected, but task continues in background
        logger.info(f"Client disconnected from session {session_id}, task continues in background")
        raise
    finally:
        # Update session status if task is done
        if task.done():
            session.status = SessionStatus.COMPLETED
            session_buffer.set_session_completed(session_id)


async def _generate_completion_events(
    request: ChatCompletionRequest,
    request_id: str,
    session_id: str,
    claude_headers: Optional[Dict[str, Any]] = None
) -> AsyncGenerator[str, None]:
    """
    Core completion logic that yields SSE-formatted event strings.
    This runs in a background task.
    """
    import time
    perf_start = time.time()
    def perf_log(label: str):
        elapsed = (time.time() - perf_start) * 1000
        logger.info(f"[PERF] {label}: {elapsed:.0f}ms")

    perf_log("completion_started")

    # Helper to buffer and yield events
    def buffer_and_format(event_type: str, event_data: Any) -> str:
        """Buffer event and return SSE formatted string with session_id for validation."""
        # Add session_id to custom events for client-side validation
        if event_type in ("todo_update", "file_created", "gdrive_file_created"):
            if isinstance(event_data, dict):
                event_data = {**event_data, "session_id": session_id}
        session_buffer.buffer_event(session_id, event_type, event_data)
        return f"data: {json.dumps(event_data)}\n\n"

    try:
        # Process messages with session management
        # IMPORTANT: Use session_id (which is request.session_id or request_id) consistently
        # to ensure SSE buffering and Claude SDK use the same session identifier
        all_messages, actual_session_id = session_manager.process_messages(
            request.messages, session_id  # Use session_id, not request.session_id
        )
        perf_log("messages_processed")

        # Convert messages to prompt
        prompt, system_prompt = MessageAdapter.messages_to_prompt(all_messages)

        # Log prompt info only at DEBUG level
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(f"📝 Prompt length: {len(prompt)} chars")
            if "<file" in prompt:
                logger.debug("📎 File attachment detected in prompt!")
            if system_prompt:
                logger.debug(f"📋 System prompt (length={len(system_prompt)})")

        # Add sampling instructions from temperature/top_p if present
        sampling_instructions = request.get_sampling_instructions()
        if sampling_instructions:
            if system_prompt:
                system_prompt = f"{system_prompt}\n\n{sampling_instructions}"
            else:
                system_prompt = sampling_instructions
            logger.debug(f"Added sampling instructions: {sampling_instructions}")

        # Filter content for unsupported features (prompts don't need show_thinking)
        prompt = MessageAdapter.filter_content(prompt, show_thinking=False)
        if system_prompt:
            system_prompt = MessageAdapter.filter_content(system_prompt, show_thinking=False)

        # Get Claude Agent SDK options from request
        claude_options = request.to_claude_options()

        # Merge with Claude-specific headers if provided
        if claude_headers:
            claude_options.update(claude_headers)

        # Validate model
        if claude_options.get("model"):
            ParameterValidator.validate_model(claude_options["model"])

        # Handle tools - disabled by default for OpenAI compatibility
        if not request.enable_tools:
            claude_options["disallowed_tools"] = CLAUDE_TOOLS
            claude_options["max_turns"] = 1

        # Build MCP servers configuration for Claude Agent SDK
        mcp_servers_config = None
        if mcp_client.is_available():
            import sys
            mcp_servers_config = {}
            for server_config in mcp_client.list_servers():
                if server_config.enabled:
                    mcp_servers_config[server_config.name] = {
                        "type": "stdio",
                        "command": server_config.command,
                        "args": server_config.args,
                        "env": server_config.env or {},
                    }
            if mcp_servers_config:
                logger.debug(f"MCP servers for SDK: {list(mcp_servers_config.keys())}")
            else:
                mcp_servers_config = None

        # Run Claude Code
        perf_log("calling_claude_sdk")
        chunks_buffer = []
        role_sent = False  # Track if we've sent the initial role chunk
        content_sent = False  # Track if we've sent any content
        first_chunk_logged = False
        pending_gdrive_uploads = []  # Track file names for pending gdrive uploads

        async for chunk in claude_cli.run_completion(
            prompt=prompt,
            system_prompt=system_prompt,
            model=claude_options.get("model"),
            max_turns=claude_options.get("max_turns", 100),
            allowed_tools=claude_options.get("allowed_tools"),
            disallowed_tools=claude_options.get("disallowed_tools"),
            permission_mode=claude_options.get("permission_mode", "bypassPermissions"),
            session_id=actual_session_id,  # Pass session_id for Claude SDK resume
            continue_session=actual_session_id is not None,  # Enable session continuity
            stream=True,
            mcp_servers=mcp_servers_config,
        ):
            if not first_chunk_logged:
                perf_log("first_chunk_from_claude_sdk")
                first_chunk_logged = True
            chunks_buffer.append(chunk)

            # Handle tool results - check for FILE_CREATED markers and Google Drive uploads
            # Claude Agent SDK returns tool results as ToolResultBlock inside UserMessage.content
            # Message type is "user", and content blocks have type "tool_result"
            chunk_type = chunk.get("type", "")

            # Debug: Log ALL chunk types to understand what SDK is returning
            chunk_subtype = chunk.get("subtype", "")
            print(f"[DEBUG] SDK chunk received: type={chunk_type}, subtype={chunk_subtype}")

            # Extract tool result content from UserMessage (type="user") with ToolResultBlock
            tool_result_contents = []
            if chunk_type == "user":
                content = chunk.get("content", [])
                print(f"[DEBUG] UserMessage content type: {type(content)}, length: {len(content) if isinstance(content, list) else 'N/A'}")
                if isinstance(content, list):
                    for block in content:
                        # Handle both SDK objects and dicts
                        block_type = getattr(block, "type", None) if hasattr(block, "type") else block.get("type") if isinstance(block, dict) else None
                        if block_type == "tool_result":
                            # Extract content from ToolResultBlock
                            block_content = getattr(block, "content", None) if hasattr(block, "content") else block.get("content") if isinstance(block, dict) else None
                            print(f"[DEBUG] ToolResultBlock content type: {type(block_content)}, preview: {str(block_content)[:200] if block_content else 'None'}")
                            if block_content:
                                if isinstance(block_content, str):
                                    tool_result_contents.append(block_content)
                                elif isinstance(block_content, list):
                                    # Content may be a list of text blocks
                                    for item in block_content:
                                        if hasattr(item, "text"):
                                            tool_result_contents.append(item.text)
                                        elif isinstance(item, dict) and "text" in item:
                                            tool_result_contents.append(item["text"])
                                        elif isinstance(item, str):
                                            tool_result_contents.append(item)
                                elif hasattr(block_content, "text"):
                                    tool_result_contents.append(block_content.text)

            # Process each tool result content
            for result_content in tool_result_contents:
                result_content = str(result_content)

                # Debug: Log tool result content to understand MCP response format
                if "gdrive" in result_content.lower() or "file" in result_content.lower() or "upload" in result_content.lower():
                    print(f"[DEBUG] Tool result content (first 500 chars): {result_content[:500]}")

                # Check for FILE_CREATED marker
                file_matches = re.findall(r'FILE_CREATED:(.+?)(?:\n|$)', result_content)
                for file_path in file_matches:
                    file_path = file_path.strip()
                    if file_path:
                        file_event = {"type": "file_created", "path": file_path}
                        yield buffer_and_format("file_created", file_event)

                # Check for Google Drive upload success pattern
                # Pattern: ✅ File created: {name} (ID: {id})\n...View: {webViewLink}
                gdrive_match = re.search(
                    r'✅\s*File created:\s*(.+?)\s*\(ID:\s*([^)]+)\)',
                    result_content
                )
                if gdrive_match:
                    file_name = gdrive_match.group(1).strip()
                    drive_id = gdrive_match.group(2).strip()
                    # Extract webViewLink if present
                    view_match = re.search(r'View:\s*(https://[^\s]+)', result_content)
                    web_view_link = view_match.group(1) if view_match else None

                    print(f"[DEBUG] Google Drive upload completed: {file_name} (ID: {drive_id})")
                    gdrive_event = {
                        "type": "gdrive_file_created",
                        "file_name": file_name,
                        "drive_id": drive_id,
                        "web_view_link": web_view_link,
                        "status": "completed",
                    }
                    yield buffer_and_format("gdrive_file_created", gdrive_event)

            # Get content blocks using unified helper (handles both old/new formats)
            content_blocks = get_content_blocks(chunk)

            # Debug: Log chunk structure to understand what we're receiving
            if content_blocks:
                for block in content_blocks:
                    block_type = getattr(block, "type", None) if hasattr(block, "type") else block.get("type") if isinstance(block, dict) else None
                    block_class = type(block).__name__
                    if block_type == "tool_use" or block_class == "ToolUseBlock":
                        tool_name = getattr(block, "name", None) or (block.get("name") if isinstance(block, dict) else None)
                        print(f"[DEBUG] Found tool block in content_blocks: type={block_type}, class={block_class}, name={tool_name}")

            if content_blocks is not None:
                # Send initial role chunk if we haven't already
                if not role_sent:
                    initial_chunk = ChatCompletionStreamResponse(
                        id=request_id,
                        model=request.model,
                        choices=[
                            StreamChoice(
                                index=0,
                                delta={"role": "assistant", "content": ""},
                                finish_reason=None,
                            )
                        ],
                    )
                    yield f"data: {initial_chunk.model_dump_json()}\n\n"
                    role_sent = True

                # Process each block once using unified helpers
                for block in content_blocks:
                    # Check if it's a tool use block
                    tool_info = extract_tool_info(block)
                    if tool_info:
                        tool_name, tool_input = tool_info

                        # Always send TodoWrite updates
                        if tool_name == "TodoWrite":
                            todos = tool_input.get("todos", []) if isinstance(tool_input, dict) else []
                            print(f"[DEBUG] TodoWrite detected: {len(todos)} todos")
                            if todos:
                                todo_event = {"type": "todo_update", "todos": todos}
                                print(f"[DEBUG] Sending todo_update event: {todo_event}")
                                yield buffer_and_format("todo_update", todo_event)

                        # Always send Write file events
                        if tool_name == "Write":
                            file_path = tool_input.get("file_path", "") if isinstance(tool_input, dict) else ""
                            if file_path:
                                file_event = {"type": "file_created", "path": file_path}
                                yield buffer_and_format("file_created", file_event)

                        # Send gdrive_upload_file events for MCP uploads
                        # Handle both direct tool name and MCP prefixed name (mcp__gdrive__gdrive_upload_file)
                        if tool_name and tool_name.endswith("gdrive_upload_file") and isinstance(tool_input, dict):
                            file_name = tool_input.get("file_name", "")
                            folder_id = tool_input.get("folder_id", "")
                            if file_name:
                                # Track pending upload for matching with completed event
                                pending_gdrive_uploads.append(file_name)
                                print(f"[DEBUG] Tracking pending gdrive upload: {file_name}")
                                gdrive_event = {
                                    "type": "gdrive_file_created",
                                    "file_name": file_name,
                                    "folder_id": folder_id,
                                    "status": "uploading",
                                }
                                yield buffer_and_format("gdrive_file_created", gdrive_event)

                        # Only show tool activity if show_thinking is enabled
                        if request.show_thinking and tool_name:
                            formatted = MessageAdapter.format_tool_use(tool_name, tool_input if isinstance(tool_input, dict) else {})
                            tool_chunk = ChatCompletionStreamResponse(
                                id=request_id,
                                model=request.model,
                                choices=[
                                    StreamChoice(
                                        index=0,
                                        delta={"content": formatted},
                                        finish_reason=None,
                                    )
                                ],
                            )
                            yield f"data: {tool_chunk.model_dump_json()}\n\n"
                            content_sent = True
                        continue

                    # Check if it's a text block
                    raw_text = extract_text_content(block)
                    if raw_text:
                        filtered_text = MessageAdapter.filter_content(raw_text, show_thinking=request.show_thinking)

                        # Check for Google Drive success pattern in Claude's text response
                        # Pattern: Google Docs/Drive URL like https://docs.google.com/document/d/{file_id}/edit
                        # or https://drive.google.com/file/d/{file_id}/view
                        gdrive_url_match = re.search(
                            r'https://(?:docs|drive)\.google\.com/(?:document|file|spreadsheets)/d/([a-zA-Z0-9_-]+)',
                            raw_text
                        )
                        if gdrive_url_match:
                            drive_id = gdrive_url_match.group(1)
                            full_url = gdrive_url_match.group(0)
                            # Use pending upload file name if available
                            if pending_gdrive_uploads:
                                file_name = pending_gdrive_uploads.pop(0)  # Use first pending upload
                                print(f"[DEBUG] Matched pending upload: {file_name}")
                            else:
                                # Fallback: Try to extract file name from nearby text
                                name_match = re.search(r'(?:created|uploaded|saved)(?:\s+\w+)*\s+["\']?([^"\']+?)["\']?\s*(?:\(|to|at|$)', raw_text, re.IGNORECASE)
                                file_name = name_match.group(1).strip() if name_match else f"gdrive-{drive_id}"

                            print(f"[DEBUG] Google Drive URL detected in text: {full_url}, drive_id={drive_id}, name={file_name}")
                            gdrive_event = {
                                "type": "gdrive_file_created",
                                "file_name": file_name,
                                "drive_id": drive_id,
                                "web_view_link": full_url,
                                "status": "completed",
                            }
                            yield buffer_and_format("gdrive_file_created", gdrive_event)

                        if filtered_text and not filtered_text.isspace():
                            stream_chunk = ChatCompletionStreamResponse(
                                id=request_id,
                                model=request.model,
                                choices=[
                                    StreamChoice(
                                        index=0,
                                        delta={"content": filtered_text},
                                        finish_reason=None,
                                    )
                                ],
                            )
                            content_event = {"type": "content", "content": filtered_text}
                            session_buffer.buffer_event(session_id, "content", content_event)
                            yield f"data: {stream_chunk.model_dump_json()}\n\n"
                            content_sent = True

        # Handle case where no role was sent (send at least role chunk)
        if not role_sent:
            # Send role chunk with empty content if we never got any assistant messages
            initial_chunk = ChatCompletionStreamResponse(
                id=request_id,
                model=request.model,
                choices=[
                    StreamChoice(
                        index=0, delta={"role": "assistant", "content": ""}, finish_reason=None
                    )
                ],
            )
            yield f"data: {initial_chunk.model_dump_json()}\n\n"
            role_sent = True

        # If we sent role but no content, send a minimal response
        if role_sent and not content_sent:
            fallback_chunk = ChatCompletionStreamResponse(
                id=request_id,
                model=request.model,
                choices=[
                    StreamChoice(
                        index=0,
                        delta={"content": "I'm unable to provide a response at the moment."},
                        finish_reason=None,
                    )
                ],
            )
            yield f"data: {fallback_chunk.model_dump_json()}\n\n"

        # Extract assistant response from all chunks
        assistant_content = None
        if chunks_buffer:
            assistant_content = claude_cli.parse_claude_message(chunks_buffer)

            # Store in session if applicable
            if actual_session_id and assistant_content:
                assistant_message = Message(role="assistant", content=assistant_content)
                session_manager.add_assistant_response(actual_session_id, assistant_message)

        # Prepare usage data if requested
        usage_data = None
        if request.stream_options and request.stream_options.include_usage:
            # Estimate token usage based on prompt and completion
            completion_text = assistant_content or ""
            token_usage = claude_cli.estimate_token_usage(prompt, completion_text, request.model)
            usage_data = Usage(
                prompt_tokens=token_usage["prompt_tokens"],
                completion_tokens=token_usage["completion_tokens"],
                total_tokens=token_usage["total_tokens"],
            )
            logger.debug(f"Estimated usage: {usage_data}")

        # Handle pending uploads that weren't matched with URLs
        # Try to find them in the assistant response and emit completed events
        if pending_gdrive_uploads and assistant_content:
            # Look for Japanese patterns indicating successful save
            # Pattern: 「ファイル名」をGoogle Driveに保存しました
            for pending_file in list(pending_gdrive_uploads):
                # Check if the file was mentioned as saved in the response
                # Escape special regex characters in file name
                escaped_name = re.escape(pending_file)
                save_pattern = rf'[「『]?{escaped_name}[」』]?\s*(?:を|が).*(?:保存|アップロード|作成)(?:しました|完了|成功)'
                if re.search(save_pattern, assistant_content, re.IGNORECASE):
                    print(f"[DEBUG] Found save confirmation for: {pending_file}")
                    # Emit completed event without drive_id - frontend will need to handle this
                    # or we could add a lookup mechanism later
                    gdrive_event = {
                        "type": "gdrive_file_created",
                        "file_name": pending_file,
                        "status": "completed",
                        "needs_lookup": True,  # Flag for frontend to know driveId needs to be fetched
                    }
                    yield buffer_and_format("gdrive_file_created", gdrive_event)
                    pending_gdrive_uploads.remove(pending_file)
                    print(f"[DEBUG] Emitted completed event (needs_lookup) for: {pending_file}")

        # Send final chunk with finish reason and optionally usage data
        final_chunk = ChatCompletionStreamResponse(
            id=request_id,
            model=request.model,
            choices=[StreamChoice(index=0, delta={}, finish_reason="stop")],
            usage=usage_data,
        )
        yield f"data: {final_chunk.model_dump_json()}\n\n"
        yield "data: [DONE]\n\n"

        # Buffer done event and mark session as completed
        session_buffer.buffer_event(session_id, "done", {"type": "done"})
        session_buffer.set_session_completed(session_id)

        # Update background session status
        if session_id in background_session_manager.sessions:
            background_session_manager.sessions[session_id].status = SessionStatus.COMPLETED

    except Exception as e:
        logger.error(f"Streaming error: {e}")
        error_chunk = {"error": {"message": str(e), "type": "streaming_error"}}
        yield f"data: {json.dumps(error_chunk)}\n\n"

        # Buffer error event and mark session as error
        session_buffer.buffer_event(session_id, "error", {"type": "error", "message": str(e)})
        session_buffer.set_session_error(session_id, str(e))

        # Update background session status
        if session_id in background_session_manager.sessions:
            session = background_session_manager.sessions[session_id]
            session.status = SessionStatus.ERROR
            session.error_message = str(e)


@app.post("/v1/chat/completions")
@rate_limit_endpoint("chat")
async def chat_completions(
    request_body: ChatCompletionRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """OpenAI-compatible chat completions endpoint."""
    # Check FastAPI API key if configured
    await verify_api_key(request, credentials)

    # Validate Claude Code authentication
    auth_valid, auth_info = validate_claude_code_auth()

    if not auth_valid:
        error_detail = {
            "message": "Claude Code authentication failed",
            "errors": auth_info.get("errors", []),
            "method": auth_info.get("method", "none"),
            "help": "Check /v1/auth/status for detailed authentication information",
        }
        raise HTTPException(status_code=503, detail=error_detail)

    try:
        request_id = f"chatcmpl-{os.urandom(8).hex()}"

        # Extract Claude-specific parameters from headers
        claude_headers = ParameterValidator.extract_claude_headers(dict(request.headers))

        # Log compatibility info
        if logger.isEnabledFor(logging.DEBUG):
            compatibility_report = CompatibilityReporter.generate_compatibility_report(request_body)
            logger.debug(f"Compatibility report: {compatibility_report}")

        if request_body.stream:
            # Return streaming response
            return StreamingResponse(
                generate_streaming_response(request_body, request_id, claude_headers),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            )
        else:
            # Non-streaming response
            # Process messages with session management
            all_messages, actual_session_id = session_manager.process_messages(
                request_body.messages, request_body.session_id
            )

            logger.info(
                f"Chat completion: session_id={actual_session_id}, total_messages={len(all_messages)}"
            )

            # Convert messages to prompt
            prompt, system_prompt = MessageAdapter.messages_to_prompt(all_messages)

            # Debug: Log system_prompt extraction
            if system_prompt:
                logger.info(f"📋 System prompt extracted (length={len(system_prompt)}): {system_prompt[:200]}...")
            else:
                logger.info("📋 No system prompt found in messages")

            # Add sampling instructions from temperature/top_p if present
            sampling_instructions = request_body.get_sampling_instructions()
            if sampling_instructions:
                if system_prompt:
                    system_prompt = f"{system_prompt}\n\n{sampling_instructions}"
                else:
                    system_prompt = sampling_instructions
                logger.debug(f"Added sampling instructions: {sampling_instructions}")

            # Filter content (prompts don't need show_thinking)
            prompt = MessageAdapter.filter_content(prompt, show_thinking=False)
            if system_prompt:
                system_prompt = MessageAdapter.filter_content(system_prompt, show_thinking=False)

            # Get Claude Agent SDK options from request
            claude_options = request_body.to_claude_options()

            # Merge with Claude-specific headers
            if claude_headers:
                claude_options.update(claude_headers)

            # Validate model
            if claude_options.get("model"):
                ParameterValidator.validate_model(claude_options["model"])

            # Handle tools - disabled by default for OpenAI compatibility
            if not request_body.enable_tools:
                # Disable all tools by using CLAUDE_TOOLS constant
                claude_options["disallowed_tools"] = CLAUDE_TOOLS
                claude_options["max_turns"] = 1  # Single turn for Q&A
                logger.info("Tools disabled (default behavior for OpenAI compatibility)")
            else:
                logger.info("Tools enabled by user request")

            # Build MCP servers configuration for Claude Agent SDK
            mcp_servers_config = None
            if mcp_client.is_available():
                import sys
                mcp_servers_config = {}
                for server_config in mcp_client.list_servers():
                    if server_config.enabled:
                        mcp_servers_config[server_config.name] = {
                            "type": "stdio",
                            "command": server_config.command,
                            "args": server_config.args,
                            "env": server_config.env or {},
                        }
                if mcp_servers_config:
                    logger.debug(f"MCP servers for SDK (non-streaming): {list(mcp_servers_config.keys())}")
                else:
                    mcp_servers_config = None

            # Collect all chunks
            chunks = []
            async for chunk in claude_cli.run_completion(
                prompt=prompt,
                system_prompt=system_prompt,
                model=claude_options.get("model"),
                max_turns=claude_options.get("max_turns", 100),
                allowed_tools=claude_options.get("allowed_tools"),
                disallowed_tools=claude_options.get("disallowed_tools"),
                permission_mode=claude_options.get("permission_mode", "bypassPermissions"),
                stream=False,
                mcp_servers=mcp_servers_config,
            ):
                chunks.append(chunk)

            # Extract assistant message
            raw_assistant_content = claude_cli.parse_claude_message(chunks)

            if not raw_assistant_content:
                raise HTTPException(status_code=500, detail="No response from Claude Code")

            # Filter out tool usage and optionally show thinking blocks
            assistant_content = MessageAdapter.filter_content(raw_assistant_content, show_thinking=request_body.show_thinking)

            # Add assistant response to session if using session mode
            if actual_session_id:
                assistant_message = Message(role="assistant", content=assistant_content)
                session_manager.add_assistant_response(actual_session_id, assistant_message)

            # Estimate tokens (rough approximation)
            prompt_tokens = MessageAdapter.estimate_tokens(prompt)
            completion_tokens = MessageAdapter.estimate_tokens(assistant_content)

            # Create response
            response = ChatCompletionResponse(
                id=request_id,
                model=request_body.model,
                choices=[
                    Choice(
                        index=0,
                        message=Message(role="assistant", content=assistant_content),
                        finish_reason="stop",
                    )
                ],
                usage=Usage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                ),
            )

            return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/models")
async def list_models(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """List available models."""
    # Check FastAPI API key if configured
    await verify_api_key(request, credentials)

    # Use constants for single source of truth
    return {
        "object": "list",
        "data": [
            {"id": model_id, "object": "model", "owned_by": "anthropic"}
            for model_id in CLAUDE_MODELS
        ],
    }


@app.post("/v1/compatibility")
async def check_compatibility(request_body: ChatCompletionRequest):
    """Check OpenAI API compatibility for a request."""
    report = CompatibilityReporter.generate_compatibility_report(request_body)
    return {
        "compatibility_report": report,
        "claude_agent_sdk_options": {
            "supported": [
                "model",
                "system_prompt",
                "max_turns",
                "allowed_tools",
                "disallowed_tools",
                "permission_mode",
                "max_thinking_tokens",
                "continue_conversation",
                "resume",
                "cwd",
            ],
            "custom_headers": [
                "X-Claude-Max-Turns",
                "X-Claude-Allowed-Tools",
                "X-Claude-Disallowed-Tools",
                "X-Claude-Permission-Mode",
                "X-Claude-Max-Thinking-Tokens",
            ],
        },
    }


@app.get("/health")
@rate_limit_endpoint("health")
async def health_check(request: Request):
    """Health check endpoint."""
    return {"status": "healthy", "service": "claude-code-openai-wrapper"}


@app.post("/v1/debug/request")
@rate_limit_endpoint("debug")
async def debug_request_validation(request: Request):
    """Debug endpoint to test request validation and see what's being sent."""
    try:
        # Get the raw request body
        body = await request.body()
        raw_body = body.decode() if body else ""

        # Try to parse as JSON
        parsed_body = None
        json_error = None
        try:
            import json as json_lib

            parsed_body = json_lib.loads(raw_body) if raw_body else {}
        except Exception as e:
            json_error = str(e)

        # Try to validate against our model
        validation_result = {"valid": False, "errors": []}
        if parsed_body:
            try:
                chat_request = ChatCompletionRequest(**parsed_body)
                validation_result = {"valid": True, "validated_data": chat_request.model_dump()}
            except ValidationError as e:
                validation_result = {
                    "valid": False,
                    "errors": [
                        {
                            "field": " -> ".join(str(loc) for loc in error.get("loc", [])),
                            "message": error.get("msg", "Unknown error"),
                            "type": error.get("type", "validation_error"),
                            "input": error.get("input"),
                        }
                        for error in e.errors()
                    ],
                }

        return {
            "debug_info": {
                "headers": dict(request.headers),
                "method": request.method,
                "url": str(request.url),
                "raw_body": raw_body,
                "json_parse_error": json_error,
                "parsed_body": parsed_body,
                "validation_result": validation_result,
                "debug_mode_enabled": DEBUG_MODE or VERBOSE,
                "example_valid_request": {
                    "model": "claude-3-sonnet-20240229",
                    "messages": [{"role": "user", "content": "Hello, world!"}],
                    "stream": False,
                },
            }
        }

    except Exception as e:
        return {
            "debug_info": {
                "error": f"Debug endpoint error: {str(e)}",
                "headers": dict(request.headers),
                "method": request.method,
                "url": str(request.url),
            }
        }


@app.get("/v1/auth/status")
@rate_limit_endpoint("auth")
async def get_auth_status(request: Request):
    """Get Claude Code authentication status."""
    from src.auth import auth_manager

    auth_info = get_claude_code_auth_info()
    active_api_key = auth_manager.get_api_key()

    return {
        "claude_code_auth": auth_info,
        "server_info": {
            "api_key_required": bool(active_api_key),
            "api_key_source": (
                "environment"
                if os.getenv("API_KEY")
                else ("runtime" if runtime_api_key else "none")
            ),
            "version": "1.0.0",
        },
    }


@app.get("/v1/sessions/stats")
async def get_session_stats(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Get session manager statistics."""
    stats = session_manager.get_stats()
    return {
        "session_stats": stats,
        "cleanup_interval_minutes": session_manager.cleanup_interval_minutes,
        "default_ttl_hours": session_manager.default_ttl_hours,
    }


@app.get("/v1/sessions")
async def list_sessions(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """List all active sessions."""
    sessions = session_manager.list_sessions()
    return SessionListResponse(sessions=sessions, total=len(sessions))


@app.get("/v1/sessions/{session_id}")
async def get_session(
    session_id: str, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get information about a specific session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session.to_session_info()


@app.delete("/v1/sessions/{session_id}")
async def delete_session(
    session_id: str, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Delete a specific session."""
    deleted = session_manager.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": f"Session {session_id} deleted successfully"}


# Session Buffer Endpoints (Background Execution Support)


@app.get("/v1/sessions/{session_id}/status")
async def get_session_status(
    session_id: str,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Get session execution status.

    Returns the current state of a background session execution,
    including whether it's running, completed, or errored.
    """
    state = session_buffer.get_session_state(session_id)

    if not state:
        return {
            "session_id": session_id,
            "status": "idle",
            "started_at": None,
            "completed_at": None,
            "buffered_events_count": 0
        }

    return {
        "session_id": state.session_id,
        "status": state.status.value,
        "started_at": state.started_at,
        "completed_at": state.completed_at,
        "error_message": state.error_message,
        "buffered_events_count": session_buffer.get_buffered_events_count(session_id)
    }


@app.get("/v1/sessions/{session_id}/buffer")
async def get_session_buffer(
    session_id: str,
    since_id: int = 0,
    limit: int = 1000,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Get buffered events for session reconnection.

    Retrieves events that were buffered while the client was disconnected.
    Use since_id to paginate through large event streams.
    """
    events, last_id, has_more = session_buffer.get_buffered_events(
        session_id, since_id=since_id, limit=limit
    )

    return {
        "events": [
            {
                "id": e.id,
                "type": e.event_type,
                "data": json.loads(e.event_data) if e.event_data else None,
                "created_at": e.created_at
            }
            for e in events
        ],
        "last_id": last_id,
        "has_more": has_more
    }


@app.get("/v1/sessions/{session_id}/stream")
async def stream_session(
    session_id: str,
    since_id: int = 0,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    SSE stream for session reconnection.

    This endpoint allows clients to reconnect to a running session and receive
    events in real-time via Server-Sent Events (SSE).

    - First sends buffered events since `since_id`
    - Then streams real-time events as they occur
    - Sends keep-alive every 30 seconds
    - Closes when session completes or client disconnects

    Args:
        session_id: Session ID to stream
        since_id: Only return events with ID > since_id (for resuming)
    """
    # Check if session exists
    state = session_buffer.get_session_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    async def event_generator():
        try:
            async for event in background_session_manager.subscribe(session_id, since_id):
                yield event
        except asyncio.CancelledError:
            logger.info(f"Stream cancelled for session {session_id}")
            raise
        except Exception as e:
            logger.error(f"Stream error for session {session_id}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/v1/sessions/{session_id}/stop")
async def stop_session(
    session_id: str,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Stop a running session.

    Marks the session as stopped, which can be checked by the streaming
    generator to terminate gracefully.
    """
    stopped = session_buffer.set_session_stopped(session_id)

    if not stopped:
        state = session_buffer.get_session_state(session_id)
        current_status = state.status.value if state else "idle"
        return {
            "success": False,
            "message": f"Session is not running (current status: {current_status})",
            "status": current_status
        }

    return {
        "success": True,
        "message": "Session stopped",
        "status": "stopped"
    }


@app.get("/v1/buffer/stats")
async def get_buffer_stats(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get session buffer statistics."""
    return session_buffer.get_stats()


@app.post("/v1/buffer/cleanup")
async def cleanup_old_buffers(
    hours: int = 24,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Clean up old session buffers."""
    count = session_buffer.cleanup_old_sessions(hours=hours)
    return {
        "cleaned_up": count,
        "hours_threshold": hours
    }


# Tool Management Endpoints


@app.get("/v1/tools", response_model=ToolListResponse)
@rate_limit_endpoint("general")
async def list_tools(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """List all available Claude Code tools with metadata."""
    await verify_api_key(request, credentials)

    tools = tool_manager.list_all_tools()
    tool_responses = [
        ToolMetadataResponse(
            name=tool.name,
            description=tool.description,
            category=tool.category,
            parameters=tool.parameters,
            examples=tool.examples,
            is_safe=tool.is_safe,
            requires_network=tool.requires_network,
        )
        for tool in tools
    ]

    return ToolListResponse(tools=tool_responses, total=len(tool_responses))


@app.get("/v1/tools/config", response_model=ToolConfigurationResponse)
@rate_limit_endpoint("general")
async def get_tool_config(
    request: Request,
    session_id: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Get tool configuration (global or per-session)."""
    await verify_api_key(request, credentials)

    config = tool_manager.get_effective_config(session_id)
    effective_tools = tool_manager.get_effective_tools(session_id)

    return ToolConfigurationResponse(
        allowed_tools=config.allowed_tools,
        disallowed_tools=config.disallowed_tools,
        effective_tools=effective_tools,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@app.post("/v1/tools/config", response_model=ToolConfigurationResponse)
@rate_limit_endpoint("general")
async def update_tool_config(
    config_request: ToolConfigurationRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Update tool configuration (global or per-session)."""
    await verify_api_key(request, credentials)

    # Validate tool names if provided
    all_tool_names = []
    if config_request.allowed_tools:
        all_tool_names.extend(config_request.allowed_tools)
    if config_request.disallowed_tools:
        all_tool_names.extend(config_request.disallowed_tools)

    if all_tool_names:
        validation = tool_manager.validate_tools(all_tool_names)
        invalid_tools = [name for name, valid in validation.items() if not valid]
        if invalid_tools:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid tool names: {', '.join(invalid_tools)}. Valid tools: {', '.join(CLAUDE_TOOLS)}",
            )

    # Update configuration
    if config_request.session_id:
        config = tool_manager.set_session_config(
            config_request.session_id, config_request.allowed_tools, config_request.disallowed_tools
        )
    else:
        config = tool_manager.update_global_config(
            config_request.allowed_tools, config_request.disallowed_tools
        )

    effective_tools = tool_manager.get_effective_tools(config_request.session_id)

    return ToolConfigurationResponse(
        allowed_tools=config.allowed_tools,
        disallowed_tools=config.disallowed_tools,
        effective_tools=effective_tools,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@app.get("/v1/tools/stats")
@rate_limit_endpoint("general")
async def get_tool_stats(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get statistics about tool configuration and usage."""
    await verify_api_key(request, credentials)
    return tool_manager.get_stats()


# MCP (Model Context Protocol) Management Endpoints


@app.get("/v1/mcp/servers", response_model=MCPServersListResponse)
@rate_limit_endpoint("general")
async def list_mcp_servers(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """List all registered MCP servers."""
    await verify_api_key(request, credentials)

    if not mcp_client.is_available():
        raise HTTPException(
            status_code=503, detail="MCP SDK not available. Install with: pip install mcp"
        )

    servers = mcp_client.list_servers()
    connections = mcp_client.list_connected_servers()

    server_responses = []
    for server in servers:
        connection = mcp_client.get_connection(server.name)
        server_responses.append(
            MCPServerInfoResponse(
                name=server.name,
                command=server.command,
                args=server.args,
                description=server.description,
                enabled=server.enabled,
                connected=server.name in connections,
                tools_count=len(connection.available_tools) if connection else 0,
                resources_count=len(connection.available_resources) if connection else 0,
                prompts_count=len(connection.available_prompts) if connection else 0,
            )
        )

    return MCPServersListResponse(servers=server_responses, total=len(server_responses))


@app.post("/v1/mcp/servers")
@rate_limit_endpoint("general")
async def register_mcp_server(
    body: MCPServerConfigRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Register a new MCP server."""
    await verify_api_key(request, credentials)

    if not mcp_client.is_available():
        raise HTTPException(
            status_code=503, detail="MCP SDK not available. Install with: pip install mcp"
        )

    config = MCPServerConfig(
        name=body.name,
        command=body.command,
        args=body.args,
        env=body.env,
        description=body.description,
        enabled=body.enabled,
    )

    mcp_client.register_server(config)

    return {"message": f"MCP server '{body.name}' registered successfully"}


@app.post("/v1/mcp/connect")
@rate_limit_endpoint("general")
async def connect_mcp_server(
    body: MCPConnectionRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Connect to a registered MCP server."""
    await verify_api_key(request, credentials)

    if not mcp_client.is_available():
        raise HTTPException(
            status_code=503, detail="MCP SDK not available. Install with: pip install mcp"
        )

    success = await mcp_client.connect_server(body.server_name)

    if not success:
        raise HTTPException(
            status_code=500, detail=f"Failed to connect to MCP server '{body.server_name}'"
        )

    connection = mcp_client.get_connection(body.server_name)
    return {
        "message": f"Connected to MCP server '{body.server_name}'",
        "tools": len(connection.available_tools) if connection else 0,
        "resources": len(connection.available_resources) if connection else 0,
        "prompts": len(connection.available_prompts) if connection else 0,
    }


@app.post("/v1/mcp/disconnect")
@rate_limit_endpoint("general")
async def disconnect_mcp_server(
    body: MCPConnectionRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Disconnect from an MCP server."""
    await verify_api_key(request, credentials)

    if not mcp_client.is_available():
        raise HTTPException(
            status_code=503, detail="MCP SDK not available. Install with: pip install mcp"
        )

    success = await mcp_client.disconnect_server(body.server_name)

    if not success:
        raise HTTPException(
            status_code=404, detail=f"Not connected to MCP server '{body.server_name}'"
        )

    return {"message": f"Disconnected from MCP server '{body.server_name}'"}


@app.get("/v1/mcp/stats")
@rate_limit_endpoint("general")
async def get_mcp_stats(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """Get statistics about MCP connections."""
    await verify_api_key(request, credentials)
    return mcp_client.get_stats()


@app.post("/v1/mcp/call")
@rate_limit_endpoint("general")
async def call_mcp_tool(
    body: MCPToolCallRequest,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Call a tool on an MCP server.

    This endpoint allows calling tools on connected MCP servers.
    For Google Drive MCP, available tools are:
    - gdrive_read_file: Read file content from Google Drive
    - gdrive_search: Search for files by name
    - gdrive_list_folder: List files in a folder

    Example request:
    {
        "server_name": "gdrive",
        "tool_name": "gdrive_read_file",
        "arguments": {"file_id": "your-file-id-here"}
    }
    """
    await verify_api_key(request, credentials)

    if not mcp_client.is_available():
        raise HTTPException(
            status_code=503, detail="MCP SDK not available. Install with: pip install mcp"
        )

    # Check if server is connected
    connection = mcp_client.get_connection(body.server_name)
    if not connection:
        # Try to auto-connect if server is registered
        server_config = mcp_client.get_server(body.server_name)
        if server_config:
            logger.info(f"Auto-connecting to MCP server: {body.server_name}")
            connected = await mcp_client.connect_server(body.server_name)
            if not connected:
                raise HTTPException(
                    status_code=503,
                    detail=f"Failed to connect to MCP server '{body.server_name}'"
                )
            connection = mcp_client.get_connection(body.server_name)
        else:
            raise HTTPException(
                status_code=404,
                detail=f"MCP server '{body.server_name}' not registered"
            )

    # Verify tool exists
    available_tools = [t["name"] for t in connection.available_tools]
    if body.tool_name not in available_tools:
        raise HTTPException(
            status_code=400,
            detail=f"Tool '{body.tool_name}' not found. Available tools: {available_tools}"
        )

    try:
        result = await mcp_client.call_tool(body.server_name, body.tool_name, body.arguments)

        # Extract content from MCP response
        content = []
        if hasattr(result, "content"):
            for item in result.content:
                if hasattr(item, "text"):
                    content.append({"type": "text", "text": item.text})
                elif hasattr(item, "data"):
                    content.append({"type": "data", "data": item.data})
                else:
                    content.append({"type": "unknown", "raw": str(item)})
        else:
            content.append({"type": "raw", "data": str(result)})

        return {
            "success": True,
            "server_name": body.server_name,
            "tool_name": body.tool_name,
            "content": content
        }

    except Exception as e:
        logger.error(f"MCP tool call failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Tool call failed: {str(e)}"
        )


# File Access Endpoints (for agent-generated files)

import base64
import mimetypes
from pathlib import Path


@app.get("/v1/files/read")
@rate_limit_endpoint("general")
async def read_file(
    path: str,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Read a file from the agent's working directory.

    Returns file content as base64 encoded string along with metadata.
    Used by frontend to retrieve agent-generated files for upload to Google Drive.

    Security: Only files within the configured working directory (CLAUDE_CWD) can be accessed.
    """
    await verify_api_key(request, credentials)

    try:
        file_path = Path(path).resolve()
        workspace_path = claude_cli.cwd.resolve()

        # Security check: Ensure file is within workspace directory
        if not str(file_path).startswith(str(workspace_path)):
            logger.warning(f"File access denied - path outside workspace: {path}")
            raise HTTPException(
                status_code=403,
                detail="Access denied: File path is outside the agent workspace"
            )

        # Check if file exists
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {path}"
            )

        if not file_path.is_file():
            raise HTTPException(
                status_code=400,
                detail=f"Path is not a file: {path}"
            )

        # Check file size (limit to 50MB)
        file_size = file_path.stat().st_size
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {file_size} bytes (max {max_size} bytes)"
            )

        # Detect MIME type
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        # Read file content
        with open(file_path, "rb") as f:
            content = f.read()

        # Encode as base64
        content_base64 = base64.b64encode(content).decode("utf-8")

        logger.info(f"File read successfully: {path} ({file_size} bytes, {mime_type})")

        return {
            "path": str(file_path),
            "name": file_path.name,
            "size": file_size,
            "mime_type": mime_type,
            "content": content_base64,
            "encoding": "base64"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading file {path}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error reading file: {str(e)}"
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Format HTTP exceptions as OpenAI-style errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {"message": exc.detail, "type": "api_error", "code": str(exc.status_code)}
        },
    )


def find_available_port(start_port: int = 8000, max_attempts: int = 10) -> int:
    """Find an available port starting from start_port."""
    import socket

    for port in range(start_port, start_port + max_attempts):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        try:
            result = sock.connect_ex(("127.0.0.1", port))
            if result != 0:  # Port is available
                return port
        except Exception:
            return port
        finally:
            sock.close()

    raise RuntimeError(
        f"No available ports found in range {start_port}-{start_port + max_attempts - 1}"
    )


def run_server(port: int = None):
    """Run the server - used as Poetry script entry point."""
    import uvicorn

    # Handle interactive API key protection
    global runtime_api_key
    runtime_api_key = prompt_for_api_protection()

    # Priority: CLI arg > ENV var > default
    if port is None:
        port = int(os.getenv("PORT", "8000"))
    preferred_port = port

    try:
        # Try the preferred port first
        uvicorn.run(app, host="0.0.0.0", port=preferred_port)
    except OSError as e:
        if "Address already in use" in str(e) or e.errno == 48:
            logger.warning(f"Port {preferred_port} is already in use. Finding alternative port...")
            try:
                available_port = find_available_port(preferred_port + 1)
                logger.info(f"Starting server on alternative port {available_port}")
                print(f"\n🚀 Server starting on http://localhost:{available_port}")
                print(f"📝 Update your client base_url to: http://localhost:{available_port}/v1")
                uvicorn.run(app, host="0.0.0.0", port=available_port)
            except RuntimeError as port_error:
                logger.error(f"Could not find available port: {port_error}")
                print(f"\n❌ Error: {port_error}")
                print("💡 Try setting a specific port with: PORT=9000 poetry run python main.py")
                raise
        else:
            raise


if __name__ == "__main__":
    import sys

    # Simple CLI argument parsing for port
    port = None
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            print(f"Using port from command line: {port}")
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}. Using default.")

    run_server(port)
