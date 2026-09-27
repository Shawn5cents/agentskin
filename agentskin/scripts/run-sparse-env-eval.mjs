#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const defaultContract = path.join(root, 'benchmarks', 'sparse-env-contract.json');
const defaultCli = process.env.SPARSE_ENV_CLI || '/data/repos/sparse-env/bin/sparse-env';

function parseArgs(argv) {
  const out = {
    sparseEnv: defaultCli,
    contract: defaultContract,
    cacheState: 'cold',
    name: `agentskin-core-${crypto.randomBytes(4).toString('hex')}`,
    out: null
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sparse-env') out.sparseEnv = argv[++i];
    else if (arg === '--contract') out.contract = argv[++i];
    else if (arg === '--cache-state') out.cacheState = argv[++i];
    else if (arg === '--name') out.name = argv[++i];
    else if (arg === '--out') out.out = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!['cold', 'warm'].includes(out.cacheState)) {
    throw new Error(`invalid cache state: ${out.cacheState}`);
  }
  return out;
}

function callSparse(cli, args, { ok = true } = {}) {
  const proc = spawnSync(cli, ['--client', 'agentskin', ...args], {
    encoding: 'utf8'
  });
  let payload = {};
  if (proc.stdout?.trim()) {
    try {
      payload = JSON.parse(proc.stdout);
    } catch {
      throw new Error(`Sparse Env returned invalid JSON for ${args[0]}: ${proc.stdout.slice(-1000)}`);
    }
  }
  if (ok && proc.status !== 0) {
    throw new Error(payload.error || proc.stderr?.trim() || `Sparse Env exit ${proc.status}`);
  }
  return { code: proc.status ?? 1, payload };
}

export function runSparseEnvEval(options) {
  const contract = JSON.parse(fs.readFileSync(options.contract, 'utf8'));
  const selection = callSparse(options.sparseEnv, [
    'select', contract.workload, '--cache-state', options.cacheState
  ]).payload;
  const selected = selection.selected_environment;

  const result = {
    schema_version: 1,
    consumer: 'agentskin',
    workload: contract.workload,
    cache_state: options.cacheState,
    selection,
    instance: options.name
  };

  let created = false;
  try {
    result.create = callSparse(options.sparseEnv, [
      'create', selected, '--name', options.name
    ]).payload;
    created = true;

    const [executable, ...args] = contract.command;
    result.run = callSparse(options.sparseEnv, [
      'run',
      options.name,
      '--cwd',
      '/app',
      '--timeout-ms',
      '120000',
      executable,
      ...args
    ]).payload;

    if (result.run.exitCode !== 0) {
      throw new Error(`AgentSkin frozen workload failed with exit ${result.run.exitCode}`);
    }

    const actual = crypto.createHash('sha256').update(result.run.stdout || '').digest('hex');
    result.correctness = {
      expected_stdout_sha256: contract.expected_stdout_sha256,
      actual_stdout_sha256: actual,
      match: actual === contract.expected_stdout_sha256
    };
    if (!result.correctness.match) {
      throw new Error(`AgentSkin output hash mismatch: ${actual} != ${contract.expected_stdout_sha256}`);
    }

    result.stats = callSparse(options.sparseEnv, ['stats', options.name]).payload;
  } finally {
    if (created) {
      result.destroy = callSparse(options.sparseEnv, ['destroy', options.name]).payload;
      const post = callSparse(options.sparseEnv, ['status', options.name], { ok: false });
      result.post_destroy_status = post.payload;
      result.teardown_verified = post.code !== 0;
    }
  }

  result.pass = Boolean(result.correctness?.match && result.teardown_verified);
  if (!result.pass) throw new Error('AgentSkin Sparse Env validation did not pass');
  return result;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = runSparseEnvEval(options);
  const payload = JSON.stringify(result, null, 2) + '\n';
  if (options.out) {
    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    fs.writeFileSync(options.out, payload);
  }
  process.stdout.write(payload);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    process.stderr.write(JSON.stringify({ ok: false, error: error.message }) + '\n');
    process.exit(1);
  }
}
