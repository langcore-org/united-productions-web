import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Encryption key from environment (should be set in production)
const ENCRYPTION_KEY = process.env.GOOGLE_CREDENTIALS_ENCRYPTION_KEY || "dev-encryption-key-32chars!!";

/**
 * Validate Service Account JSON structure
 */
function validateServiceAccountJson(json: unknown): { valid: boolean; error?: string } {
  if (!json || typeof json !== "object") {
    return { valid: false, error: "Invalid JSON format" };
  }

  const sa = json as Record<string, unknown>;

  // Required fields for a Google Service Account
  const requiredFields = [
    "type",
    "project_id",
    "private_key_id",
    "private_key",
    "client_email",
    "client_id",
    "auth_uri",
    "token_uri",
  ];

  for (const field of requiredFields) {
    if (!sa[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate type
  if (sa.type !== "service_account") {
    return { valid: false, error: "Invalid type: must be 'service_account'" };
  }

  // Validate client_email format
  const clientEmail = sa.client_email as string;
  if (!clientEmail.includes("@") || !clientEmail.includes(".iam.gserviceaccount.com")) {
    return { valid: false, error: "Invalid client_email format" };
  }

  // Validate private_key format
  const privateKey = sa.private_key as string;
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    return { valid: false, error: "Invalid private_key format" };
  }

  return { valid: true };
}

/**
 * POST /api/workspace/drive
 * Upload and save Service Account JSON for a workspace
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, serviceAccountJson, driveSettings } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    if (!serviceAccountJson) {
      return NextResponse.json(
        { error: "serviceAccountJson is required" },
        { status: 400 }
      );
    }

    // Parse and validate the JSON
    let parsedJson: unknown;
    try {
      parsedJson = typeof serviceAccountJson === "string"
        ? JSON.parse(serviceAccountJson)
        : serviceAccountJson;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    const validation = validateServiceAccountJson(parsedJson);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();

    // Check if user has access to this workspace
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify workspace membership (owner or admin)
    const { data: membership, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can configure Drive settings" },
        { status: 403 }
      );
    }

    // Encrypt and save using the database function
    const jsonString = JSON.stringify(parsedJson);

    const { error: updateError } = await supabase.rpc(
      "set_workspace_service_account",
      {
        p_workspace_id: workspaceId,
        p_service_account_json: jsonString,
        p_encryption_key: ENCRYPTION_KEY,
      }
    );

    if (updateError) {
      console.error("Failed to save service account:", updateError);
      return NextResponse.json(
        { error: "Failed to save credentials" },
        { status: 500 }
      );
    }

    // Update drive_settings if provided
    if (driveSettings) {
      const { error: settingsError } = await supabase
        .from("workspaces")
        .update({ drive_settings: driveSettings })
        .eq("id", workspaceId);

      if (settingsError) {
        console.error("Failed to update drive settings:", settingsError);
      }
    }

    // Extract client_email for display (without exposing sensitive data)
    const clientEmail = (parsedJson as { client_email: string }).client_email;

    return NextResponse.json({
      success: true,
      message: "Service account configured successfully",
      clientEmail,
    });
  } catch (error) {
    console.error("Error in POST /api/workspace/drive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workspace/drive?workspaceId=xxx
 * Get Drive connection status for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get workspace with drive status
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("id, google_drive_connected, drive_settings")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connected: workspace.google_drive_connected,
      driveSettings: workspace.drive_settings,
    });
  } catch (error) {
    console.error("Error in GET /api/workspace/drive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspace/drive
 * Disconnect Google Drive from workspace
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify workspace membership (owner or admin)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Clear service account credentials
    const { error: updateError } = await supabase
      .from("workspaces")
      .update({
        google_service_account_encrypted: null,
        google_drive_connected: false,
        drive_settings: {},
      })
      .eq("id", workspaceId);

    if (updateError) {
      console.error("Failed to disconnect Drive:", updateError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Drive disconnected successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/workspace/drive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
