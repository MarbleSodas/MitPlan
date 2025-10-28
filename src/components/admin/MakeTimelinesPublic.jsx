import { useState } from 'react';
import { makeAllTimelinesPublic } from '../../services/timelineService';
import { useToast } from '../common/Toast';

/**
 * Admin utility component to make all timelines public
 * This is a one-time utility component
 */
const MakeTimelinesPublic = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { addToast } = useToast();

  const handleMakePublic = async () => {
    if (!window.confirm('Are you sure you want to make ALL timelines public? This action will update all timelines in the database.')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const count = await makeAllTimelinesPublic();
      setResult({
        success: true,
        count,
        message: count > 0 
          ? `Successfully made ${count} timeline(s) public!`
          : 'All timelines are already public.'
      });
      addToast({
        type: 'success',
        title: 'Success',
        message: count > 0 
          ? `Made ${count} timeline(s) public`
          : 'All timelines are already public',
        duration: 5000
      });
    } catch (error) {
      console.error('Error making timelines public:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
      addToast({
        type: 'error',
        title: 'Failed to update timelines',
        message: error.message || 'Please try again.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Admin Utility: Make All Timelines Public</h1>
          
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-200">
              ⚠️ <strong>Warning:</strong> This will update ALL timelines in the database to be public.
              This action cannot be easily undone.
            </p>
          </div>

          <button
            onClick={handleMakePublic}
            disabled={loading}
            className="w-full px-6 py-3 bg-[var(--color-primary)] text-[var(--color-buttonText)] rounded-lg font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Make All Timelines Public'}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <p className={result.success ? 'text-green-200' : 'text-red-200'}>
                {result.message}
              </p>
              {result.success && result.count > 0 && (
                <p className="text-sm text-[var(--color-textSecondary)] mt-2">
                  {result.count} timeline(s) were updated to be public.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-sm text-[var(--color-textSecondary)]">
            <p className="mb-2"><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Fetches all timelines from the database</li>
              <li>Sets <code className="bg-[var(--color-background)] px-1 rounded">isPublic: true</code> for each timeline</li>
              <li>Updates the <code className="bg-[var(--color-background)] px-1 rounded">updatedAt</code> timestamp</li>
              <li>Uses batch updates for efficiency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeTimelinesPublic;

