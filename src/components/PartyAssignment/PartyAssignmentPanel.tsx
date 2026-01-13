import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, XCircle } from 'lucide-react';
import { useTankPositionContext } from '../../contexts/TankPositionContext';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeBossContext } from '../../contexts/RealtimeBossContext';
import { useRealtimeJobContext } from '../../contexts/RealtimeJobContext';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { useUserJobAssignmentOptional } from '../../contexts/UserJobAssignmentContext';
import { baseHealthValues } from '../../data/bosses/bossData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import SelectionBorder from '../collaboration/SelectionBorder';
import JobAssignmentCard from './JobAssignmentCard';
import type { Job, JobId, Role, UserJobAssignment } from '../../types';

const PartyAssignmentPanel = () => {
  const {
    tankPositions,
    assignTankPosition,
    selectedTankJobs,
  } = useTankPositionContext();

  const { realtimePlan, batchUpdateRealtime } = useRealtimePlan();
  const { currentBossLevel } = useRealtimeBossContext();
  const { selectedJobs } = useRealtimeJobContext();
  const presence = usePresenceOptional();
  const jobAssignment = useUserJobAssignmentOptional();

  const [claimingJobId, setClaimingJobId] = useState<JobId | null>(null);

  const handleTankPositionHover = useCallback((position: string) => {
    if (presence) {
      presence.updateMySelection('tankPosition', position);
    }
  }, [presence]);

  const handleTankPositionLeave = useCallback(() => {
    if (presence) {
      presence.updateMySelection('tankPosition', null);
    }
  }, [presence]);

  const defaultTankHp = baseHealthValues[currentBossLevel]?.tank || baseHealthValues[100].tank;
  const existingMainHp = realtimePlan?.healthSettings?.tankMaxHealth?.mainTank;
  const existingOffHp = realtimePlan?.healthSettings?.tankMaxHealth?.offTank;

  const [mtMaxHp, setMtMaxHp] = useState(existingMainHp || defaultTankHp);
  const [otMaxHp, setOtMaxHp] = useState(existingOffHp || defaultTankHp);

  useEffect(() => {
    if (!existingMainHp) setMtMaxHp(defaultTankHp);
    if (!existingOffHp) setOtMaxHp(defaultTankHp);
  }, [currentBossLevel, existingMainHp, existingOffHp, defaultTankHp]);

  const persistTankHp = (key: string, value: number) => {
    const safe = Math.max(1, Number(value) || 0);
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
  };

  const resetTankHpToDefault = (key: string) => {
    const value = defaultTankHp;
    if (key === 'mainTank') {
      setMtMaxHp(value);
    } else {
      setOtMaxHp(value);
    }
    persistTankHp(key, value);
  };

  const getSelectedJobsForRole = (role: Role): Job[] => {
    const roleJobs = selectedJobs?.[role];
    if (!Array.isArray(roleJobs)) return [];
    
    return roleJobs.filter((job): job is Job => {
      if (typeof job === 'string') return false;
      return job?.selected === true;
    });
  };

  const nonTankRoles: Role[] = ['healer', 'melee', 'ranged', 'caster'];
  const hasNonTankJobs = nonTankRoles.some(role => getSelectedJobsForRole(role).length > 0);

  const handleClaimJob = async (jobId: JobId) => {
    if (jobAssignment) {
      setClaimingJobId(jobId);
      try {
        await jobAssignment.claimJob(jobId);
      } finally {
        setTimeout(() => setClaimingJobId(null), 300);
      }
    }
  };

  const handleReleaseJob = async () => {
    if (jobAssignment) {
      await jobAssignment.releaseJob();
    }
  };

  const renderTankCard = (title: string, roleKey: 'mainTank' | 'offTank') => (
    <SelectionBorder
      elementType="tankPosition"
      elementId={roleKey}
      showIndicator={true}
      indicatorPosition="top-right"
      className="rounded-lg"
    >
      <Card className="shadow-sm bg-card border border-border">
        <div
          className="p-4 flex flex-col items-center"
          onMouseEnter={() => handleTankPositionHover(roleKey)}
          onMouseLeave={handleTankPositionLeave}
        >
          <h4 className="m-0 mb-2 text-center font-medium text-foreground">{title}</h4>
          <div className="w-full flex items-center justify-center">
            <div className="flex flex-wrap justify-center gap-3">
              {selectedTankJobs.map((tank: Job) => {
                const selected = tankPositions[roleKey] === tank.id;
                const assignedToOther = tankPositions[roleKey === 'mainTank' ? 'offTank' : 'mainTank'] === tank.id;
                const assignment: UserJobAssignment | null = jobAssignment?.jobAssignments[tank.id] || null;
                const isMyJob = jobAssignment?.isJobClaimedByMe(tank.id) || false;
                const canClaim = jobAssignment?.canClaimJob(tank.id) || false;
                const isClaiming = claimingJobId === tank.id;
                
                return (
                  <div
                    key={`${roleKey}-${tank.id}`}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg w-24 transition-all duration-300 cursor-pointer border-2 relative overflow-hidden",
                        selected 
                          ? "bg-primary/15 border-primary shadow-sm" 
                          : assignedToOther
                            ? "bg-muted/50 border-muted-foreground/30 hover:border-primary/50"
                            : "bg-background border-border hover:border-primary/50 hover:bg-muted/30",
                        isClaiming && "scale-[1.02] opacity-80"
                      )}
                      style={assignment ? { 
                        borderColor: isMyJob ? assignment.color : undefined,
                        boxShadow: isMyJob ? `0 0 0 1px ${assignment.color}33` : undefined
                      } : undefined}
                      onClick={() => assignTankPosition(tank.id, roleKey)}
                      title={assignedToOther ? `Click to swap ${tank.name} to ${title}` : `Assign ${tank.name} as ${title}`}
                    >
                      {isMyJob && assignment && (
                        <div 
                          className="absolute inset-0 opacity-10 pointer-events-none"
                          style={{ backgroundColor: assignment.color }}
                        />
                      )}
                      
                      <div className={cn(
                        "w-12 h-12 mb-1 flex items-center justify-center transition-transform duration-300 relative z-10",
                        isClaiming && "scale-110"
                      )}>
                        {typeof tank.icon === 'string' && tank.icon.startsWith('/') ? (
                          <img src={tank.icon} alt={tank.name} className="max-h-12 max-w-12 object-contain" />
                        ) : (
                          tank.icon
                        )}
                      </div>
                      <div className={cn(
                        "text-center text-sm font-medium relative z-10 transition-colors duration-300",
                        selected ? "text-primary" : isMyJob ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {tank.name}
                      </div>
                    </div>
                    
                    {assignment ? (
                      <div className={cn(
                        "flex flex-col items-center gap-1 w-full",
                        "animate-in slide-in-from-bottom-1 duration-300"
                      )}>
                      <div className="flex items-center gap-1 w-full justify-center">
                        <div 
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300",
                            isMyJob ? "bg-background shadow-sm" : "bg-muted/50"
                          )}
                          style={isMyJob ? { 
                            borderColor: assignment.color, 
                            borderWidth: '1px', 
                            borderStyle: 'solid' 
                          } : undefined}
                          title={`${assignment.displayName}${isMyJob ? ' (You)' : ''}`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30"
                            style={{ backgroundColor: assignment.color }}
                          />
                          <span className={cn(
                            "text-[10px] font-medium truncate max-w-[55px]",
                            isMyJob ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {assignment.displayName}
                          </span>
                          {isMyJob && (
                            <span className="text-[9px] text-primary font-bold">★</span>
                          )}
                        </div>
                        {isMyJob && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReleaseJob();
                            }}
                            className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                            title="Release job"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    ) : (
                      <Button
                        variant={canClaim ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimJob(tank.id);
                        }}
                        disabled={!canClaim || isClaiming}
                        className={cn(
                          "h-6 text-[10px] px-3 transition-all duration-200",
                          canClaim && !isClaiming && "hover:scale-105"
                        )}
                      >
                        {isClaiming ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            Claiming
                          </span>
                        ) : (
                          "Claim"
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </SelectionBorder>
  );

  const renderNonTankJobAssignments = () => {
    if (!hasNonTankJobs || !jobAssignment) return null;

    return (
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Party Assignments</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {nonTankRoles.map(role => {
            const jobs = getSelectedJobsForRole(role);
            if (jobs.length === 0) return null;

            const roleLabels: Record<Role, string> = {
              tank: 'Tanks',
              healer: 'Healers',
              melee: 'Melee',
              ranged: 'Ranged',
              caster: 'Casters'
            };

            return (
              <div key={role} className="flex flex-col gap-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {roleLabels[role]}
                </span>
                <div className="flex flex-wrap gap-2">
                  {jobs.map(job => {
                    const assignment: UserJobAssignment | null = jobAssignment.jobAssignments[job.id] || null;
                    const isMyJob = jobAssignment.isJobClaimedByMe(job.id);
                    const canClaim = jobAssignment.canClaimJob(job.id);

                    return (
                      <JobAssignmentCard
                        key={job.id}
                        job={job}
                        assignment={assignment}
                        isMyJob={isMyJob}
                        canClaim={canClaim}
                        onClaim={() => handleClaimJob(job.id)}
                        onRelease={handleReleaseJob}
                        compact
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (selectedTankJobs.length === 0 && !hasNonTankJobs) return null;

  return (
    <Card className="mb-5 bg-card border-border">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-lg font-semibold text-foreground">Party Setup</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {selectedTankJobs.length === 2 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderTankCard('Main Tank (MT)', 'mainTank')}
              {renderTankCard('Off Tank (OT)', 'offTank')}
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 place-items-center">
              <div className="flex items-center gap-2 justify-center w-full">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap w-20 text-right">MT Max HP</span>
                <Input
                  type="number"
                  variant="compact"
                  min={1}
                  step={100}
                  value={mtMaxHp}
                  onChange={(e) => setMtMaxHp(Number(e.target.value))}
                  onBlur={() => persistTankHp('mainTank', mtMaxHp)}
                  aria-label="Main Tank max HP"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => resetTankHpToDefault('mainTank')}
                  title="Reset to default"
                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-center w-full">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap w-20 text-right">OT Max HP</span>
                <Input
                  type="number"
                  variant="compact"
                  min={1}
                  step={100}
                  value={otMaxHp}
                  onChange={(e) => setOtMaxHp(Number(e.target.value))}
                  onBlur={() => persistTankHp('offTank', otMaxHp)}
                  aria-label="Off Tank max HP"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => resetTankHpToDefault('offTank')}
                  title="Reset to default"
                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
          </>
        )}

        {renderNonTankJobAssignments()}
      </CardContent>
    </Card>
  );
};

export default PartyAssignmentPanel;
