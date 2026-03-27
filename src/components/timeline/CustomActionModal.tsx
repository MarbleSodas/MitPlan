import { useEffect, useState } from 'react';
import type { BossAction, BossActionClassification, DamageType } from '../../types';
import {
  BOSS_ACTION_CLASSIFICATION_LABELS,
  BOSS_ACTION_CLASSIFICATIONS,
  deriveBossActionClassification,
  syncBossActionMetadataWithClassification,
} from '../../utils/boss/bossActionUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type EditableActionFormData = {
  name: string;
  time: number;
  description: string;
  icon: string;
  damageType: DamageType;
  importance: NonNullable<BossAction['importance']>;
  unmitigatedDamage: BossAction['unmitigatedDamage'];
  classification: BossActionClassification;
  isMultiHit: boolean;
  hitCount: number;
  hasDot: boolean;
  targetTank?: BossAction['targetTank'];
};

function buildFormData(editingAction: BossAction | null): EditableActionFormData {
  const baseAction: BossAction = editingAction
    ? syncBossActionMetadataWithClassification(editingAction)
    : syncBossActionMetadataWithClassification({
        id: 'draft',
        name: '',
        time: 0,
        description: '',
        icon: '⚔️',
        damageType: 'magical',
        importance: 'high',
        unmitigatedDamage: '',
        classification: deriveBossActionClassification({
          importance: 'high',
        }),
      });

  return {
    name: baseAction.name || '',
    time: baseAction.time || 0,
    description: baseAction.description || '',
    icon: baseAction.icon || '⚔️',
    damageType: baseAction.damageType || 'magical',
    importance: baseAction.importance || 'high',
    unmitigatedDamage: baseAction.unmitigatedDamage || '',
    classification:
      baseAction.classification || deriveBossActionClassification(baseAction),
    isMultiHit: Boolean(baseAction.isMultiHit || (baseAction.hitCount || 0) > 1),
    hitCount:
      typeof baseAction.hitCount === 'number' && baseAction.hitCount > 1
        ? baseAction.hitCount
        : 2,
    hasDot: baseAction.hasDot === true,
    targetTank:
      baseAction.targetTank === 'mainTank' || baseAction.targetTank === 'offTank'
        ? baseAction.targetTank
        : undefined,
  };
}

interface CustomActionModalProps {
  onClose: () => void;
  onSave: (action: BossAction) => void;
  editingAction?: BossAction | null;
}

