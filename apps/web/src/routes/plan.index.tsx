/**
 * Plan index. The user's plan list. Architecture §3.2, §15.1.
 *
 * Phase 1:
 *   - Lists the user's plans via `data-source.listMyPlans()` (which
 *     routes to `rpc('plans_list')` when Supabase is configured).
 *   - "New plan" CTA opens a dialog with a name input + encounter
 *     picker (EncounterPicker). On submit, calls
 *     `data-source.createPlan(...)` which hits the `plans-create`
 *     Edge Function when Supabase is configured (minting a real
 *     UUID + inserting a plans row + pre-creating the
 *     `ydoc_snapshots` placeholder row), or mints a local UUID in
 *     fallback mode.
 *   - Navigates to `/plan/<planId>?encounter=<id>` on success.
 *
 * Caffeine header layout: page title + new-plan CTA on the right,
 * skeleton during the data-source load, then a responsive grid of
 * PlanCards.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '../lib/supabase.js';
import { claimLegacyPlans, createPlan, listClaimableLegacyPlans } from '@/lib/data-source';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlanList } from '@/components/plan/plan-list';
import { EncounterPicker } from '@/components/plan/encounter-picker';

export const PlanIndex = () => {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [claimablePlans, setClaimablePlans] = useState<Array<{ id: string; name: string }>>([]);
  const [claiming, setClaiming] = useState(false);

  // Handled client-side — replace with the redirect helper when the
  // auth gate moves into a layout route (Phase 2+). In a useEffect so
  // we don't navigate during render.
  useEffect(() => {
    if (!session.loading && !session.user) {
      navigate('/login?next=/plan', { replace: true });
    }
  }, [session.loading, session.user, navigate]);

  useEffect(() => {
    if (!session.user) return;
    let mounted = true;
    listClaimableLegacyPlans()
      .then((plans) => {
        if (mounted) setClaimablePlans(plans);
      })
      .catch(() => {
        if (mounted) setClaimablePlans([]);
      });
    return () => {
      mounted = false;
    };
  }, [session.user?.id]);

  // Early returns go BELOW all hook declarations — the React Rules of
  // Hooks forbid changing the hook count between renders, so all
  // `useState`/`useEffect` calls must happen unconditionally.
  if (session.loading) return null;
  if (!session.user) return null;

  const reset = () => {
    setName('');
    setEncounterId(null);
    setSubmitError(null);
    setSubmitting(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !encounterId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { planId } = await createPlan({
        name: name.trim(),
        encounterId,
        mode: 'CURRENT',
      });
      setOpen(false);
      reset();
      navigate(`/plan/${planId}?name=${encodeURIComponent(name.trim())}&encounterId=${encounterId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create plan');
      setSubmitting(false);
    }
  };

  const handleClaim = async () => {
    if (claiming || claimablePlans.length === 0) return;
    setClaiming(true);
    try {
      const claimed = await claimLegacyPlans(claimablePlans.map((plan) => plan.id));
      setClaimablePlans([]);
      toast.success(`Claimed ${claimed} imported ${claimed === 1 ? 'plan' : 'plans'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not claim imported plans');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your plans</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Plan FFXIV raid mitigations with your static group in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {claimablePlans.length > 0 && (
            <Button variant="outline" onClick={handleClaim} disabled={claiming}>
              {claiming ? 'Claiming…' : `Claim ${claimablePlans.length} imported plans`}
            </Button>
          )}
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus /> New plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>New plan</DialogTitle>
                <DialogDescription>
                  Pick a base timeline. You can rename the plan and re-anchor mitigations
                  later.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-name">Plan name</Label>
                <Input
                  id="plan-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="FRU P1 prog"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Base timeline</Label>
                <EncounterPicker value={encounterId} onChange={setEncounterId} />
              </div>
              {submitError && (
                <p className="text-destructive text-sm">Could not create plan: {submitError}</p>
              )}
              <DialogFooter className="-mx-4 -mb-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || !encounterId || submitting}>
                  {submitting ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </header>
      <PlanList />
    </div>
  );
};
