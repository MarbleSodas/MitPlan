import React, { useRef, useCallback } from 'react';
import { useRealtimeJobContext } from '../../../contexts/RealtimeJobContext';
import { usePresenceOptional } from '../../../contexts/PresenceContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import SelectionBorder from '../../../components/collaboration/SelectionBorder';

const ROLE_CONFIG = {
  tank: { color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-600 dark:border-blue-400', bg: 'bg-blue-600/10 dark:bg-blue-400/10', icon: '🛡️', label: 'Tanks' },
  healer: { color: 'text-green-600 dark:text-green-400', border: 'border-green-600 dark:border-green-400', bg: 'bg-green-600/10 dark:bg-green-400/10', icon: '💉', label: 'Healers' },
  melee: { color: 'text-red-600 dark:text-red-400', border: 'border-red-600 dark:border-red-400', bg: 'bg-red-600/10 dark:bg-red-400/10', icon: '🗡️', label: 'Melee DPS' },
  ranged: { color: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-600 dark:border-zinc-400', bg: 'bg-zinc-600/10 dark:bg-zinc-400/10', icon: '🏹', label: 'Phys Ranged' },
  caster: { color: 'text-purple-600 dark:text-purple-400', border: 'border-purple-600 dark:border-purple-400', bg: 'bg-purple-600/10 dark:bg-purple-400/10', icon: '🔮', label: 'Magic Ranged' }
};

function JobSelector({ disabled = false }) {
  const { selectedJobs: jobs, toggleJobSelection: contextToggleJobSelection } = useRealtimeJobContext();
  const presence = usePresenceOptional();
  const lastClickTimeRef = useRef(new Map());

  const toggleJobSelection = (roleKey, jobId) => {
    if (disabled) return;
    const clickKey = `${roleKey}-${jobId}`;
    const now = Date.now();
    const lastClickTime = lastClickTimeRef.current.get(clickKey) || 0;
    if (now - lastClickTime < 200) return;
    lastClickTimeRef.current.set(clickKey, now);
    contextToggleJobSelection(roleKey, jobId);
  };

  const handleJobHover = useCallback((jobId) => {
    if (presence) {
      presence.updateMySelection('job', jobId);
    }
  }, [presence]);

  const handleJobLeave = useCallback(() => {
    if (presence) {
      presence.updateMySelection('job', null);
    }
  }, [presence]);

  return (
    <Card className="mb-5 bg-card">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-lg font-semibold text-foreground">
          Select FFXIV Jobs
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid gap-4 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {Object.entries(jobs).map(([roleKey, roleJobs]) => {
          const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG.tank;
          
          return (
            <div
              key={roleKey}
              className="rounded-lg shadow-sm p-4 bg-card border border-border"
            >
              <div className={cn("flex items-center mb-4 pb-2 border-b-2", config.border)}>
                <div className={cn("mr-4 text-2xl w-10 h-10 flex items-center justify-center rounded-full", config.bg, config.color)}>
                  {config.icon}
                </div>
                <h4 className={cn("m-0 font-bold text-lg", config.color)}>
                  {config.label}
                </h4>
              </div>

              <div className="grid gap-3 grid-cols-2">
                {roleJobs.map(job => (
                  <SelectionBorder
                    key={job.id}
                    elementType="job"
                    elementId={job.id}
                    showIndicator={true}
                    indicatorPosition="top-right"
                    className="rounded-md"
                  >
                    <div
                      onClick={() => toggleJobSelection(roleKey, job.id)}
                      onMouseEnter={() => handleJobHover(job.id)}
                      onMouseLeave={handleJobLeave}
                      className={cn(
                        "flex flex-col items-center justify-center text-center rounded-md transition-all duration-200 px-2.5 py-2 min-h-[90px] w-full border-2 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm",
                        disabled && "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-none",
                        job.selected 
                          ? "border-primary bg-primary/10" 
                          : "border-border bg-background hover:border-primary/50"
                      )}
                    >
                      <div className="mb-1.5 h-12 flex items-center justify-center">
                        {typeof job.icon === 'string' && job.icon.startsWith('/') ? (
                          <img src={job.icon} alt={job.name} className="max-h-12 max-w-12" />
                        ) : (
                          job.icon
                        )}
                      </div>
                      <div className={cn("text-sm mt-1", job.selected ? "font-bold text-foreground" : "font-normal text-muted-foreground")}>
                        {job.name}
                      </div>
                    </div>
                  </SelectionBorder>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default JobSelector;
