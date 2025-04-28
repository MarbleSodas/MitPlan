# FFXIV Log Processing Scripts

This directory contains utility scripts for processing FFXIV log data.

## process-logs.js

This script processes CSV log files from FFXIV and extracts boss action data in a format compatible with the MitPlan application.

### Features

- Processes each CSV file separately with relative times from the first non-attack action
- Consolidates similar actions across multiple CSV files based on name and relative time
- Removes all tank auto-attack actions and other attack-related entries
- Filters out duplicate actions that occur within 8 seconds of each other
- Groups similar actions by name and time (within 2 seconds of each other)
- Combines prepare and hit actions, keeping the hit time
- Calculates the highest unmitigated damage value across all files
- Sums up DoT effects and links them to the preceding boss action
- Shows initial hit damage, DoT damage, and total damage separately in the description
- Uses the total damage (initial + DoT) as the unmitigated damage value
- Outputs formatted JSON that can be directly used in the application

### Usage

```bash
# Install dependencies first
npm install

# Process logs for a specific boss
npm run process-logs -- --boss=Ketuduke --id=ketuduke --output=src/data/bosses/ketudukeActions.json

# Or run directly with node
node scripts/process-logs.js --boss=Ketuduke --id=ketuduke --output=src/data/bosses/ketudukeActions.json
```

### Options

- `--boss`: The name of the boss as it appears in the log files (e.g., 'Ketuduke')
- `--id`: The ID of the boss used in the application (e.g., 'ketuduke')
- `--logs`: The directory containing the log files (default: 'logs')
- `--output`: Path to save the JSON file (optional, if not provided, outputs to console)

## example-process-boss.js

This is a simplified script that demonstrates how to use the log processing utilities with a more straightforward command-line interface.

### Usage

```bash
# Process logs for a specific boss
npm run process-boss Ketuduke ketuduke

# Or run directly with node
node scripts/example-process-boss.js Ketuduke ketuduke
```

This will process all CSV files in the `logs/Ketuduke` directory and save the output to `src/data/bosses/ketudukeActions.json`.

## Expected Directory Structure

The scripts expect log files to be organized in the following structure:

```
logs/
  Ketuduke/
    Events - Another Aloalo Island (Savage) - Report.csv
    ...
  Lala/
    Events - Another Aloalo Island (Savage) - Report.csv
    ...
  Statice/
    Events - Another Aloalo Island (Savage) - Report.csv
    ...
```

## Output Format

The scripts output boss actions in the following format:

```json
[
  {
    "id": "tidal_roar_1",
    "name": "Tidal Roar",
    "time": 10,
    "description": "Tidal Roar - High party-wide magical damage that inflicts Dropsy. Also applies a DoT effect (initial hit: ~68,000, DoT: ~20,000, total: ~88,000).",
    "unmitigatedDamage": "~88,000",
    "damageType": "magical",
    "importance": "high",
    "icon": "⭕"
  },
  ...
]
```

This format is compatible with the boss action data structure used in the MitPlan application.

## Examples

### Process logs for Ketuduke

```bash
npm run process-logs -- --boss=Ketuduke --id=ketuduke --output=src/data/bosses/ketudukeActions.json
```

### Process logs for Lala

```bash
npm run process-boss Lala lala
```

This will read all CSV files in the `logs/Lala` directory, process them, and save the output to `src/data/bosses/lalaActions.json`.
