import type { ElementSelection } from '../../types/presence';
import PresenceBadgeGroup from './PresenceBadgeGroup';

interface SelectionIndicatorProps {
  selections: ElementSelection[];
  maxDisplay?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md';
}

const SelectionIndicator = (props: SelectionIndicatorProps) => {
  return <PresenceBadgeGroup {...props} />;
};

export default SelectionIndicator;
