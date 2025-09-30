import { useState } from 'react';
import { bosses } from '../../data';


const BossSelectionModal = ({ onClose, onSelectBoss }) => {
  const [selectedBoss, setSelectedBoss] = useState(null);

  const handleBossClick = (boss) => {
    setSelectedBoss(boss);
    // Small delay for visual feedback before proceeding
    setTimeout(() => {
      onSelectBoss(boss.id);
    }, 150);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 p-8 rounded-xl max-w-3xl w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Select Boss Encounter</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">Choose a boss to create a mitigation plan for</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800">×</button>
        </div>

        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-6 mt-4">
          {bosses.map(boss => (
            <div
              key={boss.id}
              onClick={() => handleBossClick(boss)}
              className="bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer transition-transform shadow-sm hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-lg active:-translate-y-0.5 text-center relative overflow-hidden"
              style={{
                opacity: selectedBoss?.id === boss.id ? 0.7 : 1,
                transform: selectedBoss?.id === boss.id ? 'scale(0.98)' : undefined
              }}
            >
              <div className="text-3xl mb-4 h-[60px] flex items-center justify-center">
                {typeof boss.icon === 'string' && boss.icon.startsWith('/') ? (
                  <img src={boss.icon} alt={boss.name} className="max-h-[60px] max-w-[60px] object-contain" />
                ) : (
                  boss.icon
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{boss.name}</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Level {boss.level}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 m-0 leading-snug overflow-hidden">{boss.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BossSelectionModal;
