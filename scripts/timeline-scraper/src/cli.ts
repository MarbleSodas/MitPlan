#!/usr/bin/env node
import { config } from 'dotenv';
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
  scrapeTimeline,
} from './generator/index.js';
import { processCactbotFirst } from './generator/cactbotFirstProcessor.js';
import { processTimelines, generateTimelineReport } from './generator/enhancedProcessor.js';
import { extractDamageTimeline } from './generator/damageExtractor.js';
import { getBossMultiHitAbilities, getBossFirstAction } from './config/index.js';
import { getAccessToken, clearCachedToken } from './sources/fflogs/auth.js';
import { createConfig, getBossMapping, getAllBossIds } from './config/index.js';
import { getRateLimitStatus } from './sources/fflogs/client.js';

const program = new Command();

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

program
  .command('generate')
  .description('Generate a timeline for a boss from FFLogs damage data')
  .argument('<boss>', 'Boss ID (e.g., m7s, m8s)')
  .option('-c, --count <number>', 'Number of reports to analyze', '30')
  .option('-o, --output <path>', 'Custom output path')
  .option('--dry-run', 'Preview without saving')
  .action(async (bossId: string, options: any) => {
    console.log(chalk.cyan(banner));

    const spinner = ora(`Generating timeline for ${bossId}...`).start();

    try {
      const result = await extractDamageTimeline({
        bossId,
        count: parseInt(options.count, 10),
        output: options.output,
        dryRun: options.dryRun || false,
        onProgress: (message) => {
          spinner.text = message;
        },
      });

      if (result.success) {
        spinner.succeed(chalk.green(`Generated timeline with ${result.actions.length} actions`));

        console.log(chalk.blue('\n=== Summary ==='));
        console.log(chalk.blue(`  Unique abilities: ${result.uniqueAbilities}`));
        console.log(chalk.blue(`  Events processed: ${result.totalEventsProcessed}`));
        console.log(chalk.blue(`  Reports used: ${result.reportsUsed.length}`));

        if (!options.dryRun && result.outputPath) {
          console.log(chalk.green(`\n  Output: ${result.outputPath}`));
        }

        if (result.errors.length > 0) {
          console.log(chalk.yellow(`\n  Warnings: ${result.errors.length}`));
          for (const error of result.errors.slice(0, 3)) {
            console.log(chalk.yellow(`    - ${error}`));
          }
        }
      } else {
        spinner.fail(chalk.red('Failed to generate timeline'));
        for (const error of result.errors) {
          console.log(chalk.red(`  - ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('generate-cactbot')
  .description('Generate timeline using Cactbot as source of truth (alternative approach)')
  .argument('<boss>', 'Boss ID (e.g., m7s, m8s)')
  .option('-c, --count <number>', 'Number of recent reports to fetch', '30')
  .option('-r, --reports <codes...>', 'FFLogs report codes (optional)')
  .option('-o, --output <path>', 'Output file path')
  .option('--dry-run', 'Generate without writing output file')
  .option('--include-dodgeable', 'Include abilities with low hit rates')
  .option('-t, --threshold <number>', 'Hit rate threshold for dodgeable detection (0.0-1.0)', '0.7')
  .action(async (bossId: string, options: any) => {
    console.log(chalk.cyan(banner));

    const spinner = ora('Generating timeline (Cactbot-first)...').start();

    try {
      const reportCodes = options.reports
        ? (Array.isArray(options.reports) ? options.reports : [options.reports])
        : undefined;

      const threshold = parseFloat(options.threshold);
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        spinner.fail(chalk.red('Invalid threshold value. Must be between 0.0 and 1.0'));
        process.exit(1);
      }

      const result = await processCactbotFirst({
        bossId: bossId,
        reportCodes,
        count: parseInt(options.count, 10),
        output: options.output,
        dryRun: options.dryRun || false,
        includeDodgeable: options.includeDodgeable || false,
        dodgeableThreshold: threshold,
        onProgress: (message) => {
          spinner.text = message;
        },
      });

      if (result.success) {
        spinner.succeed(chalk.green(`Generated timeline with ${result.actions.length} actions`));

        console.log(chalk.blue('\n=== Summary ==='));
        console.log(chalk.blue(`  Cactbot actions: ${result.cactbotActionCount}`));
        console.log(chalk.blue(`  Matched with FFLogs: ${result.matchedActionCount}`));
        console.log(chalk.blue(`  Dodgeable filtered: ${result.dodgeableActionCount}`));
        console.log(chalk.blue(`  Reports processed: ${result.reportsUsed.length}`));

        if (!options.dryRun && result.outputPath) {
          console.log(chalk.green(`\n  Output: ${result.outputPath}`));
        }

        if (result.errors.length > 0) {
          console.log(chalk.yellow(`\n  Warnings: ${result.errors.length}`));
          for (const error of result.errors.slice(0, 3)) {
            console.log(chalk.yellow(`    - ${error}`));
          }
        }
      } else {
        spinner.fail(chalk.red('Failed to generate timeline'));
        for (const error of result.errors) {
          console.log(chalk.red(`  - ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('list-bosses')
  .description('List all available boss IDs')
  .action(() => {
    console.log(chalk.cyan(banner));
    console.log(chalk.yellow('Available Boss IDs:\n'));

    const config = createConfig();
    const bosses = Object.entries(config.cactbot.bossMapping);

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
    console.log(chalk.gray('  ✓ = Has encounterId (supports auto-discovery)'));
    console.log(chalk.gray('  ○ = Requires manual report codes'));
  });

program
  .command('info')
  .description('Show information about a boss')
  .argument('<boss>', 'Boss ID')
  .action((bossId: string) => {
    console.log(chalk.cyan(banner));

    const bossMapping = getBossMapping(bossId);

    if (!bossMapping) {
      console.error(chalk.red(`Unknown boss ID: ${bossId}`));
      console.log(chalk.yellow('Use "list-bosses" to see available IDs.'));
      process.exit(1);
    }

    console.log(chalk.yellow('Boss Information:\n'));
    console.log(chalk.white(`  ID: ${bossMapping.id}`));
    console.log(chalk.white(`  Name: ${bossMapping.name}`));
    console.log(chalk.white(`  MitPlan ID: ${bossMapping.mitPlanId}`));
    console.log(chalk.white(`  Zone ID: ${bossMapping.zoneId || 'N/A'}`));
    console.log(chalk.white(`  Encounter ID: ${bossMapping.encounterId || 'N/A'}`));
    console.log(chalk.white(`  Timeline: ${bossMapping.timelinePath}`));
  });

program
  .command('analyze')
  .description('Analyze an FFLogs report')
  .argument('<report>', 'FFLogs report code')
  .option('-f, --fight <id>', 'Specific fight ID to analyze')
  .action(async (reportCode: string, options: any) => {
    console.log(chalk.cyan(banner));

    const spinner = ora('Analyzing report...').start();

    try {
      await analyzeReport(reportCode, {
        fightId: options.fight ? parseInt(options.fight, 10) : undefined,
      });
      spinner.stop();
    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(error);
      process.exit(1);
    }
  });

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
        console.log(chalk.blue('  Client ID: ' + config.fflogs.clientId));
        console.log(chalk.blue('  Token: ' + token.substring(0, 20) + '...'));
      } else {
        spinner.fail(chalk.red('Not authenticated'));
        console.log(chalk.yellow('  Run "authenticate" command to log in'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Status check failed'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('authenticate')
  .description('Authenticate with FFLogs')
  .action(async () => {
    console.log(chalk.cyan(banner));
    console.log(chalk.yellow('Authenticating with FFLogs...\n'));

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

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
