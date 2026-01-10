import { useState, useEffect } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import * as planService from '../../services/realtimePlanService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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

const SharePlanModal = ({ isOpen, onClose, plan }) => {
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (plan && isOpen) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/plan/edit/${plan.id}`;
      setShareUrl(url);
      setIsPublic(plan.isPublic || false);
    }
  }, [plan, isOpen]);

  const handleMakePublic = async () => {
    if (!plan) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await planService.makePlanPublic(plan.id, true);
      setIsPublic(true);
      setSuccess('Plan is now public and can be shared!');
    } catch (err) {
      setError('Failed to make plan public. Please try again.');
      console.error('Error making plan public:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Plan link copied!', { description: 'The plan link has been copied to your clipboard.' });
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Plan link copied!', { description: 'The plan link has been copied to your clipboard.' });
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={24} className="text-primary" />
            Share Plan
          </DialogTitle>
          <DialogDescription>
            Share "{plan.name}" with others for collaborative editing. Anyone with the link will be able to view and edit this plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold mb-2">Share Link</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Universal access enabled - all plans are shareable and editable by anyone.
            </p>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                onClick={(e) => e.target.select()}
                className="flex-1"
              />
              <Button
                onClick={handleCopyUrl}
                variant={copied ? "default" : "default"}
                className={cn(
                  "min-w-[100px]",
                  copied && "bg-green-500 hover:bg-green-600"
                )}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg text-sm px-3 py-2 bg-destructive/10 text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg text-sm px-3 py-2 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              {success}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SharePlanModal;
