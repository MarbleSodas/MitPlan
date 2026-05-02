import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Edit3, Trash2 } from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updateProfile
} from 'firebase/auth';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { auth, googleProvider } from '../../config/firebase';
import { deleteCurrentUserAccount } from '../../services/accountDeletionService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const generateUserColor = (userId) => {
  const colors = [
    '#3399ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const cleanDisplayName = (name) => {
  if (!name) return name;
  if ((name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))) {
    return name.slice(1, -1);
  }
  return name;
};

const getInitials = (displayName) => {
  const cleanName = cleanDisplayName(displayName);
  return cleanName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userId = user?.uid || 'default';
  const providerIds = user?.providerData?.map((provider) => provider.providerId) || [];
  const requiresPasswordReauth = providerIds.includes('password') || (!providerIds.includes('google.com') && Boolean(user?.email));
  const usesGoogleReauth = !requiresPasswordReauth && providerIds.includes('google.com');

  const handleEditClick = () => {
    setNewDisplayName(cleanDisplayName(displayName));
    setError('');
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = newDisplayName.trim();
    if (!trimmedName) {
      setError('Display name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Display name must be less than 50 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      await updateProfile(auth.currentUser, {
        displayName: trimmedName
      });

      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating display name:', err);
      setError(err.message || 'Failed to update display name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      setIsEditModalOpen(false);
      setError('');
    }
  };

  const resetDeleteForm = () => {
    setDeleteConfirmation('');
    setReauthPassword('');
    setDeleteError('');
  };

  const parseDeleteError = (err) => {
    const code = err?.code || '';

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Google reauthentication was cancelled.';
    }

    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'That password did not match this account.';
    }

    if (code === 'auth/requires-recent-login' || code === 'functions/failed-precondition') {
      return 'Please sign in again, then retry account deletion.';
    }

    if (code === 'functions/unauthenticated') {
      return 'Your session expired. Please sign in again.';
    }

    if (code === 'functions/internal') {
      return 'We could not finish deleting your account. Your account is still active, so please try again.';
    }

    return err?.message || 'Failed to delete account. Please try again.';
  };

  const handleDeleteClick = () => {
    resetDeleteForm();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE to confirm account deletion.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setDeleteError('You must be signed in to delete your account.');
      return;
    }

    if (requiresPasswordReauth && !reauthPassword) {
      setDeleteError('Enter your password to confirm this is your account.');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      if (requiresPasswordReauth) {
        const credential = EmailAuthProvider.credential(currentUser.email || '', reauthPassword);
        await reauthenticateWithCredential(currentUser, credential);
      } else if (usesGoogleReauth) {
        await reauthenticateWithPopup(currentUser, googleProvider);
      } else {
        await currentUser.getIdToken(true);
      }

      await currentUser.getIdToken(true);
      const result = await deleteCurrentUserAccount();

      toast.success('Account deleted', {
        description: `Removed ${result.deletedPlans} plans and ${result.deletedTimelines} timelines.`,
      });

      setIsDeleteDialogOpen(false);
      setIsEditModalOpen(false);
      resetDeleteForm();

      try {
        await logout?.();
      } catch (logoutError) {
        console.warn('Sign out after account deletion failed:', logoutError);
      }

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleteError(parseDeleteError(err));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <div 
        onClick={handleEditClick}
        className="group flex items-center gap-3 cursor-pointer px-2 py-1 h-10 rounded-lg transition-all duration-200 bg-card border border-border hover:bg-muted hover:shadow-md hover:border-primary hover:-translate-y-0.5 active:translate-y-0"
      >
        <div
          style={{ backgroundColor: generateUserColor(userId) }}
          className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white/20 transition-transform duration-200 group-hover:scale-110"
        >
          {getInitials(displayName)}
        </div>
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <span className="text-foreground font-semibold text-sm tracking-wide leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] transition-colors duration-200 group-hover:text-primary">
            {cleanDisplayName(displayName)}
          </span>
        </div>
        <Edit3 className="w-[14px] h-[14px] text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Update your profile details or permanently delete your account.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Display name</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                This is visible to collaborators in shared plans.
              </p>
            </div>
            <Input
              type="text"
              placeholder="Enter your display name"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              maxLength={50}
              autoFocus
              disabled={isSubmitting}
            />

            {error && <div className="text-destructive text-sm">{error}</div>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !newDisplayName.trim()}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="mb-3 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permanently delete your account, owned plans, community timelines, and account profile data.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingAccount) {
            setIsDeleteDialogOpen(open);
            if (!open) {
              resetDeleteForm();
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action permanently removes your account and owned MitPlan data.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
              Owned plans, public view links, community timelines, profile data, collections, likes, and collaboration traces tied to this account will be deleted or removed.
            </div>

            {requiresPasswordReauth && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="delete-account-password">
                  Password
                </label>
                <Input
                  id="delete-account-password"
                  type="password"
                  value={reauthPassword}
                  onChange={(event) => {
                    setReauthPassword(event.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  disabled={isDeletingAccount}
                  autoComplete="current-password"
                />
              </div>
            )}

            {usesGoogleReauth && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                You will be asked to confirm your Google account before deletion continues.
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="delete-account-confirmation">
                Type DELETE to confirm
              </label>
              <Input
                id="delete-account-confirmation"
                value={deleteConfirmation}
                onChange={(event) => {
                  setDeleteConfirmation(event.target.value);
                  if (deleteError) setDeleteError('');
                }}
                disabled={isDeletingAccount}
                autoComplete="off"
              />
            </div>

            {deleteError && <div className="text-sm text-destructive">{deleteError}</div>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeletingAccount}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  isDeletingAccount ||
                  deleteConfirmation !== 'DELETE' ||
                  (requiresPasswordReauth && !reauthPassword)
                }
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfile;
