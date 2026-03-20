#!/usr/bin/env node
/**
 * MeiliSearch Stats Script
 * 
 * Displays comprehensive statistics about MeiliSearch indices including:
 * - Server health and version
 * - Index statistics (document counts, size)
 * - Pending tasks
 * - Index settings
 * 
 * Usage: npm run search:stats
 */

import { MeiliSearch } from 'meilisearch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MEILISEARCH_HOST = process.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.VITE_MEILISEARCH_API_KEY || '';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatNumber(num) {
  return num.toLocaleString('en-US');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function printSection(title) {
  console.log('\n' + '═'.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('═'.repeat(60));
}

function printSubSection(title) {
  console.log('\n' + '─'.repeat(60));
  log(`  ${title}`, 'blue');
  console.log('─'.repeat(60));
}

async function getServerStats(client) {
  printSection('SERVER INFORMATION');

  try {
    const health = await client.health();
    log(`✓ Status: ${health.status}`, 'green');
  } catch (error) {
    log(`✗ Status: Unreachable`, 'red');
    log(`  Error: ${error.message}`, 'dim');
    return false;
  }

  try {
    const version = await client.getVersion();
    log(`  Version: ${version.pkgVersion}`, 'white');
    log(`  Commit SHA: ${version.commitSha?.substring(0, 7) || 'N/A'}`, 'dim');
    log(`  Build Date: ${version.commitDate || 'N/A'}`, 'dim');
  } catch (error) {
    log(`  Version: Unable to fetch`, 'dim');
  }

  try {
    const stats = await client.getStats();
    log(`  Database Size: ${formatBytes(stats.databaseSize)}`, 'white');
    log(`  Last Update: ${stats.lastUpdate || 'N/A'}`, 'dim');
  } catch (error) {
    // Stats might not be available
  }

  return true;
}

async function getIndexStats(client) {
  printSection('INDICES STATISTICS');

  try {
    const indexes = await client.getIndexes({ limit: 100 });

    if (indexes.results.length === 0) {
      log('  No indices found', 'yellow');
      return;
    }

    log(`  Total Indices: ${indexes.results.length}`, 'white');

    for (const index of indexes.results) {
      printSubSection(`Index: ${index.uid}`);

      try {
        const stats = await client.index(index.uid).getStats();

        log(`  Documents: ${formatNumber(stats.numberOfDocuments)}`, 'green');
        log(`  Is Indexing: ${stats.isIndexing ? 'Yes' : 'No'}`, stats.isIndexing ? 'yellow' : 'white');

        if (stats.fieldDistribution) {
          const fieldCount = Object.keys(stats.fieldDistribution).length;
          log(`  Fields: ${fieldCount}`, 'white');

          // Show top 5 fields by document count
          const topFields = Object.entries(stats.fieldDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          if (topFields.length > 0) {
            log(`  Top Fields:`, 'dim');
            topFields.forEach(([field, count]) => {
              log(`    • ${field}: ${formatNumber(count)}`, 'dim');
            });
          }
        }

        // Get index settings
        const settings = await client.index(index.uid).getSettings();

        if (settings.searchableAttributes && settings.searchableAttributes.length > 0) {
          log(`  Searchable Attributes: ${settings.searchableAttributes.length}`, 'white');
        }

        if (settings.filterableAttributes && settings.filterableAttributes.length > 0) {
          log(`  Filterable Attributes: ${settings.filterableAttributes.length}`, 'white');
          log(`    ${settings.filterableAttributes.join(', ')}`, 'dim');
        }

        if (settings.sortableAttributes && settings.sortableAttributes.length > 0) {
          log(`  Sortable Attributes: ${settings.sortableAttributes.length}`, 'white');
          log(`    ${settings.sortableAttributes.join(', ')}`, 'dim');
        }

        log(`  Primary Key: ${index.primaryKey || 'Not set'}`, 'white');
        log(`  Created At: ${new Date(index.createdAt).toLocaleString()}`, 'dim');
        log(`  Updated At: ${new Date(index.updatedAt).toLocaleString()}`, 'dim');

      } catch (error) {
        log(`  ✗ Error fetching stats: ${error.message}`, 'red');
      }
    }
  } catch (error) {
    log(`✗ Failed to fetch indices: ${error.message}`, 'red');
  }
}

async function getPendingTasks(client) {
  printSection('TASKS STATUS');

  try {
    // Try to get tasks - this method may not be available in all versions
    if (typeof client.getTasks !== 'function') {
      log('  Task information not available in this MeiliSearch client version', 'yellow');
      log('  Server version: ' + ((await client.getVersion()).pkgVersion), 'dim');
      return;
    }

    // Get all tasks
    const allTasks = await client.getTasks();

    // Count tasks by status
    const taskCounts = {
      enqueued: 0,
      processing: 0,
      succeeded: 0,
      failed: 0,
      canceled: 0
    };

    if (allTasks.results) {
      allTasks.results.forEach(task => {
        if (taskCounts.hasOwnProperty(task.status)) {
          taskCounts[task.status]++;
        }
      });
    }

    log(`  Enqueued: ${taskCounts.enqueued}`, taskCounts.enqueued > 0 ? 'yellow' : 'white');
    log(`  Processing: ${taskCounts.processing}`, taskCounts.processing > 0 ? 'yellow' : 'white');
    log(`  Succeeded: ${taskCounts.succeeded}`, 'green');
    log(`  Failed: ${taskCounts.failed}`, taskCounts.failed > 0 ? 'red' : 'white');
    log(`  Canceled: ${taskCounts.canceled}`, taskCounts.canceled > 0 ? 'yellow' : 'white');

    // Show recent pending/processing tasks
    const pendingTasks = allTasks.results?.filter(task =>
      task.status === 'enqueued' || task.status === 'processing'
    ).slice(0, 10) || [];

    if (pendingTasks.length > 0) {
      printSubSection('Pending/Processing Tasks');

      pendingTasks.forEach((task, idx) => {
        log(`  ${idx + 1}. ${task.type} - ${task.status}`, 'yellow');
        log(`     Index: ${task.indexUid || 'N/A'}`, 'dim');
        log(`     Enqueued: ${new Date(task.enqueuedAt).toLocaleString()}`, 'dim');
        if (task.startedAt) {
          log(`     Started: ${new Date(task.startedAt).toLocaleString()}`, 'dim');
        }
      });
    }

    // Show recent failed tasks
    const failedTasks = allTasks.results?.filter(task =>
      task.status === 'failed'
    ).slice(0, 5) || [];

    if (failedTasks.length > 0) {
      printSubSection('Recent Failed Tasks');

      failedTasks.forEach((task, idx) => {
        log(`  ${idx + 1}. ${task.type} - FAILED`, 'red');
        log(`     Index: ${task.indexUid || 'N/A'}`, 'dim');
        log(`     Error: ${task.error?.message || 'Unknown error'}`, 'red');
        log(`     Failed At: ${new Date(task.finishedAt).toLocaleString()}`, 'dim');
      });
    }

  } catch (error) {
    log(`  Tasks: Not available (${error.message})`, 'dim');
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'bright');
  log('║          MeiliSearch Statistics Dashboard                 ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'bright');

  log(`\nConnecting to: ${MEILISEARCH_HOST}`, 'dim');

  const client = new MeiliSearch({
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_API_KEY,
  });

  // Get server stats
  const isHealthy = await getServerStats(client);

  if (!isHealthy) {
    log('\n✗ Unable to connect to MeiliSearch server', 'red');
    log('  Please ensure MeiliSearch is running', 'yellow');
    process.exit(1);
  }

  // Get index statistics
  await getIndexStats(client);

  // Get pending tasks
  await getPendingTasks(client);

  console.log('\n' + '═'.repeat(60));
  log('  Report generated at: ' + new Date().toLocaleString(), 'dim');
  console.log('═'.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('\n');
  log('✗ Fatal Error:', 'red');
  log(`  ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});
