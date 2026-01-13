import { Tag, Plus, X } from 'lucide-react';
import { bosses } from '../../data/bosses/bossData';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
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
  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Timeline Settings</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={String(level)} onValueChange={(v) => setLevel(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">Level 90</SelectItem>
                <SelectItem value="100">Level 100</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Affects damage calculations in mitigation plans
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag size={16} />
              Boss Tags
            </Label>
            <p className="text-xs text-muted-foreground">
              Add tags to categorize this timeline (e.g., boss names, raid tiers)
            </p>

            {bossTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {bossTags.map((tag, index) => {
                  const boss = bosses.find(b => b.id === tag);
                  return (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {boss?.icon && <span>{boss.icon}</span>}
                      {boss ? boss.name : tag}
                      <button
                        onClick={() => onRemoveBossTag(tag)}
                        className="hover:bg-primary/30 rounded-full p-0.5 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative mt-3">
              <div className="flex gap-2">
                <Input
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
                  className="flex-1"
                />
                <Button onClick={() => onAddBossTag()} size="icon">
                  <Plus size={16} />
                </Button>
              </div>

              {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTagSuggestions.map((suggestion, index) => {
                    const boss = bosses.find(b => b.id === suggestion.id);
                    return (
                      <button
                        key={`${suggestion.id}-${index}`}
                        onClick={() => onSelectTagSuggestion(suggestion.id)}
                        className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {boss && <span>{boss.icon}</span>}
                          <span>{suggestion.name}</span>
                        </span>
                        {suggestion.type === 'custom' && (
                          <span className="text-xs text-muted-foreground italic">custom</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this timeline (strategies, phase breaks, etc.)"
              rows={4}
            />
          </div>
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-card border-t border-border">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default TimelineSettingsDrawer;
