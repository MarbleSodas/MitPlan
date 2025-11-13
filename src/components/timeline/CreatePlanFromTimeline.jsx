import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import { useToast } from '../common/Toast';
import { getTimeline } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { ArrowLeft } from 'lucide-react';

const CreatePlanFromTimeline = () => {
  const { timelineId } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const { createNewPlan } = usePlan();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');

  useEffect(() => {
    loadTimeline();
  }, [timelineId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const timelineData = await getTimeline(timelineId);
      setTimeline(timelineData);
      // Pre-populate plan name with timeline name
      setPlanName(`${timelineData.name} - Mitplan`);
      setPlanDescription(timelineData.description || '');
    } catch (error) {
      console.error('Error loading timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to load timeline',
        message: 'Please try again.',
        duration: 4000
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getBossInfo = () => {
    if (!timeline) return null;
    return bosses.find(b => b.id === timeline.bossId);
  };

  const handleCreatePlan = async () => {
    if (!planName.trim()) {
      addToast({
        type: 'error',
        title: 'Plan name required',
        message: 'Please enter a plan name.',
        duration: 3000
      });
      return;
    }

    setCreating(true);
    try {
      // Create plan data structure matching the expected format
      const planData = {
        name: planName.trim(),
        description: planDescription.trim(),
        bossId: timeline.bossId,
        assignments: {},
        selectedJobs: {},
        tankPositions: {
          mainTank: null,
          offTank: null
        },
        // Store timeline reference for potential future use
        sourceTimelineId: timelineId,
        sourceTimelineName: timeline.name
      };

      console.log('[CreatePlanFromTimeline] Creating plan with data:', planData);
      const newPlan = await createNewPlan(planData);
      console.log('[CreatePlanFromTimeline] Plan created successfully:', newPlan);

      addToast({
        type: 'success',
        title: 'Mitplan created!',
        message: 'Your mitplan has been created successfully from the timeline.',
        duration: 3000
      });

      // Navigate to the new plan editor
      navigate(`/plan/${newPlan.id}`);
    } catch (error) {
      console.error('Error creating plan from timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to create mitplan',
        message: error.message || 'Please try again.',
        duration: 4000
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (!timeline) {
    return null;
  }

  const bossInfo = getBossInfo();
  const sortedActions = timeline.actions ? [...timeline.actions].sort((a, b) => a.time - b.time) : [];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-cardBackground)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-[var(--select-bg)] transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold m-0">Create Mitplan from Timeline</h1>
            </div>
            <button
              onClick={handleCreatePlan}
              disabled={creating}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Mitplan'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Plan Settings */}
          <div className="space-y-6">
            <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Mitplan Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Enter plan name"
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Boss</label>
                  <div className="px-3 py-2 bg-[var(--select-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-textSecondary)]">
                    {bossInfo ? `${bossInfo.icon} ${bossInfo.name}` : timeline.bossId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Enter plan description"
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">ℹ️ What happens next?</h3>
              <ul className="text-sm text-[var(--color-textSecondary)] space-y-1 m-0 pl-5">
                <li>A new mitigation plan will be created with the selected boss</li>
                <li>The boss actions from the timeline will be available in the planner</li>
                <li>You can then assign jobs and mitigation abilities to each action</li>
                <li>The timeline itself will remain unchanged</li>
              </ul>
            </div>
          </div>

          {/* Right Panel - Timeline Preview */}
          <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Timeline Preview</h2>
            
            <div className="mb-4 pb-4 border-b border-[var(--color-border)]">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Source Timeline</div>
              <div className="font-semibold">{timeline.name}</div>
              {timeline.description && (
                <p className="text-sm text-[var(--color-textSecondary)] mt-2 m-0">
                  {timeline.description}
                </p>
              )}
            </div>

            <div className="mb-3">
              <div className="text-sm font-semibold text-[var(--color-textSecondary)]">
                Boss Actions ({sortedActions.length})
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sortedActions.map((action, index) => (
                <div
                  key={action.id}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 text-xl">{action.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{action.name}</span>
                        {action.isCustom && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-textSecondary)]">
                        ⏱️ {Math.floor(action.time / 60)}:{(action.time % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePlanFromTimeline;

