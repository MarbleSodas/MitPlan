import React, { useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRealtimeJobContext } from '../../../contexts/RealtimeJobContext';

// Role color mapping - using CSS custom properties for dynamic theming
const ROLE_COLORS = {
  tank: '#3D5CDB',
  healer: '#3D9C51',
  melee: '#AF1E3A',
  ranged: '#6C6C6C',
  caster: '#7657C0'
};

function JobSelector({ disabled = false }) {
  const { theme } = useTheme();
  const { selectedJobs: jobs, toggleJobSelection: contextToggleJobSelection } = useRealtimeJobContext();
  const lastClickTimeRef = useRef(new Map());

  const roleIcons = { tank: '🛡️', healer: '💉', melee: '🗡️', ranged: '🏹', caster: '🔮' };
  const roleNames = { tank: 'Tanks', healer: 'Healers', melee: 'Melee DPS', ranged: 'Physical Ranged DPS', caster: 'Magical Ranged DPS' };

  const toggleJobSelection = (roleKey, jobId) => {
    if (disabled) return;
    const clickKey = `${roleKey}-${jobId}`;
    const now = Date.now();
    const lastClickTime = lastClickTimeRef.current.get(clickKey) || 0;
    if (now - lastClickTime < 200) return;
    lastClickTimeRef.current.set(clickKey, now);
    contextToggleJobSelection(roleKey, jobId);
  };

  return (
    <div className="rounded-md shadow-md bg-[var(--color-secondary)] p-[15px] mb-5">
      <h3 className="m-0 mb-4 pb-2.5 border-b border-[var(--color-border)] text-[var(--color-text)]">
        Select FFXIV Jobs
      </h3>

      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {Object.entries(jobs).map(([roleKey, roleJobs]) => (
          <div
            key={roleKey}
            className="rounded-lg shadow-sm p-[15px] mb-[25px] bg-[var(--role-card-bg)]"
            style={{
              '--role-card-bg': theme.mode === 'dark' ? 'rgba(30,30,30,0.6)' : 'rgba(250,250,250,0.8)',
              '--role-color': ROLE_COLORS[roleKey],
              '--role-bg-light': `${ROLE_COLORS[roleKey]}33` // 20% opacity
            }}
          >
            <div className="flex items-center mb-4 pb-2 border-b-2 border-[var(--role-color)]">
              <div className="mr-4 text-[28px] w-10 h-10 flex items-center justify-center rounded-full bg-[var(--role-bg-light)] text-[var(--role-color)]">
                {roleIcons[roleKey]}
              </div>
              <h4 className="m-0 font-bold text-[var(--role-color)] text-lg">
                {roleNames[roleKey]}
              </h4>
            </div>

            <div className="grid gap-3 grid-cols-2">
              {roleJobs.map(job => (
                <div
                  key={job.id}
                  className={`
                    flex flex-col items-center justify-center text-center rounded-md
                    transition-all duration-200 ease-in-out
                    px-2.5 py-2 min-h-[90px] w-full
                    border-2
                    ${job.selected
                      ? 'border-[var(--color-primary)] bg-[var(--job-selected-bg)]'
                      : 'border-[var(--color-border)] bg-[var(--job-bg)]'
                    }
                    ${disabled
                      ? 'opacity-60 cursor-not-allowed'
                      : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--color-primary)]'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                  onClick={() => toggleJobSelection(roleKey, job.id)}
                  style={{
                    '--job-bg': theme.mode === 'dark' ? 'var(--color-cardBackground)' : 'white',
                    '--job-selected-bg': theme.mode === 'dark' ? 'rgba(51,153,255,0.2)' : '#e6f7ff'
                  }}
                >
                  <div className="mb-1.5 h-12 flex items-center justify-center">
                    {typeof job.icon === 'string' && job.icon.startsWith('/') ? (
                      <img src={job.icon} alt={job.name} className="max-h-12 max-w-12" />
                    ) : (
                      job.icon
                    )}
                  </div>
                  <div className={`text-sm mt-1 text-[var(--color-text)] ${job.selected ? 'font-bold' : 'font-normal'}`}>
                    {job.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobSelector;
