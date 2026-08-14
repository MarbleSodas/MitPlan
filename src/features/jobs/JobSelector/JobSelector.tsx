import React, { useRef, useCallback, memo, useState, useEffect, useMemo } from 'react';
import { ChevronDown, RefreshCw, XCircle } from 'lucide-react';
import { useRealtimeJobContext } from '../../../contexts/RealtimeJobContext';
import { useTankPositionContext } from '../../../contexts/TankPositionContext';
import { useRealtimePlan } from '../../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../../contexts/RealtimeBossContext';
import { usePresenceOptional } from '../../../contexts/PresenceContext';
import { useUserJobAssignmentOptional } from '../../../contexts/UserJobAssignmentContext';
import { baseHealthValues } from '../../../data/bosses/bossData';
import { bosses } from '../../../data';
import {
  getPlanTimelineLayout,
  getPlanTimelineMirrorFields,
  normalizePlanTimelineLayout,
} from '../../../utils/timeline/planTimelineLayoutUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PresenceSurface from '../../../components/collaboration/PresenceSurface';
import PresenceTarget from '../../../components/collaboration/PresenceTarget';
import SectionPresencePill from '../../../components/collaboration/SectionPresencePill';
import SelectionBorder from '../../../components/collaboration/SelectionBorder';
import type { Job, JobId, UserJobAssignment } from '../../../types';
import {
  isJobAvailableInMode,
  normalizePlanAbilityMode,
} from '../../../utils/abilities/abilityModeUtils';

const ROLE_CONFIG = {
  tank: { color: 'text-role-tank', border: 'border-role-tank', bg: 'bg-role-tank/10', icon: '🛡️', label: 'Tanks' },
  healer: { color: 'text-role-healer', border: 'border-role-healer', bg: 'bg-role-healer/10', icon: '💉', label: 'Healers' },
  melee: { color: 'text-role-melee', border: 'border-role-melee', bg: 'bg-role-melee/10', icon: '🗡️', label: 'Melee DPS' },
  ranged: { color: 'text-role-ranged', border: 'border-role-ranged', bg: 'bg-role-ranged/10', icon: '🏹', label: 'Phys Ranged' },
  caster: { color: 'text-role-caster', border: 'border-role-caster', bg: 'bg-role-caster/10', icon: '🔮', label: 'Magic Ranged' }
};

interface JobCardProps {
  job: Job;
  isTank: boolean;
  tankPosition: 'mainTank' | 'offTank' | null;
  assignment: UserJobAssignment | null;
  isMyJob: boolean;
  canClaim: boolean;
  onToggleJob: () => void;
  onAssignTankPosition: () => void;
  onClaimJob: () => void;
  onReleaseJob: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const JobCard = ({
  job,
  isTank,
  tankPosition,
  assignment,
  isMyJob,
  canClaim,
  onToggleJob,
  onAssignTankPosition,
  onClaimJob,
  onReleaseJob,
  disabled = false,
  compact = false,
}: JobCardProps) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const hasAssignment = !!assignment;

