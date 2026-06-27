/**
 * @xivmitplan/crdt — Yjs document shape + awareness + validators.
 * Architecture §14.1, §14.3.
 *
 * Path A (ADR-0002): also exports the provider-agnostic RealtimeProvider
 * interface. Concrete bindings live in apps/web/src/lib/realtime-provider.ts.
 */
export * from './schema.js';
export * from './awareness.js';
export * from './factory.js';
export * from './validator.js';
export * from './provider.js';
