/**
 * Plan index. The user's plan list. Architecture §3.2, §15.1.
 *
 * Phase 0: stub. Phase 1+ swaps `listSamplePlans` for `rpc('list_my_plans')`.
 *
 * The Caffeine header layout: page title + new-plan CTA on the right,
 * skeleton during the 200ms simulated load, then a responsive grid of
 * PlanCards. The "New plan" CTA opens a Dialog to capture the plan name
 * + encounter, then navigates to `/plan/<freshly-generated-uuid>`.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { useSession } from '../lib/supabase.js';
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
import { newPlanId, SAMPLE_PLANS, FRU_P1_ID } from '@/lib/sample-data';

export const PlanIndex = () => {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  if (session.loading) return null;
  if (!session.user) {
    // Handled client-side — replace with the redirect helper when the
    // auth gate moves into a layout route (Phase 2+).
    navigate('/login?next=/plan', { replace: true });
    return null;
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newPlanId();
    // Phase 0 stub: pretend we created the plan and bounce into the editor.
    // Phase 1+ swaps this for `plans-create` Edge Function.
    if (!SAMPLE_PLANS.some((p) => p.meta.id === id)) {
      // (We don't actually push into SAMPLE_PLANS — it's a frozen stub
      //  for the list view. The new id will resolve via `/plan/<id>` to
      //  an empty PlanDoc in the editor.)
    }
    setOpen(false);
    setName('');
    navigate(`/plan/${id}?name=${encodeURIComponent(name.trim())}&encounterId=${FRU_P1_ID}`);
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus /> New plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>New plan</DialogTitle>
                <DialogDescription>
                  Give your plan a name. You can rename it later.
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
              <DialogFooter className="-mx-4 -mb-4 mt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>
      <PlanList />
    </div>
  );
};