import { AlertTriangle } from 'lucide-react';
import { usePresenceOptional } from '../../contexts/PresenceContext';

interface CollaborationStatusNoticeProps {
  className?: string;
}

const CollaborationStatusNotice = ({
  className = '',
}: CollaborationStatusNoticeProps) => {
  const presence = usePresenceOptional();

  if (!presence || presence.collaborationAvailable || !presence.collaborationError) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-warning ${className}`}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p className="text-sm leading-6">{presence.collaborationError}</p>
    </div>
  );
};

export default CollaborationStatusNotice;
