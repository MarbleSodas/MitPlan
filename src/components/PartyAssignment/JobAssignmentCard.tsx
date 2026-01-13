import React, { useState, useEffect, useRef } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Job, UserJobAssignment } from '../../types';

interface JobAssignmentCardProps {
  job: Job;
  assignment: UserJobAssignment | null;
  isMyJob: boolean;
  canClaim: boolean;
  onClaim: () => void;
  onRelease: () => void;
  compact?: boolean;
}

const JobAssignmentCard = ({
  job,
  assignment,
  isMyJob,
  canClaim,
  onClaim,
  onRelease,
  compact = false
}: JobAssignmentCardProps) => {
  const [isClaimingAnimation, setIsClaimingAnimation] = useState(false);
  const [showClaimedAnimation, setShowClaimedAnimation] = useState(false);
  const prevAssignmentRef = useRef<UserJobAssignment | null>(null);
  const hasAssignment = !!assignment;
  
  useEffect(() => {
    if (assignment && !prevAssignmentRef.current) {
      setShowClaimedAnimation(true);
      setIsClaimingAnimation(false);
      const timer = setTimeout(() => setShowClaimedAnimation(false), 600);
      return () => clearTimeout(timer);
    }
    prevAssignmentRef.current = assignment;
  }, [assignment]);
  
  const handleClaim = async () => {
    setIsClaimingAnimation(true);
    try {
      await onClaim();
    } finally {
      setTimeout(() => setIsClaimingAnimation(false), 500);
    }
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
    <div
      className={cn(
        "flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-300 bg-card relative overflow-hidden",
        compact ? "min-w-[70px] gap-1" : "min-w-[90px] gap-2",
        !hasAssignment && "border-border hover:border-primary/50 hover:bg-muted/30",
        !canClaim && !isMyJob && hasAssignment && "opacity-80",
        isClaimingAnimation && "scale-[1.02] opacity-80",
        showClaimedAnimation && "animate-pulse"
      )}
      style={getBorderStyle()}
    >
      {isMyJob && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundColor: assignment?.color }}
        />
      )}
      
      <div className={cn(
        "flex items-center justify-center transition-transform duration-300 relative z-10",
        compact ? "w-8 h-8" : "w-10 h-10",
        isClaimingAnimation && "scale-110"
      )}>
        {typeof job.icon === 'string' && job.icon.startsWith('/') ? (
          <img 
            src={job.icon} 
            alt={job.name} 
            className={cn(
              "object-contain transition-all duration-300",
              compact ? "max-h-8 max-w-8" : "max-h-10 max-w-10",
              hasAssignment && "drop-shadow-sm"
            )} 
          />
        ) : (
          job.icon
        )}
      </div>
      
      <span className={cn(
        "font-semibold text-center relative z-10",
        compact ? "text-[10px]" : "text-xs",
        isMyJob && "text-foreground"
      )}>
        {job.id}
      </span>
      
      {hasAssignment && assignment ? (
        <div className={cn(
          "flex flex-col items-center gap-1 w-full relative z-10",
          showClaimedAnimation && "animate-in slide-in-from-bottom-2 duration-300"
        )}>
          <div className="flex items-center gap-1 w-full justify-center">
            <div 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300",
                isMyJob ? "bg-background/80 shadow-sm" : "bg-muted/50"
              )}
              style={isMyJob ? { borderColor: assignment.color, borderWidth: '1px', borderStyle: 'solid' } : undefined}
              title={`${assignment.displayName}${isMyJob ? ' (You)' : ''}`}
            >
              <span
                className={cn(
                  "rounded-full shrink-0 ring-1 ring-white/30 transition-all duration-300",
                  compact ? "w-2 h-2" : "w-2.5 h-2.5",
                  showClaimedAnimation && "scale-125"
                )}
                style={{ backgroundColor: assignment.color }}
              />
              <span className={cn(
                "font-medium truncate transition-colors duration-300",
                compact ? "text-[9px] max-w-[50px]" : "text-[10px] max-w-[60px]",
                isMyJob ? "text-foreground" : "text-muted-foreground"
              )}>
                {assignment.displayName}
              </span>
              {isMyJob && (
                <span className={cn(
                  "text-primary font-bold",
                  compact ? "text-[8px]" : "text-[9px]"
                )}>
                  ★
                </span>
              )}
            </div>
            {isMyJob && (
              <button
                onClick={onRelease}
                className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                title="Release job"
              >
                <XCircle className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <Button
          variant={canClaim ? "default" : "outline"}
          size="sm"
          onClick={handleClaim}
          disabled={!canClaim || isClaimingAnimation}
          className={cn(
            "transition-all duration-200 relative z-10",
            compact ? "h-5 text-[9px] px-2" : "h-6 text-[10px] px-2",
            canClaim && !isClaimingAnimation && "hover:scale-105",
            isClaimingAnimation && "opacity-70"
          )}
        >
          {isClaimingAnimation ? (
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
};

export default JobAssignmentCard;
