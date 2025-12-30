# MitPlan Timeline Scraper

A command-line tool for generating FFXIV raid timelines from FFLogs reports and Cactbot data. This tool automates the process of creating MitPlan-compatible boss action timelines by pulling real data from FFLogs and integrating with Cactbot's timeline files.

## Features

- **Client Credentials Authentication** - Simple API key authentication for public reports
- **FFLogs Data Extraction** - Pull damage data, ability timing, and mechanic information
- **Cactbot Integration** - Merge with Cactbot timeline files for accurate mechanic identification
- **Multi-Report Aggregation** - Combine data from multiple reports for accurate timings
- **Timeline Normalization** - Normalize timelines based on reference actions and phase detection
- **AoE Deduplication** - Automatically removes duplicate AoE damage entries
- **Multi-Hit Damage Formatting** - Properly formats abilities that hit multiple times
- **Dodgeable Mechanic Filtering** - Optionally exclude pure dodge mechanics
- **Timeline Updates** - Merge new data into existing timeline files

## Installation

```bash
cd scripts/timeline-scraper
bun install
```

## Authentication

The timeline scraper uses Client Credentials authentication for accessing public FFLogs reports.

### Setting Up FFLogs API Credentials

1. Log in to https://www.fflogs.com
2. Go to https://www.fflogs.com/api/clients
3. Click "Create Client"
4. Enter a client name (e.g., "MitPlan Timeline Scraper")
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**

Set environment variables in a `.env` file:

```env
FFLOGS_CLIENT_ID=your-client-id-here
FFLOGS_CLIENT_SECRET=your-client-secret-here
```

The access token is cached locally in `~/.mitplan/fflogs-token.json`.

## Usage

### Running the CLI

```bash
# From project root
npm run timeline -- <command>

# Or directly from timeline-scraper directory
cd scripts/timeline-scraper
bun run src/cli.ts <command>
```

### Commands

#### `generate` - Create a timeline from FFLogs reports

Generate a new timeline from one or more FFLogs reports:

```bash
npm run timeline -- generate \
  --boss m7s \
  --reports abc123def xyz789ghi
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-b, --boss <id>` | Boss ID (required) | - |
| `-r, --reports <codes...>` | FFLogs report codes (required) | - |
| `-o, --output <path>` | Output file path | Auto-generated |
| `--no-cactbot` | Disable Cactbot integration | - |
| `--include-dodgeable` | Include dodgeable mechanics | - |
| `--no-dedupe` | Disable AoE deduplication | - |
| `--dry-run` | Generate without writing file | - |
| `--min-duration <sec>` | Minimum fight duration | 120 |

#### `auto` - Aggregate and normalize timelines from multiple reports

Process multiple reports with timeline normalization and aggregation:

```bash
npm run timeline -- auto \
  --boss m7s \
  --reports abc123def xyz789ghi jkl456mno \
  --aggregate median
```

**Aggregation Strategies:**
- `median` - Use median timing across all reports (default)
- `average` - Use average timing
- `earliest` - Use earliest occurrence (conservative)
- `latest` - Use latest occurrence
- `merge` - Combine all unique actions

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-b, --boss <id>` | Boss ID (required) | - |
| `-r, --reports <codes...>` | Report codes (required) | - |
| `--aggregate <strategy>` | Aggregation strategy | median |
| `--reference <action>` | Reference action for time=0 | First damaging |
| `--phase-gap <sec>` | Phase gap threshold | 30 |
| `--no-phases` | Disable phase detection | - |
| `--no-cactbot` | Disable Cactbot integration | - |
| `--include-dodgeable` | Include dodgeable mechanics | - |
| `--dry-run` | Generate without writing file | - |

#### `update` - Update an existing timeline

Merge new FFLogs data into an existing timeline:

```bash
npm run timeline -- update \
  --timeline src/data/bosses/brute-abominator_actions.json \
  --reports xyz789ghi
```

#### `analyze` - Analyze a report

Examine an FFLogs report without generating a timeline:

```bash
npm run timeline -- analyze --report abc123def

# With specific fight analysis
npm run timeline -- analyze --report abc123def --fight 1 --verbose
```

#### `list-bosses` - List available bosses

Show all configured boss IDs:

```bash
npm run timeline -- list-bosses

