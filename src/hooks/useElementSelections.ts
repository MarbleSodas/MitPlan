import { useMemo } from 'react';
import { usePresenceOptional } from '../contexts/PresenceContext';
import type {
  CollaborationInteraction,
  ElementSelection,
  ElementType,
  PresenceTargetInput,
} from '../types/presence';
import { createPresenceTarget, getInitials } from '../types/presence';

interface UsePresenceTargetResult {
  selections: ElementSelection[];
  otherSelections: ElementSelection[];
  isSelectedByOthers: boolean;
  isSelectedBySelf: boolean;
  isEditingByOthers: boolean;
  primaryColor: string | null;
  allColors: string[];
}

interface BorderStyleOptions {
  selectedOnly?: boolean;
}

function withAlpha(color: string, alphaHex: string): string {
  if (color.startsWith('#') && color.length === 7) {
    return `${color}${alphaHex}`;
  }

  return color;
}

export function usePresenceTarget(
  target: PresenceTargetInput | null,
  interaction?: CollaborationInteraction
): UsePresenceTargetResult {
  const presence = usePresenceOptional();
  const normalizedTarget = useMemo(
    () => (target ? createPresenceTarget(target) : null),
    [target]
  );

  return useMemo(() => {
    if (!presence || !normalizedTarget) {
      return {
        selections: [],
        otherSelections: [],
        isSelectedByOthers: false,
        isSelectedBySelf: false,
        isEditingByOthers: false,
        primaryColor: null,
        allColors: [],
      };
    }

    const selections = presence
      .getPresenceForTarget(normalizedTarget.key)
      .filter((item) => !interaction || item.interaction === interaction);
    const otherSelections = selections.filter((item) => !item.isCurrentUser);
    const selfSelection = selections.find((item) => item.isCurrentUser);
    const allColors = otherSelections.map((item) => item.color);

    return {
      selections,
      otherSelections,
      isSelectedByOthers: otherSelections.length > 0,
      isSelectedBySelf: Boolean(selfSelection),
      isEditingByOthers: otherSelections.some((item) => item.interaction === 'editing'),
      primaryColor: allColors[0] || null,
      allColors,
    };
  }, [interaction, normalizedTarget, presence]);
}

export function useElementSelections(
  elementType: ElementType,
  elementId: string | null
): UsePresenceTargetResult {
  const target = useMemo(
    () =>
      elementId
        ? {
            surface: 'planner' as const,
            entityType: elementType,
            entityId: elementId,
          }
        : null,
    [elementId, elementType]
  );

  return usePresenceTarget(target);
}

export function useSelectionBorderStyle(
  elementTypeOrTarget: ElementType | PresenceTargetInput,
  elementIdOrOptions: string | null | BorderStyleOptions = null,
  options: BorderStyleOptions = {}
): React.CSSProperties {
  const target = useMemo(() => {
    if (typeof elementTypeOrTarget === 'string') {
      if (typeof elementIdOrOptions !== 'string' || !elementIdOrOptions) {
        return null;
      }

      return {
        surface: 'planner' as const,
        entityType: elementTypeOrTarget,
        entityId: elementIdOrOptions,
      };
    }

    return elementTypeOrTarget;
  }, [elementIdOrOptions, elementTypeOrTarget]);

  const resolvedOptions =
    typeof elementIdOrOptions === 'object' && elementIdOrOptions !== null ? elementIdOrOptions : options;
  const { isSelectedByOthers, isEditingByOthers, primaryColor, allColors } = usePresenceTarget(target);

  return useMemo(() => {
    if (!isSelectedByOthers || !primaryColor) {
      return {};
    }

    if (resolvedOptions.selectedOnly && isEditingByOthers) {
      return {
        boxShadow: `0 0 0 2px ${primaryColor}`,
        transition: 'box-shadow 150ms ease-out',
      };
    }

    if (allColors.length === 1) {
      const glow = isEditingByOthers ? withAlpha(primaryColor, '66') : withAlpha(primaryColor, '33');
      return {
        boxShadow: `0 0 0 2px ${primaryColor}, 0 0 12px ${glow}`,
        transition: 'box-shadow 150ms ease-out',
      };
    }

    if (allColors.length === 2) {
      return {
        boxShadow: `0 0 0 2px ${allColors[0]}, 0 0 0 4px ${allColors[1]}`,
        transition: 'box-shadow 150ms ease-out',
      };
    }

    return {
      boxShadow: `0 0 0 2px ${primaryColor}, 0 0 0 4px ${allColors[1] || primaryColor}`,
      transition: 'box-shadow 150ms ease-out',
    };
  }, [allColors, isEditingByOthers, isSelectedByOthers, primaryColor, resolvedOptions.selectedOnly]);
}

export { getInitials };
