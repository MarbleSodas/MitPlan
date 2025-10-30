import { useState } from 'react';
import { bosses } from '../../data';
import { BUTTON, MODAL, CARD, cn } from '../../styles/designSystem';


const BossSelectionModal = ({ onClose, onSelectBoss }) => {
  const [selectedBoss, setSelectedBoss] = useState(null);

  const handleBossClick = (boss) => {
    setSelectedBoss(boss);
    // Small delay for visual feedback before proceeding
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={cn(MODAL.title, 'text-2xl mb-2')}>Select Boss Encounter (Optional)</h2>
            <p className="text-[var(--color-textSecondary)] text-base">Choose a boss to start with their timeline, or create a custom plan</p>
          </div>
          <button onClick={onClose} className={cn(BUTTON.ghost, 'w-8 h-8 p-0')}>×</button>
        </div>

        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-6 mt-4">
          {/* No Boss Option */}
          <div
            onClick={handleNoBossClick}
            className={cn(CARD.interactive, 'border-2 border-dashed p-6 text-center', selectedBoss?.id === null && 'opacity-70 scale-[0.98]')}
          >
            <div className="text-3xl mb-4 h-[60px] flex items-center justify-center">
              ✨
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Custom Timeline</h3>
            <div className="text-sm text-[var(--color-textSecondary)] mb-3">No Boss</div>
            <p className="text-sm text-[var(--color-textSecondary)] m-0 leading-snug overflow-hidden">Create a custom timeline from scratch using the boss actions library</p>
          </div>

          {/* Boss Options */}
          {bosses.map(boss => (
            <div
              key={boss.id}
              onClick={() => handleBossClick(boss)}
              className={cn(CARD.interactive, 'p-6 text-center', selectedBoss?.id === boss.id && 'opacity-70 scale-[0.98]')}
            >
              <div className="text-3xl mb-4 h-[60px] flex items-center justify-center">
                {typeof boss.icon === 'string' && boss.icon.startsWith('/') ? (
                  <img src={boss.icon} alt={boss.name} className="max-h-[60px] max-w-[60px] object-contain" />
                ) : (
                  boss.icon
                )}
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">{boss.name}</h3>
              <div className="text-sm text-[var(--color-textSecondary)] mb-3">Level {boss.level}</div>
              <p className="text-sm text-[var(--color-textSecondary)] m-0 leading-snug overflow-hidden">{boss.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BossSelectionModal;
