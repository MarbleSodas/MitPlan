import { useState, useEffect } from 'react';
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

const CustomActionModal = ({ onClose, onSave, editingAction = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    time: 0,
    description: '',
    icon: '⚔️',
    damageType: 'magical',
    importance: 'high',
    unmitigatedDamage: '',
    isTankBuster: false,
    isDualTankBuster: false
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingAction) {
      setFormData({
        name: editingAction.name || '',
        time: editingAction.time || 0,
        description: editingAction.description || '',
        icon: editingAction.icon || '⚔️',
        damageType: editingAction.damageType || 'magical',
        importance: editingAction.importance || 'high',
        unmitigatedDamage: editingAction.unmitigatedDamage || '',
        isTankBuster: editingAction.isTankBuster || false,
        isDualTankBuster: editingAction.isDualTankBuster || false
      });
    }
  }, [editingAction]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Action name is required';
    }

    if (formData.time < 0) {
      newErrors.time = 'Time must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    onSave(formData);
  };

  const iconOptions = [
    '⚔️', '🛡️', '💥', '🔥', '❄️', '⚡', '💀', '🌊', '🌪️', '💫',
    '⭕', '🎯', '💢', '✨', '🔮', '⚠️', '💣', '🗡️', '🏹', '🔱'
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingAction ? 'Edit Custom Action' : 'Create Custom Action'}
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
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Raidwide Attack"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="action-time">
              Time (seconds) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="action-time"
              type="number"
              value={formData.time}
              onChange={(e) => handleChange('time', parseInt(e.target.value) || 0)}
              min="0"
              step="1"
              className={cn(errors.time && 'border-destructive')}
            />
            {errors.time && (
              <p className="text-destructive text-sm">{errors.time}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="action-icon">Icon</Label>
            <Input
              id="action-icon"
              type="text"
              value={formData.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
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
                {iconOptions.map(icon => (
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
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the boss action and its mechanics"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Damage Type</Label>
            <Select
              value={formData.damageType}
              onValueChange={(value) => handleChange('damageType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select damage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="magical">Magical</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Importance</Label>
            <Select
              value={formData.importance}
              onValueChange={(value) => handleChange('importance', value)}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="unmitigated-damage">
              Unmitigated Damage (Optional)
            </Label>
            <Input
              id="unmitigated-damage"
              type="text"
              value={formData.unmitigatedDamage}
              onChange={(e) => handleChange('unmitigatedDamage', e.target.value)}
              placeholder="e.g., 100,000 or ~85,000"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isTankBuster}
                onChange={(e) => handleChange('isTankBuster', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium">Tank Buster</span>
            </label>

            {formData.isTankBuster && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={formData.isDualTankBuster}
                  onChange={(e) => handleChange('isDualTankBuster', e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium">Dual Tank Buster</span>
              </label>
            )}
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
