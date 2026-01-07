/**
 * Anonymous Plan Creator Component
 * Handles creation of new plans for anonymous users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import localStoragePlanService from '../../services/localStoragePlanService';
import { bosses } from '../../data';
import { getTimelinesByBossTag } from '../../services/timelineService';

// Define which bosses have timelines implemented
const ENABLED_BOSS_IDS = [
  'vamp-fatale-m9s',
  'red-hot-deep-blue-m10s',
  'dancing-green-m5s',
  'sugar-riot',
  'brute-abominator-m7s',
  'howling-blade-m8s',
  'ketuduke',
  'lala',
  'statice'
];

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


const AnonymousPlanCreator = ({ onCancel, onSuccess, preSelectedBossId = null }) => {
  const navigate = useNavigate();
  const { isAnonymousMode, anonymousUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    bossId: preSelectedBossId || '',
    description: '',
    timelineId: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [loadingTimelines, setLoadingTimelines] = useState(false);
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
    if (error) setError('');
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
      console.error('[AnonymousPlanCreator] Error loading timelines:', err);
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

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (!formData.bossId) {
      setError('Please select a boss');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create the plan using local storage service
      const planData = {
        name: formData.name.trim(),
        bossId: formData.bossId,
        bossTags: [formData.bossId],
        description: formData.description.trim(),
        assignments: {},
        selectedJobs: {},
        tankPositions: {}
      };

      // If a timeline is selected, store the reference
      if (formData.timelineId) {
        planData.sourceTimelineId = formData.timelineId;
        const selectedTimeline = availableTimelines.find(t => t.id === formData.timelineId);
        if (selectedTimeline) {
          planData.sourceTimelineName = selectedTimeline.name;
        }
      }

      const createdPlan = await localStoragePlanService.createPlan(planData);

      console.log('[AnonymousPlanCreator] Plan created:', createdPlan);

      // Navigate to the new plan
      navigate(`/anonymous/plan/${createdPlan.id}`);

      // Call success callback
      onSuccess?.(createdPlan);
      
    } catch (err) {
      console.error('[AnonymousPlanCreator] Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1); // Go back
    }
  };

  if (!isAnonymousMode) {
    return null;
  }

  return (
    <div className="max-w-[500px] mx-auto p-8 bg-white dark:bg-neutral-900 rounded-xl shadow-md">
      <h2 className="m-0 mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Plus size={24} />
        {preSelectedBossId
          ? `Create Plan for ${bosses.find(b => b.id === preSelectedBossId)?.name}`
          : 'Create New Plan'
        }
      </h2>

      <div className="text-sm rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 p-4 mb-4">
        You're creating a plan in anonymous mode. It will be stored locally in your browser.
        Create an account to save plans permanently and enable sharing.
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-800 dark:text-gray-200">Plan Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter plan name"
            maxLength={100}
            disabled={isCreating}
            required
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-800 dark:text-gray-200">Boss *</label>
          {preSelectedBossId ? (
            <div className="text-sm text-gray-500 py-2 px-3 bg-gray-50 dark:bg-neutral-800 rounded-md">
              Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
            </div>
          ) : (
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
              {BOSS_TIERS.map(tier => {
                const tierBosses = tier.bossIds
                  .map(id => bosses.find(b => b.id === id))
                  .filter(Boolean);
                
                return (
                  <div key={tier.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleTier(tier.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-left"
                    >
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{tier.name}</span>
                      {expandedTiers[tier.id] ? (
                        <ChevronDown size={16} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-500" />
                      )}
                    </button>
                    {expandedTiers[tier.id] && (
                      <div className="bg-white dark:bg-neutral-900">
                        {tierBosses.map(boss => {
                          const enabled = isBossEnabled(boss.id);
                          const isSelected = formData.bossId === boss.id;
                          
                          return (
                            <button
                              key={boss.id}
                              type="button"
                              onClick={() => handleBossSelect(boss.id)}
                              disabled={!enabled}
                              className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors text-sm ${
                                enabled && !isSelected ? 'hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer' : ''
                              } ${
                                enabled && isSelected ? 'bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-500' : ''
                              } ${
                                !enabled ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <span className={`flex items-center gap-2 ${
                                enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'
                              }`}>
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
            <label htmlFor="timelineId" className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Timeline (Optional)
            </label>
            {loadingTimelines ? (
              <div className="text-sm text-gray-500 py-2">Loading timelines...</div>
            ) : (
              <>
                <select
                  id="timelineId"
                  name="timelineId"
                  value={formData.timelineId}
                  onChange={handleInputChange}
                  disabled={isCreating}
                  className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
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
          <label htmlFor="description" className="text-sm font-medium text-gray-800 dark:text-gray-200">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a description for your plan"
            maxLength={500}
            disabled={isCreating}
            className="min-h-[100px] px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCreating}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isCreating || !formData.name.trim() || !formData.bossId}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            {isCreating ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnonymousPlanCreator;
