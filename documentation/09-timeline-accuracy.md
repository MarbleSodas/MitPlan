# Official Timeline Accuracy Checks

Official timelines should be treated as curated encounter data, not as unchecked fixtures. The accuracy analyzer compares each MitPlan timeline against the source material recorded in the timeline metadata:

- `analysisSources` or `guideSources` entries with `kind: "cactbot"` or `site: "cactbot"` are fetched and parsed as cactbot `.txt` timelines.
- FF Logs reports can be added with exported events JSON files when a log sample is available.
- MitPlan action names and `sourceAbilities` are normalized so collapsed multi-hit entries such as `Brutal Rain (3 hits)` can be compared with cactbot labels like `Brutal Rain x3+`.

## Run

```bash
bun run timeline:accuracy --timeline vamp-fatale-m9s
```

For machine-readable output:

```bash
bun run timeline:accuracy --timeline vamp-fatale-m9s --format json
```

With FF Logs events exported from the report API:

```bash
bun run timeline:accuracy --timeline vamp-fatale-m9s --fflogs-file ./tmp/m9s-fflogs-events.json
```

The command exits with:

- `0` when the report passes.
- `2` when the timeline needs review.
- `1` for invalid input, fetch failures that prevent analysis, or unsupported options.

## What The Report Means

- `ok`: source event exists and timing drift is within tolerance.
- `drift`: source event exists but differs by more than the review tolerance.
- `high_drift`: source event differs by more than the high-drift threshold and should be reviewed before publishing.
- `missing_source`: MitPlan has an official action that was not found in that source.
- `missing_official_occurrence`: the source has another occurrence of an ability that MitPlan also tracks. This is often expected for intentionally collapsed multi-hit mechanics, but it should be checked.

Default thresholds are:

- Review drift: `3s`
- High drift: `8s`

Override them with:

```bash
bun run timeline:accuracy --timeline vamp-fatale-m9s --tolerance 2 --high-drift 6
```

## FF Logs Input Shape

The analyzer accepts common report-event payloads:

- A raw array of events.
- `{ "events": [...] }`
- `{ "events": { "data": [...] } }`
- GraphQL-style payloads such as `{ "data": { "reportData": { "report": { "events": { "data": [...] } } } } }`

Each event should include a timestamp or relative time plus an ability name, for example:

```json
{
  "startTime": 1000000,
  "events": [
    {
      "timestamp": 1010400,
      "type": "damage",
      "ability": { "name": "Killer Voice", "guid": 45956 },
      "source": { "name": "Vamp Fatale" }
    }
  ]
}
```

When timestamps look absolute, `startTime` is subtracted and converted to seconds. Relative second or millisecond fields are also accepted through `relativeTime`, `fightRelativeTime`, `timestamp`, or `time`.

## Review Workflow

1. Make sure the official timeline includes source URLs in `analysisSources` or `guideSources`.
2. Run the analyzer against cactbot first.
3. Add one or more FF Logs event exports for empirical timing checks.
4. Review all `high_drift`, `missing_source`, and phase-anchor issues.
5. Treat `missing_official_occurrence` as a prompt to decide whether a mechanic is intentionally collapsed or should be split into separate mitigation rows.
