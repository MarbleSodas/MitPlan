/**
 * useSplitPane Hook
 * 
 * Manages split pane state and resize functionality.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSplitPaneOptions {
  /** The plan ID used for session storage key */
  planId?: string;
  /** Default split ratio (0-1), default 0.66 */
  defaultRatio?: number;
  /** Minimum ratio (0-1), default 0.4 */
  minRatio?: number;
  /** Maximum ratio (0-1), default 0.8 */
  maxRatio?: number;
}

interface UseSplitPaneReturn {
  /** Current split ratio (0-1) */
  splitRatio: number;
  /** Timeline width as percentage */
  timelinePercent: number;
  /** Mitigation panel width as percentage */
  mitigationPercent: number;
  /** Ref to attach to the split container */
  splitContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Mouse down handler for the resizer */
  onResizerMouseDown: (e: React.MouseEvent) => void;
}

export const useSplitPane = (options: UseSplitPaneOptions = {}): UseSplitPaneReturn => {
  const {
    planId,
    defaultRatio = 0.66,
    minRatio = 0.4,
    maxRatio = 0.8,
  } = options;

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startRatioRef = useRef(defaultRatio);

  const storageKey = `plannerSplitRatio:${planId || 'default'}`;

  const [splitRatio, setSplitRatio] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      const parsed = stored ? parseFloat(stored) : NaN;
      return Number.isFinite(parsed) ? Math.min(maxRatio, Math.max(minRatio, parsed)) : defaultRatio;
    } catch {
      return defaultRatio;
    }
  });

  // Persist split ratio to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, String(splitRatio));
    } catch {
      // Ignore sessionStorage errors (e.g., privacy mode)
    }
  }, [splitRatio, storageKey]);

  const onResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!splitContainerRef.current) return;
    
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startRatioRef.current = splitRatio;

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !splitContainerRef.current) return;
      
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (!rect.width) return;
      
      const delta = (ev.clientX - startXRef.current) / rect.width;
      let next = startRatioRef.current + delta;
      next = Math.max(minRatio, Math.min(maxRatio, next));
      setSplitRatio(next);
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [splitRatio, minRatio, maxRatio]);

  return {
    splitRatio,
    timelinePercent: Math.round(splitRatio * 100),
    mitigationPercent: 100 - Math.round(splitRatio * 100),
    splitContainerRef,
    onResizerMouseDown,
  };
};

export default useSplitPane;
