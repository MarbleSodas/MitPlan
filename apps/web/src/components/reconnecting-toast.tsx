/**
 * Reconnecting toast. Architecture §14.6.7 Guardrail 2 (generalised).
 *
 * Every plan editor triggers this for the SUBSCRIBE round-trip when the
 * realtime provider reconnects (cold open of a plan, mid-session token
 * refresh, network blip). The exact latency budget depends on the
 * transport — Supabase Realtime Broadcast is typically <100ms for first
 * SUBSCRIBE.
 *
 * Backed by Sonner (mounted at app root via `<AppToaster />`). The
 * imperative `showReconnecting(message)` API is preserved so the
 * realtime provider doesn't need to know about toast UI.
 */
import { toast } from 'sonner';

let _dedupeTimer: ReturnType<typeof setTimeout> | null = null;
let _lastMessage = '';

/** Imperative API used by the realtime provider on reconnect. */
export const showReconnecting = (message = 'Reconnecting…'): void => {
  // Dedupe: if the same message fired again within 1.5s, ignore.
  // The realtime provider may surface multiple lifecycle events for a
  // single reconnect; we don't want a stack of identical toasts.
  if (_dedupeTimer && _lastMessage === message) return;
  _lastMessage = message;
  if (_dedupeTimer) clearTimeout(_dedupeTimer);
  _dedupeTimer = setTimeout(() => {
    _dedupeTimer = null;
    _lastMessage = '';
  }, 1500);
  toast.info(message, {
    duration: 1500,
    id: 'reconnecting',
  });
};

/** Empty component — Sonner viewport is mounted at app root. */
export const ReconnectingToast = () => null;