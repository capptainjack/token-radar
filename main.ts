// Token Radar, entrypoint (Node 22, standard library only).
//
// Reads the sealed snapshot from /input/snapshot.json (or --input
// <file|directory>), scores every rankable pre-token protocol with the
// radar-2 model in lib/model.ts, writes the ranked board to
// /output/board.json, writes the dashboard's data beside it, copies
// dashboard/ and screenshots/ to /output, and writes /output/dossier.json
// with the vendored make.fun library.
//
// The run is deterministic: the same snapshot always writes the same
// bytes. It fails loudly, with the exact problem, instead of writing
// a half-valid board.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, impliedValue, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The dossier's text cap, and the screenshot caps the gate enforces. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function fail(message: string, code = 1): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

/** The value after --name, or after --name=, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  fail(`no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`, 2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

let snapshotText: string;
try {
  snapshotText = readFileSync(inputFile, 'utf8');
} catch {
  fail(`cannot read the snapshot at ${inputFile}`);
}

let snapshot;
try {
  snapshot = parseSnapshot(snapshotText);
} catch (err) {
  fail(`the snapshot is not one this model can score: ${(err as Error).message}`);
}

const { board, radar } = buildRadar(snapshot);

// The board must agree with the model when recomputed row by row:
// a stale or hand-edited row is caught here, before anything is written.
for (const row of board) {
  const protocol = snapshot.protocols.find((p) => p.slug === row.slug)!;
  const recomputed = impliedValue(protocol, snapshot.as_of);
  if (recomputed.implied !== row.implied_value_usd) {
    fail(`row ${row.slug} carries implied value $${row.implied_value_usd} but the model recomputes $${recomputed.implied}`);
  }
  // The farm plan's shape follows the chain count: six steps on one
  // chain, seven when the protocol runs on more than one, with the
  // extra step repeating the core action on the second chain.
  const expectedSteps = protocol.chains.length > 1 ? 7 : 6;
  if (row.farm_steps.length !== expectedSteps) {
    fail(`row ${row.slug} runs on ${protocol.chains.length} chain${protocol.chains.length === 1 ? '' : 's'} but carries ${row.farm_steps.length} farm steps, expected ${expectedSteps}`);
  }
  const dashboardRow = radar.rows.find((r) => r.slug === row.slug)!;
  if (dashboardRow.implied_value_usd !== row.implied_value_usd || dashboardRow.farm_steps.length !== row.farm_steps.length) {
    fail(`row ${row.slug}: the dashboard data disagrees with the board`);
  }
}

const issue = boardIssue(board, snapshot);
if (issue !== null) {
  fail(`the model wrote a board the gate refuses: ${issue}`);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

/** Copy one directory's regular files into `to`, skipping dot-names. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const dashboardFiles = copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
if (dashboardFiles.length === 0 || !dashboardFiles.includes('index.html')) {
  fail('dashboard/ holds no index.html: the page is what the judge reads');
}
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  fail(`screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
  }
  const bytes = statSync(join(here, 'screenshots', name)).size;
  if (bytes > SCREENSHOT_CAPS.max_bytes) {
    fail(`screenshots/${name} is ${bytes} bytes, over the ${SCREENSHOT_CAPS.max_bytes} cap`);
  }
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: SCREENSHOT_CAPS,
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  }),
);

process.stdout.write(
  `token radar: snapshot ${snapshot.as_of}, ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, floor $${snapshot.floor_usd}\n` +
    `token radar: ${board.length} rows scored (${radar.early_size} outside the watchlist, ${radar.live_size} live set aside, ${radar.set_aside_size} pre-token set aside)\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (${dashboardFiles.length} files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);
