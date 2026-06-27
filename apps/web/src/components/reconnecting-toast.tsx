/**
 * Reconnecting toast. Architecture §14.6.7 Guardrail 2.
 * Every plan editor shows this for the 150-400ms cold-start window
 * while a hibernated DO reloads its Y.Doc state from Supabase Postgres.
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
