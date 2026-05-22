import { existsSync, readFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '..');
const timelinesDir = join(projectRoot, 'src', 'data', 'timelines');

const DEFAULT_TIME_TOLERANCE_SECONDS = 3;
const DEFAULT_HIGH_DRIFT_SECONDS = 8;

function round(value, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function normalizeAbilityName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:x|\*)\s*\d+\+?\b/gi, ' ')
    .replace(/\b\d+\+?\b/g, ' ')
    .replace(/[#:_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}/ ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitAbilityVariants(name) {
  return String(name || '')
    .split('/')
    .map((part) => normalizeAbilityName(part))
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function candidateKeysForAction(action) {
  const sourceNames = Array.isArray(action.sourceAbilities) ? action.sourceAbilities : [];
  return unique(
    [action.name, ...sourceNames].flatMap((name) => {
      const directName = normalizeAbilityName(name);
      const variants = splitAbilityVariants(name);
      return [directName, ...variants];
    })
  );
}

function candidateKeysForSourceEvent(event) {
  return unique([normalizeAbilityName(event.name), ...splitAbilityVariants(event.name)]);
}

function extractQuotedList(value) {
  if (!value) return [];
  return Array.from(value.matchAll(/"([^"]+)"/g), (match) => match[1]);
}

function stripTrailingComment(line) {
  let inQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];
    if (char === '"' && previous !== '\\') {
      inQuote = !inQuote;
    }
    if (char === '#' && !inQuote && line[index + 1] === ' ') {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

export function parseCactbotTimeline(text, { sourceUrl = null } = {}) {
  const events = [];
  const lines = String(text || '').split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('hideall')) {
      return;
    }

    const line = stripTrailingComment(trimmed);
    const match = line.match(/^(-?\d+(?:\.\d+)?)\s+"((?:\\"|[^"])*)"\s*(.*)$/);
    if (!match) {
      return;
    }

    const [, timeValue, rawName, rest] = match;
    const name = rawName.replace(/\\"/g, '"');
    if (!name || name.startsWith('--')) {
      return;
    }

    const eventType = rest.match(/#?([A-Za-z][A-Za-z]+)\s*\{/)?.[1] || null;
    const idExpression = rest.match(/\bid:\s*(\[[^\]]+\]|"[^"]+")/)?.[1] || '';
    const sourceExpression = rest.match(/\bsource:\s*(\[[^\]]+\]|"[^"]+")/)?.[1] || '';
    const duration = rest.match(/\bduration\s+(-?\d+(?:\.\d+)?)/)?.[1];

    events.push({
      kind: 'cactbot',
      sourceUrl,
      lineNumber: index + 1,
      name,
      normalizedNames: candidateKeysForSourceEvent({ name }),
      time: Number(timeValue),
      eventType,
      ids: extractQuotedList(idExpression),
      sources: extractQuotedList(sourceExpression),
      duration: duration === undefined ? null : Number(duration),
      raw: rawLine,
    });
  });

  return events.sort((left, right) => left.time - right.time || left.lineNumber - right.lineNumber);
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function resolveTimelinePath(input) {
  const directPath = resolve(projectRoot, input);
  if (existsSync(directPath)) {
    return directPath;
  }

  const timelinePath = join(timelinesDir, input.endsWith('.timeline.json') ? input : `${input}.timeline.json`);
  if (existsSync(timelinePath)) {
    return timelinePath;
  }

  throw new Error(`Could not find timeline "${input}" as a file path or official boss id.`);
}

function collectOfficialActions(timeline) {
  return [...(timeline.actions || []), ...((timeline.adaptiveModel?.branches || []).flatMap((branch) => branch.events || []))]
    .filter((action, index, actions) => {
      if (!action?.id) return false;
      return actions.findIndex((candidate) => candidate.id === action.id) === index;
    })
    .map((action, index) => ({
      ...action,
      order: index,
      normalizedNames: candidateKeysForAction(action),
    }))
    .sort((left, right) => Number(left.time || 0) - Number(right.time || 0) || left.order - right.order);
}

function isCactbotSource(source) {
  return source?.kind === 'cactbot' || source?.site === 'cactbot';
}

export function getCactbotSourceUrls(timeline) {
  return unique([...(timeline.analysisSources || []), ...(timeline.guideSources || [])].filter(isCactbotSource).map((source) => source.url));
}

async function loadTextSource(source, { fetchImpl = fetch } = {}) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetchImpl(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }
    return {
      label: source,
      text: await response.text(),
    };
  }

  const filePath = resolve(projectRoot, source);
  return {
    label: filePath,
    text: readFileSync(filePath, 'utf8'),
  };
}

export async function loadCactbotEventsForTimeline(
  timeline,
  {
    cactbotSources,
    fetchImpl = fetch,
  } = {}
) {
  const sourceUrls = cactbotSources?.length ? cactbotSources : getCactbotSourceUrls(timeline);
  const allEvents = [];
  const failures = [];

  for (const source of sourceUrls) {
    try {
      const { label, text } = await loadTextSource(source, { fetchImpl });
      allEvents.push(...parseCactbotTimeline(text, { sourceUrl: label }));
    } catch (error) {
      failures.push({
        source,
        message: error.message,
      });
    }
  }

  return {
    events: allEvents.sort((left, right) => left.time - right.time),
    failures,
    sources: sourceUrls,
  };
}

function findFirstArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return null;

  const preferredPaths = [
    ['data', 'reportData', 'report', 'events', 'data'],
    ['reportData', 'report', 'events', 'data'],
    ['events', 'data'],
    ['events'],
  ];

  for (const path of preferredPaths) {
    const found = path.reduce((current, key) => current?.[key], value);
    if (Array.isArray(found)) return found;
  }

  for (const child of Object.values(value)) {
    const found = findFirstArray(child);
    if (found) return found;
  }

  return null;
}

function getEventName(event) {
  return (
    event?.ability?.name ||
    event?.abilityGameID ||
    event?.abilityName ||
    event?.name ||
    event?.type ||
    null
  );
}

function getEventTimestamp(event) {
  if (typeof event?.relativeTime === 'number') return event.relativeTime;
  if (typeof event?.fightRelativeTime === 'number') return event.fightRelativeTime;
  if (typeof event?.timestamp === 'number') return event.timestamp;
  if (typeof event?.time === 'number') return event.time;
  return null;
}

export function parseFflogsEvents(input, { fightStartTime = null, sourceLabel = null } = {}) {
  const payload = typeof input === 'string' ? JSON.parse(input) : input;
  const rawEvents = findFirstArray(payload) || [];
  const explicitStartTime =
    fightStartTime ??
    payload?.fight?.startTime ??
    payload?.startTime ??
    payload?.data?.reportData?.report?.fights?.[0]?.startTime ??
    null;

  const timestampedEvents = rawEvents
    .map((event, index) => ({
      event,
      index,
      timestamp: getEventTimestamp(event),
      name: getEventName(event),
    }))
    .filter((event) => typeof event.timestamp === 'number' && event.name);

  const startTime =
    explicitStartTime ??
    Math.min(...timestampedEvents.map((event) => event.timestamp).filter((timestamp) => Number.isFinite(timestamp)));

  return timestampedEvents
    .map(({ event, index, timestamp, name }) => {
      const relativeSeconds = timestamp > 10_000 && Number.isFinite(startTime)
        ? (timestamp - startTime) / 1000
        : timestamp / (timestamp > 1000 ? 1000 : 1);

      return {
        kind: 'fflogs',
        sourceUrl: sourceLabel,
        lineNumber: index + 1,
        name,
        normalizedNames: candidateKeysForSourceEvent({ name }),
        time: round(relativeSeconds, 3),
        eventType: event.type || null,
        ids: unique([event.ability?.guid, event.ability?.id, event.abilityGameID].map((id) => (id == null ? null : String(id)))),
        sources: unique([event.source?.name, event.sourceName, event.sourceID == null ? null : String(event.sourceID)]),
        raw: event,
      };
    })
    .filter((event) => Number.isFinite(event.time) && event.time >= 0)
    .sort((left, right) => left.time - right.time || left.lineNumber - right.lineNumber);
}

function buildSourceBuckets(sourceEvents) {
  const buckets = new Map();
  for (const event of sourceEvents) {
    for (const key of event.normalizedNames || []) {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(event);
    }
  }
  return buckets;
}

function pickSourceEvent(action, sourceBuckets, usedEvents) {
  let best = null;
  for (const key of action.normalizedNames || []) {
    const candidates = sourceBuckets.get(key) || [];
    for (const event of candidates) {
      if (usedEvents.has(event)) continue;
      const delta = Math.abs(Number(action.time || 0) - event.time);
      if (!best || delta < best.delta) {
        best = {
          key,
          event,
          delta,
          signedDelta: Number(action.time || 0) - event.time,
        };
      }
    }
  }
  return best;
}

function sourceEventMatchesAnyAction(event, actions) {
  const eventKeys = event.normalizedNames || [];
  return actions.some((action) => eventKeys.some((key) => action.normalizedNames?.includes(key)));
}

function severityForDelta(delta, { toleranceSeconds, highDriftSeconds }) {
  if (delta <= toleranceSeconds) return 'ok';
  if (delta <= highDriftSeconds) return 'drift';
  return 'high_drift';
}

export function compareActionsToSource(
  officialActions,
  sourceEvents,
  {
    sourceKind,
    toleranceSeconds = DEFAULT_TIME_TOLERANCE_SECONDS,
    highDriftSeconds = DEFAULT_HIGH_DRIFT_SECONDS,
  } = {}
) {
  const sourceBuckets = buildSourceBuckets(sourceEvents);
  const usedEvents = new Set();

  const matches = officialActions.map((action) => {
    const best = pickSourceEvent(action, sourceBuckets, usedEvents);
    if (!best) {
      return {
        status: 'missing_source',
        sourceKind,
        actionId: action.id,
        actionName: action.name,
        officialTime: action.time,
        sourceTime: null,
        deltaSeconds: null,
        matchedSourceName: null,
      };
    }

    usedEvents.add(best.event);
    return {
      status: severityForDelta(best.delta, { toleranceSeconds, highDriftSeconds }),
      sourceKind,
      actionId: action.id,
      actionName: action.name,
      officialTime: action.time,
      sourceTime: best.event.time,
      deltaSeconds: round(best.signedDelta, 2),
      absoluteDeltaSeconds: round(best.delta, 2),
      matchedSourceName: best.event.name,
      matchedSourceLine: best.event.lineNumber,
      matchedSourceId: best.event.ids?.[0] || null,
      matchedKey: best.key,
    };
  });

  const missingOfficial = sourceEvents
    .filter((event) => !usedEvents.has(event))
    .filter((event) => sourceEventMatchesAnyAction(event, officialActions))
    .map((event) => ({
      sourceKind,
      sourceName: event.name,
      sourceTime: event.time,
      matchedSourceLine: event.lineNumber,
      matchedSourceId: event.ids?.[0] || null,
      status: 'missing_official_occurrence',
    }));

  const matchedCount = matches.filter((match) => match.status !== 'missing_source').length;
  const driftCount = matches.filter((match) => match.status === 'drift' || match.status === 'high_drift').length;
  const missingSourceCount = matches.length - matchedCount;

  return {
    sourceKind,
    summary: {
      officialActionCount: officialActions.length,
      sourceEventCount: sourceEvents.length,
      matchedCount,
      coverageRatio: officialActions.length ? round(matchedCount / officialActions.length, 3) : 1,
      driftCount,
      highDriftCount: matches.filter((match) => match.status === 'high_drift').length,
      missingSourceCount,
      missingOfficialOccurrenceCount: missingOfficial.length,
      maxAbsoluteDeltaSeconds: round(
        Math.max(0, ...matches.map((match) => match.absoluteDeltaSeconds || 0)),
        2
      ),
    },
    matches,
    missingOfficial,
  };
}

function analyzePhaseAnchors(timeline, officialActions, cactbotEvents, { toleranceSeconds }) {
  return (timeline.phases || []).map((phase) => {
    const anchor = officialActions.find((action) => action.id === phase.anchorActionId);
    if (!anchor) {
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        status: 'missing_anchor_action',
        anchorActionId: phase.anchorActionId,
      };
    }

    const sourceBuckets = buildSourceBuckets(cactbotEvents);
    const best = pickSourceEvent(anchor, sourceBuckets, new Set());
    if (!best) {
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        status: 'missing_cactbot_anchor',
        anchorActionId: phase.anchorActionId,
        anchorName: anchor.name,
        officialTime: anchor.time,
      };
    }

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      anchorActionId: phase.anchorActionId,
      anchorName: anchor.name,
      officialTime: anchor.time,
      sourceTime: best.event.time,
      deltaSeconds: round(Number(anchor.time || 0) - best.event.time, 2),
      absoluteDeltaSeconds: round(best.delta, 2),
      matchedSourceName: best.event.name,
      matchedSourceLine: best.event.lineNumber,
      status: best.delta <= toleranceSeconds ? 'ok' : 'drift',
    };
  });
}

