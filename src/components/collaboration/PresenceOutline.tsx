import type { CSSProperties, ReactNode } from 'react';
import type { ElementSelection } from '../../types/presence';

interface PresenceOutlineProps {
  children: ReactNode;
  selections: ElementSelection[];
  className?: string;
  style?: CSSProperties;
}

function withAlpha(color: string, alphaHex: string): string {
  if (color.startsWith('#') && color.length === 7) {
    return `${color}${alphaHex}`;
  }

  return color;
}

function getOutlineStyle(selections: ElementSelection[]): CSSProperties {
  const otherSelections = selections.filter((selection) => !selection.isCurrentUser);
  const allColors = otherSelections.map((selection) => selection.color);
  const primaryColor = allColors[0];
  const hasEditing = otherSelections.some((selection) => selection.interaction === 'editing');

  if (!primaryColor) {
    return {};
  }

  if (allColors.length === 1) {
    return {
      boxShadow: hasEditing
        ? `0 0 0 2px ${primaryColor}, 0 0 0 5px ${withAlpha(primaryColor, '33')}, 0 0 18px ${withAlpha(primaryColor, '66')}`
        : `0 0 0 2px ${primaryColor}, 0 0 12px ${withAlpha(primaryColor, '40')}`,
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
}

const PresenceOutline = ({
  children,
  selections,
  className = '',
  style,
}: PresenceOutlineProps) => {
  const outlineStyle = getOutlineStyle(selections);

  return (
    <div className={`relative transition-shadow duration-150 ${className}`} style={{ ...outlineStyle, ...style }}>
      {children}
    </div>
  );
};

export default PresenceOutline;
