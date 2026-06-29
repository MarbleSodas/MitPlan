/**
 * Reconnecting toast. Architecture §14.6.7 Guardrail 2 (generalised).
 *
 * Every plan editor shows this for the SUBSCRIBE round-trip when the
 * realtime provider reconnects (cold open of a plan, mid-session token
 * refresh, network blip). The exact latency budget depends on the
 * transport — Supabase Realtime Broadcast is typically <100ms for
 * first SUBSCRIBE; a Hocuspocus-on-DO swap (ADR-0003 §"v2 re-introduction
 * triggers") would push that to 150-400ms for hibernated DOs.
 */
import { useEffect, useState } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  ts: number;
}

let _push: ((message: string) => void) | null = null;

/** Imperative API used by the realtime provider on reconnect. */
export const showReconnecting = (message = 'Reconnecting…'): void => {
  _push?.(message);
};

export const ReconnectingToast = () => {
  const [state, setState] = useState<ToastState>({ visible: false, message: '', ts: 0 });

  useEffect(() => {
    _push = (message: string) => setState({ visible: true, message, ts: Date.now() });
    return () => {
      _push = null;
    };
  }, []);

  useEffect(() => {
    if (!state.visible) return;
    const t = setTimeout(() => setState((s) => ({ ...s, visible: false })), 1_500);
    return () => clearTimeout(t);
  }, [state.ts, state.visible]);

  if (!state.visible) return null;
  return (
    <div className="reconnecting-toast" role="status" aria-live="polite">
      {state.message}
    </div>
  );
};