export async function analyzeTimelineAccuracy({
  timeline,
  timelinePath = null,
  cactbotSources = null,
  fflogsFiles = [],
  toleranceSeconds = DEFAULT_TIME_TOLERANCE_SECONDS,
  highDriftSeconds = DEFAULT_HIGH_DRIFT_SECONDS,
  fetchImpl = fetch,
} = {}) {
  const officialActions = collectOfficialActions(timeline);
  const cactbotResult = await loadCactbotEventsForTimeline(timeline, { cactbotSources, fetchImpl });
  const cactbot = compareActionsToSource(officialActions, cactbotResult.events, {
    sourceKind: 'cactbot',
    toleranceSeconds,
    highDriftSeconds,
  });

  const fflogsReports = fflogsFiles.map((filePath) => {
    const absolutePath = resolve(projectRoot, filePath);
    const events = parseFflogsEvents(readFileSync(absolutePath, 'utf8'), { sourceLabel: absolutePath });
    return {
      file: absolutePath,
      ...compareActionsToSource(officialActions, events, {
        sourceKind: 'fflogs',
        toleranceSeconds,
        highDriftSeconds,
      }),
    };
  });

  const sourceFailures = [...cactbotResult.failures];
  const phaseAnchors = analyzePhaseAnchors(timeline, officialActions, cactbotResult.events, { toleranceSeconds });
  const cactbotSourceCount = cactbotResult.sources.length;
  const fflogsSourceCount = fflogsReports.length;

  const blockingIssueCount =
    cactbot.summary.highDriftCount +
    cactbot.summary.missingSourceCount +
    phaseAnchors.filter((phase) => phase.status !== 'ok').length +
    fflogsReports.reduce(
      (total, report) => total + report.summary.highDriftCount + report.summary.missingSourceCount,
      0
    );

  return {
    metadata: {
      timelinePath,
      timelineName: timeline.name,
      bossId: timeline.bossId || null,
      analyzedAt: new Date().toISOString(),
      toleranceSeconds,
      highDriftSeconds,
      officialActionCount: officialActions.length,
      cactbotSourceCount,
      fflogsSourceCount,
      sourceFailures,
      verdict: blockingIssueCount === 0 && cactbotSourceCount > 0 ? 'pass' : 'review',
    },
    cactbot,
    fflogs: fflogsReports,
    phaseAnchors,
  };
}

