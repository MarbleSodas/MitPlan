import React from 'react';
import { X } from 'lucide-react';
import { ffxivJobs } from '../../../data';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ClassSelectionModal = ({ isOpen, onClose, mitigation, eligibleJobs = [], onSelectJob }) => {
  if (!isOpen) return null;

  const jobMetaById = new Map();
  Object.values(ffxivJobs).forEach(list => list.forEach(j => jobMetaById.set(j.id, j)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Select Caster</DialogTitle>
        </DialogHeader>

        <div className="mb-3 text-foreground">
          <strong>{mitigation?.name}</strong>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {eligibleJobs.map(jobId => {
            const meta = jobMetaById.get(jobId);
            return (
              <Button
                key={jobId}
                variant="ghost"
                onClick={() => onSelectJob(jobId)}
                className="flex flex-col items-center justify-center gap-1.5 min-h-[96px] rounded-lg text-center transition-transform hover:-translate-y-[3px] p-3 bg-background hover:bg-accent"
              >
                {meta?.icon && <img src={meta.icon} alt={meta?.name || jobId} className="w-11 h-11" />}
                <span className="text-xs font-bold tracking-wide">{jobId}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassSelectionModal;
