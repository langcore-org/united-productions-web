"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { ImageUpload } from "@/components/uploads/ImageUpload";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    setSlug(generatedSlug);
  };

  // Store the logo file for upload after workspace creation
  const handleLogoSelect = useCallback(async (file: File): Promise<string> => {
    setLogoFile(file);
    // Create a preview URL for display
    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);
    return previewUrl;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("ワークスペース名を入力してください");
      return;
    }

    if (!slug.trim()) {
      setError("スラッグを入力してください");
      return;
    }

    if (slug.length < 3) {
      setError("スラッグは3文字以上で入力してください");
      return;
    }

    setIsLoading(true);

    try {
      // Create workspace via API
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("このスラッグは既に使用されています。別のスラッグを入力してください。");
        } else {
          setError(data.error || "ワークスペースの作成に失敗しました。");
        }
        return;
      }

      // Upload logo if provided
      if (logoFile && data.workspace?.slug) {
        const formData = new FormData();
        formData.append("file", logoFile);

        await fetch(`/api/workspace/${data.workspace.slug}/logo`, {
          method: "POST",
          body: formData,
        });
      }

      router.push(`/${data.workspace.slug}/dashboard`);
    } catch {
      setError("ワークスペースの作成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/mypage"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Link>

      <PageHeader
        title="新しいワークスペースを作成"
        description="チームの制作拠点となるワークスペースを作成します"
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <ImageUpload
              currentImageUrl={logoPreviewUrl}
              onUpload={handleLogoSelect}
              aspectRatio={1}
              cropShape="rect"
              placeholder={<Building2 className="h-10 w-10 text-muted-foreground" />}
              buttonLabel="ロゴをアップロード"
              imageClassName="h-24 w-24"
            />

            <div className="space-y-2">
              <Label htmlFor="name">ワークスペース名 *</Label>
              <Input
                id="name"
                placeholder="ABC制作会社"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ（URL） *</Label>
              <Input
                id="slug"
                placeholder="abc-production"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
              />
              <p className="text-xs text-muted-foreground">
                t-agent.app/{slug || "your-slug"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                placeholder="ワークスペースの説明を入力"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ワークスペースを作成
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
