import { useState, useEffect } from 'react';
import { loadFromLocalStorage } from '../../utils/storage/storageUtils';


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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && allowCancel && !isSubmitting) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={allowCancel ? handleCancel : undefined} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown} className="bg-white dark:bg-neutral-900 rounded-xl p-8 max-w-md w-[90%] shadow-2xl">
        <h2 className="m-0 mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="m-0 mb-6 text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            autoFocus
            disabled={isSubmitting}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] disabled:bg-gray-50 disabled:border-gray-400 disabled:text-gray-400 placeholder:text-gray-500 placeholder:font-normal"
          />

          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

          <div className="flex gap-3 justify-end">
            {allowCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800 transition disabled:text-gray-400 disabled:border-gray-400"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="min-h-11 px-5 py-3 rounded-[10px] text-white font-semibold bg-blue-500 hover:bg-blue-600 transition shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]"
            >
              {isSubmitting ? 'Joining...' : 'Join Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisplayNameModal;
