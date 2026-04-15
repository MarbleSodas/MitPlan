import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RotateCw, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  enablePlanShareView,
  getShareableEditLink,
  getShareableViewLink,
  makePlanPublic,
  revokePlanShareView,
  rotatePlanShareViewToken,
} from '../../services/realtimePlanService';
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

const copyToClipboard = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch (_error) {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

const SharePlanModal = ({ isOpen, onClose, onPlanChanged, plan }) => {
  const { user } = useAuth();
  const [copiedKey, setCopiedKey] = useState('');
  const [isPublicEditEnabled, setIsPublicEditEnabled] = useState(plan?.isPublic === true);
  const [shareState, setShareState] = useState({
    viewToken: plan?.shareSettings?.viewToken || null,
    viewEnabled: plan?.shareSettings?.viewEnabled === true,
  });
  const [workingAction, setWorkingAction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !plan) {
      return;
    }

    setCopiedKey('');
    setError('');
    setIsPublicEditEnabled(plan.isPublic === true);
    setShareState({
      viewToken: plan?.shareSettings?.viewToken || null,
      viewEnabled: plan?.shareSettings?.viewEnabled === true,
    });
  }, [isOpen, plan]);

  const editUrl = useMemo(() => (plan ? getShareableEditLink(plan.id) : ''), [plan]);
  const viewUrl = useMemo(() => (
    shareState.viewToken && shareState.viewEnabled ? getShareableViewLink(shareState.viewToken) : ''
  ), [shareState.viewEnabled, shareState.viewToken]);

  const markCopied = async (value, key, successMessage) => {
    if (!value) {
      return;
    }

    await copyToClipboard(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((currentKey) => (currentKey === key ? '' : currentKey)), 2000);
    toast.success(successMessage);
  };

  const handleEnablePublicEdit = async () => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction('enable-public-edit');
    setError('');

    try {
      await makePlanPublic(plan.id, true, user.uid);
      setIsPublicEditEnabled(true);
      onPlanChanged?.();
      toast.success('Public edit link enabled');
    } catch (enableError) {
      console.error('Failed to enable public edit sharing:', enableError);
      setError(enableError instanceof Error ? enableError.message : 'Failed to enable public edit sharing.');
    } finally {
      setWorkingAction('');
    }
  };

  const handleDisablePublicEdit = async () => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction('disable-public-edit');
    setError('');

    try {
      await makePlanPublic(plan.id, false, user.uid);
      setIsPublicEditEnabled(false);
      onPlanChanged?.();
      toast.success('Public edit link disabled');
    } catch (disableError) {
      console.error('Failed to disable public edit sharing:', disableError);
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable public edit sharing.');
    } finally {
      setWorkingAction('');
    }
  };

  const handleEnableViewLink = async () => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction('enable-view');
    setError('');

    try {
      const result = await enablePlanShareView(plan.id, user.uid);
      setShareState({
        viewToken: result.viewToken,
        viewEnabled: true,
      });
      onPlanChanged?.();
      toast.success('Snapshot link enabled');
    } catch (enableError) {
      console.error('Failed to enable snapshot link:', enableError);
      setError(enableError instanceof Error ? enableError.message : 'Failed to enable the snapshot link.');
    } finally {
      setWorkingAction('');
    }
  };

  const handleRotateViewLink = async () => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction('rotate-view');
    setError('');

    try {
      const result = await rotatePlanShareViewToken(plan.id, user.uid);
      setShareState({
        viewToken: result.viewToken,
        viewEnabled: true,
      });
      onPlanChanged?.();
      toast.success('Snapshot link regenerated');
    } catch (rotateError) {
      console.error('Failed to regenerate snapshot link:', rotateError);
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to regenerate the snapshot link.');
    } finally {
      setWorkingAction('');
    }
  };

  const handleDisableViewLink = async () => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction('disable-view');
    setError('');

    try {
      await revokePlanShareView(plan.id, user.uid);
      setShareState((currentState) => ({
        ...currentState,
        viewEnabled: false,
      }));
      onPlanChanged?.();
      toast.success('Snapshot link disabled');
    } catch (disableError) {
      console.error('Failed to disable snapshot link:', disableError);
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable the snapshot link.');
    } finally {
      setWorkingAction('');
    }
  };

  if (!plan) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="text-primary" size={22} />
            Share Plan
          </DialogTitle>
          <DialogDescription>
            Share "{plan.name}" with a public edit link for signed-in users and a frozen printable snapshot for viewers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Public Edit Link</h3>
              {!isPublicEditEnabled ? (
                <Button onClick={handleEnablePublicEdit} disabled={workingAction === 'enable-public-edit'}>
                  {workingAction === 'enable-public-edit' ? 'Enabling...' : 'Enable Edit Link'}
                </Button>
              ) : null}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Signed-in users who open this link can edit the original plan. It will also appear in their shared plans after first access.
            </p>
            {isPublicEditEnabled ? (
              <>
                <div className="flex gap-2">
                  <Input value={editUrl} readOnly onClick={(event) => event.currentTarget.select()} />
                  <Button
                    onClick={() => markCopied(editUrl, 'edit-link', 'Public edit link copied')}
                    className={cn(copiedKey === 'edit-link' && 'bg-green-500 hover:bg-green-600')}
                  >
                    {copiedKey === 'edit-link' ? <Check size={16} /> : <Copy size={16} />}
                    {copiedKey === 'edit-link' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDisablePublicEdit}
                    disabled={workingAction === 'disable-public-edit'}
                  >
                    {workingAction === 'disable-public-edit' ? 'Disabling...' : 'Disable Edit Link'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Public edit sharing is currently disabled.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Read-Only Snapshot Link</h3>
              {!shareState.viewEnabled ? (
                <Button onClick={handleEnableViewLink} disabled={workingAction === 'enable-view'}>
                  {workingAction === 'enable-view' ? 'Capturing...' : 'Enable Snapshot Link'}
                </Button>
              ) : null}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Anyone with this link can view and print a frozen snapshot of the plan. Regenerate the link to capture a newer version.
            </p>
            {shareState.viewEnabled && shareState.viewToken ? (
              <>
                <div className="flex gap-2">
                  <Input value={viewUrl} readOnly onClick={(event) => event.currentTarget.select()} />
                  <Button
                    onClick={() => markCopied(viewUrl, 'view-link', 'Snapshot link copied')}
                    className={cn(copiedKey === 'view-link' && 'bg-green-500 hover:bg-green-600')}
                  >
                    {copiedKey === 'view-link' ? <Check size={16} /> : <Copy size={16} />}
                    {copiedKey === 'view-link' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRotateViewLink}
                    disabled={workingAction === 'rotate-view'}
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    {workingAction === 'rotate-view' ? 'Regenerating...' : 'Regenerate Snapshot'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisableViewLink}
                    disabled={workingAction === 'disable-view'}
                  >
                    {workingAction === 'disable-view' ? 'Disabling...' : 'Disable Snapshot'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Read-only snapshot sharing is currently disabled.
              </div>
            )}
          </section>

          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SharePlanModal;
