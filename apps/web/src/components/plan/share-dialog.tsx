/**
 * ShareDialog. Modal for sharing the current plan.
 *
 * Sharing is account-grant: minting a share link creates an opaque
 * capability token (stored in `share_tokens`). Anyone who opens the
 * link while signed in redeems it for a normal `plan_access` row
 * (VIEWER or EDITOR), after which the standard RLS + realtime-ACL
 * paths apply. See `apps/edge/functions/plans-share*` and migration
 * 0005.
 */
import { useEffect, useState } from 'react';
import { Check, Copy, Link as LinkIcon, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sharePlan, listPlanAccess, type PlanAccessInfo } from '@/lib/data-source';
import type { PresenceUser } from '@/lib/use-presence';

const ROLE_LABEL: Record<PlanAccessInfo['role'], string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

export const ShareDialog = ({
  open,
  onOpenChange,
  planId,
  viewers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  viewers: PresenceUser[];
}) => {
  const [copied, setCopied] = useState<'view' | 'edit' | null>(null);
  const [access, setAccess] = useState<PlanAccessInfo[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    listPlanAccess(planId)
      .then((rows) => {
        if (mounted) setAccess(rows);
      })
      .catch(() => {
        if (mounted) setAccess([]);
      });
    return () => {
      mounted = false;
    };
  }, [open, planId]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = async (role: 'read' | 'edit') => {
    try {
      const { token } = await sharePlan({ planId, role, expiresInDays: 30 });
      const url = `${baseUrl}/plan/${planId}?token=${token}`;
      await navigator.clipboard.writeText(url);
      const kind = role === 'edit' ? 'edit' : 'view';
      setCopied(kind);
      toast.success('Link copied', {
        description:
          role === 'edit'
            ? 'Anyone with this link can edit (after signing in)'
            : 'Anyone with this link can view (after signing in)',
      });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to create share link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="size-4" />
            Share plan
          </DialogTitle>
          <DialogDescription>
            Share this plan with your static. Anyone who opens the link while
            signed in gets access automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Link sharing */}
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Plan link
            </p>
            <div className="flex items-center gap-2">
              <div className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-xs">
                {baseUrl}/plan/{planId}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={copied === 'view' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCopyLink('read')}
                className="flex-1"
              >
                {copied === 'view' ? <Check className="size-3" /> : <Copy className="size-3" />}
                Copy view link
              </Button>
              <Button
                variant={copied === 'edit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCopyLink('edit')}
                className="flex-1"
              >
                {copied === 'edit' ? <Check className="size-3" /> : <Copy className="size-3" />}
                Copy edit link
              </Button>
            </div>
          </div>

          {/* Current access */}
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              Has access
            </p>
            {access === null ? (
              <p className="text-muted-foreground text-xs">Loading…</p>
            ) : access.length === 0 ? (
              <p className="text-muted-foreground text-xs">Only you can see this plan.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {access.map((a) => (
                  <div
                    key={a.userId}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">
                        {(a.displayName ?? a.email ?? '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{a.displayName ?? a.email ?? 'Unknown'}</span>
                    <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                      {ROLE_LABEL[a.role]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currently viewing */}
          {viewers.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                Currently viewing
              </p>
              <div className="flex flex-col gap-1.5">
                {viewers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                  >
                    <Avatar className="size-6">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.displayName}</span>
                    <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                      Live
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewers.length === 0 && (access === null || access.length <= 1) && (
            <div className="border-border flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-center">
              <Users className="text-muted-foreground size-4" />
              <p className="text-muted-foreground text-xs">No one else is here right now</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