const CustomActionModal = ({
  onClose,
  onSave,
  editingAction = null,
}: CustomActionModalProps) => {
  const [formData, setFormData] = useState<EditableActionFormData>(() =>
    buildFormData(editingAction)
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setFormData(buildFormData(editingAction));
    setErrors({});
  }, [editingAction]);

  const handleChange = <K extends keyof EditableActionFormData>(
    field: K,
    value: EditableActionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleClassificationChange = (classification: BossActionClassification) => {
    const next = syncBossActionMetadataWithClassification({
      ...formData,
      id: editingAction?.id || 'draft',
      classification,
      targetTank:
        classification === 'tankbuster' ? formData.targetTank : undefined,
    });

    setFormData((prev) => ({
      ...prev,
      classification: next.classification || classification,
      targetTank:
        next.targetTank === 'mainTank' || next.targetTank === 'offTank'
          ? next.targetTank
          : undefined,
    }));

    if (errors.classification) {
      setErrors((prev) => ({ ...prev, classification: null }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Action name is required';
    }

    if (formData.time < 0) {
      newErrors.time = 'Time must be 0 or greater';
    }

    if (formData.isMultiHit && formData.hitCount < 2) {
      newErrors.hitCount = 'Hit count must be at least 2 when multi-hit is enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const normalized = syncBossActionMetadataWithClassification({
      ...editingAction,
      ...formData,
      classification: formData.classification,
      isMultiHit: formData.isMultiHit,
      hitCount: formData.isMultiHit ? formData.hitCount : undefined,
      hasDot: formData.hasDot,
      targetTank: formData.classification === 'tankbuster' ? formData.targetTank : undefined,
    });

    onSave(normalized);
  };

  const iconOptions = [
    '⚔️', '🛡️', '💥', '🔥', '❄️', '⚡', '💀', '🌊', '🌪️', '💫',
    '⭕', '🎯', '💢', '✨', '🔮', '⚠️', '💣', '🗡️', '🏹', '🔱',
  ];

  const isEditingCustomAction = editingAction?.isCustom === true;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingAction
              ? isEditingCustomAction
                ? 'Edit Custom Action'
                : 'Edit Timeline Action'
              : 'Create Custom Action'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="action-name">
              Action Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="action-name"
              type="text"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="e.g., Raidwide Attack"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="action-time">
              Time (seconds) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="action-time"
              type="number"
              value={formData.time}
              onChange={(event) =>
                handleChange('time', Number.parseInt(event.target.value, 10) || 0)
              }
              min="0"
              step="1"
              className={cn(errors.time && 'border-destructive')}
            />
            {errors.time && <p className="text-destructive text-sm">{errors.time}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="action-icon">Icon</Label>
            <Input
              id="action-icon"
              type="text"
              value={formData.icon}
              onChange={(event) => handleChange('icon', event.target.value)}
              placeholder="Enter any emoji or text icon"
              className="text-2xl text-center"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Type any emoji, symbol, or text (up to 10 characters)
            </p>

            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">Quick select presets:</p>
              <div className="grid grid-cols-10 gap-2">
                {iconOptions.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={formData.icon === icon ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => handleChange('icon', icon)}
                    className="text-2xl h-10 w-10"
                    title={`Use ${icon}`}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="action-description">Description</Label>
            <Textarea
              id="action-description"
              value={formData.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Describe the boss action and its mechanics"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Damage Type</Label>
              <Select
                value={formData.damageType}
                onValueChange={(value) => handleChange('damageType', value as DamageType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select damage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="magical">Magical</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Importance</Label>
              <Select
                value={formData.importance}
                onValueChange={(value) =>
                  handleChange('importance', value as EditableActionFormData['importance'])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select importance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Classification</Label>
            <Select value={formData.classification} onValueChange={handleClassificationChange}>
              <SelectTrigger className={cn(errors.classification && 'border-destructive')}>
                <SelectValue placeholder="Select classification" />
              </SelectTrigger>
              <SelectContent>
                {BOSS_ACTION_CLASSIFICATIONS.map((classification) => (
                  <SelectItem key={classification} value={classification}>
                    {BOSS_ACTION_CLASSIFICATION_LABELS[classification]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.classification && (
              <p className="text-destructive text-sm">{errors.classification}</p>
            )}
          </div>

          {formData.classification === 'dual_tankbuster' && (
            <p className="text-xs text-muted-foreground">
              Dual tankbusters automatically target both tanks.
            </p>
          )}

          {formData.classification === 'small_parties' && (
            <p className="text-xs text-muted-foreground">
              Small parties means 4 players are targeted at the same time.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isMultiHit}
                onChange={(event) => {
                  const checked = event.target.checked;
                  handleChange('isMultiHit', checked);
                  if (checked && formData.hitCount < 2) {
                    handleChange('hitCount', 2);
                  }
                }}
                className="mt-1"
              />
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">Multi-hit</div>
                <p className="text-xs text-muted-foreground m-0">
                  Track repeated hits separately from classification.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasDot}
                onChange={(event) => handleChange('hasDot', event.target.checked)}
                className="mt-1"
              />
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">Applies DoT</div>
                <p className="text-xs text-muted-foreground m-0">
                  Mark actions that also leave damage over time behind.
                </p>
              </div>
            </label>
          </div>

          {formData.isMultiHit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="hit-count">
                Hit Count <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hit-count"
                type="number"
                value={formData.hitCount}
                onChange={(event) =>
                  handleChange('hitCount', Number.parseInt(event.target.value, 10) || 0)
                }
                min="2"
                step="1"
                className={cn(errors.hitCount && 'border-destructive')}
              />
              {errors.hitCount && (
                <p className="text-destructive text-sm">{errors.hitCount}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="unmitigated-damage">
              Unmitigated Damage (Optional)
            </Label>
            <Input
              id="unmitigated-damage"
              type="text"
              value={formData.unmitigatedDamage || ''}
              onChange={(event) => handleChange('unmitigatedDamage', event.target.value)}
              placeholder="e.g., 100,000 or ~85,000"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {editingAction ? 'Update Action' : 'Add Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomActionModal;