function formatIssueLine(match) {
  const sourceTime = match.sourceTime == null ? 'missing' : `${match.sourceTime}s`;
  const delta = match.deltaSeconds == null ? '' : ` (${match.deltaSeconds >= 0 ? '+' : ''}${match.deltaSeconds}s)`;
  return `- ${match.status}: ${match.actionName} [${match.actionId}] official ${match.officialTime}s vs source ${sourceTime}${delta}`;
}

export function formatAccuracyReportMarkdown(report) {
  const lines = [
    `# Timeline Accuracy Report`,
    '',
    `Timeline: ${report.metadata.timelineName || report.metadata.timelinePath || 'Unknown'}`,
    `Boss: ${report.metadata.bossId || 'unknown'}`,
    `Verdict: ${report.metadata.verdict}`,
    `Tolerance: ${report.metadata.toleranceSeconds}s; high drift: ${report.metadata.highDriftSeconds}s`,
    '',
    `## Cactbot`,
    '',
    `Sources: ${report.metadata.cactbotSourceCount}`,
    `Coverage: ${report.cactbot.summary.matchedCount}/${report.cactbot.summary.officialActionCount} (${Math.round(report.cactbot.summary.coverageRatio * 100)}%)`,
    `Drifted: ${report.cactbot.summary.driftCount}; high drift: ${report.cactbot.summary.highDriftCount}; missing source: ${report.cactbot.summary.missingSourceCount}`,
  ];

  const cactbotIssues = report.cactbot.matches.filter((match) => match.status !== 'ok');
  if (cactbotIssues.length) {
    lines.push('', '### Cactbot Issues', '', ...cactbotIssues.map(formatIssueLine));
  }

  const phaseIssues = report.phaseAnchors.filter((phase) => phase.status !== 'ok');
  if (phaseIssues.length) {
    lines.push('', '### Phase Anchor Issues', '');
    lines.push(
      ...phaseIssues.map(
        (phase) =>
          `- ${phase.status}: ${phase.phaseName} [${phase.anchorActionId}] official ${phase.officialTime ?? 'missing'}s vs cactbot ${phase.sourceTime ?? 'missing'}s`
      )
    );
  }

  if (report.fflogs.length) {
    lines.push('', '## FF Logs', '');
    for (const fflogsReport of report.fflogs) {
      lines.push(
        `### ${basename(fflogsReport.file)}`,
        '',
        `Coverage: ${fflogsReport.summary.matchedCount}/${fflogsReport.summary.officialActionCount} (${Math.round(fflogsReport.summary.coverageRatio * 100)}%)`,
        `Drifted: ${fflogsReport.summary.driftCount}; high drift: ${fflogsReport.summary.highDriftCount}; missing source: ${fflogsReport.summary.missingSourceCount}`
      );
      const issues = fflogsReport.matches.filter((match) => match.status !== 'ok');
      if (issues.length) {
        lines.push('', ...issues.map(formatIssueLine));
      }
      lines.push('');
    }
  }

  if (report.metadata.sourceFailures.length) {
    lines.push('', '## Source Failures', '');
    lines.push(...report.metadata.sourceFailures.map((failure) => `- ${failure.source}: ${failure.message}`));
  }

  return `${lines.join('\n').trim()}\n`;
}

