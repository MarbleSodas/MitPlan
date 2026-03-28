import { useMemo, useState } from 'react';
import { Grid, List, Plus, Search } from 'lucide-react';
import {
  bossActionsLibrary,
  categorizedActions,
  libraryUtils,
} from '../../data/bossActionsLibrary';
import { bosses } from '../../data/bosses/bossData';
import type { BossActionClassification, BossActionTemplate, DamageType } from '../../types';
import {
  BOSS_ACTION_CLASSIFICATION_LABELS,
  BOSS_ACTION_CLASSIFICATIONS,
  isTankBusterClassification,
} from '../../utils/boss/bossActionUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'tankBusters', label: 'Tank Busters' },
  { id: 'raidwide', label: 'Raidwides' },
  { id: 'mechanics', label: 'Mechanics' },
] as const;

function getClassificationBadgeClasses(classification: BossActionClassification): string {
  switch (classification) {
    case 'dual_tankbuster':
    case 'tankbuster':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'raidwide':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'small_parties':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
  }
}

function getDamageTypeLabel(damageType?: DamageType): string {
  if (damageType === 'magical') {
    return 'Magical';
  }
  if (damageType === 'physical') {
    return 'Physical';
  }
  if (damageType === 'both') {
    return 'Both';
  }
  return 'Unknown';
}

interface BossActionsLibraryProps {
  onSelectAction: (action: BossActionTemplate) => void;
}

const BossActionsLibrary = ({ onSelectAction }: BossActionsLibraryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_TABS)[number]['id']>('all');
  const [selectedDamageType, setSelectedDamageType] = useState<'all' | DamageType>('all');
  const [selectedBossSource, setSelectedBossSource] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState<'all' | BossActionClassification>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const bossNameById = useMemo(
    () => new Map(bosses.map((boss) => [boss.id, boss.name])),
    []
  );

  const uniqueBossSources = useMemo(() => {
    const sources = Array.from(new Set(bossActionsLibrary.map((action) => action.sourceBoss)));

    return sources
      .map((sourceBoss) => ({
        id: sourceBoss,
        name: bossNameById.get(sourceBoss) || sourceBoss,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [bossNameById]);

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
      actions = actions.filter((action) => action.sourceBoss === selectedBossSource);
    }

    if (selectedClassification !== 'all') {
      actions = libraryUtils.getActionsByClassification(actions, selectedClassification);
    }

    return actions;
  }, [searchTerm, selectedCategory, selectedDamageType, selectedBossSource, selectedClassification]);

  const handleDirectAdd = (action: BossActionTemplate) => {
    onSelectAction(action);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        data-testid="boss-actions-library-controls"
        className="sticky top-0 z-10 -mx-1 mb-3 space-y-3 bg-card px-1 pb-1"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search actions, bosses, abilities..."
            className="pl-9 h-8 text-sm"
          />
        </div>

        <div className="flex border-b border-border">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(tab.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium rounded-none relative',
                selectedCategory === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {selectedCategory === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={selectedDamageType}
            onValueChange={(value) => setSelectedDamageType(value as 'all' | DamageType)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Damage Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Damage Types</SelectItem>
              <SelectItem value="magical">Magical</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBossSource} onValueChange={setSelectedBossSource}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Bosses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bosses</SelectItem>
              {uniqueBossSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedClassification}
            onValueChange={(value) =>
              setSelectedClassification(value as 'all' | BossActionClassification)
            }
          >
            <SelectTrigger className="h-8 text-xs sm:col-span-2">
              <SelectValue placeholder="All Classifications" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              {BOSS_ACTION_CLASSIFICATIONS.map((classification) => (
                <SelectItem key={classification} value={classification}>
                  {BOSS_ACTION_CLASSIFICATION_LABELS[classification]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {filteredActions.length} template{filteredActions.length !== 1 ? 's' : ''}
          </div>

          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-none"
              title="List view"
            >
              <List size={14} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-none"
              title="Grid view"
            >
              <Grid size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div
        data-testid="boss-actions-library-results"
        className="flex-1 min-h-0 overflow-y-auto pr-1"
      >
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-2' : 'space-y-1.5'}>
          {filteredActions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No boss action templates found
            </div>
          ) : (
            filteredActions.map((action) => {
              const bossName = bossNameById.get(action.sourceBoss) || action.sourceBoss;
              const classificationLabel =
                BOSS_ACTION_CLASSIFICATION_LABELS[action.classification] || action.classification;

              return viewMode === 'grid' ? (
                <button
                  key={action.libraryId}
                  type="button"
                  onClick={() => handleDirectAdd(action)}
                  className="cursor-pointer text-left p-3 bg-background border border-border rounded-lg hover:border-primary transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{action.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{action.name}</span>
                        {isTankBusterClassification(action.classification) && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-300">
                            TB
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span
                          className={cn(
                            'border px-2 py-0.5 text-[10px] rounded-full',
                            getClassificationBadgeClasses(action.classification)
                          )}
                        >
                          {classificationLabel}
                        </span>
                        {action.isMultiHit && (
                          <span className="border border-border px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
                            {action.hitCount && action.hitCount > 1 ? `${action.hitCount}-Hit` : 'Multi-hit'}
                          </span>
                        )}
                        {action.hasDot && (
                          <span className="border border-border px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
                            DoT
                          </span>
                        )}
                        <span className="border border-border px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
                          {getDamageTypeLabel(action.damageType)}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {bossName} • {action.occurrenceCount} occurrence
                        {action.occurrenceCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <span className="text-[11px] font-medium text-primary">Set Time</span>
                  </div>
                </button>
              ) : (
                <div
                  key={action.libraryId}
                  className="flex items-start gap-3 px-3 py-2 bg-background border border-border rounded-lg hover:border-primary transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => handleDirectAdd(action)}
                    className="flex items-start gap-3 text-left min-w-0 flex-1"
                  >
                    <span className="text-xl flex-shrink-0">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{action.name}</span>
                        {isTankBusterClassification(action.classification) && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/20 text-red-300">
                            TB
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'border px-2 py-0.5 text-[10px] rounded-full',
                            getClassificationBadgeClasses(action.classification)
                          )}
                        >
                          {classificationLabel}
                        </span>
                        {action.isMultiHit && (
                          <span className="border border-border px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
                            {action.hitCount && action.hitCount > 1 ? `${action.hitCount}-Hit` : 'Multi-hit'}
                          </span>
                        )}
                        {action.hasDot && (
                          <span className="border border-border px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
                            DoT
                          </span>
                        )}
                        <span className="border border-border px-2 py-0.5 text-[10px] rounded-full text-muted-foreground">
                          {getDamageTypeLabel(action.damageType)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {bossName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {action.occurrenceCount}x
                        </span>
                      </div>
                      {action.description && (
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                          {action.description}
                        </p>
                      )}
                    </div>
                  </button>

                  <Button
                    size="sm"
                    onClick={() => handleDirectAdd(action)}
                    className="h-8 px-2 text-[11px] flex-shrink-0"
                  >
                    <Plus size={13} />
                    Set Time
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BossActionsLibrary;
