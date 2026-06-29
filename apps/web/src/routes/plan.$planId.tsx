/**
 * Plan editor. The Yjs-backed real-time view. Architecture §3.2, §14.6.5.
 *
 * Path A Hardened (ADR-0003): the realtime provider is our own
 * `SupabaseBroadcastProvider`. The Supabase client is the singleton
 * from `lib/supabase.ts`, read directly by the factory. Snapshots are
 * written via the `upsert_ydoc_snapshot` RPC on a 2s debounce.
 *
 * Layout (Caffeine-styled):
 *   - Top header: back-link, plan name (editable), realtime status
 *     badge, Add-mit CTA.
 *   - Two-column body: left rail = assignments list (live), main
 *     canvas = "what's next" hero card explaining the Phase 2+ timeline.
 *   - AbilityPicker is a right-anchored Sheet.
 *
 * The Y.Doc is created once and shared between the realtime provider
 * (which broadcasts its updates) and `usePlanDoc` (which subscribes
 * to them and exposes them as React state).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { ArrowLeft, Plus, Sparkles, Wifi, WifiOff, Loader2, AlertCircle, Cable } from 'lucide-react';
import { PlanDoc, createPlanDoc } from '@xivmitplan/crdt';
import {
  realtimeProvider,
  type RealtimeProvider,
  type RealtimeStatus,
} from '../lib/realtime-provider.js';
import { useSession } from '../lib/supabase.js';
import { usePlanDoc } from '@/lib/use-plan-doc';
import { SAMPLE_EVENTS } from '@/lib/sample-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AssignmentRow } from '@/components/plan/assignment-row';
import { AbilityPicker } from '@/components/plan/ability-picker';
import { Logo } from '@/components/logo';

const STATUS_BADGE: Record<
  RealtimeStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }
> = {
  connecting: { variant: 'secondary', icon: <Loader2 className="size-3 animate-spin" />, label: 'Connecting' },
  connected: { variant: 'default', icon: <Wifi className="size-3" />, label: 'Live' },
  disconnected: { variant: 'outline', icon: <WifiOff className="size-3" />, label: 'Offline' },
  error: { variant: 'destructive', icon: <AlertCircle className="size-3" />, label: 'Error' },
};

export const PlanEditor = () => {
  const { planId } = useParams<{ planId: string }>();
  const [search] = useSearchParams();
  const session = useSession();
  const [planDoc, setPlanDoc] = useState<PlanDoc | null>(null);
  const providerRef = useRef<RealtimeProvider | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [pickerOpen, setPickerOpen] = useState(false);

  const encounterId = search.get('encounterId') ?? Object.keys(SAMPLE_EVENTS)[0]!;

  const { assignments, addAssignment, removeAssignment, planName, setPlanName, ready } = usePlanDoc(
    planDoc,
    planId ?? '00000000-0000-0000-0000-000000000000',
  );

  // Create the Y.Doc once on mount, destroy on unmount.
  useEffect(() => {
    const doc = createPlanDoc();
    setPlanDoc(doc);
    return () => {
      doc.doc.destroy();
      setPlanDoc(null);
    };
  }, []);

  // Wire the realtime provider to the same Y.Doc. Re-runs only when
  // auth state changes; the Y.Doc itself is stable across renders.
  useEffect(() => {
    if (!planDoc || !planId) return;
    if (session.loading || !session.session) return;
    const accessToken = session.session.access_token;
    if (!accessToken) return;
    const provider = realtimeProvider({
      planId,
      ydoc: planDoc.doc,
      accessToken,
      onStatus: setStatus,
    });
    providerRef.current = provider;
    provider.connect();
    return () => {
      provider.disconnect();
      providerRef.current = null;
    };
  }, [planDoc, planId, session.loading, session.user?.id]);

  if (session.loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }
  if (!session.user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted-foreground text-sm">Please sign in to view this plan.</p>
        <Button asChild className="mt-4">
          <Link to={`/login?next=/plan/${planId}`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[status];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b bg-card/40 px-6 py-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/plan" aria-label="Back to plans">
            <ArrowLeft />
          </Link>
        </Button>
        <Logo className="text-primary hidden sm:block" />
        <Input
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="h-8 max-w-md border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-input"
          aria-label="Plan name"
        />
        <Badge variant={statusInfo.variant} className="gap-1.5">
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
        <div className="ml-auto">
          <Button onClick={() => setPickerOpen(true)} size="sm" disabled={!ready}>
            <Plus /> Add mitigation
          </Button>
        </div>
      </div>

      {/* Body: left rail + main canvas */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="bg-sidebar text-sidebar-foreground flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r p-4">
          <header className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold tracking-widest uppercase">Mitigations</h2>
            <span className="text-muted-foreground font-mono text-[10px]">
              {assignments.length}
            </span>
          </header>
          {assignments.length === 0 ? (
            <div className="border-border bg-card/40 flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No mitigations yet</p>
                <p className="text-muted-foreground text-xs">
                  Click <strong>Add mitigation</strong> to plan your first.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {assignments.map((a) => (
                <AssignmentRow key={a.id} assignment={a} onRemove={removeAssignment} />
              ))}
            </div>
          )}
        </aside>

        <main className="bg-background/40 flex-1 overflow-y-auto p-6">
          <div className="border-border bg-card/40 mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border p-10 text-center">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <Cable className="size-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Realtime bridge is live</h2>
              <p className="text-muted-foreground max-w-md text-sm">
                You're connected to the Yjs broadcast channel for this plan. Open the same
                URL in another tab or browser profile to see edits sync in &lt;100ms.
              </p>
            </div>
            <div className="border-border bg-background/40 mt-2 flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xs">
              <span className="text-muted-foreground">channel</span>
              <span>plan:{planId?.slice(0, 8)}…</span>
            </div>
            <p className="text-muted-foreground mt-4 text-[11px] tracking-wide uppercase">
              Timeline + palette coming in Phase 2
            </p>
          </div>
        </main>
      </div>

      <AbilityPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        encounterId={encounterId}
        onPick={({ ability, event }) => {
          addAssignment({ ability, event });
        }}
      />
    </div>
  );
};