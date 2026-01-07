# MitPlan Timeline Scraper

A command-line tool for generating FFXIV raid timelines from FFLogs data.

## Quick Start

1. **Install dependencies**
   ```bash
   cd scripts/timeline-scraper
   bun install
   ```

2. **Set up FFLogs API credentials**
   Create a `.env` file in `scripts/timeline-scraper/`:
   ```env
   FFLOGS_CLIENT_ID=your_client_id
   FFLOGS_CLIENT_SECRET=your_client_secret
   ```

3. **Generate a timeline**
   ```bash
   bun timeline generate m7s
   ```

---

## Commands

### `generate`
The primary command for creating timelines. Analyzes DamageTaken events from multiple FFLogs reports.

```bash
bun timeline generate <boss_id>
```

**Options:**
- `-c, --count <number>`: Number of reports to analyze (default: 30)
- `-o, --output <path>`: Custom output file path
- `--dry-run`: Preview without saving

**How it works:**
1. Auto-discovers recent kill reports from FFLogs
2. Extracts DamageTaken events (actual damage players receive)
3. Groups events by ability and clusters by time proximity
4. Filters outliers using IQR (Interquartile Range) method
5. Uses **median** damage values for accuracy
6. Detects tank busters by target count (1-2 targets) + high relative damage
7. Calculates importance using percentile thresholds from the fight's own data

---

### `generate-cactbot`
Alternative approach using Cactbot timeline files as the source of truth.

```bash
bun timeline generate-cactbot <boss_id>
```

**Options:**
- `-c, --count <number>`: Number of reports to fetch (default: 30)
- `-r, --reports <codes...>`: Specific FFLogs report codes
- `-o, --output <path>`: Custom output file path
- `--dry-run`: Preview without saving

---

### `list-bosses`
View all available boss IDs.

```bash
bun timeline list-bosses
```

### `info`
Show information about a specific boss.

```bash
bun timeline info m7s
```

### `analyze`
Analyze an FFLogs report without generating a timeline.

```bash
bun timeline analyze <report_code>
```

### `status`
Check FFLogs API authentication status.

```bash
bun timeline status
```

### `authenticate`
Authenticate with FFLogs.

```bash
bun timeline authenticate
```

### `logout`
Clear stored FFLogs credentials.

```bash
bun timeline logout
```

---

## Output Format

Generated timelines are saved to `src/data/bosses/`:

```json
{
  "id": "brutal_impact_1",
  "name": "Brutal Impact",
  "time": 10,
  "unmitigatedDamage": "~54,000",
  "damageType": "physical",
  "importance": "high",
  "icon": "⚔️",
  "isTankBuster": false
}
```

---

## Troubleshooting

### SSL/Network Issues
If you encounter certificate errors:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 bun timeline generate m7s
```

### Authentication
If the API returns unauthorized:
```bash
bun timeline logout
bun timeline authenticate
```
