/**
 * Data policy page. Static informational page linked from the
 * app-shell footer. Outlines what data XIVMitPlan collects, how it
 * is stored, and how the user can request deletion.
 *
 * ADR-0001 §1.1 #3: account-required auth. We collect the minimum
 * needed to provide the product (Supabase Auth id + email + plan
 * content). No analytics, no third-party tracking.
 */
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const DataPolicyPage = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Data policy</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What XIVMitPlan stores, why, and how to remove it.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What we store</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Your Supabase Auth account (id, email, display name, avatar URL if
            your OAuth provider supplied one) and the plans you create:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Plan metadata (name, encounter, creation timestamp)</li>
            <li>Plan content (mitigation assignments, edit history)</li>
            <li>Realtime presence (who is currently viewing a plan)</li>
            <li>Yjs snapshots (CRDT state for cold-reopen)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where it's stored</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            All data lives in our Supabase project (Postgres + Realtime +
            Edge Functions). Snapshots additionally upload to Cloudflare R2
            for backups. Both providers are SOC 2 compliant.
          </p>
          <p>
            No third-party analytics, no advertising trackers, no data sale
            or sharing.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sharing &amp; collaboration</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            When you generate a share link, the recipient must sign in to
            redeem it — we never grant anonymous access. Redeeming grants
            them a role on the plan (VIEWER or EDITOR) that you can revoke
            at any time from the Share dialog.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account deletion</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Sign in, open the account menu (top right), and choose
            <strong> Delete account</strong>. We will permanently remove your
            auth row, profile, plans, plan_access grants, and snapshots
            within 30 days.
          </p>
          <p>
            Until self-serve deletion ships, email{' '}
            <a
              href="mailto:privacy@xivmitplan.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              privacy@xivmitplan.com
            </a>{' '}
            to request deletion.
          </p>
        </CardContent>
      </Card>

      <div className="pt-4">
        <Button asChild variant="outline">
          <Link to="/plan">Back to plans</Link>
        </Button>
      </div>
    </div>
  );
};