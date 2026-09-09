#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Load config from .env.local.postgres if present, fallback to process.env
const envFile = path.join(rootDir, '.env.local.postgres');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1];
      const val = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://finance_local:finance_local_dev_only@127.0.0.1:55432/finance_local';
const AGENT_INGEST_TOKEN =
  process.env.AGENT_INGEST_TOKEN || 'local-dev-agent-token-test-12345';
const LOCAL_OWNER_ID = process.env.LOCAL_OWNER_ID || 'local-test-owner-001';
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');
const helpRequested = args.includes('--help') || args.includes('-h');

if (helpRequested) {
  console.log(`
FinanceMe Local Agent Ingestion E2E Verification Harness

Usage:
  node scripts/verify-local-ingestion.mjs [options]

Options:
  --clean       Clean test owner records from local database and exit
  --help, -h    Show this help message

Environment Variables:
  DATABASE_URL        Postgres connection string (default: 127.0.0.1:55432)
  AGENT_INGEST_TOKEN  Bearer token for agent ingestion
  LOCAL_OWNER_ID      Owner ID for test records
  APP_URL             Next.js server URL (default: http://localhost:3000)
`);
  process.exit(0);
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function logHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logPass(msg) {
  console.log(`  ${colors.green}✔ PASS:${colors.reset} ${msg}`);
}

function logFail(msg, detail = '') {
  console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${msg}`);
  if (detail) console.log(`    ${colors.gray}${detail}${colors.reset}`);
}

function logWarn(msg) {
  console.log(`  ${colors.yellow}⚠ WARN:${colors.reset} ${msg}`);
}

function logInfo(msg) {
  console.log(`  ${colors.blue}ℹ INFO:${colors.reset} ${msg}`);
}

let passedTests = 0;
let failedTests = 0;

async function run() {
  console.log(`\n${colors.bold}${colors.green}FinanceMe — Task 9 Local E2E Verification${colors.reset}`);
  logInfo(`Target App URL: ${BASE_URL}`);
  logInfo(`Database URL:   ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  logInfo(`Test Owner ID:  ${LOCAL_OWNER_ID}`);

  // Step 1: Check Database Connectivity
  logHeader('1. Checking PostgreSQL Connection');
  let sql;
  try {
    sql = postgres(DATABASE_URL, { connect_timeout: 3, max: 1 });
    const [{ now }] = await sql`SELECT NOW() as now`;
    logPass(`Connected to PostgreSQL successfully (server time: ${now.toISOString()})`);
  } catch (err) {
    logFail('Cannot connect to local PostgreSQL', err.message);
    console.log(`\n${colors.yellow}How to start the isolated local PostgreSQL container:${colors.reset}`);
    console.log(`  1. Make sure Docker Desktop is started.`);
    console.log(`  2. Run: ${colors.bold}docker compose -f docker-compose.local.yml up -d${colors.reset}`);
    console.log(`  3. Run: ${colors.bold}npm run db:migrate${colors.reset}\n`);
    if (sql) await sql.end();
    process.exit(1);
  }

  // Step 2: Check Schema Tables
  logHeader('2. Verifying Schema Tables');
  const requiredTables = [
    'finance_transactions',
    'meal_logs',
    'workout_logs',
    'running_logs',
    'agent_ingestion_events',
  ];

  try {
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableNames = new Set(existingTables.map((t) => t.table_name));
    for (const table of requiredTables) {
      if (tableNames.has(table)) {
        logPass(`Table '${table}' exists`);
        passedTests++;
      } else {
        logFail(`Table '${table}' is missing!`);
        failedTests++;
      }
    }
  } catch (err) {
    logFail('Error inspecting schema tables', err.message);
    failedTests++;
  }

  // Step 2.5: If --clean flag requested, clean test owner data and exit
  if (shouldClean) {
    logHeader('Cleaning Test Owner Data');
    try {
      for (const table of requiredTables) {
        const res = await sql.unsafe(
          `DELETE FROM "${table}" WHERE owner_id = $1`,
          [LOCAL_OWNER_ID]
        );
        logInfo(`Deleted records from ${table}: ${res.count}`);
      }
      logPass(`Cleaned all records for owner '${LOCAL_OWNER_ID}'`);
    } catch (err) {
      logFail('Failed to clean test data', err.message);
    } finally {
      await sql.end();
    }
    process.exit(0);
  }

  // Step 3: Check Next.js Server Status
  logHeader('3. Checking Next.js Server Status');
  let serverRunning = false;
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, { method: 'GET' });
    // 401 or 503 means the server is running
    if (res.status === 401 || res.status === 503 || res.status === 200) {
      serverRunning = true;
      logPass(`Next.js server is responding at ${BASE_URL} (status: ${res.status})`);
      if (res.status === 503) {
        logWarn(
          `API returned 503 ("Local PostgreSQL agent ingestion is disabled"). ` +
          `Make sure Next.js was started with DATA_BACKEND=postgres and LOCAL_OWNER_ID set.`
        );
      }
    }
  } catch (err) {
    logFail(`Cannot reach Next.js server at ${BASE_URL}`, err.message);
    console.log(`\n${colors.yellow}Please start Next.js in PostgreSQL mode:${colors.reset}`);
    console.log(
      `  ${colors.bold}powershell: $env:DATA_BACKEND="postgres"; $env:LOCAL_OWNER_ID="${LOCAL_OWNER_ID}"; $env:AGENT_INGEST_TOKEN="${AGENT_INGEST_TOKEN}"; npm run dev${colors.reset}\n`
    );
    await sql.end();
    process.exit(1);
  }

  // Step 4: Security & Authentication Tests
  logHeader('4. Security & Authentication Checks');

  // Test 4.1: Missing Bearer Token
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
    if (res.status === 401) {
      logPass('Rejects request without Authorization header (HTTP 401)');
      passedTests++;
    } else {
      logFail(`Expected 401 for missing token, got ${res.status}`);
      failedTests++;
    }
  } catch (err) {
    logFail('Test 4.1 failed with error', err.message);
    failedTests++;
  }

  // Test 4.2: Invalid Bearer Token
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-token-xyz',
      },
      body: JSON.stringify({ test: true }),
    });
    if (res.status === 401) {
      logPass('Rejects request with invalid Bearer token (HTTP 401)');
      passedTests++;
    } else {
      logFail(`Expected 401 for wrong token, got ${res.status}`);
      failedTests++;
    }
  } catch (err) {
    logFail('Test 4.2 failed with error', err.message);
    failedTests++;
  }

  // Step 5: Ingestion Tests (4 Record Types)
  logHeader('5. Ingestion of 4 Domain Record Types');
  const nowIso = new Date().toISOString();
  const runBatchId = Date.now().toString();

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AGENT_INGEST_TOKEN}`,
  };

  // 5.1 Ingest Transaction (Expense)
  const txKey = `e2e-tx-${runBatchId}`;
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'transaction',
        idempotencyKey: txKey,
        source: 'e2e-tester',
        sourceMessageId: `msg-${runBatchId}-1`,
        data: {
          transactionType: 'EXPENSE',
          amount: '350.50',
          currency: 'THB',
          description: 'E2E Test Lunch & Coffee',
          occurredAt: nowIso,
        },
      }),
    });
    const json = await res.json();
    if (res.status === 201 && json.status === 'created' && json.record?.id) {
      logPass(`Ingested 'transaction' successfully (ID: ${json.record.id}, Amount: 350.50 THB)`);
      passedTests++;
    } else {
      logFail(`Failed to ingest transaction`, JSON.stringify(json));
      failedTests++;
    }
  } catch (err) {
    logFail('Transaction ingestion threw error', err.message);
    failedTests++;
  }

  // 5.2 Ingest Meal
  const mealKey = `e2e-meal-${runBatchId}`;
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'meal',
        idempotencyKey: mealKey,
        source: 'e2e-tester',
        sourceMessageId: `msg-${runBatchId}-2`,
        data: {
          mealType: 'lunch',
          food: 'Grilled Chicken Breast with Brown Rice',
          calories: 520,
          proteinGrams: 45.5,
          carbsGrams: 50.0,
          fatGrams: 10.2,
          cost: '120.00',
          loggedAt: nowIso,
        },
      }),
    });
    const json = await res.json();
    if (res.status === 201 && json.status === 'created' && json.record?.id) {
      logPass(`Ingested 'meal' successfully (ID: ${json.record.id}, Food: Grilled Chicken)`);
      passedTests++;
    } else {
      logFail(`Failed to ingest meal`, JSON.stringify(json));
      failedTests++;
    }
  } catch (err) {
    logFail('Meal ingestion threw error', err.message);
    failedTests++;
  }

  // 5.3 Ingest Workout
  const workoutKey = `e2e-workout-${runBatchId}`;
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'workout',
        idempotencyKey: workoutKey,
        source: 'e2e-tester',
        sourceMessageId: `msg-${runBatchId}-3`,
        data: {
          exercise: 'Barbell Bench Press',
          sets: 4,
          reps: 10,
          durationMinutes: 45,
          intensity: 'hard',
          loggedAt: nowIso,
        },
      }),
    });
    const json = await res.json();
    if (res.status === 201 && json.status === 'created' && json.record?.id) {
      logPass(`Ingested 'workout' successfully (ID: ${json.record.id}, Exercise: Bench Press)`);
      passedTests++;
    } else {
      logFail(`Failed to ingest workout`, JSON.stringify(json));
      failedTests++;
    }
  } catch (err) {
    logFail('Workout ingestion threw error', err.message);
    failedTests++;
  }

  // 5.4 Ingest Run
  const runKey = `e2e-run-${runBatchId}`;
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'run',
        idempotencyKey: runKey,
        source: 'e2e-tester',
        sourceMessageId: `msg-${runBatchId}-4`,
        data: {
          distanceKm: 5.25,
          durationMinutes: 30,
          runType: 'tempo',
          intensity: 'normal',
          loggedAt: nowIso,
        },
      }),
    });
    const json = await res.json();
    if (res.status === 201 && json.status === 'created' && json.record?.id) {
      logPass(`Ingested 'run' successfully (ID: ${json.record.id}, Distance: 5.25 km)`);
      passedTests++;
    } else {
      logFail(`Failed to ingest run`, JSON.stringify(json));
      failedTests++;
    }
  } catch (err) {
    logFail('Run ingestion threw error', err.message);
    failedTests++;
  }

  // Step 6: Idempotency Deduplication Verification
  logHeader('6. Idempotency & Deduplication Check');
  try {
    // Re-submit the exact same transaction key
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'transaction',
        idempotencyKey: txKey,
        source: 'e2e-tester',
        sourceMessageId: `msg-${runBatchId}-1-duplicate`,
        data: {
          transactionType: 'EXPENSE',
          amount: '350.50',
          currency: 'THB',
          description: 'E2E Test Lunch & Coffee (Duplicate attempt)',
          occurredAt: nowIso,
        },
      }),
    });
    const json = await res.json();
    if (res.status === 200 && json.status === 'deduplicated') {
      logPass(`Deduplicated correctly! Returned HTTP 200 with status: 'deduplicated'`);
      passedTests++;
    } else {
      logFail(`Expected HTTP 200 deduplicated, got status ${res.status}`, JSON.stringify(json));
      failedTests++;
    }
  } catch (err) {
    logFail('Deduplication check failed with error', err.message);
    failedTests++;
  }

  // Step 7: Constraint Validation & Rollback
  logHeader('7. Constraint Validation Checks');
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'transaction',
        idempotencyKey: `e2e-invalid-${runBatchId}`,
        source: 'e2e-tester',
        sourceMessageId: `msg-inv-${runBatchId}`,
        data: {
          transactionType: 'EXPENSE',
          amount: '-50.00', // Invalid negative amount
          currency: 'THB',
          description: 'Invalid negative transaction',
          occurredAt: nowIso,
        },
      }),
    });
    if (res.status === 400) {
      logPass('Rejected negative transaction amount (HTTP 400)');
      passedTests++;
    } else {
      logFail(`Expected HTTP 400 for negative amount, got ${res.status}`);
      failedTests++;
    }
  } catch (err) {
    logFail('Constraint check failed with error', err.message);
    failedTests++;
  }

  // Step 8: GET Verification & Pagination
  logHeader('8. GET Records & Pagination Verification');
  try {
    const res = await fetch(`${BASE_URL}/api/agent/records?limit=10&offset=0`, {
      method: 'GET',
      headers: authHeaders,
    });
    const json = await res.json();
    if (res.status === 200 && Array.isArray(json.records) && json.total >= 4) {
      logPass(`Retrieved ${json.records.length} records (total in DB: ${json.total})`);
      passedTests++;
    } else {
      logFail(`GET records failed or unexpected response`, JSON.stringify(json));
      failedTests++;
    }
  } catch (err) {
    logFail('GET verification failed with error', err.message);
    failedTests++;
  }

  // Step 9: Direct Database Row Counts & Audit Reconciliation
  logHeader('9. Direct Database Row Reconciliation');
  try {
    const [txCount] = await sql`SELECT count(*)::int as c FROM finance_transactions WHERE owner_id = ${LOCAL_OWNER_ID}`;
    const [mealCount] = await sql`SELECT count(*)::int as c FROM meal_logs WHERE owner_id = ${LOCAL_OWNER_ID}`;
    const [workoutCount] = await sql`SELECT count(*)::int as c FROM workout_logs WHERE owner_id = ${LOCAL_OWNER_ID}`;
    const [runCount] = await sql`SELECT count(*)::int as c FROM running_logs WHERE owner_id = ${LOCAL_OWNER_ID}`;
    const [auditCount] = await sql`SELECT count(*)::int as c FROM agent_ingestion_events WHERE owner_id = ${LOCAL_OWNER_ID}`;

    logInfo(`Postgres Row Counts for Owner '${LOCAL_OWNER_ID}':`);
    console.log(`    - finance_transactions:  ${txCount.c}`);
    console.log(`    - meal_logs:             ${mealCount.c}`);
    console.log(`    - workout_logs:          ${workoutCount.c}`);
    console.log(`    - running_logs:          ${runCount.c}`);
    console.log(`    - agent_ingestion_events:${auditCount.c}`);

    // Audit count must equal sum of domain rows for 1-to-1 ingestion events
    const domainTotal = txCount.c + mealCount.c + workoutCount.c + runCount.c;
    if (auditCount.c === domainTotal) {
      logPass(`Audit event count (${auditCount.c}) matches total domain records (${domainTotal})`);
      passedTests++;
    } else {
      logFail(`Audit count (${auditCount.c}) does not match domain total (${domainTotal})`);
      failedTests++;
    }
  } catch (err) {
    logFail('Reconciliation query failed', err.message);
    failedTests++;
  }

  // Final Summary
  await sql.end();
  logHeader('Verification Summary');
  console.log(`  Passed Tests: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`  Failed Tests: ${failedTests > 0 ? colors.red : colors.gray}${failedTests}${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${colors.bold}${colors.green}🎉 ALL TASK 9 LOCAL VERIFICATIONS PASSED!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.bold}${colors.red}❌ Some verifications failed. Please check logs above.${colors.reset}\n`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(`\n${colors.red}Unexpected fatal error:${colors.reset}`, err);
  process.exit(1);
});
