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
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import type { AbilityMode } from '@xivmitplan/validation/ability';

export const PlanIndex = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [encounterId, setEncounterId] = useState<string | null>(() => search.get('encounterId'));
  const [mode, setMode] = useState<AbilityMode>('CURRENT');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [plansRevision, setPlansRevision] = useState(0);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const plans = await listClaimableLegacyPlans();
        if (!mounted || plans.length === 0) return;
        const claimed = await claimLegacyPlans(plans.map((plan) => plan.id));
        if (!mounted || claimed === 0) return;
        setPlansRevision((revision) => revision + 1);
        toast.success(`Imported ${claimed} ${claimed === 1 ? 'plan' : 'plans'}`);
      } catch (error) {
        if (mounted) {
          toast.error(
            error instanceof Error ? error.message : 'Could not import your previous plans',
          );
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const reset = () => {
    setName('');
    setEncounterId(null);
    setMode('CURRENT');
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
        mode,
      });
      setOpen(false);
      reset();
      navigate(
        `/plan/${planId}?name=${encodeURIComponent(name.trim())}&encounterId=${encounterId}&mode=${mode}`,
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create plan');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your plans</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Plan FFXIV raid mitigations with your static group in real time.
          </p>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <Button asChild variant="outline" size="lg" className="hidden sm:inline-flex">
            <Link to="/timeline">Browse timelines</Link>
          </Button>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) reset();
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="size-4" /> New plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <DialogHeader>
                  <DialogTitle>New plan</DialogTitle>
                  <DialogDescription>
                    Pick a base timeline. You can rename the plan and re-anchor mitigations later.
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
                    aria-describedby={submitError ? 'plan-create-error' : undefined}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Base timeline</Label>
                  <EncounterPicker value={encounterId} onChange={setEncounterId} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="plan-mode">Ruleset</Label>
                  <select
                    id="plan-mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as AbilityMode)}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="REBORN">7.x actions</option>
                    <option value="EVOLVED">8.0 evolved actions</option>
                    <option value="CURRENT">Current actions</option>
                    <option value="ALL">All catalog modes</option>
                  </select>
                </div>
                {submitError && (
                  <p id="plan-create-error" className="text-destructive text-sm" role="alert">
                    {submitError}
                  </p>
                )}
                <DialogFooter className="-mx-4 -mb-4 mt-2 flex-col-reverse gap-2 sm:flex-row">
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
      <PlanList key={plansRevision} />
    </div>
  );
};
