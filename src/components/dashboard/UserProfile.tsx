import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const { user, anonymousUser, isAnonymousMode, setAnonymousDisplayName } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentUser = user || anonymousUser;
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const userId = user?.uid || anonymousUser?.id || 'default';

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
      if (user) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName
        });
      } else if (isAnonymousMode && anonymousUser) {
        setAnonymousDisplayName(trimmedName);
      }

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
            <DialogTitle>Edit Display Name</DialogTitle>
            <DialogDescription>
              Enter a new display name for your profile.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfile;
