"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/layout";
import { Loader2, Mail, MoreVertical, Plus, Search, UserMinus } from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: "admin" | "member";
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "member";
  inviter_name: string;
  invited_at: string;
  expires_at: string | null;
}

const roleLabels = {
  admin: "管理者",
  member: "メンバー",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MembersPage({ params }: PageProps) {
  const { slug } = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(`/api/workspace/${slug}/members`);
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }
        const data = await response.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
        setCurrentUserId(data.currentUserId);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setIsDataLoading(false);
      }
    }
    fetchMembers();
  }, [slug]);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    setIsLoading(true);
    try {
      // TODO: Send invite via API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteMessage("");
    } catch {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="メンバー管理"
          description="ワークスペースのメンバーを管理します"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="メンバー管理"
        description="ワークスペースのメンバーを管理します"
      />

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="メンバーを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">メンバーを招待</span>
              <span className="sm:hidden">招待</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>メンバーを招待</DialogTitle>
              <DialogDescription>
                メールアドレスを入力して、ワークスペースにメンバーを招待します。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  複数のメールアドレスをカンマ区切りで入力できます
                </p>
              </div>

              <div className="space-y-2">
                <Label>役割</Label>
                <RadioGroup
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as "admin" | "member")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label htmlFor="admin" className="font-normal">
                      管理者 - すべての設定と管理が可能
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="member" id="member" />
                    <Label htmlFor="member" className="font-normal">
                      メンバー - 番組とチームの利用が可能
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">招待メッセージ（任意）</Label>
                <Textarea
                  id="message"
                  placeholder="ワークスペースに参加してください。"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleInvite} disabled={!inviteEmail || isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                招待を送信
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Members */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            アクティブメンバー ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">メンバーが見つかりません</p>
          ) : (
            filteredMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                slug={slug}
                onMemberRemoved={(memberId) => {
                  setMembers((prev) => prev.filter((m) => m.id !== memberId));
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              保留中の招待 ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  slug,
  onMemberRemoved,
}: {
  member: Member;
  currentUserId: string | null;
  slug: string;
  onMemberRemoved?: (memberId: string) => void;
}) {
  const [role, setRole] = useState(member.role);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isSelf = member.user_id === currentUserId;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/workspace/${slug}/members`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to update role:', data.error);
        return;
      }

      setRole(newRole as "admin" | "member");
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/workspace/${slug}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to delete member:', data.error);
        return;
      }

      onMemberRemoved?.(member.id);
    } catch (error) {
      console.error('Error deleting member:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg border p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback>{member.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate">{member.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 ml-0 sm:ml-auto">
          <div className="text-left sm:text-right">
            <div className="text-sm">
              役割:{" "}
              {!isSelf ? (
                <Select value={role} onValueChange={handleRoleChange} disabled={isUpdating}>
                  <SelectTrigger className="inline-flex h-auto w-auto gap-1 border-0 p-0 font-medium shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="member">メンバー</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-medium">{roleLabels[role]}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              参加日: {formatDate(member.joined_at)}
            </p>
          </div>
          {!isSelf && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  削除する
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{member.name}</span> をワークスペースから削除します。
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InvitationRow({
  invitation,
}: {
  invitation: Invitation;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{invitation.email}</h3>
          <p className="text-sm text-muted-foreground">
            役割: {roleLabels[invitation.role]} • 招待者: {invitation.inviter_name}
          </p>
          <p className="text-xs text-muted-foreground">
            有効期限: {invitation.expires_at || "-"}
          </p>
        </div>
      </div>
      <div className="flex gap-2 ml-0 sm:ml-auto">
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
          取消
        </Button>
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
          再送信
        </Button>
      </div>
    </div>
  );
}
