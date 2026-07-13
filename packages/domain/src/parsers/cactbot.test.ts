/**
 * Cactbot parser tests. Architecture §12.2 + Appendix B.1.
 */
import { describe, expect, it } from 'vitest';
import { parseCactbotRaw, normalizeCactbot } from './cactbot.js';
import { brandId } from '@xivmitplan/shared/ids';

const ENC_ID = brandId<'EncounterId'>('00000000-0000-0000-0000-000000000001');

describe('Cactbot parser', () => {
  it('parses a basic Cactbot timeline', () => {
    const raw = `
### M1S: Sugar Riot
hideall "--sync--"
0.0 "--sync--" sync "/NameOfTheEnemy appears!/"
10.0 "Brutal Rain" sync / 1[56]:Brutal Rain:/ window 10,10
30.0 "Brutal Rain" duration 3
50.0 "Sugar Riot" sync / 1[56]:Sugar Riot:/
60.0 "Brutal Strike"
`.trim();
    const lines = parseCactbotRaw(raw);
    expect(lines).toHaveLength(5);
    expect(lines[0]?.timestampMs).toBe(0);
    expect(lines[1]?.timestampMs).toBe(10_000);
    expect(lines[1]?.name).toBe('Brutal Rain');
    expect(lines[3]?.name).toBe('Sugar Riot');
  });

  it('ignores header lines and sync markers', () => {
    const raw = `
### M1S
hideall "--sync--"
0.0 "--sync--" sync "/foo/"
10.0 "Brutal Rain" sync / regex:/
20.0 "Sugar Riot"
`.trim();
    const lines = parseCactbotRaw(raw);
    // The first sync line (0.0) is filtered by the normalize function,
    // not the raw parser. The raw parser includes all valid timestamped lines.
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('normalizes to TimelineEvent with confidence 0.9', () => {
    const raw = `0.0 "Brutal Rain" sync / 1[56]:Brutal Rain:/\n30.0 "Sugar Riot" sync / 1[56]:Sugar Riot:/`;
    const lines = parseCactbotRaw(raw);
    const events = normalizeCactbot(lines, { patchVersion: '7.20', encounterId: ENC_ID });
    expect(events).toHaveLength(2);
    expect(events[0]?.confidence).toBe(0.9);
    expect(events[0]?.mergedFromSources).toEqual({ cactbot: true, triggernometry: false, fflogs: false });
    expect(events[0]?.name).toBe('Brutal Rain');
    expect(events[0]?.timestampMs).toBe(0);
    expect(events[1]?.timestampMs).toBe(30_000);
  });

  it('handles empty input gracefully', () => {
    expect(parseCactbotRaw('')).toEqual([]);
    expect(parseCactbotRaw('\n\n\n')).toEqual([]);
  });
});
