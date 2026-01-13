import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useCollaboration } from './CollaborationContext';
import {
  updatePresence,
  setFullPresence,
  clearPresence,
  setupDisconnectHandler,
  subscribeToPresence,
  createPresenceUpdate,
  getElementIdFromPresence,
  presenceDebouncer
} from '../services/presenceService';
import type {
  UserPresence,
  UserPresenceData,
  ElementType,
  ElementSelection,
  PresenceContextValue
} from '../types/presence';
import {
  EMPTY_PRESENCE_DATA,
  PRESENCE_DEBOUNCE,
  getColorFromUserId
} from '../types/presence';

interface PresenceProviderProps {
  children: ReactNode;
  planId: string | null;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

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

export const PresenceProvider = ({ children, planId }: PresenceProviderProps) => {
  const collaboration = useCollaboration() as {
    sessionId: string;
    collaborators: Array<{ sessionId: string; userId: string; displayName: string; color?: string }>;
    isCollaborating: boolean;
    displayName: string;
  };
  const { sessionId, collaborators, isCollaborating, displayName } = collaboration;
  
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [myPresence, setMyPresence] = useState<UserPresenceData>({ ...EMPTY_PRESENCE_DATA });
  
  const myPresenceRef = useRef<UserPresenceData>(myPresence);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    myPresenceRef.current = myPresence;
  }, [myPresence]);

  useEffect(() => {
    if (!planId || !sessionId || !isCollaborating) {
      setIsConnected(false);
      return;
    }

    const initialPresence: UserPresenceData = {
      ...EMPTY_PRESENCE_DATA,
      lastUpdated: Date.now()
    };
    
    setFullPresence(planId, sessionId, initialPresence);
    setupDisconnectHandler(planId, sessionId);
    setMyPresence(initialPresence);

    const collaboratorMap = new Map<string, { userId: string; displayName: string; color: string }>();
    collaborators.forEach((collab) => {
      collaboratorMap.set(collab.sessionId, {
        userId: collab.userId,
        displayName: collab.displayName,
        color: collab.color || getColorFromUserId(collab.userId)
      });
    });

    unsubscribeRef.current = subscribeToPresence(planId, (rawPresenceMap) => {
      const enrichedMap = new Map<string, UserPresence>();
      
      rawPresenceMap.forEach((presence, presenceSessionId) => {
        const collaboratorInfo = collaboratorMap.get(presenceSessionId);
        
        if (collaboratorInfo) {
          enrichedMap.set(presenceSessionId, {
            ...presence,
            sessionId: presenceSessionId,
            userId: collaboratorInfo.userId,
            displayName: collaboratorInfo.displayName,
            color: collaboratorInfo.color
          });
        }
      });
      
      setPresenceMap(enrichedMap);
      setIsConnected(true);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      presenceDebouncer.clearAll();
      if (planId && sessionId) {
        clearPresence(planId, sessionId);
      }
    };
  }, [planId, sessionId, isCollaborating, collaborators]);

  const updateMySelection = useCallback((type: ElementType, elementId: string | null) => {
    if (!planId || !sessionId) return;

    const newPresence = createPresenceUpdate(type, elementId, myPresenceRef.current);
    setMyPresence(newPresence);
    myPresenceRef.current = newPresence;

    const debounceTime = PRESENCE_DEBOUNCE[type];
    const updateKey = `${planId}-${sessionId}-${type}`;

    presenceDebouncer.debounce(updateKey, () => {
      updatePresence(planId, sessionId, newPresence);
    }, debounceTime);
  }, [planId, sessionId]);

  const getSelectionsForElement = useCallback((type: ElementType, elementId: string): ElementSelection[] => {
    const selections: ElementSelection[] = [];
    
    presenceMap.forEach((presence, presenceSessionId) => {
      const selectedId = getElementIdFromPresence(presence, type);
      
      if (selectedId === elementId) {
        selections.push({
          sessionId: presenceSessionId,
          userId: presence.userId,
          displayName: presence.displayName,
          color: presence.color,
          isCurrentUser: presenceSessionId === sessionId
        });
      }
    });

    selections.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    return selections;
  }, [presenceMap, sessionId]);

  const isElementSelectedByOthers = useCallback((type: ElementType, elementId: string): boolean => {
    for (const [presenceSessionId, presence] of presenceMap) {
      if (presenceSessionId === sessionId) continue;
      
      const selectedId = getElementIdFromPresence(presence, type);
      if (selectedId === elementId) {
        return true;
      }
    }
    return false;
  }, [presenceMap, sessionId]);

  const getMyPresence = useCallback((): UserPresenceData | null => {
    return myPresenceRef.current;
  }, []);

  const value = useMemo<PresenceContextValue>(() => ({
    presenceMap,
    isConnected,
    currentSessionId: sessionId,
    updateMySelection,
    getSelectionsForElement,
    isElementSelectedByOthers,
    getMyPresence
  }), [
    presenceMap,
    isConnected,
    sessionId,
    updateMySelection,
    getSelectionsForElement,
    isElementSelectedByOthers,
    getMyPresence
  ]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};

export default PresenceContext;
