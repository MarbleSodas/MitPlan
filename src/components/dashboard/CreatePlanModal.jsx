import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { bosses } from '../../data';
import { getTimelinesByBossTag } from '../../services/timelineService';
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

    setLoading(true);
    setError('');

    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        bossId: formData.bossId || null,
        bossTags: formData.bossId ? [formData.bossId] : [],
        assignments: {},
        selectedJobs: {},
        tankPositions: {
          mainTank: null,
          offTank: null
        }
      };

      if (formData.timelineId) {
        planData.sourceTimelineId = formData.timelineId;
        const selectedTimeline = availableTimelines.find(t => t.id === formData.timelineId);
        if (selectedTimeline) {
          planData.sourceTimelineName = selectedTimeline.name;
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
              ? `Create Plan for ${bosses.find(b => b.id === preSelectedBossId)?.name}`
              : 'Create New Plan'
            }
          </DialogTitle>
          <DialogDescription>
            Create a new mitigation plan for your raid team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter plan name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Boss Encounter</Label>
            {preSelectedBossId ? (
              <div className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
                Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
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
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary hover:bg-accent transition-colors text-left"
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
                                  'w-full flex items-center justify-between px-4 py-2 text-left transition-colors text-sm',
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
              <div className="text-sm text-primary mt-1">
                Selected: {bosses.find(b => b.id === formData.bossId)?.name}
              </div>
            )}
          </div>

          {formData.bossId && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="timelineId">Timeline (Optional)</Label>
              {loadingTimelines ? (
                <div className="text-sm text-muted-foreground py-2">Loading timelines...</div>
              ) : (
                <>
                  <Select
                    value={formData.timelineId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timelineId: value }))}
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
