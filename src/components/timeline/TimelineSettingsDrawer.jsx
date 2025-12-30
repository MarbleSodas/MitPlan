import { useRef, useEffect } from 'react';
import { X, Tag, Plus } from 'lucide-react';
import { bosses } from '../../data/bosses/bossData';

const TimelineSettingsDrawer = ({
  isOpen,
  onClose,
  level,
  setLevel,
  bossTags,
  description,
  setDescription,
  newBossTag,
  setNewBossTag,
  filteredTagSuggestions,
  showTagSuggestions,
  setShowTagSuggestions,
  onAddBossTag,
  onRemoveBossTag,
  onSelectTagSuggestion,
}) => {
  const drawerRef = useRef(null);
  const tagInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(event.target)
      ) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowTagSuggestions]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--color-cardBackground)] border-l border-[var(--color-border)] shadow-2xl z-50 overflow-y-auto transform transition-transform"
      >
        <div className="sticky top-0 bg-[var(--color-cardBackground)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold m-0">Timeline Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--select-bg)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value={90}>Level 90</option>
              <option value={100}>Level 100</option>
            </select>
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">
              Affects damage calculations in mitigation plans
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Tag size={16} />
              Boss Tags
            </label>
            <p className="text-xs text-[var(--color-textSecondary)] mb-3">
              Add tags to categorize this timeline (e.g., boss names, raid tiers)
            </p>

            {bossTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {bossTags.map((tag, index) => {
                  const boss = bosses.find(b => b.id === tag);
                  return (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                    >
                      {boss?.icon && <span>{boss.icon}</span>}
                      {boss ? boss.name : tag}
                      <button
                        onClick={() => onRemoveBossTag(tag)}
                        className="hover:bg-blue-500/30 rounded-full p-0.5 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={newBossTag}
                  onChange={(e) => setNewBossTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredTagSuggestions.length > 0) {
                        onSelectTagSuggestion(filteredTagSuggestions[0].id);
                      } else {
                        onAddBossTag();
                      }
                    }
                  }}
                  onFocus={() => {
                    if (newBossTag.trim() && filteredTagSuggestions.length > 0) {
                      setShowTagSuggestions(true);
                    }
                  }}
                  placeholder="Search or add tag..."
                  className="flex-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                />
                <button
                  onClick={() => onAddBossTag()}
                  className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 transition-all"
                  title="Add tag"
                >
                  <Plus size={16} />
                </button>
              </div>

              {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {filteredTagSuggestions.map((suggestion, index) => {
                    const boss = bosses.find(b => b.id === suggestion.id);
                    return (
                      <button
                        key={`${suggestion.id}-${index}`}
                        onClick={() => onSelectTagSuggestion(suggestion.id)}
                        className="w-full px-3 py-2 text-left hover:bg-[var(--select-bg)] transition-colors flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {boss && <span>{boss.icon}</span>}
                          <span>{suggestion.name}</span>
                        </span>
                        {suggestion.type === 'custom' && (
                          <span className="text-xs text-[var(--color-textSecondary)] italic">custom</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this timeline (strategies, phase breaks, etc.)"
              rows={4}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-[var(--color-cardBackground)] border-t border-[var(--color-border)] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:brightness-110 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};

export default TimelineSettingsDrawer;
