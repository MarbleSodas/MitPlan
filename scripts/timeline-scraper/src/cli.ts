#!/usr/bin/env node
/**
 * Timeline Scraper CLI
 *
 * Command-line interface for generating MitPlan timelines from FFLogs and Cactbot data.
 */

import { config } from 'dotenv';
// Load environment variables from .env file
config();

import { Command } from 'commander';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import {
  generateTimeline,
  autoGenerateTimeline,
  updateTimeline,
  clearCredentials,
  listAvailableBosses,
  analyzeReport,
} from './generator/index.js';
import { getAccessToken, clearCachedToken } from './sources/fflogs/auth.js';
import { createConfig, getBossMapping, getAllBossIds } from './config/index.js';
import { getRateLimitStatus } from './sources/fflogs/client.js';

const program = new Command();

// ASCII art banner
const banner = `
 ___ _        _   ___
| __| |___ __| |_| _ \\ __ ___ _ _ ___
| _|| / -_) _| / /  _/ _\` / -_) '_(_-<
|___|_\\___\\__|_\\_\\_| |\\__,_\\___|_| /__/
                    |__/
                    Timeline Scraper
`;

program
  .name('mitplan-timeline')
  .description('Generate FFXIV raid timelines from FFLogs reports and Cactbot data')
  .version('1.0.0');

/**
 * Generate command - Create a new timeline from FFLogs data
 */
