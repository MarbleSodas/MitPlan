import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { ffxivJobs } from '../../../data';
import { useTheme } from '../../../contexts/ThemeContext';

const ClassSelectionModal = ({ isOpen, onClose, mitigation, eligibleJobs = [], onSelectJob }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const modalRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    if (isOpen) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const jobMetaById = new Map();
  Object.values(ffxivJobs).forEach(list => list.forEach(j => jobMetaById.set(j.id, j)));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div ref={modalRef} className="w-[90%] max-w-[480px] rounded-xl p-5" style={{ backgroundColor: colors.secondary, boxShadow: theme.shadows?.large }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="m-0 text-lg font-semibold" style={{ color: colors.text }}>Select Caster</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:opacity-80" style={{ color: colors.text }}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-3" style={{ color: colors.text }}>
          <strong>{mitigation?.name}</strong>
        </div>

        <div className="grid grid-cols-3 gap-[14px]">
          {eligibleJobs.map(jobId => {
            const meta = jobMetaById.get(jobId);
            return (
              <button key={jobId} onClick={() => onSelectJob(jobId)} className="flex flex-col items-center justify-center gap-1.5 min-h-[96px] rounded-md text-center transition-transform hover:-translate-y-[3px]" style={{ padding: '14px 12px', background: colors.background, color: colors.text }}>
                {meta?.icon && <img src={meta.icon} alt={meta?.name || jobId} className="w-11 h-11" />}
                <span className="text-[12px] font-bold tracking-[0.3px]">{jobId}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassSelectionModal;
