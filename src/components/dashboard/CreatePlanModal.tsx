import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { bosses } from '../../data';
import { getTimelinesByBossTag } from '../../services/timelineService';
import { createPlanTimelineLayoutFromTimeline } from '../../utils/timeline/planTimelineLayoutUtils';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Plan, PlanAbilityMode } from '../../types';
import AbilityModeSelect from '../common/AbilityModeSelect';
import { PLAN_ABILITY_MODE_OPTIONS } from '../../utils/abilities/abilityModeUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ENABLED_BOSS_IDS = [
  'vamp-fatale-m9s',
  'red-hot-deep-blue-m10s',
  'the-tyrant-m11s',
  'lindwurm-m12s',
  'lindwurm-ii-m12s',
  'dancing-green-m5s',
  'sugar-riot',
  'brute-abominator-m7s',
  'howling-blade-m8s',
  'ketuduke',
  'lala',
  'statice'
];

const BOSS_TIERS = [
  {
    id: 'm9s-m12s',
    name: 'M9S-M12S (AAC Heavyweight)',
    bossIds: [
      'vamp-fatale-m9s',
      'red-hot-deep-blue-m10s',
      'the-tyrant-m11s',
      'lindwurm-m12s',
      'lindwurm-ii-m12s'
    ],
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
  const preSelectedBoss = bosses.find(boss => boss.id === preSelectedBossId) || null;
  const [formData, setFormData] = useState({
    name: preSelectedBoss ? `${preSelectedBoss.name} Plan` : '',
    description: '',
    bossId: preSelectedBossId || '',
    timelineId: '',
    routeId: 'default',
    mode: 'CURRENT' as PlanAbilityMode,
    composition: 'empty'
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
      const timelines = await getTimelinesByBossTag(bossId, false);
      setAvailableTimelines(timelines);

      const officialTimeline = timelines.find(t => t.official === true);
      if (officialTimeline) {
        setFormData(prev => ({
          ...prev,
          timelineId: officialTimeline.id,
          routeId:
            officialTimeline.resolution?.defaultBranchId ||
            officialTimeline.adaptiveModel?.branches?.[0]?.id ||
            'default'
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
    if (!formData.timelineId) {
      setError('Choose an official or custom timeline version.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const standardComposition = {
        tank: ['PLD', 'WAR'],
        healer: ['WHM', 'SCH'],
        melee: ['VPR', 'DRG'],
        ranged: ['DNC'],
        caster: ['PCT']
      } as Plan['selectedJobs'];
      const planData: Partial<Plan> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        bossId: formData.bossId || null,
        bossTags: formData.bossId ? [formData.bossId] : [],
        assignments: {},
        selectedJobs: formData.composition === 'standard'
          ? standardComposition
          : { tank: [], healer: [], melee: [], ranged: [], caster: [] },
        tankPositions: {
          mainTank: null,
          offTank: null
        },
        routeId: formData.routeId,
        mode: formData.mode
      };

      if (formData.timelineId) {
        planData.sourceTimelineId = formData.timelineId;
        const selectedTimeline = availableTimelines.find(t => t.id === formData.timelineId);
        if (selectedTimeline) {
          planData.sourceTimelineName = selectedTimeline.name;
          planData.timelineLayout = createPlanTimelineLayoutFromTimeline(selectedTimeline);
          planData.bossMetadata = selectedTimeline.bossMetadata || null;
          planData.bossTags = selectedTimeline.bossTags || planData.bossTags;
          planData.bossId = selectedTimeline.bossId || planData.bossId;
        }
      }

      const newPlan = await createNewPlan(planData);

      onSuccess?.(newPlan);

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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {preSelectedBossId
              ? `Review ${preSelectedBoss?.name} plan`
              : 'Review new plan'
            }
          </DialogTitle>
          <DialogDescription>
            Confirm the plan name and timeline before creating it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Week 1 progression"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Boss Encounter</Label>
            {preSelectedBossId ? (
              <div className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                {preSelectedBoss?.name}
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
                {BOSS_TIERS.map(tier => {
                  const tierBosses = tier.bossIds
                    .map(id => bosses.find(b => b.id === id))
                    .filter(Boolean);
                  
                  return (
                    <div key={tier.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleTier(tier.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <span className="font-medium text-sm text-foreground">{tier.name}</span>
                        {expandedTiers[tier.id] ? (
                          <ChevronDown size={16} className="text-muted-foreground" />
                        ) : (
                          <ChevronRight size={16} className="text-muted-foreground" />
                        )}
                      </button>
                      {expandedTiers[tier.id] && (
                        <div className="bg-background">
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
                                  'w-full flex items-center justify-between px-4 py-2 text-left transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                  enabled && !isSelected && 'hover:bg-accent cursor-pointer',
                                  enabled && isSelected && 'bg-primary/10 border-l-2 border-primary',
                                  !enabled && 'opacity-50 cursor-not-allowed'
                                )}
                              >
                                <span className={cn(
                                  'flex items-center gap-2',
                                  enabled ? 'text-foreground' : 'text-muted-foreground'
                                )}>
                                  <span>{boss.icon}</span>
                                  <span>{boss.name}</span>
                                </span>
                                {!enabled && (
                                  <span className="text-xs text-warning font-medium">
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
              <div className="text-sm text-primary mt-1">
                Selected: {bosses.find(b => b.id === formData.bossId)?.name}
              </div>
            )}
          </div>

          {formData.bossId && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="timelineId">Timeline version *</Label>
              {loadingTimelines ? (
                <div className="text-sm text-muted-foreground py-2">Loading timelines...</div>
              ) : (
                <>
                  <Select
                    value={formData.timelineId}
                    onValueChange={(value) => {
                      const timeline = availableTimelines.find((item) => item.id === value);
                      setFormData(prev => ({
                        ...prev,
                        timelineId: value,
                        routeId:
                          timeline?.resolution?.defaultBranchId ||
                          timeline?.adaptiveModel?.branches?.[0]?.id ||
                          'default'
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimelines.map(timeline => (
                        <SelectItem key={timeline.id} value={timeline.id}>
                          {timeline.official ? '⭐ ' : '📝 '}
                          {timeline.name}
                          {timeline.official ? ' (Official)' : ' (Custom)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formData.timelineId && (
                      <>
                        Selected timeline will be used as a reference for boss actions.
                        {availableTimelines.find(t => t.id === formData.timelineId)?.official && (
                          <span className="block mt-1 text-primary">
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

          {formData.timelineId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="routeId">Fight route</Label>
                <Select
                  value={formData.routeId}
                  onValueChange={(value) => setFormData((previous) => ({
                    ...previous,
                    routeId: value
                  }))}
                >
                  <SelectTrigger id="routeId">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      availableTimelines.find((timeline) => timeline.id === formData.timelineId)
                        ?.adaptiveModel?.branches || []
                    ).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.label || branch.id}
                      </SelectItem>
                    ))}
                    {!availableTimelines.find((timeline) => timeline.id === formData.timelineId)
                      ?.adaptiveModel?.branches?.length && (
                      <SelectItem value="default">Default route</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="composition">Party composition</Label>
                <Select
                  value={formData.composition}
                  onValueChange={(value) => setFormData((previous) => ({
                    ...previous,
                    composition: value
                  }))}
                >
                  <SelectTrigger id="composition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empty">Build in workspace</SelectItem>
                    <SelectItem value="standard">Standard 2/2/4 party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="abilityMode">Job action mode</Label>
            <AbilityModeSelect
              value={formData.mode}
              onValueChange={(mode) => setFormData((previous) => ({ ...previous, mode }))}
            />
            <p className="text-sm text-muted-foreground">
              {PLAN_ABILITY_MODE_OPTIONS.find((option) => option.value === formData.mode)?.description}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Optional description for your plan"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          {error && (
            <div className="text-destructive-foreground bg-destructive/10 border border-destructive/20 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlanModal;
