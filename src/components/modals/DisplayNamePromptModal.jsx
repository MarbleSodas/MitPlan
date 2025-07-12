import React, { useState } from 'react';

/**
 * Modal that prompts unauthenticated users to enter a display name
 * for their anonymous session when accessing plan edit links
 */
const DisplayNamePromptModal = ({ isOpen, onSubmit, onCancel, planId }) => {
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate display name
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur effect */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300" />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 max-w-sm w-full p-8 transform transition-all duration-300 scale-100">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Display Name
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Enter your name for collaboration
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-4 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/80 dark:focus:bg-gray-700/80 transition-all duration-200 text-center text-lg font-medium shadow-sm"
                disabled={isSubmitting}
                autoFocus
                maxLength={50}
              />
              {error && (
                <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-gray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300/50 dark:focus:ring-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-200/30 dark:border-gray-600/30"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !displayName.trim()}
                className="flex-1 px-6 py-3 text-sm font-medium text-white bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg border border-blue-500/20"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisplayNamePromptModal;
