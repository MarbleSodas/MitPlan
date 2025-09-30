import React, { useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useRealtimeJobContext } from '../../../contexts/RealtimeJobContext';

function JobSelector({ disabled = false }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { selectedJobs: jobs, toggleJobSelection: contextToggleJobSelection } = useRealtimeJobContext();
  const lastClickTimeRef = useRef(new Map());

  const roleIcons = { tank: '🛡️', healer: '💉', melee: '🗡️', ranged: '🏹', caster: '🔮' };
  const roleNames = { tank: 'Tanks', healer: 'Healers', melee: 'Melee DPS', ranged: 'Physical Ranged DPS', caster: 'Magical Ranged DPS' };

  const roleColor = (roleKey) => ({
    tank: '#3D5CDB', healer: '#3D9C51', melee: '#AF1E3A', ranged: '#6C6C6C', caster: '#7657C0'
  }[roleKey] || colors.text);

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
    <div className="rounded-md shadow-md" style={{ backgroundColor: colors.secondary, padding: 15, marginBottom: 20 }}>
      <h3 className="m-0 mb-4" style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: 10, color: colors.text }}>Select FFXIV Jobs</h3>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {Object.entries(jobs).map(([roleKey, roleJobs]) => (
          <div key={roleKey} className="rounded-lg shadow-sm" style={{ backgroundColor: theme.mode === 'dark' ? 'rgba(30,30,30,0.6)' : 'rgba(250,250,250,0.8)', padding: 15, marginBottom: 25 }}>
            <div className="flex items-center mb-4 pb-2 border-b-2" style={{ borderBottomColor: roleColor(roleKey) }}>
              <div className="mr-4 text-[28px] w-10 h-10 flex items-center justify-center rounded-full" style={{ backgroundColor: roleKey==='tank'?'rgba(61,92,219,0.2)':roleKey==='healer'?'rgba(61,156,81,0.2)':roleKey==='melee'?'rgba(175,30,58,0.2)':roleKey==='ranged'?'rgba(108,108,108,0.2)':'rgba(118,87,192,0.2)', color: roleColor(roleKey) }}>
                {roleIcons[roleKey]}
              </div>
              <h4 className="m-0 font-bold" style={{ color: roleColor(roleKey), fontSize: 18 }}>{roleNames[roleKey]}</h4>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {roleJobs.map(job => (
                <div
                  key={job.id}
                  className="flex flex-col items-center justify-center text-center rounded-md transition-all"
                  onClick={() => toggleJobSelection(roleKey, job.id)}
                  style={{
                    backgroundColor: theme.mode === 'dark' ? (job.selected ? 'rgba(51,153,255,0.2)' : colors.cardBackground) : (job.selected ? '#e6f7ff' : 'white'),
                    border: `2px solid ${job.selected ? colors.primary : colors.border}`,
                    padding: '8px 10px',
                    minHeight: 90,
                    width: '100%',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = theme.shadows?.medium;
                    e.currentTarget.style.borderColor = colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.borderColor = job.selected ? colors.primary : colors.border;
                  }}
                >
                  <div className="mb-1.5 h-12 flex items-center justify-center">
                    {typeof job.icon === 'string' && job.icon.startsWith('/') ? (
                      <img src={job.icon} alt={job.name} style={{ maxHeight: 48, maxWidth: 48 }} />
                    ) : (
                      job.icon
                    )}
                  </div>
                  <div className="text-[14px] mt-1" style={{ color: colors.text, fontWeight: job.selected ? 'bold' : 'normal' }}>{job.name}</div>
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
