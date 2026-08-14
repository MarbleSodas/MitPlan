'use client';

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@/lib/navigation';
import { redeemPlanInvite } from '../../services/normalizedPlanService';

const PlanInviteRedeemer = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This invite link is incomplete.');
      return;
    }

    let active = true;
    void redeemPlanInvite(token)
      .then(({ planId }) => {
        if (active) navigate(`/plan/edit/${planId}`, { replace: true });
      })
      .catch((redeemError) => {
        if (active) {
          setError(
            redeemError instanceof Error
              ? redeemError.message
              : 'This invite is invalid, expired, or already used.'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [navigate, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Joining plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || 'Redeeming your authenticated collaboration invite…'}
        </p>
      </div>
    </main>
  );
};

export default PlanInviteRedeemer;
