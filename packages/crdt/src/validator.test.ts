/**
 * CRDT validator tests. Architecture §20.3.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { PlanDoc } from './schema.js';
import { validatePlanDoc } from './validator.js';

const newDoc = (): PlanDoc => new PlanDoc(new Y.Doc());

describe('PlanDoc validator', () => {
  it('returns violations on an empty doc (meta is required)', () => {
    const doc = newDoc();
    const violations = validatePlanDoc(doc);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('returns 0 violations when meta conforms to PlanMeta', () => {
    const doc = newDoc();
    doc.meta.set('id', '00000000-0000-0000-0000-000000000001');
    doc.meta.set('ownerId', '00000000-0000-0000-0000-000000000002');
    doc.meta.set('name', 'Test plan');
    doc.meta.set('encounterId', '00000000-0000-0000-0000-000000000003');
    doc.meta.set('partyId', '00000000-0000-0000-0000-000000000004');
    doc.meta.set('mode', 'CURRENT');
    doc.meta.set('isLegacy', false);
    doc.meta.set('createdAt', new Date().toISOString());
    doc.meta.set('updatedAt', new Date().toISOString());
    expect(validatePlanDoc(doc)).toEqual([]);
  });
});
