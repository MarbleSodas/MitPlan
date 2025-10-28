import React from 'react';
import { bosses } from '../../../data';


function BossSelector({ selectedBossId, onSelectBoss, disabled = false, disabledMessage = null }) {


  return (
    <div className="rounded-md p-4 mb-5 shadow-md transition-colors bg-[var(--color-secondary)]">
      <h3 className="m-0 mb-4 pb-2 border-b border-b-[var(--color-border)] text-[var(--color-text)]">Select Boss</h3>
      {disabled && disabledMessage && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
          ℹ️ {disabledMessage}
        </div>
      )}
      <div className="flex flex-wrap gap-2 md:gap-2 justify-start md:justify-start">
        {bosses.map((boss) => {
          const isSelected = boss.id === selectedBossId;
          return (
            <div
              key={boss.id}
              className={`rounded-md p-2 transition-all w-[120px] ${!disabled && 'hover:-translate-y-0.5 hover:shadow-md'} border-2 text-[var(--color-text)] ${isSelected ? 'bg-[var(--select-bg)] border-[var(--color-primary)] font-bold' : 'bg-[var(--color-cardBackground)] border-[var(--color-border)]'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
              onClick={() => disabled ? undefined : onSelectBoss(boss.id)}
            >
              <div className="mb-1 text-center h-10 flex items-center justify-center">
                {typeof boss.icon === 'string' && boss.icon.startsWith('/') ? (
                  <img src={boss.icon} alt={boss.name} className="max-h-10 max-w-10 object-contain" />
                ) : (
                  boss.icon
                )}
              </div>
              <div className="text-center text-[14px]">{boss.name}</div>
              <div className="text-center text-[12px] mt-1 text-[var(--color-lightText)]">Level {boss.level}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BossSelector;
