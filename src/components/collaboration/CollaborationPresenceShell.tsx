import type { ReactNode } from 'react';
import { CollaborationProvider } from '../../contexts/CollaborationContext';
import { PresenceProvider } from '../../contexts/PresenceContext';
import CollaborationAutoJoin from './CollaborationAutoJoin';

interface CollaborationPresenceShellProps {
  children: ReactNode;
  roomId: string | null;
  enabled?: boolean;
}

const CollaborationPresenceShell = ({
  children,
  roomId,
  enabled = true,
}: CollaborationPresenceShellProps) => {
  const isActive = enabled && Boolean(roomId);

  return (
    <CollaborationProvider enabled={isActive}>
      {isActive && roomId ? (
        <PresenceProvider roomId={roomId}>
          <CollaborationAutoJoin roomId={roomId} enabled={isActive} />
          {children}
        </PresenceProvider>
      ) : (
        children
      )}
    </CollaborationProvider>
  );
};

export default CollaborationPresenceShell;
