import type { BossAction } from '../types/index.js';
import type { DamageMapping } from '../sources/cactbot/syncMapper.js';

export interface ValidationResult {
  totalCactbotActions: number;
  matchedActions: number;
  unmatchedActions: UnmatchedAction[];
  matchRate: number;
  suggestions: string[];
}

export interface UnmatchedAction {
  name: string;
  time: number;
  occurrence: number;
  possibleMatches: string[];
}

export function validateCactbotMapping(
  cactbotActions: BossAction[],
  mappings: DamageMapping[],
  fflogsAbilityNames: Set<string>
): ValidationResult {
  const unmatched: UnmatchedAction[] = [];
  const matched: DamageMapping[] = [];
  
  const occurrenceCounts = new Map<string, number>();

  for (const mapping of mappings) {
    const baseName = mapping.cactbotAction.name.toLowerCase()
      .replace(/\s+x\d+$/i, '')
      .replace(/\s*\([^)]+\)$/i, '')
      .trim();
    
    const occurrence = (occurrenceCounts.get(baseName) || 0) + 1;
    occurrenceCounts.set(baseName, occurrence);

    if (mapping.matched) {
      matched.push(mapping);
    } else {
      const possibleMatches = findPossibleMatches(mapping.cactbotAction.name, fflogsAbilityNames);
      unmatched.push({
        name: mapping.cactbotAction.name,
        time: mapping.cactbotAction.time,
        occurrence,
        possibleMatches,
      });
    }
  }

  const matchRate = mappings.length > 0 ? matched.length / mappings.length : 0;

  const suggestions = generateSuggestions(unmatched, matchRate);

  return {
    totalCactbotActions: cactbotActions.length,
    matchedActions: matched.length,
    unmatchedActions: unmatched,
    matchRate,
    suggestions,
  };
}

function findPossibleMatches(cactbotName: string, fflogsNames: Set<string>): string[] {
  const normalized = cactbotName.toLowerCase()
    .replace(/\s+x\d+$/i, '')
    .replace(/\s*\([^)]+\)$/i, '')
    .replace(/[^a-z0-9]/g, '');

  const matches: Array<{ name: string; score: number }> = [];

  for (const fflogsName of fflogsNames) {
    const fflogsNorm = fflogsName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (fflogsNorm.includes(normalized) || normalized.includes(fflogsNorm)) {
      matches.push({ name: fflogsName, score: 0.9 });
      continue;
    }

    const score = calculateSimilarity(normalized, fflogsNorm);
    if (score > 0.5) {
      matches.push({ name: fflogsName, score });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => m.name);
}

function calculateSimilarity(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  let matchingChars = 0;
  let lastMatchIndex = -1;
  
  for (const char of shorter) {
    const idx = longer.indexOf(char, lastMatchIndex + 1);
    if (idx !== -1) {
      matchingChars++;
      lastMatchIndex = idx;
    }
  }
  
  return matchingChars / longer.length;
}

function generateSuggestions(unmatched: UnmatchedAction[], matchRate: number): string[] {
  const suggestions: string[] = [];

  if (matchRate < 0.5) {
    suggestions.push('Low match rate detected. Check if the sync reference action is correct.');
    suggestions.push('Verify that the FFLogs reports contain kill data from the correct encounter.');
  }

  const unmatchedPatterns = new Map<string, number>();
  for (const action of unmatched) {
    const baseName = action.name.toLowerCase()
      .replace(/\s+x\d+$/i, '')
      .replace(/\s*\([^)]+\)$/i, '')
      .replace(/\s+\d+$/i, '')
      .trim();
    unmatchedPatterns.set(baseName, (unmatchedPatterns.get(baseName) || 0) + 1);
  }

  for (const [pattern, count] of unmatchedPatterns) {
    if (count >= 3) {
      suggestions.push(`"${pattern}" has ${count} unmatched occurrences. This ability may be dodgeable or have a different name in FFLogs.`);
    }
  }

  return suggestions;
}

export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('\n=== Cactbot Mapping Validation ===');
  lines.push(`  Total Cactbot actions: ${result.totalCactbotActions}`);
  lines.push(`  Matched with FFLogs: ${result.matchedActions}`);
  lines.push(`  Unmatched: ${result.unmatchedActions.length}`);
  lines.push(`  Match rate: ${(result.matchRate * 100).toFixed(1)}%`);

  if (result.unmatchedActions.length > 0) {
    lines.push('\n  Unmatched Actions:');
    for (const action of result.unmatchedActions.slice(0, 10)) {
      lines.push(`    - "${action.name}" at ${action.time}s (occurrence ${action.occurrence})`);
      if (action.possibleMatches.length > 0) {
        lines.push(`      Possible matches: ${action.possibleMatches.join(', ')}`);
      }
    }
    if (result.unmatchedActions.length > 10) {
      lines.push(`    ... and ${result.unmatchedActions.length - 10} more`);
    }
  }

  if (result.suggestions.length > 0) {
    lines.push('\n  Suggestions:');
    for (const suggestion of result.suggestions) {
      lines.push(`    - ${suggestion}`);
    }
  }

  return lines.join('\n');
}
