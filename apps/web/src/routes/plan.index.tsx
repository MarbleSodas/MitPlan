/**
 * Plan index. The user's plan list. Architecture §3.2, §15.1.
 */
import { Link, Navigate } from 'react-router';
import { useSession } from '../lib/supabase.js';

export const PlanIndex = () => {
  const session = useSession();
  if (session.loading) return <p>Loading…</p>;
  if (!session.user) return <Navigate to="/login?next=/plan" replace />;
  return (
    <div className="plan-index">
      <h1>Your plans</h1>
      <p className="muted">Phase 0 stub. Phase 2+ lists your plans from /v1/plans.</p>
      <Link to="/plan/new" className="btn-primary">
        New plan
      </Link>
    </div>
  );
};
