"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout";
import { ImageUpload } from "@/components/uploads/ImageUpload";
import { Building2, Loader2 } from "lucide-react";

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceSlug = params.slug as string;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  // Load workspace data from DB
  useEffect(() => {
    async function loadWorkspace() {
      try {
        const response = await fetch(`/api/workspace/${workspaceSlug}`);
        if (response.ok) {
          const data = await response.json();
          setName(data.workspace.name || "");
          setSlug(data.workspace.slug || "");
          setDescription(data.workspace.description || "");
          setWebsiteUrl(data.workspace.website_url || "");
          setLogoUrl(data.workspace.logo_url);
        }
      } catch (error) {
        console.error("Failed to load workspace:", error);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadWorkspace();
  }, [workspaceSlug]);

  const handleLogoUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/workspace/${workspaceSlug}/logo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload logo');
    }

    const data = await response.json();
    setLogoUrl(data.logo_url);
    return data.logo_url;
  }, [workspaceSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Save settings via API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const canDelete = deleteConfirmName === name;

  if (isLoadingData) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="ワークスペース設定"
          description="ワークスペースの基本情報を設定します"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ワークスペース設定"
        description="ワークスペースの基本情報を設定します"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <ImageUpload
              currentImageUrl={logoUrl}
              onUpload={handleLogoUpload}
              aspectRatio={1}
              cropShape="rect"
              placeholder={<Building2 className="h-10 w-10 text-muted-foreground" />}
              buttonLabel="ロゴを変更"
              imageClassName="h-24 w-24"
            />

            <div className="space-y-2">
              <Label htmlFor="name">ワークスペース名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ（URL）</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                t-agent.app/{slug || "your-slug"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">ウェブサイトURL</Label>
              <Input
                id="website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaved ? "保存しました" : "変更を保存"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">危険な操作</CardTitle>
          <CardDescription>
            ワークスペースを削除すると、すべてのデータ（番組、チーム、セッション）が削除されます。この操作は取り消せません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">ワークスペースを削除</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ワークスペースを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <p>
                      「{name}」を削除すると、以下のすべてが完全に削除されます：
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      <li>5つの番組</li>
                      <li>12のチーム</li>
                      <li>156のチャットセッション</li>
                      <li>すべての成果物</li>
                    </ul>
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="confirmName">
                        確認のため、ワークスペース名を入力してください：
                      </Label>
                      <Input
                        id="confirmName"
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder={name}
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmName("")}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={!canDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  永久に削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
