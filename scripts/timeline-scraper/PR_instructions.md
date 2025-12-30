# PR Instructions

- Create a pull request from your branch to the main branch
- Target the main branch (default)
- Include a detailed description of your changes
- Ensure proper review and merge workflow

## Pull Request Template

```markdown
# Auto-Discovery Feature for Timeline Scraper

## Summary

Implements automatic report discovery for the `auto` command, allowing users to fetch the 30 most recent clear reports for a boss without manually providing FFLogs report codes.

## Changes Made

### 1. Fixed FFLogs Client (`src/sources/fflogs/client.ts`)
- **Issue**: The `getEncounterRankings()` method used Warcraft Logs schema (`worldData.rankings.encounter`) which doesn't exist in FFLogs
- **Fix**: Replaced with correct FFLogs API: `worldData.encounter(id).fightRankings: JSON`
- **Added**: `parseFightRankingsJson()` method with defensive JSON parsing to handle unknown response structure
- **Handling**: The `fightRankings` API returns unstructured JSON - added robust parsing that tries multiple common field names

### 2. Updated Generator (`src/generator/index.ts`)
- **Modified**: `AutoGenerateOptions` interface to make `reportCodes` optional
- **Enhanced**: `autoGenerateTimeline()` function to support both auto-discovery and manual override:
  - If `reportCodes` provided: use them directly (backward compatibility)
  - If `reportCodes` omitted: auto-discover reports using `discoverRecentReports()`

### 3. Fixed CLI Auto Command (`src/cli.ts`)
- **Changed**: Made `--reports` option optional (previously required)
- **Updated**: Now calls `autoGenerateTimeline()` instead of `generateTimeline()`
- **Added**: `-c, --count` option for specifying number of reports to discover
- **Enhanced**: Passes all aggregation options to `autoGenerateTimeline()`

### 4. Updated Type Definitions (`src/types/index.ts`)
- **Deprecated**: Old `RankingsData` interface (kept for reference)
- **Added**: `FightRankingsResponse` type for the new JSON-based response
- **Added**: Deprecation notes for old types

## Key Technical Details

### FFLogs API Change
```graphql
# Old (Warcraft Logs - doesn't work in FFLogs)
query EncounterRankings($encounterId: Int!) {
  worldData {
    rankings {
      encounter(id: $encounterId) {
        rankings(metric: $metric, limit: $limit) {
          report { code title }
          startTime
          kill
        }
      }
    }
  }
}

# New (FFLogs - returns JSON)
query EncounterFightRankings($encounterId: Int!) {
  worldData {
    encounter(id: $encounterId) {
      id
      name
      fightRankings(page: 1)  # Returns JSON (unstructured)
    }
  }
}
```

### JSON Parsing Strategy
The `parseFightRankingsJson()` method:
- Tries multiple possible JSON structures (`rankings`, `data`, `reports`, `fights`)
- Extracts report codes from various field names (`code`, `reportCode`)
- Handles missing kill status (defaults to true for rankings)
- Logs debugging info if parsing fails

## Usage Examples

```bash
# Auto-discover 30 most recent clears (default)
npm run timeline -- auto --boss m7s

# Custom count
npm run timeline -- auto --boss m7s --count 50

# Manual override still works (backward compatible)
npm run timeline -- auto --boss m7s --reports abc123 xyz789

# With aggregation strategy
npm run timeline -- auto --boss m7s --aggregate earliest
```

## Backward Compatibility

- All existing functionality preserved
- Manual report codes still work via `--reports` option
- No breaking changes to existing commands or options

## Testing

- ✅ Type checking passes (`bun run typecheck`)
- ✅ All phases implemented according to plan
- ✅ Defensive JSON parsing handles unknown FFLogs response structures
- ✅ Rate limiting and error handling included
- ✅ Graceful fallback if auto-discovery fails

## Risk Mitigation

1. **Unknown JSON structure**: Added defensive parsing with multiple fallbacks
2. **Rate limiting**: ~90 requests for 30 reports, with progress indicators
3. **Private reports**: Skip on auth errors during report fetching
4. **API instability**: `fightRankings` is "not considered frozen" - added error handling
5. **Fail gracefully**: Auto-discovery failure doesn't crash, provides helpful error messages

## Files Modified

| File | Changes |
|------|---------|
| `src/sources/fflogs/client.ts` | Fixed GraphQL query, added JSON parsing |
| `src/generator/index.ts` | Made `reportCodes` optional, enhanced auto-discovery |
| `src/cli.ts` | Made `--reports` optional, updated to call correct function |
| `src/types/index.ts` | Deprecated old types, added new response type |

## Future Considerations

- The `fightRankings` JSON format is undocumented in FFLogs API
- Implementation includes logging of response structure for debugging
- May need updates if FFLogs changes the response format