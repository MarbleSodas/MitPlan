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
      className={`flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 ${className}`}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p className="text-sm leading-6">{presence.collaborationError}</p>
    </div>
  );
};

export default CollaborationStatusNotice;
