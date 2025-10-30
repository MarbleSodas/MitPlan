import { useState, useEffect } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { bosses } from '../../data';
import { getTimelinesByBossTag, getOfficialTimelines } from '../../services/timelineService';
import { INPUT, SELECT, BUTTON, MODAL, cn } from '../../styles/designSystem';


const CreatePlanModal = ({ onClose, onSuccess, onNavigateToPlanner, preSelectedBossId = null }) => {
  const { createNewPlan } = usePlan();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bossId: preSelectedBossId || '',
    timelineId: '' // Selected timeline (optional)
  });
  const [loading, setLoading] = useState(false);
  const [loadingTimelines, setLoadingTimelines] = useState(false);
  const [error, setError] = useState('');
  const [availableTimelines, setAvailableTimelines] = useState([]);

  // Load timelines when boss is selected
  useEffect(() => {
    if (formData.bossId) {
      loadTimelinesForBoss(formData.bossId);
    } else {
      setAvailableTimelines([]);
    }
  }, [formData.bossId]);

  const loadTimelinesForBoss = async (bossId) => {
    setLoadingTimelines(true);
    try {
      // Get both official and custom timelines for this boss
      const timelines = await getTimelinesByBossTag(bossId, false);
      setAvailableTimelines(timelines);
    } catch (err) {
      console.error('[CreatePlanModal] Error loading timelines:', err);
      setAvailableTimelines([]);
    } finally {
      setLoadingTimelines(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    // Boss is now optional - no validation required

    setLoading(true);
    setError('');

    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        bossId: formData.bossId || null, // Boss is now optional
        bossTags: formData.bossId ? [formData.bossId] : [], // Convert to array for new structure
        assignments: {},
        selectedJobs: {},
        tankPositions: {
          mainTank: null,
          offTank: null
        }
      };

      // If a timeline is selected, store the reference
      if (formData.timelineId) {
        planData.sourceTimelineId = formData.timelineId;
        const selectedTimeline = availableTimelines.find(t => t.id === formData.timelineId);
        if (selectedTimeline) {
          planData.sourceTimelineName = selectedTimeline.name;
        }
      }

      console.log('[CreatePlanModal] Creating plan with data:', planData);
      const newPlan = await createNewPlan(planData);
      console.log('[CreatePlanModal] Plan created successfully:', newPlan);

      onSuccess?.(newPlan);

      // Navigate to planner if requested
      if (onNavigateToPlanner) {
        onNavigateToPlanner(newPlan.id);
      }
    } catch (err) {
      console.error('[CreatePlanModal] Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} className={cn(MODAL.overlay, 'z-[1000]')}>
      <div onClick={(e) => e.stopPropagation()} className={cn(MODAL.container, 'max-w-xl p-8')}>
        <div className="flex justify-between items-center mb-8">
          <h2 className={cn(MODAL.title, 'text-2xl')}>
            {preSelectedBossId
              ? `Create Plan for ${bosses.find(b => b.id === preSelectedBossId)?.name}`
              : 'Create New Plan'
            }
          </h2>
          <button onClick={onClose} className={cn(BUTTON.ghost, 'w-8 h-8 p-0')}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-[var(--color-text)] font-medium text-sm">Plan Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter plan name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={INPUT.medium}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="bossId" className="text-[var(--color-text)] font-medium text-sm">Boss Encounter</label>
            <select
              id="bossId"
              name="bossId"
              value={formData.bossId}
              onChange={handleInputChange}
              disabled={!!preSelectedBossId}
              className={SELECT.medium}
            >
              <option value="">Select a boss encounter</option>
              {bosses.map(boss => (
                <option key={boss.id} value={boss.id}>
                  {boss.icon} {boss.name}
                </option>
              ))}
            </select>
            {preSelectedBossId && (
              <div className="text-sm text-[var(--color-textSecondary)] mt-1">
                Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
              </div>
            )}
          </div>

          {/* Timeline Selection - Only show when boss is selected */}
          {formData.bossId && (
            <div className="flex flex-col gap-2">
              <label htmlFor="timelineId" className="text-[var(--color-text)] font-medium text-sm">
                Timeline (Optional)
              </label>
              {loadingTimelines ? (
                <div className="text-sm text-[var(--color-textSecondary)] py-2">Loading timelines...</div>
              ) : (
                <>
                  <select
                    id="timelineId"
                    name="timelineId"
                    value={formData.timelineId}
                    onChange={handleInputChange}
                    className={SELECT.medium}
                  >
                    <option value="">Create blank plan (no timeline)</option>
                    {availableTimelines.map(timeline => (
                      <option key={timeline.id} value={timeline.id}>
                        {timeline.official ? '⭐ ' : '📝 '}
                        {timeline.name}
                        {timeline.official ? ' (Official)' : ' (Custom)'}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-500 mt-1">
                    {formData.timelineId ? (
                      <>
                        Selected timeline will be used as a reference for boss actions.
                        {availableTimelines.find(t => t.id === formData.timelineId)?.official && (
                          <span className="block mt-1 text-blue-600 dark:text-blue-400">
                            ⭐ Official timeline - Predefined boss actions
                          </span>
                        )}
                      </>
                    ) : (
                      'Select a timeline to use predefined boss actions, or create a blank plan to add custom actions.'
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-[var(--color-text)] font-medium text-sm">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional description for your plan"
              value={formData.description}
              onChange={handleInputChange}
              className={cn(INPUT.medium, 'min-h-[100px] resize-y')}
            />
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className={BUTTON.secondary.large}>Cancel</button>
            <button type="submit" disabled={loading} className={BUTTON.primary.large}>{loading ? 'Creating...' : 'Create Plan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlanModal;
