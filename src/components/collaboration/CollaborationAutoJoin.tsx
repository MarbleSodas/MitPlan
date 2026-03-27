import { useEffect, useRef } from 'react';
import { useCollaboration } from '../../contexts/CollaborationContext';

interface CollaborationAutoJoinProps {
  roomId: string | null;
  enabled?: boolean;
}

const CollaborationAutoJoin = ({
  roomId,
  enabled = true,
}: CollaborationAutoJoinProps) => {
  const {
    joinCollaborativeSession,
    leaveCollaborativeSession,
    displayName,
    isInitialized,
  } = useCollaboration() as {
    joinCollaborativeSession?: (roomId: string, displayName?: string) => Promise<boolean>;
    leaveCollaborativeSession?: () => Promise<void>;
    displayName?: string;
    isInitialized?: boolean;
  };
  const joinedRoomRef = useRef<string | null>(null);
  const displayNameRef = useRef(displayName);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    const nextRoomId = enabled && roomId && isInitialized ? roomId : null;

    if (!nextRoomId) {
      if (joinedRoomRef.current && typeof leaveCollaborativeSession === 'function') {
        joinedRoomRef.current = null;
        void leaveCollaborativeSession();
      }
      return;
    }

    if (typeof joinCollaborativeSession !== 'function') {
      return;
    }

    if (joinedRoomRef.current === nextRoomId) {
      return;
    }

    joinedRoomRef.current = nextRoomId;
    void joinCollaborativeSession(nextRoomId, displayNameRef.current).then((didJoin) => {
      if (!didJoin && joinedRoomRef.current === nextRoomId) {
        joinedRoomRef.current = null;
      }
    });
  }, [
    enabled,
    isInitialized,
    joinCollaborativeSession,
    leaveCollaborativeSession,
    roomId,
  ]);

  return null;
};

export default CollaborationAutoJoin;
