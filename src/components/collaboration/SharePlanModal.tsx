import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RotateCw, Share2, UserPlus, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  addPlanCollaborator,
  enablePlanShareView,
  getKnownPlanUsers,
  getShareableEditLink,
  getShareableViewLink,
  removePlanCollaborator,
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
  const [shareState, setShareState] = useState({
    viewToken: plan?.shareSettings?.viewToken || null,
    viewEnabled: plan?.shareSettings?.viewEnabled === true,
  });
  const [knownUsers, setKnownUsers] = useState([]);
  const [loadingKnownUsers, setLoadingKnownUsers] = useState(false);
  const [workingAction, setWorkingAction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !plan) {
      return;
    }

    setShareState({
      viewToken: plan?.shareSettings?.viewToken || null,
      viewEnabled: plan?.shareSettings?.viewEnabled === true,
    });
    setError('');
    setCopiedKey('');
  }, [isOpen, plan]);

  useEffect(() => {
    if (!isOpen || !plan || !user?.uid) {
      return;
    }

    let cancelled = false;
    setLoadingKnownUsers(true);

    getKnownPlanUsers(plan.id, user.uid)
      .then((users) => {
        if (!cancelled) {
          setKnownUsers(users);
        }
      })
      .catch((knownUsersError) => {
        if (!cancelled) {
          console.error('Failed to load known users for sharing:', knownUsersError);
          setKnownUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingKnownUsers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, plan, user?.uid]);

  const editUrl = useMemo(() => (plan ? getShareableEditLink(plan.id) : ''), [plan]);
  const viewUrl = useMemo(() => (
    shareState.viewToken && shareState.viewEnabled ? getShareableViewLink(shareState.viewToken) : ''
  ), [shareState.viewEnabled, shareState.viewToken]);

  const collaborators = knownUsers.filter((knownUser) => knownUser.isCollaborator);
  const promotableUsers = knownUsers.filter((knownUser) => !knownUser.isCollaborator);

  const markCopied = async (value, key, successMessage) => {
    if (!value) {
      return;
    }

    await copyToClipboard(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((currentKey) => (currentKey === key ? '' : currentKey)), 2000);
    toast.success(successMessage);
  };

  const refreshKnownUsers = async () => {
    if (!plan || !user?.uid) {
      return;
    }

    setLoadingKnownUsers(true);
    try {
      const users = await getKnownPlanUsers(plan.id, user.uid);
      setKnownUsers(users);
    } finally {
      setLoadingKnownUsers(false);
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
      toast.success('Public view link enabled');
    } catch (enableError) {
      console.error('Failed to enable public view link:', enableError);
      setError(enableError instanceof Error ? enableError.message : 'Failed to enable public view link.');
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
      toast.success('Public view link rotated');
    } catch (rotateError) {
      console.error('Failed to rotate public view link:', rotateError);
      setError(rotateError instanceof Error ? rotateError.message : 'Failed to rotate the public view link.');
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
      toast.success('Public view link disabled');
    } catch (disableError) {
      console.error('Failed to disable public view link:', disableError);
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable the public view link.');
    } finally {
      setWorkingAction('');
    }
  };

  const handleAddCollaborator = async (collaboratorId) => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction(`add-${collaboratorId}`);
    setError('');

    try {
      await addPlanCollaborator(plan.id, collaboratorId, user.uid);
      await refreshKnownUsers();
      onPlanChanged?.();
      toast.success('Editor added');
    } catch (addError) {
      console.error('Failed to add collaborator:', addError);
      setError(addError instanceof Error ? addError.message : 'Failed to add collaborator.');
    } finally {
      setWorkingAction('');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    if (!plan || !user?.uid) {
      return;
    }

    setWorkingAction(`remove-${collaboratorId}`);
    setError('');

    try {
      await removePlanCollaborator(plan.id, collaboratorId, user.uid);
      await refreshKnownUsers();
      onPlanChanged?.();
      toast.success('Editor removed');
    } catch (removeError) {
      console.error('Failed to remove collaborator:', removeError);
      setError(removeError instanceof Error ? removeError.message : 'Failed to remove collaborator.');
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
            Share "{plan.name}" with separate links for editors and read-only viewers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-base font-semibold">Editable Link</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This link opens the original plan. Only people you add below can edit it.
            </p>
            <div className="flex gap-2">
              <Input value={editUrl} readOnly onClick={(event) => event.currentTarget.select()} />
              <Button
                onClick={() => markCopied(editUrl, 'edit-link', 'Editable link copied')}
                className={cn(copiedKey === 'edit-link' && 'bg-green-500 hover:bg-green-600')}
              >
                {copiedKey === 'edit-link' ? <Check size={16} /> : <Copy size={16} />}
                {copiedKey === 'edit-link' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Read-Only View Link</h3>
              {!shareState.viewEnabled ? (
                <Button onClick={handleEnableViewLink} disabled={workingAction === 'enable-view'}>
                  {workingAction === 'enable-view' ? 'Enabling...' : 'Enable View Link'}
                </Button>
              ) : null}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Anyone with this link can view and print the static plan. Signed-in viewers can make a private copy.
            </p>
            {shareState.viewEnabled && shareState.viewToken ? (
              <>
                <div className="flex gap-2">
                  <Input value={viewUrl} readOnly onClick={(event) => event.currentTarget.select()} />
                  <Button
                    onClick={() => markCopied(viewUrl, 'view-link', 'Read-only view link copied')}
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
                    {workingAction === 'rotate-view' ? 'Rotating...' : 'Rotate Link'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisableViewLink}
                    disabled={workingAction === 'disable-view'}
                  >
                    {workingAction === 'disable-view' ? 'Disabling...' : 'Disable Link'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Public read-only sharing is currently disabled.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-base font-semibold">Editors</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Added editors can use the editable link and update the original plan.
            </p>
            {collaborators.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No editors have been added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.uid} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{collaborator.displayName}</p>
                      <p className="text-xs text-muted-foreground">Can edit the original plan</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleRemoveCollaborator(collaborator.uid)}
                      disabled={workingAction === `remove-${collaborator.uid}`}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-base font-semibold">Known Users</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Authenticated viewers appear here after they open the read-only link, and you can promote them to editor access.
            </p>
            {loadingKnownUsers ? (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                Loading known users...
              </div>
            ) : promotableUsers.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                No additional known users yet. Share the public view link first to populate this list.
              </div>
            ) : (
              <div className="space-y-2">
                {promotableUsers.map((knownUser) => (
                  <div key={knownUser.uid} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{knownUser.displayName}</p>
                      <p className="text-xs text-muted-foreground">Can be promoted to editor</p>
                    </div>
                    <Button
                      onClick={() => handleAddCollaborator(knownUser.uid)}
                      disabled={workingAction === `add-${knownUser.uid}`}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Editor
                    </Button>
                  </div>
                ))}
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
