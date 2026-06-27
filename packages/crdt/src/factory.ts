/**
 * PlanDoc factory. Architecture §14.1.
 * The Y.Doc is created fresh on the client (web) and on the server
 * (Hocuspocus on DO). Snapshots are exchanged via the `onSave` /
 * `onLoad` extension pair.
 */
import * as Y from 'yjs';
import { PlanDoc } from './schema.js';

export const createPlanDoc = (existingState?: Uint8Array): PlanDoc => {
  const doc = new Y.Doc();
  const plan = new PlanDoc(doc);
  if (existingState && existingState.byteLength > 0) {
    Y.applyUpdate(doc, existingState);
  }
  return plan;
};

/**
 * Rebuild a Y.Doc from a stored snapshot, garbage-collecting tombstones.
 * Used by the §14.5 rebuild policy when the doc size > 2MB.
 */
export const rebuildPlanDoc = (cleanState: Uint8Array): PlanDoc => {
  const doc = new Y.Doc({ gc: true });
  Y.applyUpdate(doc, cleanState);
  return new PlanDoc(doc);
};
