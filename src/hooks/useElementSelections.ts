import { useMemo } from 'react';
import { usePresenceOptional } from '../contexts/PresenceContext';
import type { ElementType, ElementSelection } from '../types/presence';
import { getInitials } from '../types/presence';

interface UseElementSelectionsResult {
  selections: ElementSelection[];
  otherSelections: ElementSelection[];
  isSelectedByOthers: boolean;
  isSelectedBySelf: boolean;
  primaryColor: string | null;
  allColors: string[];
}

export function useElementSelections(
  elementType: ElementType,
  elementId: string | null
): UseElementSelectionsResult {
  const presence = usePresenceOptional();

  return useMemo(() => {
    if (!presence || !elementId) {
      return {
        selections: [],
        otherSelections: [],
        isSelectedByOthers: false,
        isSelectedBySelf: false,
        primaryColor: null,
        allColors: []
      };
    }

    const selections = presence.getSelectionsForElement(elementType, elementId);
    const otherSelections = selections.filter(s => !s.isCurrentUser);
    const selfSelection = selections.find(s => s.isCurrentUser);

    const allColors = otherSelections.map(s => s.color);
    const primaryColor = allColors[0] || null;

    return {
      selections,
      otherSelections,
      isSelectedByOthers: otherSelections.length > 0,
      isSelectedBySelf: !!selfSelection,
      primaryColor,
      allColors
    };
  }, [presence, elementType, elementId]);
}

export function useSelectionBorderStyle(
  elementType: ElementType,
  elementId: string | null
): React.CSSProperties {
  const { isSelectedByOthers, primaryColor, allColors } = useElementSelections(elementType, elementId);

  return useMemo(() => {
    if (!isSelectedByOthers || !primaryColor) {
      return {};
    }

    if (allColors.length === 1) {
      return {
        boxShadow: `0 0 0 2px ${primaryColor}, 0 0 8px ${primaryColor}40`,
        transition: 'box-shadow 150ms ease-out'
      };
    }

    if (allColors.length === 2) {
      return {
        boxShadow: `0 0 0 2px ${allColors[0]}, 0 0 0 4px ${allColors[1]}`,
        transition: 'box-shadow 150ms ease-out'
      };
    }

    return {
      boxShadow: `0 0 0 2px ${primaryColor}, 0 0 0 4px ${allColors[1] || primaryColor}`,
      transition: 'box-shadow 150ms ease-out'
    };
  }, [isSelectedByOthers, primaryColor, allColors]);
}

export { getInitials };
