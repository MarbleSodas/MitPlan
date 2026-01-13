import React, { useState } from 'react';
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

const DisplayNamePromptModal = ({ isOpen, onSubmit, onCancel, planId }) => {
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Please enter a display name');
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
    } catch (error) {
      console.error('[DisplayNamePromptModal] Error submitting display name:', error);
      setError('Failed to create anonymous session. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Display Name</DialogTitle>
          <DialogDescription>
            Enter your name for collaboration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              disabled={isSubmitting}
              autoFocus
              maxLength={50}
              className="text-center text-lg font-medium"
            />
            {error && (
              <p className="mt-3 text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <DialogFooter className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DisplayNamePromptModal;
