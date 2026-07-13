/**
 * PresenceBar. Shows avatars/initials of users currently viewing the
 * plan. Displays in the plan editor's top bar. Tooltip on hover shows
 * names. When >5 users are online, shows "+N more".
 */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import type { PresenceUser } from '@/lib/use-presence';

const MAX_VISIBLE = 5;

export const PresenceBar = ({ users }: { users: PresenceUser[] }) => {
  if (users.length === 0) return null;

  const visible = users.slice(0, MAX_VISIBLE);
  const extra = users.length - MAX_VISIBLE;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        <Users className="text-muted-foreground size-3" />
        <div className="flex -space-x-1.5">
          {visible.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <Avatar className="ring-background size-6 ring-2">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{user.displayName}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {extra > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="ring-background flex size-6 items-center justify-center rounded-full p-0 font-mono text-[10px] ring-2"
                >
                  +{extra}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{extra} more viewer{extra > 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
