"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Users } from "lucide-react";
import type { InvitationDetails, InvitationAcceptResult } from "@/lib/types/database";

interface PageProps {
  params: Promise<{ token: string }>;
}

const roleLabels = {
  owner: "オーナー",
  admin: "管理者",
  member: "メンバー",
};

const roleDescriptions = {
  owner: "ワークスペースの完全な管理権限を持ちます",
  admin: "メンバーの管理やワークスペースの設定を変更できます",
  member: "番組とチームの利用が可能です",
};

export default function InvitationPage({ params }: PageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<InvitationAcceptResult | null>(null);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 404) {
            setError('この招待は見つかりませんでした。既に使用されているか、取り消された可能性があります。');
          } else if (response.status === 410) {
            setError('この招待の有効期限が切れています。管理者に新しい招待リンクを依頼してください。');
          } else if (response.status === 400) {
            setError('無効な招待リンクです。');
          } else {
            setError(data.error || '招待情報の取得に失敗しました');
          }
          return;
        }

        const data: InvitationDetails = await response.json();
        setInvitation(data);
      } catch (err) {
        console.error('Fetch invitation error:', err);
        setError('招待情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && data.redirect_url) {
          // Not logged in - redirect to login page
          router.push(data.redirect_url);
          return;
        }
        if (response.status === 409) {
          setError('既にこのワークスペースのメンバーです。');
          return;
        }
        if (response.status === 410) {
          setError('この招待の有効期限が切れています。');
          return;
        }
        setError(data.error || '招待の承認に失敗しました');
        return;
      }

      const result: InvitationAcceptResult = data;
      setAcceptResult(result);

      // Redirect to workspace after 3 seconds
      setTimeout(() => {
        router.push(`/${result.workspace_slug}/dashboard`);
      }, 3000);

    } catch (err) {
      console.error('Accept invitation error:', err);
      setError('招待の承認に失敗しました');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    router.push('/mypage');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>招待エラー</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">{error}</p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push('/')}
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (acceptResult?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>招待を承認しました</CardTitle>
            <CardDescription>
              ワークスペースへようこそ！
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {acceptResult.email_mismatch && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>注意: この招待は別のメールアドレス宛てに送信されたものです。</span>
              </div>
            )}
            <p className="text-center text-muted-foreground">
              ワークスペースにリダイレクトしています...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation display state
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>ワークスペースへの招待</CardTitle>
          <CardDescription>
            {invitation?.inviter_name || '管理者'}さんから
            <span className="font-semibold text-foreground"> {invitation?.workspace_name} </span>
            への招待が届いています
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation details */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ワークスペース</span>
              <span className="font-medium">{invitation?.workspace_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">招待メール</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">役割</span>
              <span className="font-medium">
                {invitation?.role ? roleLabels[invitation.role] : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">有効期限</span>
              <span className="font-medium">
                {invitation?.expires_at
                  ? new Date(invitation.expires_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
          </div>

          {/* Role description */}
          {invitation?.role && (
            <p className="text-sm text-muted-foreground text-center">
              {roleDescriptions[invitation.role]}
            </p>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              招待を承認する
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleDecline}
              disabled={isAccepting}
            >
              後で確認する
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            承認することで、このワークスペースのメンバーとして参加します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
