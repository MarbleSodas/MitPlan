/**
 * useFullscreen Hook
 * 
 * Manages fullscreen overlay state with animations.
 */

import { useState, useCallback, useEffect } from 'react';

interface UseFullscreenReturn {
  /** Whether the fullscreen overlay is mounted in the DOM */
  isMounted: boolean;
  /** Whether the fullscreen overlay is visible (after animation) */
  isOpen: boolean;
  /** Open the fullscreen overlay */
  openFullscreen: () => void;
  /** Close the fullscreen overlay */
  closeFullscreen: () => void;
}

const ANIMATION_DURATION_MS = 300;

export const useFullscreen = (): UseFullscreenReturn => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const openFullscreen = useCallback(() => {
    if (isMounted) return;
    
    setIsMounted(true);
    // Next frame to allow transition from opacity-0 to 100
    requestAnimationFrame(() => setIsOpen(true));
  }, [isMounted]);

  const closeFullscreen = useCallback(() => {
    setIsOpen(false);
    // Unmount after transition ends
    setTimeout(() => setIsMounted(false), ANIMATION_DURATION_MS);
  }, []);

  // ESC key to exit
  useEffect(() => {
    if (!isMounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMounted, closeFullscreen]);

  // Lock page scroll when mounted
  useEffect(() => {
    if (!isMounted) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMounted]);

  return {
    isMounted,
    isOpen,
    openFullscreen,
    closeFullscreen,
  };
};

export default useFullscreen;
