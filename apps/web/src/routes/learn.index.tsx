/**
 * Learn mode index. The encounter browser. Architecture §3.1, §15.1.
 *
 * Phase 0: stub. Phase 1+ fetches from /v1/encounters via tRPC.
 */
import { Link } from 'react-router';

const PLACEHOLDER_ENCOUNTERS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Futures Rewritten (FRU) — Phase 1', raid: 'FRU' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'M1S — Sugar Riot', raid: 'M1S' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'M2S — Howling Blade', raid: 'M2S' },
];

export const LearnIndex = () => (
  <div className="learn-index">
    <h1>Encounter browser</h1>
    <p className="muted">
      Browse and learn FFXIV raid mitigations. Phase 0: static list. Phase 1+ connects to the
      catalog API.
    </p>
    <ul className="encounter-list">
      {PLACEHOLDER_ENCOUNTERS.map((e) => (
        <li key={e.id}>
          <Link to={`/learn/${e.id}`}>
            <strong>{e.name}</strong>
            <span className="raid">{e.raid}</span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
