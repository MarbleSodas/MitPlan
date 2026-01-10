import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Grid, List, Plus, X } from 'lucide-react';
import { bossActionsLibrary, categorizedActions, libraryUtils } from '../../data/bossActionsLibrary';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'tankBusters', label: 'Tank Busters' },
  { id: 'raidwide', label: 'Raidwides' },
  { id: 'mechanics', label: 'Mechanics' },
];

const BossActionsLibrary = ({ onSelectAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDamageType, setSelectedDamageType] = useState('all');
  const [selectedBossSource, setSelectedBossSource] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [quickAddAction, setQuickAddAction] = useState(null);
  const [quickAddTime, setQuickAddTime] = useState(0);
  const quickAddInputRef = useRef(null);

  const uniqueBossSources = useMemo(() => {
    const sources = new Set();
    bossActionsLibrary.forEach(action => {
      if (action.sourceBoss) {
        sources.add(action.sourceBoss);
      }
    });
    return Array.from(sources).sort();
  }, []);

  const filteredActions = useMemo(() => {
    let actions = bossActionsLibrary;

    if (selectedCategory !== 'all') {
      actions = categorizedActions[selectedCategory] || [];
    }

    if (searchTerm) {
      actions = libraryUtils.searchActions(actions, searchTerm);
    }

    if (selectedDamageType !== 'all') {
      actions = libraryUtils.getActionsByDamageType(actions, selectedDamageType);
    }

    if (selectedBossSource !== 'all') {
      actions = actions.filter(a => a.sourceBoss === selectedBossSource);
    }

    return actions;
  }, [searchTerm, selectedCategory, selectedDamageType, selectedBossSource]);

  useEffect(() => {
    if (quickAddAction && quickAddInputRef.current) {
      quickAddInputRef.current.focus();
      quickAddInputRef.current.select();
    }
  }, [quickAddAction]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuickAdd = (action, e) => {
    e.stopPropagation();
    setQuickAddAction(action);
    setQuickAddTime(action.time || 0);
  };

  const handleQuickAddConfirm = () => {
    if (quickAddAction) {
      onSelectAction({ ...quickAddAction, time: quickAddTime });
      setQuickAddAction(null);
    }
  };

  const handleQuickAddKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleQuickAddConfirm();
    } else if (e.key === 'Escape') {
      setQuickAddAction(null);
    }
  };

  const handleDirectAdd = (action) => {
    onSelectAction(action);
  };

  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search actions..."
          className="pl-9 h-8 text-sm"
        />
      </div>

      <div className="flex border-b border-border">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={cn(
              "px-3 py-2 text-xs font-medium transition-colors relative",
              selectedCategory === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {selectedCategory === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedDamageType}
          onChange={(e) => setSelectedDamageType(e.target.value)}
          className="h-8 px-2 text-xs flex-1 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Types</option>
          <option value="magical">Magical</option>
          <option value="physical">Physical</option>
        </select>

        <select
          value={selectedBossSource}
          onChange={(e) => setSelectedBossSource(e.target.value)}
          className="h-8 px-2 text-xs flex-1 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Bosses</option>
          {uniqueBossSources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>

        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === 'list' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background text-muted-foreground hover:text-foreground'
            )}
            title="List view"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === 'grid' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background text-muted-foreground hover:text-foreground'
            )}
            title="Grid view"
          >
            <Grid size={14} />
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''}
      </div>

      {quickAddAction && (
        <div className="bg-primary/10 border border-primary rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">{quickAddAction.icon}</span>
              <span className="font-medium text-sm truncate">{quickAddAction.name}</span>
            </div>
            <button 
              onClick={() => setQuickAddAction(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Time (s):</label>
            <input
              ref={quickAddInputRef}
              type="number"
              value={quickAddTime}
              onChange={(e) => setQuickAddTime(parseInt(e.target.value) || 0)}
              onKeyDown={handleQuickAddKeyDown}
              min={0}
              className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" onClick={handleQuickAddConfirm}>
              Add
            </Button>
          </div>
        </div>
      )}

      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
        {filteredActions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm col-span-2">
            No actions found
          </div>
        ) : (
          filteredActions.map((action) => (
            viewMode === 'grid' ? (
              <button
                key={action.libraryId || action.id}
                onClick={() => handleDirectAdd(action)}
                className="text-left p-2 bg-background border border-border rounded-lg hover:border-primary transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-xs font-medium truncate flex-1">{action.name}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatTime(action.time)}</span>
                  {action.isTankBuster && (
                    <span className="px-1 py-0.5 bg-red-500/20 text-red-400 rounded">TB</span>
                  )}
                  {action.isDualTankBuster && (
                    <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded">Dual</span>
                  )}
                </div>
                <button
                  onClick={(e) => handleQuickAdd(action, e)}
                  className="mt-1 w-full py-1 text-[10px] bg-muted text-muted-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                >
                  + Set Time
                </button>
              </button>
            ) : (
              <div
                key={action.libraryId || action.id}
                className="flex items-center gap-2 px-2 py-1.5 bg-background border border-border rounded-lg hover:border-primary transition-colors group"
              >
                <span className="text-lg flex-shrink-0">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{action.name}</span>
                    {action.isTankBuster && (
                      <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded flex-shrink-0">TB</span>
                    )}
                    {action.isDualTankBuster && (
                      <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded flex-shrink-0">Dual</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatTime(action.time)}</span>
                    {action.damageType && (
                      <span>{action.damageType === 'magical' ? '🔮' : '⚔️'}</span>
                    )}
                    {action.importance && (
                      <span className={getImportanceColor(action.importance)}>●</span>
                    )}
                    {action.sourceBoss && (
                      <span className="truncate">{action.sourceBoss}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleQuickAdd(action, e)}
                    className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Add with custom time"
                  >
                    <Plus size={14} />
                  </button>
                  <Button
                    size="sm"
                    onClick={() => handleDirectAdd(action)}
                    className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
};

export default BossActionsLibrary;