  const handleClick = () => {
    onToggleJob();
  };

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClaiming(true);
    try {
      await onClaimJob();
    } finally {
      setTimeout(() => setIsClaiming(false), 500);
    }
  };

  const handleRelease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onReleaseJob();
  };

  const getBorderStyle = (): React.CSSProperties => {
    if (hasAssignment && assignment) {
      return {
        borderColor: assignment.color,
        borderWidth: '2px',
        boxShadow: isMyJob ? `0 0 0 2px ${assignment.color}33` : undefined
      };
    }
    return {};
  };

  return (
    <SelectionBorder
      elementType="job"
      elementId={job.id}
      showIndicator={true}
      indicatorPosition="top-right"
      className="rounded-md"
      publishHover={true}
    >
      <div
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.currentTarget !== event.target || disabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={job.selected}
        aria-label={`${job.selected ? 'Remove' : 'Add'} ${job.name} ${job.selected ? 'from' : 'to'} party`}
        className={cn(
          "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          compact ? "min-h-20 px-1.5 py-1.5" : "min-h-[100px] px-2.5 py-2",
          disabled && "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none",
          job.selected
            ? "border-primary bg-primary/10"
            : "border-border bg-background hover:border-primary/50",
          hasAssignment && "bg-muted/20"
        )}
        style={getBorderStyle()}
      >

        {/* Job Icon */}
        <div className={cn('flex items-center justify-center', compact ? 'mb-0.5 h-8' : 'mb-1 h-10')}>
          {typeof job.icon === 'string' && job.icon.startsWith('/') ? (
            <img src={job.icon} alt={job.name} className={cn(compact ? 'max-h-8 max-w-8' : 'max-h-10 max-w-10')} />
          ) : (
            job.icon
          )}
        </div>

        {/* Job Name */}
        <div className={cn(compact ? 'text-xs' : 'text-sm', "font-medium", job.selected ? "text-foreground" : "text-muted-foreground")}>
          {job.name}
        </div>

        {/* Tank Position Toggle Button */}
        {isTank && job.selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssignTankPosition();
            }}
            className={cn(
              "mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              tankPosition === 'mainTank' ? "bg-primary" : tankPosition === 'offTank' ? "bg-destructive" : "bg-muted"
            )}
            aria-label={`Set ${job.name} tank position. Current position: ${tankPosition === 'mainTank' ? 'main tank' : tankPosition === 'offTank' ? 'off tank' : 'not set'}`}
          >
            {tankPosition === 'mainTank' ? 'MT' : tankPosition === 'offTank' ? 'OT' : 'Set'}
          </button>
        )}

        {/* Party Assignment Section */}
        <div className="mt-1 w-full">
          {hasAssignment && assignment ? (
            <div className="flex flex-col items-center gap-1 w-full">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
                  isMyJob ? "bg-background shadow-sm" : "bg-muted/50"
                )}
                style={isMyJob ? { borderColor: assignment.color, borderWidth: '1px', borderStyle: 'solid' } : undefined}
                title={`${assignment.displayName}${isMyJob ? ' (You)' : ''}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/30"
                  style={{ backgroundColor: assignment.color }}
                />
                <span className={cn(
                  "truncate max-w-[60px]",
                  isMyJob ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {assignment.displayName}
                </span>
                {isMyJob && <span className="text-primary font-bold">★</span>}
              </div>
              {isMyJob && (
                <button
                  type="button"
                  onClick={handleRelease}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Release job"
                  aria-label={`Release ${job.name}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <Button
              variant={canClaim ? "default" : "outline"}
              size="sm"
              onClick={handleClaim}
              disabled={!canClaim || isClaiming || !job.selected}
              className={cn(
                "h-5 text-[10px] px-2 transition-all duration-200",
                canClaim && !isClaiming && "hover:scale-105"
              )}
            >
              {isClaiming ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                </span>
              ) : (
                "Claim"
              )}
            </Button>
          )}
        </div>
      </div>
    </SelectionBorder>
  );
};

interface HealthSettingsSectionProps {
  mtMaxHp: number;
  otMaxHp: number;
  setMtMaxHp: (value: number) => void;
  setOtMaxHp: (value: number) => void;
  persistTankHp: (key: string, value: number) => void;
  resetTankHpToDefault: (key: string) => void;
  partyMinHp: number;
  setPartyMinHp: (value: number) => void;
  persistPartyMinHp: (value: number) => void;
  resetPartyMinHp: () => void;
  mtTankJob: Job | null;
  otTankJob: Job | null;
  healingPotency: number;
  setHealingPotency: (value: number) => void;
  resetHealingPotency: () => void;
  currentBossLevel: number;
  compact?: boolean;
}