function parseArgs(argv) {
  const options = {
    timelineInput: null,
    cactbotSources: [],
    fflogsFiles: [],
    format: 'markdown',
    toleranceSeconds: DEFAULT_TIME_TOLERANCE_SECONDS,
    highDriftSeconds: DEFAULT_HIGH_DRIFT_SECONDS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--timeline' || arg === '-t') {
      options.timelineInput = argv[++index];
    } else if (arg === '--cactbot') {
      options.cactbotSources.push(argv[++index]);
    } else if (arg === '--fflogs-file') {
      options.fflogsFiles.push(argv[++index]);
    } else if (arg === '--format') {
      options.format = argv[++index];
    } else if (arg === '--tolerance') {
      options.toleranceSeconds = Number(argv[++index]);
    } else if (arg === '--high-drift') {
      options.highDriftSeconds = Number(argv[++index]);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!options.timelineInput) {
      options.timelineInput = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/timelineAccuracyAnalyzer.js --timeline <boss-id|path> [options]

Options:
  --cactbot <url|path>       Override or add a cactbot timeline source. Defaults to cactbot URLs in timeline metadata.
  --fflogs-file <path>       Compare against an exported FF Logs events JSON payload. May be repeated.
  --tolerance <seconds>      Drift threshold before a match is marked for review. Default: ${DEFAULT_TIME_TOLERANCE_SECONDS}
  --high-drift <seconds>     Drift threshold for high severity. Default: ${DEFAULT_HIGH_DRIFT_SECONDS}
  --format <markdown|json>   Output format. Default: markdown
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.timelineInput) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const timelinePath = resolveTimelinePath(options.timelineInput);
  const timeline = readJsonFile(timelinePath);
  const report = await analyzeTimelineAccuracy({
    timeline,
    timelinePath,
    cactbotSources: options.cactbotSources,
    fflogsFiles: options.fflogsFiles,
    toleranceSeconds: options.toleranceSeconds,
    highDriftSeconds: options.highDriftSeconds,
  });

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.format === 'markdown') {
    console.log(formatAccuracyReportMarkdown(report));
  } else {
    throw new Error(`Unsupported format: ${options.format}`);
  }

  process.exit(report.metadata.verdict === 'pass' ? 0 : 2);
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
