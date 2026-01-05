# MitPlan Timeline Scraper

A powerful command-line tool for generating accurate FFXIV raid timelines. It uses **Cactbot** as the authoritative source for mechanics and timings, then enriches them with **FFLogs** data for damage values and dodgeability detection.

## 🚀 Quick Start

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
   # Basic usage (defaults to 30 reports for accuracy)
   bun timeline generate m7s

   # Custom report count
   bun timeline generate m8s -c 10
   ```

---

## 📖 Commands

### `generate` (Recommended)
This is the primary command for creating high-quality timelines. It uses Cactbot timeline files as the source of truth for mechanics and fetches damage data from FFLogs.

```bash
bun timeline generate <boss_id> [options]
```

**Options:**
- `-c, --count <number>`: Number of reports to auto-discover (default: **30**)
- `-r, --reports <codes...>`: Specific FFLogs report codes (space-separated)
- `-o, --output <path>`: Custom output file path
- `--dodgeable-threshold <ratio>`: Hit rate threshold (0-1) below which an ability is marked dodgeable (default: **0.7**)
- `--include-dodgeable`: Include mechanics that players usually dodge in the final output
- `--dry-run`: Preview the timeline in console without writing to disk
- `--min-duration <sec>`: Minimum fight duration to consider a report valid (default: **120**)

---

### `generate-damage` (Damage-Only)
Generates timelines purely from DamageTaken events, ignoring cast actions. Uses statistical filtering (IQR) to remove damage outliers and median values for more accurate unmitigated damage estimates.

```bash
bun timeline generate-damage <boss_id> [options]
```

**Options:**
- `-c, --count <number>`: Number of reports to auto-discover (default: **30**)
- `-r, --reports <codes...>`: Specific FFLogs report codes (space-separated)
- `-o, --output <path>`: Custom output file path
- `--iqr-multiplier <number>`: IQR multiplier for outlier detection (1.5 = standard, 3.0 = extreme only) (default: **1.5**)
- `--occurrence-gap <seconds>`: Seconds gap to consider a new occurrence of same ability (default: **15**)
- `--min-damage <number>`: Minimum damage threshold to include an event (default: **5000**)
- `--dry-run`: Preview the timeline in console without writing to disk
- `--min-duration <sec>`: Minimum fight duration to consider a report valid (default: **120**)

**How it works:**
1. Fetches only `DamageTaken` events from FFLogs (actual damage players receive)
2. Groups damage events by ability name and clusters them by time proximity
3. Filters outliers using the Interquartile Range (IQR) method
4. Uses **median** damage values instead of max for more accurate estimates
5. Derives timing from when damage actually lands, not when abilities are cast

---

### `list-bosses`
View all available boss IDs and their status.

```bash
bun timeline list-bosses
# Or grouped by raid tier
bun timeline list-bosses --group
```

### `auto`
Aggregates and normalizes timelines from multiple reports using a pure FFLogs approach. Useful when Cactbot data isn't available or for custom encounters.

```bash
bun timeline auto <boss_id> [options]
```

### `generate-fflogs` (Legacy)
The original FFLogs-first generation method. Requires specific report codes.

```bash
bun timeline generate-fflogs -b m7s -r reportCode1
```

---

## 🛠️ Advanced Usage

### Specific Report Syncing
If auto-discovery isn't finding the exact data you want, provide specific high-quality report codes:
```bash
bun timeline generate m7s --reports abc123def xyz789ghi
```

### Identifying Dodgeable Mechanics
The tool calculates a "hit rate" for every mechanic across all processed reports. If a mechanic hits less than 70% of players across all reports (default threshold), it is flagged as dodgeable and excluded from the final timeline unless `--include-dodgeable` is used.

### Accuracy Tips
- **Use more reports**: The default of 30 reports provides excellent statistical averages for damage values.
- **Reference Actions**: The tool syncs FFLogs reports to Cactbot using a reference action (usually the first damaging ability). You can see the reference action used in the console output.

---

## 📂 Output Format
Generated timelines are saved to `src/data/bosses/` in a format ready for the MitPlan web application:

```json
{
  "id": "brutal_impact_1",
  "name": "Brutal Impact",
  "time": 10,
  "unmitigatedDamage": "~54,000",
  "damageType": "physical",
  "importance": "high",
  "icon": "⚔️"
}
```

---

## 🔧 Troubleshooting

### SSL/Network Issues
If you encounter `unable to get local issuer certificate` or API 403 errors (often due to network firewalls/OpenDNS):
- Try running with: `NODE_TLS_REJECT_UNAUTHORIZED=0 bun timeline generate ...`
- Check your network's DNS settings.

### Authentication
If the API returns unauthorized:
```bash
bun timeline logout
bun timeline status
```
