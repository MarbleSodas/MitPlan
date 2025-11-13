import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

  // Load editing action data
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
    // Clear error for this field
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-cardBackground)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-cardBackground)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold m-0">
            {editingAction ? 'Edit Custom Action' : 'Create Custom Action'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--select-bg)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Action Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Action Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Raidwide Attack"
              className={`w-full px-3 py-2 bg-[var(--color-background)] border ${
                errors.name ? 'border-red-500' : 'border-[var(--color-border)]'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Time (seconds) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.time}
              onChange={(e) => handleChange('time', parseInt(e.target.value) || 0)}
              min="0"
              step="1"
              className={`w-full px-3 py-2 bg-[var(--color-background)] border ${
                errors.time ? 'border-red-500' : 'border-[var(--color-border)]'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
            />
            {errors.time && (
              <p className="text-red-500 text-sm mt-1">{errors.time}</p>
            )}
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>

            {/* Custom Icon Input */}
            <div className="mb-3">
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => handleChange('icon', e.target.value)}
                placeholder="Enter any emoji or text icon"
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-2xl text-center"
                maxLength={10}
              />
              <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                Type any emoji, symbol, or text (up to 10 characters)
              </p>
            </div>

            {/* Preset Icons */}
            <div>
              <p className="text-xs text-[var(--color-textSecondary)] mb-2">Quick select presets:</p>
              <div className="grid grid-cols-10 gap-2">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleChange('icon', icon)}
                    className={`p-2 text-2xl rounded-lg border-2 transition-colors ${
                      formData.icon === icon
                        ? 'border-[var(--color-primary)] bg-[var(--select-bg)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                    title={`Use ${icon}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the boss action and its mechanics"
              rows={3}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          {/* Damage Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Damage Type</label>
            <select
              value={formData.damageType}
              onChange={(e) => handleChange('damageType', e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="magical">Magical</option>
              <option value="physical">Physical</option>
            </select>
          </div>

          {/* Importance */}
          <div>
            <label className="block text-sm font-medium mb-2">Importance</label>
            <select
              value={formData.importance}
              onChange={(e) => handleChange('importance', e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Unmitigated Damage */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Unmitigated Damage (Optional)
            </label>
            <input
              type="text"
              value={formData.unmitigatedDamage}
              onChange={(e) => handleChange('unmitigatedDamage', e.target.value)}
              placeholder="e.g., 100,000 or ~85,000"
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Tank Buster Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isTankBuster}
                onChange={(e) => handleChange('isTankBuster', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm font-medium">Tank Buster</span>
            </label>

            {formData.isTankBuster && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={formData.isDualTankBuster}
                  onChange={(e) => handleChange('isDualTankBuster', e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm font-medium">Dual Tank Buster</span>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--color-cardBackground)] border-t border-[var(--color-border)] px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[#2563eb] transition-colors"
          >
            {editingAction ? 'Update Action' : 'Add Action'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomActionModal;

