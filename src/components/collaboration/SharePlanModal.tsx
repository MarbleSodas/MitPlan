import { useEffect, useState } from 'react';
import { Check, Copy, RotateCw, Share2, UserPlus, XCircle } from 'lucide-react';
import {
  createPlanInvite,
  createPlanShareLink,
  revokePlanInvites,
  revokePlanShareLinks,
} from '../../services/normalizedPlanService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

const SharePlanModal = ({ isOpen, onClose, onPlanChanged, plan }) => {
  const [copiedKey, setCopiedKey] = useState('');
  const [viewUrl, setViewUrl] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [workingAction, setWorkingAction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCopiedKey('');
    setError('');
    // Capability tokens are shown only when created. They are never stored
    // in plaintext or rehydrated into the owner's browser.
    setViewUrl('');
    setInviteUrl('');
  }, [isOpen, plan?.id]);

  const markCopied = async (value: string, key: string, message: string) => {
    if (!value) return;
    await copyToClipboard(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => current === key ? '' : current);
    }, 2_000);
    toast.success(message);
  };

  const createViewLink = async () => {
    if (!plan?.id) return;
    setWorkingAction('view');
    setError('');
    try {
      const result = await createPlanShareLink(plan.id);
      setViewUrl(`${window.location.origin}/plan/view/${result.token}`);
      onPlanChanged?.();
      toast.success('Anonymous view link created');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not create view link.');
    } finally {
      setWorkingAction('');
    }
  };

  const revokeViewLinks = async () => {
    if (!plan?.id) return;
    setWorkingAction('revoke');
    setError('');
    try {
      await revokePlanShareLinks(plan.id);
      setViewUrl('');
      onPlanChanged?.();
      toast.success('Anonymous view links revoked');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not revoke view links.');
    } finally {
      setWorkingAction('');
    }
  };

  const createEditInvite = async () => {
    if (!plan?.id) return;
    setWorkingAction('invite');
    setError('');
    try {
      const result = await createPlanInvite(plan.id, 'EDITOR');
      setInviteUrl(`${window.location.origin}/plan/invite/${result.token}`);
      toast.success('Authenticated editor invite created');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not create invite.');
    } finally {
      setWorkingAction('');
    }
  };

  const revokeEditInvites = async () => {
    if (!plan?.id) return;
    setWorkingAction('revoke-invites');
    setError('');
    try {
      await revokePlanInvites(plan.id);
      setInviteUrl('');
      toast.success('Outstanding editor invites revoked');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not revoke invites.');
    } finally {
      setWorkingAction('');
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="text-primary" size={22} />
            Share plan
          </DialogTitle>
          <DialogDescription>
            Invite signed-in editors to the private workspace, or create a refresh-only anonymous view link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-muted/25 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Editor invite</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The recipient must sign in before redeeming this revocable, one-time token.
                </p>
              </div>
              <Button onClick={createEditInvite} disabled={workingAction === 'invite'}>
                <UserPlus className="h-4 w-4" />
                {workingAction === 'invite' ? 'Creating…' : 'Create invite'}
              </Button>
            </div>
            {inviteUrl && (
              <div className="mt-4 flex gap-2">
                <Input value={inviteUrl} readOnly onClick={(event) => event.currentTarget.select()} />
                <Button
                  onClick={() => markCopied(inviteUrl, 'invite', 'Editor invite copied')}
                  className={cn(copiedKey === 'invite' && 'bg-success text-success-foreground')}
                >
                  {copiedKey === 'invite' ? <Check size={16} /> : <Copy size={16} />}
                  {copiedKey === 'invite' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              className="mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={revokeEditInvites}
              disabled={workingAction === 'revoke-invites'}
            >
              <XCircle className="h-4 w-4" />
              {workingAction === 'revoke-invites' ? 'Revoking…' : 'Revoke outstanding invites'}
            </Button>
          </section>

          <section className="rounded-lg border border-border bg-muted/25 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Anonymous view link</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Viewers fetch the latest saved plan on refresh and never join private Realtime.
                </p>
              </div>
              <Button onClick={createViewLink} disabled={workingAction === 'view'}>
                <RotateCw className="h-4 w-4" />
                {workingAction === 'view' ? 'Creating…' : 'Create or rotate'}
              </Button>
            </div>
            {viewUrl && (
              <div className="mt-4 flex gap-2">
                <Input value={viewUrl} readOnly onClick={(event) => event.currentTarget.select()} />
                <Button
                  onClick={() => markCopied(viewUrl, 'view', 'Anonymous view link copied')}
                  className={cn(copiedKey === 'view' && 'bg-success text-success-foreground')}
                >
                  {copiedKey === 'view' ? <Check size={16} /> : <Copy size={16} />}
                  {copiedKey === 'view' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              className="mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={revokeViewLinks}
              disabled={workingAction === 'revoke'}
            >
              <XCircle className="h-4 w-4" />
              {workingAction === 'revoke' ? 'Revoking…' : 'Revoke all view links'}
            </Button>
          </section>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SharePlanModal;