program
  .command('generate')
  .description('Generate a timeline from FFLogs report(s)')
  .option('-b, --boss <id>', 'Boss ID (e.g., m7s, m8s)')
  .option('-r, --reports <codes...>', 'FFLogs report code(s), space-separated')
  .option('-o, --output <path>', 'Output file path')
  .option('--no-cactbot', 'Disable Cactbot timeline integration')
  .option('--include-dodgeable', 'Include dodgeable mechanics')
  .option('--no-dedupe', 'Disable AoE deduplication')
  .option('--dry-run', 'Generate without writing output file')
  .option('--min-duration <seconds>', 'Minimum fight duration in seconds', '120')
  .action(async (options) => {
    console.log(chalk.cyan(banner));

    // Validate required options
    if (!options.boss) {
      console.error(chalk.red('Error: Boss ID is required. Use -b or --boss'));
      console.log(chalk.yellow('Available boss IDs: ' + getAllBossIds().slice(0, 8).join(', ') + '...'));
      console.log(chalk.yellow('Use "list-bosses" command to see all available bosses.'));
      process.exit(1);
    }

    if (!options.reports || options.reports.length === 0) {
      console.error(chalk.red('Error: At least one report code is required. Use -r or --reports'));
      console.log(chalk.yellow('Example: -r abc123def'));
      process.exit(1);
    }

    const spinner = ora('Generating timeline...').start();

    try {
      const result = await generateTimeline({
        bossId: options.boss,
        reportCodes: options.reports,
        output: options.output,
        useCactbot: options.cactbot !== false,
        includeDodgeable: options.includeDodgeable || false,
        dedupeAoE: options.dedupe !== false,
        dryRun: options.dryRun || false,
        minFightDuration: parseInt(options.minDuration, 10),
      });

      if (result.success) {
        spinner.succeed(chalk.green(`Generated timeline with ${result.actions.length} actions`));

        if (result.cactbotUsed) {
          console.log(chalk.blue('  • Cactbot data integrated'));
        }
        console.log(chalk.blue(`  • Reports used: ${result.reportsUsed.join(', ')}`));

        if (!options.dryRun) {
          console.log(chalk.blue(`  • Output: ${result.outputPath}`));
        }
      } else {
        spinner.fail(chalk.red('Failed to generate timeline'));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }

    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Auto command - Aggregate and normalize timelines from multiple FFLogs reports
 *
 * Automatically discovers recent clear reports if no report codes are provided.
 */
program
  .command('auto')
  .description('Aggregate and normalize timelines from multiple FFLogs reports')
  .option('-b, --boss <id>', 'Boss ID (e.g., m7s, m8s)')
  .option('-r, --reports <codes...>', 'FFLogs report code(s) - space separated (optional, auto-discovers if omitted)')
  .option('-c, --count <number>', 'Number of recent reports to fetch when auto-discovering', '30')
  .option('-o, --output <path>', 'Output file path')
  .option('--no-cactbot', 'Disable Cactbot integration')
  .option('--include-dodgeable', 'Include dodgeable mechanics')
  .option('--no-dedupe', 'Disable AoE deduplication')
  .option('--dry-run', 'Generate without writing output file')
  .option('--min-duration <seconds>', 'Minimum fight duration in seconds', '120')
  .option('--aggregate <strategy>', 'Aggregation strategy: median|average|earliest|latest|merge', 'median')
  .option('--reference <action>', 'Reference action name for time=0 (default: first damaging action)')
  .option('--phase-gap <seconds>', 'Seconds gap indicating phase change', '30')
  .option('--no-phases', 'Disable phase detection (single-phase timeline)')
  .action(async (options) => {
    console.log(chalk.cyan(banner));

    // Validate required options
    if (!options.boss) {
      console.error(chalk.red('Error: Boss ID is required. Use -b or --boss'));
      console.log(chalk.yellow('Available boss IDs: ' + getAllBossIds().slice(0, 8).join(', ') + '...'));
      console.log(chalk.yellow('Use "list-bosses" command to see all available bosses.'));
      process.exit(1);
    }

    // Validate aggregation strategy
    const validStrategies = ['median', 'average', 'earliest', 'latest', 'merge'];
    if (!validStrategies.includes(options.aggregate)) {
      console.error(chalk.red(`Error: Invalid aggregation strategy "${options.aggregate}"`));
      console.log(chalk.yellow(`Valid strategies: ${validStrategies.join(', ')}`));
      process.exit(1);
    }

    const spinner = ora('Aggregating timelines...').start();

    try {
      // Call autoGenerateTimeline with or without report codes
      if (!options.reports || options.reports.length === 0) {
        console.log(chalk.yellow(`Auto-discovering ${options.count} recent reports for ${options.boss}...`));
      } else {
        console.log(chalk.yellow(`Processing ${options.reports.length} provided report codes...`));
      }

      const result = await autoGenerateTimeline({
        bossId: options.boss,
        reportCodes: options.reports,
        count: parseInt(options.count, 10),
        output: options.output,
        useCactbot: options.cactbot !== false,
        includeDodgeable: options.includeDodgeable || false,
        dedupeAoE: options.dedupe !== false,
        dryRun: options.dryRun || false,
        minFightDuration: parseInt(options.minDuration, 10),
        aggregate: options.aggregate,
        referenceAction: options.reference,
        phaseGap: parseInt(options.phaseGap, 10),
        detectPhases: options.phases !== false,
      });

      if (result.success) {
        spinner.succeed(chalk.green(`Generated timeline with ${result.actions.length} actions`));

        if (result.cactbotUsed) {
          console.log(chalk.blue('  • Cactbot data integrated'));
        }
        console.log(chalk.blue(`  • Reports processed: ${result.reportsUsed.length}`));

        if (result.reportsUsed.length <= 10) {
          console.log(chalk.blue(`  • Reports: ${result.reportsUsed.join(', ')}`));
        } else {
          console.log(chalk.blue(`  • First 10 reports: ${result.reportsUsed.slice(0, 10).join(', ')}`));
        }

        if (!options.dryRun) {
          console.log(chalk.blue(`  • Output: ${result.outputPath}`));
        }
      } else {
        spinner.fail(chalk.red('Failed to generate timeline'));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }

    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Update command - Update an existing timeline with new FFLogs data
 */
program
  .command('update')
  .description('Update an existing timeline with new FFLogs data')
  .option('-t, --timeline <path>', 'Path to existing timeline file')
  .option('-r, --reports <codes...>', 'FFLogs report code(s), space-separated')
  .option('--include-dodgeable', 'Include dodgeable mechanics')
  .option('--no-dedupe', 'Disable AoE deduplication')
  .action(async (options) => {
    console.log(chalk.cyan(banner));

    if (!options.timeline) {
      console.error(chalk.red('Error: Timeline path is required. Use -t or --timeline'));
      console.log(chalk.yellow('Example: -t src/data/bosses/brute-abominator_actions.json'));
      process.exit(1);
    }

    if (!options.reports || options.reports.length === 0) {
      console.error(chalk.red('Error: At least one report code is required. Use -r or --reports'));
      process.exit(1);
    }

    const spinner = ora('Updating timeline...').start();

    try {
      const result = await updateTimeline(options.timeline, options.reports, {
        includeDodgeable: options.includeDodgeable || false,
        dedupeAoE: options.dedupe !== false,
      });

      if (result.success) {
        spinner.succeed(chalk.green(`Updated timeline with ${result.actions.length} total actions`));
        console.log(chalk.blue(`  • Reports used: ${result.reportsUsed.join(', ')}`));
      } else {
        spinner.fail(chalk.red('Failed to update timeline'));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }

    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Analyze command - Analyze an FFLogs report without generating a timeline
 */
program
  .command('analyze')
  .description('Analyze an FFLogs report')
  .option('-r, --report <code>', 'FFLogs report code')
  .option('-f, --fight <id>', 'Specific fight ID to analyze')
  .option('-v, --verbose', 'Show detailed event information')
  .action(async (options) => {
    console.log(chalk.cyan(banner));

    if (!options.report) {
      console.error(chalk.red('Error: Report code is required. Use -r or --report'));
      console.log(chalk.yellow('Example: -r abc123def'));
      process.exit(1);
    }

    const spinner = ora('Analyzing report...').start();

    try {
      await analyzeReport(options.report, {
        fightId: options.fight ? parseInt(options.fight, 10) : undefined,
        verbose: options.verbose || false,
      });

      spinner.stop();

    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Status command - Check authentication status
 */
program
  .command('status')
  .description('Check FFLogs API authentication status')
  .action(async () => {
    console.log(chalk.cyan(banner));

    const config = createConfig();
    const spinner = ora('Checking status...').start();

    try {
      const token = await getAccessToken(config.fflogs.clientId);

      if (token) {
        spinner.succeed(chalk.green('Authenticated with FFLogs'));
        console.log(chalk.blue('  • Client ID: ' + config.fflogs.clientId));
        console.log(chalk.blue('  • Token: ' + token.substring(0, 20) + '...'));

        const rateLimit = getRateLimitStatus();
        console.log(chalk.blue(`  • Rate limit: ${rateLimit.requestsRemaining} requests/minute`));
      } else {
        spinner.fail(chalk.red('Not authenticated'));
        console.log(chalk.yellow('  Run "mitplan-timeline authenticate" to log in'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Status check failed'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Rate-limit command - Check current rate limit status
 */
program
  .command('rate-limit')
  .description('Check FFLogs API rate limit status')
  .action(() => {
    const rateLimit = getRateLimitStatus();
    console.log(chalk.cyan('FFLogs API Rate Limit Status'));
    console.log(chalk.blue(`  • Requests remaining: ${rateLimit.requestsRemaining}/minute`));
    console.log(chalk.blue(`  • Window resets: ${new Date(rateLimit.windowReset).toLocaleTimeString()}`));
  });

/**
 * List-bosses command - List all available boss IDs
 */
program
  .command('list-bosses')
  .description('List all available boss IDs')
  .option('--group', 'Group by raid tier')
  .action((options) => {
    console.log(chalk.cyan(banner));
    console.log(chalk.yellow('Available Boss IDs:\n'));

    const config = createConfig();
    const bosses = Object.entries(config.cactbot.bossMapping);

    if (options.group) {
      // Group by raid tier
      const savage = bosses.filter(([_, b]) => b.id.includes('s') || b.id.match(/\d+s$/i));
      const normal = bosses.filter(([_, b]) => !b.id.includes('s') && b.id.match(/^\d+$/));
      const others = bosses.filter(([_, b]) => !b.id.match(/^\d+s?$/) && !b.id.match(/m\d+s?$/));

      if (savage.length > 0) {
        console.log(chalk.white('  === Savage Raids ==='));
        for (const [id, boss] of savage) {
          console.log(chalk.cyan(`    ${id.padEnd(6)} ${chalk.white(boss.name)}`));
        }
        console.log('');
      }

      if (normal.length > 0) {
        console.log(chalk.white('  === Normal Raids ==='));
        for (const [id, boss] of normal) {
          console.log(chalk.green(`    ${id.padEnd(6)} ${chalk.white(boss.name)}`));
        }
        console.log('');
      }

      if (others.length > 0) {
        console.log(chalk.white('  === Other ==='));
        for (const [id, boss] of others) {
          console.log(chalk.gray(`    ${id.padEnd(6)} ${chalk.white(boss.name)}`));
        }
      }
    } else {
      // Simple list with more info
      const maxIdLen = Math.max(...bosses.map(([id]) => id.length));

      console.log(chalk.white('  ' + 'ID'.padEnd(maxIdLen + 2) + 'Name'));
      console.log(chalk.gray('  ' + '-'.repeat(maxIdLen + 40)));

      for (const [id, boss] of bosses) {
        const paddedId = id.padEnd(maxIdLen + 2);
        const hasEncounterId = (boss as { encounterId?: number }).encounterId;
        const status = hasEncounterId ? chalk.green('✓') : chalk.yellow('○');
        console.log(`${status} ${chalk.white(paddedId + boss.name)}`);
      }
      console.log('');
      console.log(chalk.gray('  ✓ = Has encounterId configured (supports auto-discovery)'));
      console.log(chalk.gray('  ○ = Zone-based only (use "generate" with report codes)'));
    }
  });

/**
 * Authenticate command - Manually trigger FFLogs authentication
 */
program
  .command('authenticate')
  .description('Authenticate with FFLogs (opens browser)')
  .action(async () => {
    console.log(chalk.cyan(banner));
    console.log(chalk.yellow('Opening browser for FFLogs authentication...\n'));

    const config = createConfig();

    try {
      const token = await getAccessToken(config.fflogs.clientId, config.fflogs.clientSecret, true);
      console.log(chalk.green('Authentication successful!'));
      console.log(chalk.blue(`  Token: ${token.substring(0, 20)}...`));
    } catch (error) {
      console.error(chalk.red('Authentication failed'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Logout command - Clear stored credentials
 */
program
  .command('logout')
  .description('Clear stored FFLogs credentials')
  .action(async () => {
    console.log(chalk.cyan(banner));

    const spinner = ora('Clearing credentials...').start();

    try {
      await clearCredentials();
      spinner.succeed(chalk.green('Credentials cleared'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to clear credentials'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Config command - Show or set configuration
 */
program
  .command('config')
  .description('Show current configuration')
  .option('-s, --set <key=value>', 'Set a configuration value')
  .action((options) => {
    console.log(chalk.cyan(banner));
    const config = createConfig();

    if (options.set) {
      console.log(chalk.yellow('Setting configuration: ' + options.set));
      console.log(chalk.gray('Configuration changes are not persistent.'));
      console.log(chalk.gray('Use environment variables or .env file for persistent config.'));
      return;
    }

    console.log(chalk.yellow('Current Configuration:\n'));
    console.log(chalk.white('FFLogs:'));
    console.log(chalk.blue(`  • Client ID: ${config.fflogs.clientId}`));
    console.log(chalk.blue(`  • API URL: ${config.fflogs.apiUrl}`));
    console.log(chalk.blue(`  • Redirect URI: ${config.fflogs.redirectUri}`));

    console.log(chalk.white('\nCactbot:'));
    console.log(chalk.blue(`  • Base URL: ${config.cactbot.baseUrl}`));
    console.log(chalk.blue(`  • Bosses mapped: ${Object.keys(config.cactbot.bossMapping).length}`));

    console.log(chalk.white('\nOptions:'));
    console.log(chalk.blue(`  • Include dodgeable: ${config.options.includeDodgeable}`));
    console.log(chalk.blue(`  • Dedupe AoE: ${config.options.dedupeAoE}`));
    console.log(chalk.blue(`  • Min damage threshold: ${config.options.minDamageThreshold}`));
  });

/**
 * Info command - Show information about a boss
 */
program
  .command('info')
  .description('Show information about a boss')
  .option('-b, --boss <id>', 'Boss ID')
  .action((options) => {
    console.log(chalk.cyan(banner));

    if (!options.boss) {
      console.error(chalk.red('Error: Boss ID is required. Use -b or --boss'));
      process.exit(1);
    }

    const bossMapping = getBossMapping(options.boss);

    if (!bossMapping) {
      console.error(chalk.red(`Unknown boss ID: ${options.boss}`));
      console.log(chalk.yellow('Use "list-bosses" to see available IDs.'));
      process.exit(1);
    }

    console.log(chalk.yellow('Boss Information:\n'));
    console.log(chalk.white(`  ID: ${bossMapping.id}`));
    console.log(chalk.white(`  Name: ${bossMapping.name}`));
    console.log(chalk.white(`  MitPlan ID: ${bossMapping.mitPlanId}`));
    console.log(chalk.white(`  Zone ID: ${bossMapping.zoneId || 'N/A'}`));
    console.log(chalk.white(`  Timeline: ${bossMapping.timelinePath}`));
  });

// Parse command line arguments
program.parse();

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
