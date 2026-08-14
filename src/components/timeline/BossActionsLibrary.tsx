import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Grid, List, Plus, Search } from 'lucide-react';
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

const RESULTS_PER_PAGE = 50;

function getClassificationBadgeClasses(classification: BossActionClassification): string {
  switch (classification) {
    case 'dual_tankbuster':
    case 'tankbuster':
      return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'raidwide':
      return 'bg-warning/15 text-warning border-warning/30';
    case 'small_parties':
      return 'bg-info/15 text-info border-info/30';
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
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedDamageType, selectedBossSource, selectedClassification]);

  const totalPages = Math.max(1, Math.ceil(filteredActions.length / RESULTS_PER_PAGE));
  const visibleActions = useMemo(() => {
    const pageStart = (currentPage - 1) * RESULTS_PER_PAGE;
    return filteredActions.slice(pageStart, pageStart + RESULTS_PER_PAGE);
  }, [currentPage, filteredActions]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedDamageType('all');
    setSelectedBossSource('all');
    setSelectedClassification('all');
  };

  const handleDirectAdd = (action: BossActionTemplate) => {
    onSelectAction(action);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        data-testid="boss-actions-library-controls"
        className="sticky top-0 z-10 -mx-1 mb-3 space-y-3 border-b border-border bg-card/95 px-1 pb-3 backdrop-blur"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            aria-label="Search boss action templates"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search actions, bosses, abilities..."
            className="pl-9 h-8 text-sm"
          />
        </div>

        <div className="flex overflow-x-auto border-b border-border">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(tab.id)}
              className={cn(
                'relative rounded-none px-3 py-2 text-xs font-medium',
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
          <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {filteredActions.length} template{filteredActions.length !== 1 ? 's' : ''}
          </div>

          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-none"
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={14} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-none"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
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
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-2 xl:grid-cols-2' : 'space-y-1.5'}>
          {filteredActions.length === 0 ? (
            <div className="space-y-3 py-8 text-center text-sm text-muted-foreground">
              <p>No templates match these filters.</p>
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            visibleActions.map((action) => {
              const bossName = bossNameById.get(action.sourceBoss) || action.sourceBoss;
              const classificationLabel =
                BOSS_ACTION_CLASSIFICATION_LABELS[action.classification] || action.classification;

              return viewMode === 'grid' ? (
                <button
                  key={action.libraryId}
                  type="button"
                  onClick={() => handleDirectAdd(action)}
                  className="group cursor-pointer rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none">{action.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{action.name}</span>
                        {isTankBusterClassification(action.classification) && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-destructive/20 text-destructive">
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
                  className="group flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <button
                    type="button"
                    onClick={() => handleDirectAdd(action)}
                    className="flex items-start gap-3 text-left min-w-0 flex-1"
                  >
                    <span className="flex-shrink-0 text-xl leading-none">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{action.name}</span>
                        {isTankBusterClassification(action.classification) && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-destructive/20 text-destructive">
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

      {filteredActions.length > RESULTS_PER_PAGE && (
        <nav className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3" aria-label="Template pages">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={14} /> Previous
          </Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight size={14} />
          </Button>
        </nav>
      )}
    </div>
  );
};

export default BossActionsLibrary;
