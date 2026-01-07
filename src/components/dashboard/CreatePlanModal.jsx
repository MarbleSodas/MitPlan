import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { bosses } from '../../data';
import { getTimelinesByBossTag, getOfficialTimelines } from '../../services/timelineService';
import { INPUT, SELECT, BUTTON, MODAL, cn } from '../../styles/designSystem';

// Define which bosses have timelines implemented
const ENABLED_BOSS_IDS = ['vamp-fatale-m9s'];

// Define tier groupings for boss selection
const BOSS_TIERS = [
  {
    id: 'm9s-m12s',
    name: 'M9S-M12S (AAC Heavyweight)',
    bossIds: ['vamp-fatale-m9s', 'red-hot-deep-blue-m10s', 'the-tyrant-m11s', 'lindwurm-m12s'],
    defaultExpanded: true
  },
  {
    id: 'm5s-m8s',
    name: 'M5S-M8S (AAC Cruiserweight)',
    bossIds: ['dancing-green-m5s', 'sugar-riot', 'brute-abominator-m7s', 'howling-blade-m8s'],
    defaultExpanded: false
  },
  {
    id: 'm1s-m4s',
    name: 'M1S-M4S (AAC Light-heavyweight)',
    bossIds: ['black-cat-m1s', 'honey-b-lovely-m2s', 'brute-bomber-m3s', 'wicked-thunder-m4s'],
    defaultExpanded: false
  },
  {
    id: 'aai',
    name: 'Another Aloalo Island (Savage)',
    bossIds: ['ketuduke', 'lala', 'statice'],
    defaultExpanded: false
  }
];


const CreatePlanModal = ({ onClose, onSuccess, onNavigateToPlanner, preSelectedBossId = null }) => {
  const { createNewPlan } = usePlan();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bossId: preSelectedBossId || '',
    timelineId: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingTimelines, setLoadingTimelines] = useState(false);
  const [error, setError] = useState('');
  const [availableTimelines, setAvailableTimelines] = useState([]);
  const [expandedTiers, setExpandedTiers] = useState(() => {
    const initial = {};
    BOSS_TIERS.forEach(tier => {
      initial[tier.id] = tier.defaultExpanded;
    });
    return initial;
  });

  const toggleTier = (tierId) => {
    setExpandedTiers(prev => ({
      ...prev,
      [tierId]: !prev[tierId]
    }));
  };

  const handleBossSelect = (bossId) => {
    if (!ENABLED_BOSS_IDS.includes(bossId)) return;
    setFormData(prev => ({
      ...prev,
      bossId
    }));
  };

  const isBossEnabled = (bossId) => ENABLED_BOSS_IDS.includes(bossId);

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

      // Auto-select the official timeline if available
      const officialTimeline = timelines.find(t => t.official === true);
      if (officialTimeline) {
        setFormData(prev => ({
          ...prev,
          timelineId: officialTimeline.id
        }));
      }
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
            <label className="text-[var(--color-text)] font-medium text-sm">Boss Encounter</label>
            {preSelectedBossId ? (
              <div className="text-sm text-[var(--color-textSecondary)] py-2 px-3 bg-[var(--color-bgHover)] rounded-md">
                Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
              </div>
            ) : (
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                {BOSS_TIERS.map(tier => {
                  const tierBosses = tier.bossIds
                    .map(id => bosses.find(b => b.id === id))
                    .filter(Boolean);
                  
                  return (
                    <div key={tier.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleTier(tier.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--color-bgSecondary)] hover:bg-[var(--color-bgHover)] transition-colors text-left"
                      >
                        <span className="font-medium text-sm text-[var(--color-text)]">{tier.name}</span>
                        {expandedTiers[tier.id] ? (
                          <ChevronDown size={16} className="text-[var(--color-textSecondary)]" />
                        ) : (
                          <ChevronRight size={16} className="text-[var(--color-textSecondary)]" />
                        )}
                      </button>
                      {expandedTiers[tier.id] && (
                        <div className="bg-[var(--color-bg)]">
                          {tierBosses.map(boss => {
                            const enabled = isBossEnabled(boss.id);
                            const isSelected = formData.bossId === boss.id;
                            
                            return (
                              <button
                                key={boss.id}
                                type="button"
                                onClick={() => handleBossSelect(boss.id)}
                                disabled={!enabled}
                                className={cn(
                                  'w-full flex items-center justify-between px-4 py-2 text-left transition-colors text-sm',
                                  enabled && !isSelected && 'hover:bg-[var(--color-bgHover)] cursor-pointer',
                                  enabled && isSelected && 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-500',
                                  !enabled && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                <span className={cn(
                                  'flex items-center gap-2',
                                  enabled ? 'text-[var(--color-text)]' : 'text-[var(--color-textSecondary)]'
                                )}>
                                  <span>{boss.icon}</span>
                                  <span>{boss.name}</span>
                                </span>
                                {!enabled && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    Coming Soon
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {formData.bossId && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Selected: {bosses.find(b => b.id === formData.bossId)?.name}
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
                    {availableTimelines.map(timeline => (
                      <option key={timeline.id} value={timeline.id}>
                        {timeline.official ? '⭐ ' : '📝 '}
                        {timeline.name}
                        {timeline.official ? ' (Official)' : ' (Custom)'}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-500 mt-1">
                    {formData.timelineId && (
                      <>
                        Selected timeline will be used as a reference for boss actions.
                        {availableTimelines.find(t => t.id === formData.timelineId)?.official && (
                          <span className="block mt-1 text-blue-600 dark:text-blue-400">
                            ⭐ Official timeline automatically selected
                          </span>
                        )}
                      </>
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
