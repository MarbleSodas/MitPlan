import { useState } from 'react';
import { makeAllTimelinesPublic } from '../../services/timelineService';
import { useToast } from '../common/Toast';
import { Button } from '../ui/button';

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
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-6">
          <h1 className="text-2xl font-bold mb-4">Admin Utility: Make All Timelines Public</h1>
          
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-xl">
            <p className="text-sm text-warning">
              ⚠️ <strong>Warning:</strong> This will update ALL timelines in the database to be public.
              This action cannot be easily undone.
            </p>
          </div>

          <Button
            onClick={handleMakePublic}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Make All Timelines Public'}
          </Button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg border ${
              result.success 
                ? 'bg-success/10 border-success/30' 
                : 'bg-destructive/10 border-destructive/30'
            }`}>
              <p className={result.success ? 'text-success' : 'text-destructive'}>
                {result.message}
              </p>
              {result.success && result.count > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {result.count} timeline(s) were updated to be public.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-sm text-muted-foreground">
            <p className="mb-2"><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Fetches all timelines from the database</li>
              <li>Sets <code className="bg-background px-1 rounded">isPublic: true</code> for each timeline</li>
              <li>Updates the <code className="bg-background px-1 rounded">updatedAt</code> timestamp</li>
              <li>Uses batch updates for efficiency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeTimelinesPublic;