const HealthSettingsSection = ({
  mtMaxHp,
  otMaxHp,
  setMtMaxHp,
  setOtMaxHp,
  persistTankHp,
  resetTankHpToDefault,
  partyMinHp,
  setPartyMinHp,
  persistPartyMinHp,
  resetPartyMinHp,
  mtTankJob,
  otTankJob,
  healingPotency,
  setHealingPotency,
  resetHealingPotency,
  currentBossLevel,
  compact = false,
}: HealthSettingsSectionProps) => {
  const presence = usePresenceOptional();

  const renderTankIcon = (job: Job | null) => {
    if (!job) return null;
    return (
      <div className="w-6 h-6 flex items-center justify-center">
        {typeof job.icon === 'string' && job.icon.startsWith('/') ? (
          <img src={job.icon} alt={job.name} className="max-h-6 max-w-6 object-contain" />
        ) : (
          job.icon
        )}
      </div>
    );
  };

  const renderSettingRow = (
    presenceId: string,
    label: string,
    value: number,
    onChange: (val: number) => void,
    onCommit: (val: number) => void,
    onReset: () => void,
    tankIcon?: React.ReactNode,
    suffix?: string
  ) => (
    <PresenceTarget
      target={{
        surface: 'planner',
        entityType: 'healthSetting',
        entityId: presenceId,
      }}
      className="rounded-lg"
      publishHover={true}
      publishFocus={true}
      focusInteraction="editing"
    >
      <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
        {tankIcon && <div className="mr-1">{tankIcon}</div>}
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          {label}
        </span>
        <Input
          type="number"
          variant="compact"
          min={1}
          step={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={() => {
            const safeValue = Math.max(1, Number(value) || 0);
            onChange(safeValue);
            onCommit(safeValue);

            if (label.includes('Heal')) {
              localStorage.setItem(`mitplan-healing-potency-${currentBossLevel}`, safeValue.toString());
            }

            if (
              presence?.getMyPresence()?.activeTarget?.entityId === presenceId &&
              presence.getMyPresence()?.interaction === 'editing'
            ) {
              presence.setInteraction('hovering');
              presence.setActiveTarget({
                surface: 'planner',
                entityType: 'healthSetting',
                entityId: presenceId,
              });
            }
          }}
          className="h-10 text-sm font-semibold w-24"
          aria-label={label}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          title="Reset to default"
          aria-label={`Reset ${label.replace(':', '')} to default`}
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 shrink-0"
        >
          <RefreshCw size={14} />
        </Button>
      </div>
    </PresenceTarget>
  );

  return (
    <div className={cn('border-t border-border', compact ? 'pt-3' : 'pt-4')}>
      <h4 className={cn('font-semibold text-foreground', compact ? 'mb-2 text-sm' : 'mb-3 text-base')}>
        {compact ? 'Tank HP' : 'Health Settings'}
      </h4>
      <div className={cn('flex flex-wrap', compact ? 'gap-2' : 'gap-3')}>
        {renderSettingRow(
          'mainTankHp',
          'MT HP:',
          mtMaxHp,
          setMtMaxHp,
          (value) => persistTankHp('mainTank', value),
          () => resetTankHpToDefault('mainTank'),
          renderTankIcon(mtTankJob)
        )}
        {renderSettingRow(
          'offTankHp',
          'OT HP:',
          otMaxHp,
          setOtMaxHp,
          (value) => persistTankHp('offTank', value),
          () => resetTankHpToDefault('offTank'),
          renderTankIcon(otTankJob)
        )}
        {!compact && (
          <>
            {renderSettingRow(
              'partyMinHealth',
              'Party Min:',
              partyMinHp,
              setPartyMinHp,
              persistPartyMinHp,
              resetPartyMinHp,
              undefined,
              'HP'
            )}
            {renderSettingRow(
              'healingPotency',
              'Heal Potency:',
              healingPotency,
              setHealingPotency,
              () => undefined,
              resetHealingPotency,
              undefined,
              'ppt'
            )}
          </>
        )}
      </div>
    </div>
  );
};

function JobSelector({ disabled = false, compact = false, showHealthSettings = true }) {
  const { selectedJobs: jobs, toggleJobSelection: contextToggleJobSelection } = useRealtimeJobContext();
  const { tankPositions, assignTankPosition, selectedTankJobs } = useTankPositionContext();
  const { realtimePlan, batchUpdateRealtime } = useRealtimePlan();
  const planAbilityMode = normalizePlanAbilityMode(realtimePlan?.mode);
  const { currentBossId, currentBossLevel } = useRealtimeBossContext();
  const jobAssignment = useUserJobAssignmentOptional();
  const lastClickTimeRef = useRef(new Map());

  const planTimelineLayout = useMemo(
    () => getPlanTimelineLayout(realtimePlan),
    [realtimePlan]
  );
  const currentBoss = bosses.find(b => b.id === currentBossId) || null;
  const timelineDefaultTankHp = planTimelineLayout?.healthConfig?.defaultTank
    ?? planTimelineLayout?.bossMetadata?.baseHealth?.tank;
  const timelineDefaultPartyHp = planTimelineLayout?.bossMetadata?.baseHealth?.party;
  const defaultTankHp = timelineDefaultTankHp
    ?? (baseHealthValues[currentBossLevel]?.tank)
    ?? baseHealthValues[100].tank;
  const defaultPartyHp = timelineDefaultPartyHp
    ?? (currentBoss?.baseHealth?.party)
    ?? (baseHealthValues[currentBossLevel]?.party)
    ?? baseHealthValues[100].party;
  const existingMainHp = planTimelineLayout?.healthConfig?.mainTank
    ?? realtimePlan?.healthSettings?.tankMaxHealth?.mainTank;
  const existingOffHp = planTimelineLayout?.healthConfig?.offTank
    ?? realtimePlan?.healthSettings?.tankMaxHealth?.offTank;
  const existingPartyMinHp = planTimelineLayout?.healthConfig?.party
    ?? realtimePlan?.healthSettings?.partyMinHealth;

  const HEALING_POTENCY_VALUES: Record<number, number> = {
    90: 5000,
    100: 6000,
  };
  const defaultHealingPotency = HEALING_POTENCY_VALUES[currentBossLevel] || HEALING_POTENCY_VALUES[100];

  const getStoredHealingPotency = () => {
    const saved = localStorage.getItem(`mitplan-healing-potency-${currentBossLevel}`);
    if (saved) {
      const val = parseInt(saved, 10);
      if (val > 0) return val;
    }
    return defaultHealingPotency;
  };

  const [mtMaxHp, setMtMaxHp] = useState(() => existingMainHp || defaultTankHp);
  const [otMaxHp, setOtMaxHp] = useState(() => existingOffHp || defaultTankHp);
  const [partyMinHp, setPartyMinHp] = useState(() => existingPartyMinHp ?? defaultPartyHp);
  const [healingPotency, setHealingPotency] = useState(() => getStoredHealingPotency());

  useEffect(() => {
    const nextMainHp = existingMainHp ?? defaultTankHp;
    const nextOffHp = existingOffHp ?? defaultTankHp;
    const nextPartyHp = existingPartyMinHp ?? defaultPartyHp;

    setMtMaxHp((previous) => (previous === nextMainHp ? previous : nextMainHp));
    setOtMaxHp((previous) => (previous === nextOffHp ? previous : nextOffHp));
    setPartyMinHp((previous) => (previous === nextPartyHp ? previous : nextPartyHp));
  }, [
    defaultPartyHp,
    defaultTankHp,
    existingMainHp,
    existingOffHp,
    existingPartyMinHp,
  ]);

  const persistTankHp = useCallback((key: string, value: number) => {
    const safe = Math.max(1, Number(value) || 0);

    if (planTimelineLayout) {
      const nextLayout = normalizePlanTimelineLayout({
        ...planTimelineLayout,
        healthConfig: {
          ...planTimelineLayout.healthConfig,
          [key]: safe,
        },
      });

      batchUpdateRealtime(getPlanTimelineMirrorFields(nextLayout));
      return;
    }

    const current = realtimePlan?.healthSettings?.tankMaxHealth || {};
    const updated = {
      healthSettings: {
        ...(realtimePlan?.healthSettings || {}),
        tankMaxHealth: {
          ...current,
          [key]: safe,
        },
      },
    };
    batchUpdateRealtime(updated);
  }, [planTimelineLayout, realtimePlan, batchUpdateRealtime]);

  const resetTankHpToDefault = useCallback((key: string) => {
    const value = defaultTankHp;
    if (key === 'mainTank') {
      setMtMaxHp(value);
    } else {
      setOtMaxHp(value);
    }
    persistTankHp(key, value);
  }, [defaultTankHp, persistTankHp]);

  const persistPartyMinHp = useCallback((value: number) => {
    const safe = Math.max(1, Number(value) || 0);

    if (planTimelineLayout) {
      const nextLayout = normalizePlanTimelineLayout({
        ...planTimelineLayout,
        healthConfig: {
          ...planTimelineLayout.healthConfig,
          party: safe,
        },
      });

      batchUpdateRealtime(getPlanTimelineMirrorFields(nextLayout));
      return;
    }

    const updated = {
      healthSettings: {
        ...(realtimePlan?.healthSettings || {}),
        partyMinHealth: safe,
      },
    };
    batchUpdateRealtime(updated);
  }, [planTimelineLayout, realtimePlan, batchUpdateRealtime]);

  const resetPartyMinHp = useCallback(() => {
    setPartyMinHp(defaultPartyHp);
    persistPartyMinHp(defaultPartyHp);
  }, [defaultPartyHp, persistPartyMinHp]);

  const resetHealingPotency = useCallback(() => {
    setHealingPotency(defaultHealingPotency);
    localStorage.removeItem(`mitplan-healing-potency-${currentBossLevel}`);
  }, [defaultHealingPotency, currentBossLevel]);

  const toggleJobSelection = (roleKey: string, jobId: string) => {
    if (disabled) return;
    const clickKey = `${roleKey}-${jobId}`;
    const now = Date.now();
    const lastClickTime = lastClickTimeRef.current.get(clickKey) || 0;
    if (now - lastClickTime < 200) return;
    lastClickTimeRef.current.set(clickKey, now);
    contextToggleJobSelection(roleKey, jobId);
  };

  const handleTankPositionClick = useCallback((tankJobId: JobId) => {
    const currentMT = tankPositions.mainTank;
    const currentOT = tankPositions.offTank;

    if (currentMT === tankJobId) {
      assignTankPosition(tankJobId, 'offTank');
    }
    else if (currentOT === tankJobId) {
      assignTankPosition(tankJobId, 'mainTank');
    }
    else if (!currentMT) {
      assignTankPosition(tankJobId, 'mainTank');
    } else if (!currentOT) {
      assignTankPosition(tankJobId, 'offTank');
    }
    else {
      assignTankPosition(tankJobId, 'mainTank');
    }
  }, [tankPositions, assignTankPosition]);

  const handleClaimJob = async (jobId: JobId) => {
    if (jobAssignment) {
      await jobAssignment.claimJob(jobId);
    }
  };

  const handleReleaseJob = async () => {
    if (jobAssignment) {
      await jobAssignment.releaseJob();
    }
  };

  const mtTankJob = tankPositions.mainTank ? selectedTankJobs.find(t => t.id === tankPositions.mainTank) || null : null;
  const otTankJob = tankPositions.offTank ? selectedTankJobs.find(t => t.id === tankPositions.offTank) || null : null;
  const selectedJobCount = (Object.values(jobs) as Job[][]).reduce(
    (count, roleJobs) => count + roleJobs.filter((job: Job) => job.selected).length,
    0,
  );
  const [isExpanded, setIsExpanded] = useState(selectedJobCount === 0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    setIsExpanded(selectedJobCount === 0);
  }, [selectedJobCount]);

  return (
    <PresenceSurface
      surface="planner"
      panel="jobs"
      section="jobs"
      hideRemoteCursorsOnMobile={true}
      className={compact ? "mb-3" : "mb-5"}
    >
    <Card className="bg-card">
      <CardHeader className={cn("border-b border-border pb-3", compact && "p-3")}>
        <CardTitle className={cn("flex items-center justify-between gap-3 font-semibold text-foreground", compact ? "text-base" : "text-lg")}>
          <div className={cn("flex min-w-0 items-center", compact ? "gap-2" : "gap-3")}>
            <span>{compact ? 'Party jobs' : 'Select FFXIV Jobs'}</span>
            <SectionPresencePill surface="planner" section="jobs" />
            {selectedJobCount > 0 ? (
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                {selectedJobCount} selected
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls="planner-job-selector-content"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            className="shrink-0 gap-1.5"
          >
            {isExpanded ? 'Collapse' : 'Configure'}
            <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      {isExpanded ? <CardContent
        id="planner-job-selector-content"
        className={cn(
          "grid gap-4 pt-4",
          compact
            ? "grid-cols-1 gap-2 px-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
        )}
      >
        {Object.entries(jobs).map(([roleKey, roleJobs]: [string, any]) => {
          const config = ROLE_CONFIG[roleKey as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.tank;
          const isTankRole = roleKey === 'tank';

          return (
            <div
              key={roleKey}
              className={cn("rounded-lg border border-border bg-card shadow-sm", compact ? "p-2" : "p-4")}
            >
              <div className={cn("flex items-center border-b-2", compact ? "mb-2 pb-2" : "mb-4 pb-2", config.border)}>
                <div className={cn(
                  "flex items-center justify-center rounded-full",
                  compact ? "mr-2 h-7 w-7 text-base" : "mr-4 h-10 w-10 text-2xl",
                  config.bg,
                  config.color,
                )}>
                  {config.icon}
                </div>
                <h4 className={cn("m-0 font-bold", compact ? "text-sm" : "text-lg", config.color)}>
                  {config.label}
                </h4>
              </div>

              <div className={cn("grid grid-cols-2", compact ? "gap-2" : "gap-3")}>
                {roleJobs
                  .filter((job: Job) => isJobAvailableInMode(job, planAbilityMode))
                  .map((job: Job) => {
                  const isTank = isTankRole;
                  const tankPosition: 'mainTank' | 'offTank' | null = isTank
                    ? (tankPositions.mainTank === job.id ? 'mainTank' : tankPositions.offTank === job.id ? 'offTank' : null)
                    : null;
                  const assignment = jobAssignment?.jobAssignments[job.id] || null;
                  const isMyJob = jobAssignment?.isJobClaimedByMe(job.id) || false;
                  const canClaim = jobAssignment?.canClaimJob(job.id) || false;

                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      isTank={isTank}
                      tankPosition={tankPosition}
                      assignment={assignment}
                      isMyJob={isMyJob}
                      canClaim={canClaim}
                      disabled={disabled}
                      compact={compact}
                      onToggleJob={() => toggleJobSelection(roleKey, job.id)}
                      onAssignTankPosition={() => handleTankPositionClick(job.id)}
                      onClaimJob={() => handleClaimJob(job.id)}
                      onReleaseJob={handleReleaseJob}
                    />
                  );
                  })}
              </div>
            </div>
          );
        })}
      </CardContent> : null}

      {isExpanded && showHealthSettings ? <div className={compact ? "px-3 pb-3 pt-3" : "px-6 pb-6"}>
        <HealthSettingsSection
          mtMaxHp={mtMaxHp}
          otMaxHp={otMaxHp}
          setMtMaxHp={setMtMaxHp}
          setOtMaxHp={setOtMaxHp}
          persistTankHp={persistTankHp}
          resetTankHpToDefault={resetTankHpToDefault}
          partyMinHp={partyMinHp}
          setPartyMinHp={setPartyMinHp}
          persistPartyMinHp={persistPartyMinHp}
          resetPartyMinHp={resetPartyMinHp}
          mtTankJob={mtTankJob}
          otTankJob={otTankJob}
          healingPotency={healingPotency}
          setHealingPotency={setHealingPotency}
          resetHealingPotency={resetHealingPotency}
          currentBossLevel={currentBossLevel}
          compact={compact}
        />
      </div> : null}
    </Card>
    </PresenceSurface>
  );
}

JobSelector.displayName = 'JobSelector';

export default memo(JobSelector);
