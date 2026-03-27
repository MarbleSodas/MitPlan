import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useCollaboration } from './CollaborationContext';
import {
  applyPresencePatch,
  areCursorPresencesEqual,
  arePresenceStatesEqual,
  areViewportPresencesEqual,
  clearPresence,
  presenceDebouncer,
  setFullPresence,
  setupDisconnectHandler,
  subscribeToPresence,
  updatePresence,
} from '../services/presenceService';
import type {
  CollaborationInteraction,
  CursorPresence,
  PresenceContextValue,
  PresenceTarget,
  PresenceTargetInput,
  TargetPresence,
  UserPresence,
  UserPresenceData,
  ViewportPresence,
} from '../types/presence';
import {
  EMPTY_PRESENCE_DATA,
  PRESENCE_HEARTBEAT_INTERVAL,
  PRESENCE_THROTTLE,
  createPresenceTarget,
  deriveViewportFromTarget,
  getColorFromUserId,
} from '../types/presence';
import {
  COLLABORATION_UNAVAILABLE_MESSAGE,
  getErrorMessage,
  isPermissionDeniedError,
} from '../services/firebaseErrorUtils';

interface PresenceProviderProps {
  children: ReactNode;
  roomId: string | null;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

type RawPresenceEntry = UserPresenceData & { sessionId: string };

function getPresenceUpdateKey(
  roomId: string,
  sessionId: string,
  channel: keyof typeof PRESENCE_THROTTLE
): string {
  return `${roomId}-${sessionId}-${channel}`;
}

function clearQueuedPresenceUpdates(roomId: string, sessionId: string): void {
  (Object.keys(PRESENCE_THROTTLE) as Array<keyof typeof PRESENCE_THROTTLE>).forEach((channel) => {
    presenceDebouncer.clear(getPresenceUpdateKey(roomId, sessionId, channel));
  });
}

function hasStickyPresence(presence: UserPresenceData | null | undefined): boolean {
  if (!presence?.activeTarget) {
    return false;
  }

  return presence.interaction === 'selected' || presence.interaction === 'editing';
}

export const usePresence = (): PresenceContextValue => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};

export const usePresenceOptional = (): PresenceContextValue | null => {
  return useContext(PresenceContext);
};

