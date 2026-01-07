import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { bosses } from '../../data';
import { BUTTON, MODAL, CARD, cn } from '../../styles/designSystem';

const ENABLED_BOSS_IDS = [
  'vamp-fatale-m9s',
  'red-hot-deep-blue-m10s',
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
    bossIds: ['vamp-fatale-m9s', 'red-hot-deep-blue-m10s', 'the-tyrant-m11s', 'lindwurm-m12s'],
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
    <div onClick={onClose} className={cn(MODAL.overlay, 'z-[1000] backdrop-blur-sm')}>
      <div onClick={(e) => e.stopPropagation()} className={cn(MODAL.container, 'max-w-3xl p-8')}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={cn(MODAL.title, 'text-2xl mb-2')}>Select Boss Encounter (Optional)</h2>
            <p className="text-[var(--color-textSecondary)] text-base">Choose a boss to start with their timeline, or create a custom plan</p>
          </div>
          <button onClick={onClose} className={cn(BUTTON.ghost, 'w-8 h-8 p-0')}>×</button>
        </div>

        {/* Custom Timeline Option */}
        <div
          onClick={handleNoBossClick}
          className={cn(CARD.interactive, 'border-2 border-dashed p-4 mb-6 flex items-center gap-4', selectedBoss?.id === null && 'opacity-70 scale-[0.98]')}
        >
          <div className="text-2xl">✨</div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text)]">Custom Timeline</h3>
            <p className="text-sm text-[var(--color-textSecondary)] m-0">Create from scratch using the boss actions library</p>
          </div>
        </div>

        {/* Tier Sections */}
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          {BOSS_TIERS.map(tier => {
            const tierBosses = tier.bossIds
              .map(id => bosses.find(b => b.id === id))
              .filter(Boolean);
            
            return (
              <div key={tier.id} className="border-b border-[var(--color-border)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleTier(tier.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bgSecondary)] hover:bg-[var(--color-bgHover)] transition-colors text-left"
                >
                  <span className="font-medium text-[var(--color-text)]">{tier.name}</span>
                  {expandedTiers[tier.id] ? (
                    <ChevronDown size={18} className="text-[var(--color-textSecondary)]" />
                  ) : (
                    <ChevronRight size={18} className="text-[var(--color-textSecondary)]" />
                  )}
                </button>
                {expandedTiers[tier.id] && (
                  <div className="bg-[var(--color-bg)] grid grid-cols-2 gap-3 p-3">
                    {tierBosses.map(boss => {
                      const enabled = isBossEnabled(boss.id);
                      const isSelected = selectedBoss?.id === boss.id;
                      
                      return (
                        <div
                          key={boss.id}
                          onClick={() => handleBossClick(boss)}
                          className={cn(
                            'p-4 rounded-lg border transition-all text-center',
                            enabled && !isSelected && 'border-[var(--color-border)] hover:border-blue-400 hover:bg-[var(--color-bgHover)] cursor-pointer',
                            enabled && isSelected && 'border-blue-500 bg-blue-50 dark:bg-blue-950/40',
                            !enabled && 'border-[var(--color-border)] opacity-50 cursor-not-allowed'
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
                            enabled ? 'text-[var(--color-text)]' : 'text-[var(--color-textSecondary)]'
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
      </div>
    </div>
  );
};

export default BossSelectionModal;
