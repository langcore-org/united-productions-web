import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

// Encryption key from environment
const ENCRYPTION_KEY =
  process.env.GOOGLE_CREDENTIALS_ENCRYPTION_KEY ||
  "dev-encryption-key-32chars!!";

interface SharedDrive {
  id: string;
  name: string;
}

interface TestResult {
  success: boolean;
  clientEmail?: string;
  sharedDrives?: SharedDrive[];
  rootFolderAccess?: {
    accessible: boolean;
    name?: string;
    fileCount?: number;
  };
  outputFolderAccess?: {
    accessible: boolean;
    name?: string;
    writable?: boolean;
  };
  error?: string;
  errorDetails?: string;
}

/**
 * POST /api/workspace/drive/test
 * Test Google Drive connection for a workspace
 */
export async function POST(request: NextRequest) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace membership (owner or admin)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get decrypted service account JSON
    const { data: saData, error: saError } = await supabase.rpc(
      "get_workspace_service_account",
      {
        p_workspace_id: workspaceId,
        p_encryption_key: ENCRYPTION_KEY,
      }
    );

    if (saError) {
      console.error("Failed to get service account:", saError);
      return NextResponse.json(
        {
          success: false,
          error: "Service Accountの取得に失敗しました",
          errorDetails: saError.message,
        } as TestResult,
        { status: 500 }
      );
    }

    if (!saData) {
      return NextResponse.json(
        {
          success: false,
          error: "Service Accountが設定されていません",
        } as TestResult,
        { status: 404 }
      );
    }

    // Get workspace drive settings
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("drive_settings")
      .eq("id", workspaceId)
      .single();

    const driveSettings = workspace?.drive_settings as {
      rootFolderId?: string;
      outputFolderId?: string;
    } | null;

    // Parse service account JSON
    let serviceAccount: {
      client_email: string;
      private_key: string;
      project_id: string;
    };

    try {
      serviceAccount = JSON.parse(saData);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Service Account JSONの形式が不正です",
        } as TestResult,
        { status: 400 }
      );
    }

    // Create Google Auth client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });

    const drive = google.drive({ version: "v3", auth });

    const result: TestResult = {
      success: true,
      clientEmail: serviceAccount.client_email,
      sharedDrives: [],
    };

    // Test 1: List shared drives
    try {
      const drivesResponse = await drive.drives.list({
        pageSize: 10,
        fields: "drives(id, name)",
      });

      result.sharedDrives =
        (drivesResponse.data.drives as SharedDrive[]) || [];
    } catch (error) {
      console.error("Failed to list drives:", error);
      // Not critical - might just not have shared drive access
    }

    // Test 2: Check root folder access
    if (driveSettings?.rootFolderId) {
      try {
        const folderResponse = await drive.files.get({
          fileId: driveSettings.rootFolderId,
          fields: "id, name",
          supportsAllDrives: true,
        });

        // List files in the folder
        const filesResponse = await drive.files.list({
          q: `'${driveSettings.rootFolderId}' in parents and trashed = false`,
          pageSize: 1,
          fields: "files(id)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        result.rootFolderAccess = {
          accessible: true,
          name: folderResponse.data.name || undefined,
          fileCount: filesResponse.data.files?.length || 0,
        };
      } catch (error) {
        const err = error as { message?: string };
        result.rootFolderAccess = {
          accessible: false,
        };
        console.error("Root folder access error:", err.message);
      }
    }

    // Test 3: Check output folder access
    if (driveSettings?.outputFolderId) {
      try {
        const folderResponse = await drive.files.get({
          fileId: driveSettings.outputFolderId,
          fields: "id, name, capabilities(canAddChildren)",
          supportsAllDrives: true,
        });

        result.outputFolderAccess = {
          accessible: true,
          name: folderResponse.data.name || undefined,
          writable:
            folderResponse.data.capabilities?.canAddChildren || false,
        };
      } catch (error) {
        const err = error as { message?: string };
        result.outputFolderAccess = {
          accessible: false,
        };
        console.error("Output folder access error:", err.message);
      }
    }

    // Determine overall success
    const hasRootAccess =
      !driveSettings?.rootFolderId ||
      result.rootFolderAccess?.accessible === true;
    const hasOutputAccess =
      !driveSettings?.outputFolderId ||
      result.outputFolderAccess?.accessible === true;

    result.success = hasRootAccess && hasOutputAccess;

    if (!result.success) {
      result.error = "一部のフォルダにアクセスできません";
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/workspace/drive/test:", error);
    const err = error as { message?: string };

    // Parse Google API error
    let errorMessage = "接続テストに失敗しました";
    let errorDetails = err.message;

    if (err.message?.includes("invalid_grant")) {
      errorMessage = "Service Accountの認証に失敗しました";
      errorDetails =
        "Service Account JSONが無効か、APIが有効化されていない可能性があります";
    } else if (err.message?.includes("accessNotConfigured")) {
      errorMessage = "Google Drive APIが有効化されていません";
      errorDetails =
        "Google Cloud ConsoleでDrive APIを有効化してください";
    } else if (err.message?.includes("notFound")) {
      errorMessage = "指定されたフォルダが見つかりません";
      errorDetails = "フォルダIDを確認してください";
    } else if (err.message?.includes("forbidden")) {
      errorMessage = "フォルダへのアクセス権限がありません";
      errorDetails =
        "Service AccountのメールアドレスをフォルダのShare設定に追加してください";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorDetails,
      } as TestResult,
      { status: 500 }
    );
  }
}
