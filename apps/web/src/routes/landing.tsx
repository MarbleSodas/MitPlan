/**
 * Landing page. The unauthenticated root route (/). Shows the product
 * pitch, feature highlights, and CTAs to sign in and create a plan.
 * Replaces the bare redirect to /plan.
 */
import { Link } from 'react-router';
import { Shield, Users, Zap, Clock, Swords, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';
import { useSession } from '@/lib/supabase';

const FEATURES = [
  {
    icon: Shield,
    title: 'Real-time mit planning',
    desc: 'Plan raid mitigations with your static group. See changes sync live across all viewers.',
  },
  {
    icon: BarChart3,
    title: 'Mit stack calculator',
    desc: 'Instantly see the residual damage % for every mechanic. Spot gaps and overlaps at a glance.',
  },
  {
    icon: Clock,
    title: 'Cooldown tracking',
    desc: 'Ability cooldowns are tracked across events. No double-booking the same Rampart.',
  },
  {
    icon: Users,
    title: 'Live collaboration',
    desc: 'See who is viewing the plan right now. Every edit syncs in real-time via CRDT.',
  },
  {
    icon: Swords,
    title: 'FFXIV encounter timelines',
    desc: 'Pre-loaded timelines for current raids and extreme trials. Click an event and assign mits.',
  },
  {
    icon: Zap,
    title: 'Drag and drop',
    desc: 'Drag abilities from the quick-mit strip directly onto timeline events. Fast, tactile planning.',
  },
];

export const LandingPage = () => {
  const session = useSession();
  const isLoggedIn = !session.loading && !!session.user;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="bg-primary/5 absolute inset-0 -z-10" />
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-20 text-center">
          <Badge variant="secondary" className="font-mono text-[10px]">
            FFXIV Mitigation Planner
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plan your mitigations
            <br />
            <span className="text-primary">with your static</span>
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg">
            A real-time collaborative tool for planning raid mitigations
            in FFXIV. See mit coverage, track cooldowns, and sync with
            your group — all in one place.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to={isLoggedIn ? '/plan' : '/login?next=/plan'}>
                {isLoggedIn ? 'Go to your plans' : 'Get started'}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a
                href="https://github.com/MarbleSodas/MitPlan"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-muted-foreground mb-8 text-center text-xs font-semibold tracking-widest uppercase">
          What you can do
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card rounded-xl border p-5"
            >
              <div className="bg-primary/10 text-primary mb-3 flex size-9 items-center justify-center rounded-lg">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-1 text-sm font-semibold">{title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Logo className="text-primary" />
          <p className="text-muted-foreground text-xs">
            Built for FFXIV raiders. Not affiliated with Square Enix.
          </p>
        </div>
      </footer>
    </div>
  );
};
