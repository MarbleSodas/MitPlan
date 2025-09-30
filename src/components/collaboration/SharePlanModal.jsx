import { useState, useEffect } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import * as planService from '../../services/realtimePlanService';
import { useToast } from '../common/Toast';
import { useTheme } from '../../contexts/ThemeContext';

const SharePlanModal = ({ isOpen, onClose, plan }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { addToast } = useToast();
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
      addToast({ type: 'success', title: 'Plan link copied!', message: 'The plan link has been copied to your clipboard.', duration: 3000 });
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: 'success', title: 'Plan link copied!', message: 'The plan link has been copied to your clipboard.', duration: 3000 });
    }
  };

  const handleClose = () => {
    setCopied(false);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={handleClose}>
      <div className="rounded-xl w-[90%] max-w-[500px] p-8" style={{ background: colors.background, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-6">
          <Share2 size={24} color={colors.primary || '#3399ff'} />
          <h2 className="m-0 text-xl font-semibold" style={{ color: colors.text }}>Share Plan</h2>
        </div>

        <p className="mb-6" style={{ color: colors.textSecondary, lineHeight: 1.5 }}>
          Share "{plan.name}" with others for collaborative editing. Anyone with the link will be able to view and edit this plan.
        </p>

        <div className="mb-6">
          <h3 className="m-0 mb-2 text-base font-semibold" style={{ color: colors.text }}>Share Link</h3>
          <p className="mb-4" style={{ color: colors.textSecondary }}>Universal access enabled - all plans are shareable and editable by anyone.</p>
          <div className="flex gap-2 mb-4">
            <input
              value={shareUrl}
              readOnly
              onClick={(e) => e.target.select()}
              className="flex-1 rounded-lg text-sm"
              style={{ padding: '0.75rem', border: `2px solid ${colors.border}`, background: colors.backgroundSecondary, color: colors.text }}
            />
            <button
              onClick={handleCopyUrl}
              className={`flex items-center gap-2 rounded-lg font-semibold text-sm min-w-[100px] justify-center transition ${copied ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
              style={{ padding: '0.75rem 1rem', background: copied ? undefined : colors.primary, color: '#fff', border: 'none' }}
            >
              {copied ? (<><Check size={16} />Copied!</>) : (<><Copy size={16} />Copy</>)}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg text-sm" style={{ padding: '0.75rem', background: colors.errorBackground || '#fef2f2', color: colors.error || '#ef4444', border: `1px solid ${colors.errorBorder || '#fecaca'}` }}>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg text-sm" style={{ padding: '0.75rem', background: colors.successBackground || '#f0f9ff', color: colors.success || '#10b981', border: `1px solid ${colors.successBorder || '#bfdbfe'}` }}>
            {success}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={handleClose} className="rounded-lg font-semibold transition" style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: colors.textSecondary, border: `2px solid ${colors.border}` }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePlanModal;
