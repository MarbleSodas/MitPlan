/**
 * Learn mode — single encounter. Read-only timeline view. Architecture §3.1, §15.1.
 *
 * Phase 0: stub. Phase 1+ renders the timeline with confidence badges.
 */
import { useParams } from 'react-router';

export const LearnEncounter = () => {
  const { encounterId } = useParams<{ encounterId: string }>();
  return (
    <div className="learn-encounter">
      <h1>Encounter {encounterId?.slice(0, 8)}</h1>
      <p className="muted">Phase 0 stub. Phase 1+ renders the timeline.</p>
    </div>
  );
};