export const PresenceProvider = ({ children, roomId }: PresenceProviderProps) => {
  const collaboration = useCollaboration() as {
    sessionId: string;
    collaborators: Array<{ sessionId: string; userId: string; displayName: string; color?: string }>;
    isCollaborating: boolean;
    collaborationAvailable?: boolean;
    collaborationError?: string | null;
  };
  const {
    sessionId,
    collaborators,
    isCollaborating,
    collaborationAvailable: sessionCollaborationAvailable = true,
    collaborationError: sessionCollaborationError = null,
  } = collaboration;

  const [rawPresenceMap, setRawPresenceMap] = useState<Map<string, RawPresenceEntry>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [myPresence, setMyPresence] = useState<UserPresenceData>({ ...EMPTY_PRESENCE_DATA });
  const [presenceAvailable, setPresenceAvailable] = useState(true);
  const [presenceError, setPresenceError] = useState<string | null>(null);

  const myPresenceRef = useRef<UserPresenceData>(myPresence);
  const lastPublishedPresenceRef = useRef<UserPresenceData>({ ...EMPTY_PRESENCE_DATA });
  const presenceDisabledRef = useRef(false);
  const loggedPresenceErrorRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    myPresenceRef.current = myPresence;
  }, [myPresence]);

  const collaboratorMap = useMemo(() => {
    const nextMap = new Map<string, { userId: string; displayName: string; color: string }>();

    collaborators.forEach((collaborator) => {
      nextMap.set(collaborator.sessionId, {
        userId: collaborator.userId,
        displayName: collaborator.displayName,
        color: collaborator.color || getColorFromUserId(collaborator.userId),
      });
    });

    return nextMap;
  }, [collaborators]);

  const presenceMap = useMemo(() => {
    const enrichedMap = new Map<string, UserPresence>();

    rawPresenceMap.forEach((presence, presenceSessionId) => {
      const collaboratorInfo = collaboratorMap.get(presenceSessionId);

      if (!collaboratorInfo) {
        return;
      }

      enrichedMap.set(presenceSessionId, {
        ...presence,
        sessionId: presenceSessionId,
        userId: collaboratorInfo.userId,
        displayName: collaboratorInfo.displayName,
        color: collaboratorInfo.color,
      });
    });

    return enrichedMap;
  }, [collaboratorMap, rawPresenceMap]);

  const handlePresenceServiceError = useCallback(
    (error: unknown, stage: string) => {
      const isPermissionError = isPermissionDeniedError(error);
      const nextErrorMessage = isPermissionError
        ? COLLABORATION_UNAVAILABLE_MESSAGE
        : 'Realtime collaboration encountered an unexpected error. Live presence is temporarily disabled.';
      const logMessage = `${stage}:${getErrorMessage(error)}`;

      if (loggedPresenceErrorRef.current !== logMessage) {
        if (isPermissionError) {
          console.warn('[PresenceContext] Collaboration presence disabled:', getErrorMessage(error));
        } else {
          console.error('[PresenceContext] Presence error:', error);
        }
        loggedPresenceErrorRef.current = logMessage;
      }

      if (roomId && sessionId) {
        clearQueuedPresenceUpdates(roomId, sessionId);
      }

      presenceDisabledRef.current = true;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      setPresenceAvailable(false);
      setPresenceError(nextErrorMessage);
      setIsConnected(false);
      setRawPresenceMap(new Map());
    },
    [roomId, sessionId]
  );

  useEffect(() => {
    if (!roomId || !sessionId || !isCollaborating || !sessionCollaborationAvailable) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      setRawPresenceMap(new Map());
      setIsConnected(false);
      setPresenceAvailable(true);
      setPresenceError(null);
      setMyPresence({ ...EMPTY_PRESENCE_DATA });
      myPresenceRef.current = { ...EMPTY_PRESENCE_DATA };
      lastPublishedPresenceRef.current = { ...EMPTY_PRESENCE_DATA };
      presenceDisabledRef.current = false;
      loggedPresenceErrorRef.current = null;
      return;
    }

    let isActive = true;
    let unsubscribe = () => {};

    const initialPresence: UserPresenceData = {
      ...EMPTY_PRESENCE_DATA,
      lastUpdated: Date.now(),
    };

    setRawPresenceMap(new Map());
    setIsConnected(false);
    setPresenceAvailable(true);
    setPresenceError(null);
    setMyPresence(initialPresence);
    myPresenceRef.current = initialPresence;
    lastPublishedPresenceRef.current = initialPresence;
    presenceDisabledRef.current = false;
    loggedPresenceErrorRef.current = null;

    const initializePresence = async () => {
      try {
        await setFullPresence(roomId, sessionId, initialPresence);
        await setupDisconnectHandler(roomId, sessionId);
      } catch (error) {
        if (isActive) {
          handlePresenceServiceError(error, 'initializing');
        }
        return;
      }

      if (!isActive || presenceDisabledRef.current) {
        return;
      }

      unsubscribe = subscribeToPresence(
        roomId,
        (nextRawPresenceMap) => {
          if (!isActive || presenceDisabledRef.current) {
            return;
          }

          setRawPresenceMap(nextRawPresenceMap);
          setIsConnected(true);
        },
        {
          onError: (error) => {
            if (isActive) {
              handlePresenceServiceError(error, 'subscribing');
            }
          },
        }
      );
    };

    void initializePresence();

    return () => {
      isActive = false;
      unsubscribe();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (roomId && sessionId) {
        clearQueuedPresenceUpdates(roomId, sessionId);
        if (!presenceDisabledRef.current) {
          void clearPresence(roomId, sessionId).catch((error) => {
            if (!isPermissionDeniedError(error)) {
              console.error('[PresenceContext] Failed to clear presence during cleanup:', error);
            }
          });
        }
      }
    };
  }, [roomId, sessionId, isCollaborating, sessionCollaborationAvailable, handlePresenceServiceError]);

  const publishPresence = useCallback(
    (
      channel: keyof typeof PRESENCE_THROTTLE,
      options: { force?: boolean } = {}
    ) => {
      if (!roomId || !sessionId || presenceDisabledRef.current || !sessionCollaborationAvailable) {
        return;
      }

      const updateKey = getPresenceUpdateKey(roomId, sessionId, channel);
      const delay = PRESENCE_THROTTLE[channel];
      const shouldForcePublish = options.force === true;

      presenceDebouncer.debounce(updateKey, () => {
        const latestPresence = {
          ...myPresenceRef.current,
          lastUpdated: Date.now(),
        };

        if (!shouldForcePublish && arePresenceStatesEqual(lastPublishedPresenceRef.current, latestPresence)) {
          return;
        }

        lastPublishedPresenceRef.current = latestPresence;
        void updatePresence(roomId, sessionId, latestPresence).catch((error) => {
          handlePresenceServiceError(error, 'publishing');
        });
      }, delay);
    },
    [roomId, sessionId, sessionCollaborationAvailable, handlePresenceServiceError]
  );

  useEffect(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (
      !roomId ||
      !sessionId ||
      !isCollaborating ||
      !sessionCollaborationAvailable ||
      presenceDisabledRef.current ||
      !hasStickyPresence(myPresence)
    ) {
      return undefined;
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (presenceDisabledRef.current || !hasStickyPresence(myPresenceRef.current)) {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        return;
      }

      publishPresence('activity', { force: true });
    }, PRESENCE_HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [
    isCollaborating,
    myPresence,
    publishPresence,
    roomId,
    sessionCollaborationAvailable,
    sessionId,
  ]);

  const updateMyPresence = useCallback(
    (patch: Partial<UserPresenceData>, channel: keyof typeof PRESENCE_THROTTLE) => {
      if (presenceDisabledRef.current || !sessionCollaborationAvailable) {
        return;
      }

      const currentPresence = myPresenceRef.current;
      const nextPresence = applyPresencePatch(currentPresence, patch);

      if (arePresenceStatesEqual(currentPresence, nextPresence)) {
        return;
      }

      setMyPresence(nextPresence);
      myPresenceRef.current = nextPresence;
      publishPresence(channel);
    },
    [publishPresence]
  );

  const setActiveTarget = useCallback(
    (target: PresenceTargetInput | PresenceTarget | null) => {
      const normalizedTarget = target ? createPresenceTarget(target) : null;
      const currentTarget = myPresenceRef.current.activeTarget;
      const currentViewport = myPresenceRef.current.viewport;
      const nextViewport =
        normalizedTarget
          ? {
              ...(currentViewport || deriveViewportFromTarget(normalizedTarget)),
              ...deriveViewportFromTarget(normalizedTarget),
              scrollTop: currentViewport?.scrollTop ?? null,
            }
          : currentViewport;

      updateMyPresence(
        {
          activeTarget: normalizedTarget,
          viewport: nextViewport,
        },
        'activity'
      );
    },
    [updateMyPresence]
  );

  const setInteraction = useCallback(
    (interaction: CollaborationInteraction | null) => {
      if (myPresenceRef.current.interaction === interaction) {
        return;
      }

      updateMyPresence({ interaction }, 'activity');
    },
    [updateMyPresence]
  );

  const setCursor = useCallback(
    (cursor: CursorPresence | null) => {
      if (areCursorPresencesEqual(myPresenceRef.current.cursor, cursor)) {
        return;
      }

      updateMyPresence({ cursor }, 'cursor');
    },
    [updateMyPresence]
  );

  const setViewport = useCallback(
    (viewport: ViewportPresence | null) => {
      if (areViewportPresencesEqual(myPresenceRef.current.viewport, viewport)) {
        return;
      }

      updateMyPresence({ viewport }, 'viewport');
    },
    [updateMyPresence]
  );

  const getPresenceForTarget = useCallback(
    (targetKey: string): TargetPresence[] => {
      const matches: TargetPresence[] = [];

      presenceMap.forEach((presence, presenceSessionId) => {
        if (presence.activeTarget?.key !== targetKey) {
          return;
        }

        matches.push({
          sessionId: presenceSessionId,
          userId: presence.userId,
          displayName: presence.displayName,
          color: presence.color,
          isCurrentUser: presenceSessionId === sessionId,
          interaction: presence.interaction,
          target: presence.activeTarget,
        });
      });

      matches.sort((a, b) => {
        if (a.isCurrentUser) {
          return -1;
        }
        if (b.isCurrentUser) {
          return 1;
        }
        if (a.interaction === 'editing' && b.interaction !== 'editing') {
          return -1;
        }
        if (b.interaction === 'editing' && a.interaction !== 'editing') {
          return 1;
        }
        return a.displayName.localeCompare(b.displayName);
      });

      return matches;
    },
    [presenceMap, sessionId]
  );

  const isTargetActiveByOthers = useCallback(
    (targetKey: string, interaction?: CollaborationInteraction): boolean => {
      for (const [presenceSessionId, presence] of presenceMap) {
        if (presenceSessionId === sessionId) {
          continue;
        }

        if (presence.activeTarget?.key !== targetKey) {
          continue;
        }

        if (!interaction || presence.interaction === interaction) {
          return true;
        }
      }

      return false;
    },
    [presenceMap, sessionId]
  );

  const getMyPresence = useCallback((): UserPresenceData | null => {
    return myPresenceRef.current;
  }, []);

  const collaborationAvailable = sessionCollaborationAvailable && presenceAvailable;
  const collaborationError = sessionCollaborationError || presenceError;

  const value = useMemo<PresenceContextValue>(
    () => ({
      presenceMap,
      isConnected: collaborationAvailable ? isConnected : false,
      collaborationAvailable,
      collaborationError,
      currentSessionId: sessionId,
      setActiveTarget,
      setInteraction,
      setCursor,
      setViewport,
      getPresenceForTarget,
      isTargetActiveByOthers,
      getMyPresence,
    }),
    [
      presenceMap,
      isConnected,
      collaborationAvailable,
      collaborationError,
      sessionId,
      setActiveTarget,
      setInteraction,
      setCursor,
      setViewport,
      getPresenceForTarget,
      isTargetActiveByOthers,
      getMyPresence,
    ]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};

export default PresenceContext;
