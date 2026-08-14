import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Sparkles } from 'lucide-react';
import { bosses } from '../../data';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ENABLED_BOSS_IDS = [
  'vamp-fatale-m9s',
  'red-hot-deep-blue-m10s',
  'the-tyrant-m11s',
  'lindwurm-m12s',
  'lindwurm-ii-m12s',
  'dancing-green-m5s',
  'sugar-riot',
  'brute-abominator-m7s',
  'howling-blade-m8s',
  'ketuduke',
  'lala',
  'statice'
];

const BOSS_TIERS = [
  {
    id: 'm9s-m12s',
    name: 'M9S-M12S (AAC Heavyweight)',
    bossIds: [
      'vamp-fatale-m9s',
      'red-hot-deep-blue-m10s',
      'the-tyrant-m11s',
      'lindwurm-m12s',
      'lindwurm-ii-m12s'
    ],
    defaultExpanded: true
  },
  {
    id: 'm5s-m8s',
    name: 'M5S-M8S (AAC Cruiserweight)',
    bossIds: ['dancing-green-m5s', 'sugar-riot', 'brute-abominator-m7s', 'howling-blade-m8s'],
    defaultExpanded: false
  },
  {
    id: 'm1s-m4s',
    name: 'M1S-M4S (AAC Light-heavyweight)',
    bossIds: ['black-cat-m1s', 'honey-b-lovely-m2s', 'brute-bomber-m3s', 'wicked-thunder-m4s'],
    defaultExpanded: false
  },
  {
    id: 'aai',
    name: 'Another Aloalo Island (Savage)',
    bossIds: ['ketuduke', 'lala', 'statice'],
    defaultExpanded: false
  }
];

const BossSelectionModal = ({ onClose, onSelectBoss }) => {
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentBossIds] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem('mitplan-recent-bosses') || '[]');
      return Array.isArray(value) ? value.slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [expandedTiers, setExpandedTiers] = useState(() => {
    const initial = {};
    BOSS_TIERS.forEach(tier => {
      initial[tier.id] = tier.defaultExpanded;
    });
    return initial;
  });

  const toggleTier = (tierId) => {
    setExpandedTiers(prev => ({
      ...prev,
      [tierId]: !prev[tierId]
    }));
  };

  const isBossEnabled = (bossId) => ENABLED_BOSS_IDS.includes(bossId);

  const handleBossClick = (boss) => {
    if (!isBossEnabled(boss.id)) return;
    setSelectedBoss(boss);
  };

  const handleNoBossClick = () => {
    setSelectedBoss({ id: null });
  };

  const handleContinue = () => {
    if (!selectedBoss) return;
    if (selectedBoss.id) {
      try {
        const nextRecent = [selectedBoss.id, ...recentBossIds.filter(id => id !== selectedBoss.id)].slice(0, 3);
        localStorage.setItem('mitplan-recent-bosses', JSON.stringify(nextRecent));
      } catch {
        // Recent encounters are a convenience only.
      }
    }
    onSelectBoss(selectedBoss.id || null);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const recentBosses = recentBossIds
    .map(id => bosses.find(boss => boss.id === id))
    .filter(boss => boss && isBossEnabled(boss.id));

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Start a plan</DialogTitle>
          <DialogDescription>
            Choose an encounter or custom timeline, then review the plan details before creating it.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search encounters"
            aria-label="Search encounters"
            className="pl-9"
          />
        </div>

        <button
          type="button"
          onClick={handleNoBossClick}
          className={cn(
            'flex w-full items-center gap-4 rounded-lg border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selectedBoss?.id === null && 'border-primary bg-primary/10'
          )}
          aria-pressed={selectedBoss?.id === null}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Custom Timeline</h3>
            <p className="text-sm text-muted-foreground m-0">Create from scratch using the boss actions library</p>
          </div>
        </button>

        {recentBosses.length > 0 && !normalizedQuery ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Recent encounters</h3>
            <div className="flex flex-wrap gap-2">
              {recentBosses.map((boss) => (
                <Button
                  key={boss.id}
                  type="button"
                  variant={selectedBoss?.id === boss.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBossClick(boss)}
                >
                  {boss.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-lg border border-border">
          {BOSS_TIERS.map(tier => {
            const tierBosses = tier.bossIds
              .map(id => bosses.find(b => b.id === id))
              .filter(Boolean)
              .filter(boss => !normalizedQuery || boss.name.toLowerCase().includes(normalizedQuery));
            if (tierBosses.length === 0) return null;
            
            return (
              <div key={tier.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleTier(tier.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/70 hover:bg-muted transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="font-medium text-foreground">{tier.name}</span>
                  {expandedTiers[tier.id] ? (
                    <ChevronDown size={18} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={18} className="text-muted-foreground" />
                  )}
                </button>
                {(normalizedQuery || expandedTiers[tier.id]) && (
                  <div className="grid grid-cols-1 gap-3 bg-background p-3 sm:grid-cols-2">
                    {tierBosses.map(boss => {
                      const enabled = isBossEnabled(boss.id);
                      const isSelected = selectedBoss?.id === boss.id;
                      
                      return (
                        <button
                          type="button"
                          key={boss.id}
                          onClick={() => handleBossClick(boss)}
                          disabled={!enabled}
                          aria-pressed={isSelected}
                          className={cn(
                            'rounded-lg border p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            enabled && !isSelected && 'border-border hover:border-primary/60 hover:bg-muted/60 cursor-pointer',
                            enabled && isSelected && 'border-primary bg-primary/10',
                            !enabled && 'border-border opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="text-2xl mb-2">
                            {typeof boss.icon === 'string' && boss.icon.startsWith('/') ? (
                              <img src={boss.icon} alt={boss.name} className="max-h-[40px] max-w-[40px] object-contain mx-auto" />
                            ) : (
                              boss.icon
                            )}
                          </div>
                          <h3 className={cn(
                            'text-sm font-semibold mb-1',
                            enabled ? 'text-foreground' : 'text-muted-foreground'
                          )}>{boss.name}</h3>
                          {!enabled && (
                            <span className="text-xs text-warning font-medium">
                              Coming Soon
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleContinue} disabled={!selectedBoss}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BossSelectionModal;
