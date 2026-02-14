# MitPlan Timeline Scraper v2.0

Atomic agents-based timeline scraper for FFXIV raid boss timelines.

## Installation

```bash
cd scripts/timeline-scraper-py
pip install -e .
```

Or install dependencies directly:

```bash
pip install atomic-agents instructor pydantic httpx python-dotenv tenacity tqdm rich
```

## Configuration

Create a `.env` file in this directory:

```env
MITPLAN_FFLOGS_CLIENT_ID=your_client_id
MITPLAN_FFLOGS_CLIENT_SECRET=your_client_secret
```

To get FFLogs API credentials:
1. Go to https://www.fflogs.com/profile
2. Click "API" tab
3. Create a new OAuth application

## Usage

### List available bosses

```bash
python -m cli.main list-bosses
```

### Generate a timeline

```bash
python -m cli.main generate m7s
```

With options:

```bash
python -m cli.main generate m7s \
  --count 50 \
  --output ./m7s_timeline.json \
  --include-dodgeable
```

### Show boss info

```bash
python -m cli.main info m7s
```

## Architecture

This scraper uses the atomic agents pattern with 6 specialized agents:

1. **CactbotTimelineAgent** - Fetches boss timeline from Cactbot repository
2. **FFLogsReportAgent** - Handles FFLogs authentication and report discovery
3. **DamageEventExtractorAgent** - Extracts damage events and syncs to timeline
4. **TimelineVariantDetectorAgent** - Detects timeline branches and default path
5. **TimelineAggregatorAgent** - Computes median damage and statistics
6. **TimelineBuilderAgent** - Generates final output with all variants

The **TimelineGenerationOrchestrator** coordinates all agents into a pipeline.

## Output Format

The generated timeline includes:
- All timeline actions with damage values
- Default timeline (most common path)
- All detected variants (different abilities at different times)

```json
{
  "name": "Brute Abominator",
  "boss_id": "m7s",
  "actions": [...],
  "default_actions": [...],
  "all_variants": {
    "120s": ["Ability A", "Ability B"]
  }
}
```

## Development

Run tests:

```bash
pip install pytest pytest-asyncio
pytest
```

Type checking:

```bash
pip install mypy
mypy agents tools schemas
```
