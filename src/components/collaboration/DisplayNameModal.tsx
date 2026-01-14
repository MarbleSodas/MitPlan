import { useState, useEffect } from 'react';
import { loadFromLocalStorage } from '../../utils/storage/storageUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


const DisplayNameModal = ({ 
  isOpen, 
  onSubmit, 
  onCancel, 
  allowCancel = true,
  title = "Join Collaboration",
  description = "Enter your display name to join this collaborative planning session."
}) => {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved display name on mount
  useEffect(() => {
    if (isOpen) {
      const savedDisplayName = loadFromLocalStorage('mitplan_display_name');
      if (savedDisplayName) {
        setDisplayName(savedDisplayName);
      }
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = displayName.trim();
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
      await onSubmit(trimmedName);
    } catch (err) {
      setError(err.message || 'Failed to join collaboration');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (allowCancel && !isSubmitting) {
      onCancel?.();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && allowCancel && !isSubmitting) {
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            placeholder="Enter your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            autoFocus
            disabled={isSubmitting}
          />

          {error && <div className="text-destructive text-sm">{error}</div>}

          <DialogFooter>
            {allowCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
            >
              {isSubmitting ? 'Joining...' : 'Join Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DisplayNameModal;
