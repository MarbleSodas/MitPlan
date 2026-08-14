import type { PlanAbilityMode } from '../../types';
import { PLAN_ABILITY_MODE_OPTIONS } from '../../utils/abilities/abilityModeUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AbilityModeSelectProps {
  value: PlanAbilityMode;
  onValueChange: (value: PlanAbilityMode) => void;
  id?: string;
  disabled?: boolean;
}

export default function AbilityModeSelect({
  value,
  onValueChange,
  id = 'abilityMode',
  disabled = false,
}: AbilityModeSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onValueChange(nextValue as PlanAbilityMode)}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PLAN_ABILITY_MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