# Grouped by raid tier
npm run timeline -- list-bosses --group
```

#### `info` - Show boss information

Get details about a specific boss:

```bash
npm run timeline -- info --boss m7s
```

#### `status` - Check authentication status

```bash
npm run timeline -- status
```

#### `rate-limit` - Check API rate limit

```bash
npm run timeline -- rate-limit
```

#### `config` - Show configuration

```bash
npm run timeline -- config
```

## Supported Bosses

### Dawntrail Savage (AAC Light-Heavyweight - Zone 62)

| ID | Boss Name | FFLogs Encounter |
|----|-----------|------------------|
| m1s | Black Cat | 93 |
| m2s | Honey B. Lovely | 94 |
| m3s | Brute Bomber | 95 |
| m4s | Wicked Thunder | 96 |

### Dawntrail Savage (AAC Cruiserweight - Zone 68)

| ID | Boss Name | FFLogs Encounter |
|----|-----------|------------------|
| m5s | Dancing Green | 97 |
| m6s | Sugar Riot | 98 |
| m7s | Brute Abombinator | 99 |
| m8s | Howling Blade | 100 |

### Dawntrail Normal Raids

| ID | Boss Name | Zone |
|----|-----------|------|
| m1-m4 | AAC Light-Heavyweight bosses | 62 |
| m5-m8 | AAC Cruiserweight bosses | 68 |

### Legacy Aliases

For backward compatibility, these aliases also work:

| Alias | Maps To |
|-------|---------|
| sugar-riot | m6s |
| dancing-green | m5s |
| brute-abominator | m7s |
| howling-blade | m8s |

## Finding FFLogs Report Codes

To get report codes for timeline generation:

1. Go to the FFLogs encounter page:
   - M7S: https://www.fflogs.com/zone/encounter/99
   - M8S: https://www.fflogs.com/zone/encounter/100
2. Click on a clear report
3. Copy the report code from the URL (e.g., `abc123def` from `https://www.fflogs.com/reports/abc123def`)

## Output Format

Generated timelines follow the MitPlan boss action schema:

```json
[
  {
    "id": "brutal_impact_1_10",
    "name": "Brutal Impact",
    "time": 10,
    "unmitigatedDamage": "~54,000 per hit",
    "damageType": "physical",
    "importance": "high",
    "icon": "⚔️",
    "isTankBuster": false
  },
  {
    "id": "smash_here_1_30",
    "name": "Smash Here",
    "time": 30,
    "unmitigatedDamage": "100,000",
    "damageType": "physical",
    "importance": "high",
    "icon": "🛡️",
    "isTankBuster": true,
    "isDualTankBuster": true
  }
]
```

## Workflow Examples

### Basic Single-Report Timeline

```bash
npm run timeline -- generate --boss m7s --reports abc123def
```

### Multi-Report Aggregation with Normalization

```bash
npm run timeline -- auto \
  --boss m7s \
  --reports report1 report2 report3 report4 report5 \
  --aggregate median \
  --phase-gap 30
```

### Conservative Timeline (Earliest Timings)

```bash
npm run timeline -- auto \
  --boss m8s \
  --reports r1 r2 r3 \
  --aggregate earliest
```

### Timeline Without Cactbot

```bash
npm run timeline -- generate \
  --boss m7s \
  --reports abc123def \
  --no-cactbot
```

### Dry Run to Preview Results

```bash
npm run timeline -- auto \
  --boss m7s \
  --reports r1 r2 r3 \
  --dry-run
```

## Troubleshooting

### Authentication Fails

```bash
# Clear stored credentials
npm run timeline -- logout

# Check status
npm run timeline -- status
```

### "Rate Limit Reached" Error

The FFLogs API has a rate limit. Check your status:

```bash
npm run timeline -- rate-limit
```

### Empty Timeline Generated

Possible causes:
- Report code is incorrect or private
- Fight duration is below minimum (use `--min-duration` to adjust)
- No damaging events found (try `--include-dodgeable`)

### Cactbot Timeline Not Found

Cactbot does not yet have Dawntrail (7.x) timeline files. The tool will fall back to FFLogs-only mode with a warning. This is expected behavior for 7.x content.

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run src/cli.ts <command>

# Build for production
bun run build

# Type checking
bun run typecheck

# Linting
bun run lint
```

## Architecture

```
src/
├── cli.ts              # Command-line interface
├── config/
│   └── index.ts        # Configuration and boss mappings
├── generator/
│   ├── index.ts        # Timeline generation orchestration
│   ├── normalizer.ts   # Timeline normalization and phase detection
│   └── aggregator.ts   # Multi-report aggregation
├── sources/
│   ├── fflogs/
│   │   ├── auth.ts     # FFLogs OAuth authentication
│   │   ├── client.ts   # FFLogs API client
│   │   ├── discover.ts # Report discovery
│   │   └── parser.ts   # Event parsing
│   └── cactbot/
│       └── parser.ts   # Cactbot timeline parser
├── types/
│   └── index.ts        # TypeScript type definitions
└── utils/
    └── damage.ts       # Damage formatting utilities
```

## License

MIT License - See project root for details.
