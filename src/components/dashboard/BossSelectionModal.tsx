import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { bosses } from '../../data';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    setTimeout(() => {
      onSelectBoss(boss?.id || null);
    }, 150);
  };

  const handleNoBossClick = () => {
    setSelectedBoss({ id: null });
    setTimeout(() => {
      onSelectBoss(null);
    }, 150);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Select Boss Encounter (Optional)</DialogTitle>
          <DialogDescription>
            Choose a boss to start with their timeline, or create a custom plan
          </DialogDescription>
        </DialogHeader>

        <Card
          onClick={handleNoBossClick}
          className={cn(
            'flex cursor-pointer items-center gap-4 border border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-muted/60',
            selectedBoss?.id === null && 'border-primary bg-primary/10'
          )}
        >
          <div className="text-2xl">✨</div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Custom Timeline</h3>
            <p className="text-sm text-muted-foreground m-0">Create from scratch using the boss actions library</p>
          </div>
        </Card>

        <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-lg border border-border">
          {BOSS_TIERS.map(tier => {
            const tierBosses = tier.bossIds
              .map(id => bosses.find(b => b.id === id))
              .filter(Boolean);
            
            return (
              <div key={tier.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleTier(tier.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/70 hover:bg-muted transition-colors text-left"
                >
                  <span className="font-medium text-foreground">{tier.name}</span>
                  {expandedTiers[tier.id] ? (
                    <ChevronDown size={18} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={18} className="text-muted-foreground" />
                  )}
                </button>
                {expandedTiers[tier.id] && (
                  <div className="grid grid-cols-1 gap-3 bg-background p-3 sm:grid-cols-2">
                    {tierBosses.map(boss => {
                      const enabled = isBossEnabled(boss.id);
                      const isSelected = selectedBoss?.id === boss.id;
                      
                      return (
                        <div
                          key={boss.id}
                          onClick={() => handleBossClick(boss)}
                          className={cn(
                            'p-4 rounded-lg border transition-colors text-center',
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
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Coming Soon
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BossSelectionModal;
