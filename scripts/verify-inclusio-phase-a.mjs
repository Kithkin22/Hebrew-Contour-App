#!/usr/bin/env node
/**
 * Phase A inclusio verification — migration + API surface (no browser).
 */
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = { pass: [], fail: [] };
function ok(name) { results.pass.push(name); }
function fail(name, msg) { results.fail.push({ name, msg }); }

// Static file checks
const required = [
  'js/app/inclusios.js',
  'styles/inclusio-phase-a.css',
  'index.html'
];
for (const f of required) {
  try {
    readFileSync(join(root, f), 'utf8');
    ok(`file exists: ${f}`);
  } catch {
    fail(`file exists: ${f}`, 'missing');
  }
}

const index = readFileSync(join(root, 'index.html'), 'utf8');
if (index.includes('inclusios.js')) ok('index.html loads inclusios.js');
else fail('index.html loads inclusios.js', 'script tag missing');
if (index.includes('id="inclusioEditor"')) ok('index.html has inclusioEditor');
else fail('index.html has inclusioEditor', 'missing');
if (!index.includes('inclusioManager')) ok('index.html removed inclusioManager');
else fail('index.html removed inclusioManager', 'still present');

const inclusiosJs = readFileSync(join(root, 'js/app/inclusios.js'), 'utf8');
for (const sym of ['migrateInclusioItem', 'renderInclusioEditor', 'renderInclusioRegistry', 'deriveInclusioSpan', 'activateInclusio', 'syncInclusioWordMarkers']) {
  if (inclusiosJs.includes(`function ${sym}`)) ok(`inclusios.js defines ${sym}`);
  else fail(`inclusios.js defines ${sym}`, 'missing');
}

// Migration unit test via vm — minimal globals
const vm = await import('vm');
const sandbox = {
  state: { verses: [{ ref: 'Ruth 1:1', clauses: [{ words: [{ text: 'לחם', deleted: false }, { text: 'ו', deleted: false }] }] }, { ref: 'Ruth 1:2', clauses: [{ words: [{ text: 'לחם', deleted: false }] }] }], inclusios: [], activeInclusioId: null },
  cloneLoc: l => l ? { v: l.v, c: l.c, w: l.w } : null,
  locOK: l => !!(l && l.v != null),
  orderedLocs: (a, b) => [a, b],
  locRank: () => 0,
  locInRange: () => true,
  locEqual: (a, b) => a.v === b.v && a.c === b.c && a.w === b.w,
  isMaqafConnector: () => false,
  commentAnchorText: (s, e) => 'לחם',
  esc: s => String(s),
  markUndo: () => {},
  autoSaveProject: () => {},
  document: { getElementById: () => null, readyState: 'complete', addEventListener: () => {} }
};
vm.createContext(sandbox);
const code = inclusiosJs.replace(/^let inclusioPhraseDraft[\s\S]*?^const RELATIONSHIP/m, 'const RELATIONSHIP');
vm.runInContext(code, sandbox);

const legacy = { id: 'inc1', label: 'Test', color: '#315efb', start: { v: 0, c: 0, w: 0 }, end: { v: 1, c: 0, w: 0 } };
const migrated = sandbox.migrateInclusioItem(legacy);
if (migrated.openingAnchor?.range?.start?.v === 0) ok('migration: start → openingAnchor');
else fail('migration: start → openingAnchor', JSON.stringify(migrated));
if (migrated.closingAnchor?.range?.start?.v === 1) ok('migration: end → closingAnchor');
else fail('migration: end → closingAnchor', JSON.stringify(migrated));
if (migrated.start === undefined && migrated.end === undefined) ok('migration: removes legacy start/end');
else fail('migration: removes legacy start/end', 'legacy fields remain');

sandbox.state.inclusios = [migrated];
const span = sandbox.deriveInclusioSpan(migrated);
if (span.includes('Ruth')) ok('deriveInclusioSpan returns verse refs');
else fail('deriveInclusioSpan returns verse refs', span);

console.log(JSON.stringify({ pass: results.pass.length, fail: results.fail.length, failures: results.fail }, null, 2));
process.exit(results.fail.length ? 1 : 0);
