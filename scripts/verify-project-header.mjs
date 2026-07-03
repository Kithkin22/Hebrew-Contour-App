#!/usr/bin/env node
/** Quick checks for project header + save shortcut wiring */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const pass = [];

function ok(m) { pass.push(m); }
function bad(m) { fail.push(m); }

const index = readFileSync(join(root, 'index.html'), 'utf8');
const layout = readFileSync(join(root, 'js/app/layout.js'), 'utf8');
const header = readFileSync(join(root, 'js/app/project-header.js'), 'utf8');

if (index.includes('project-header.js')) ok('index loads project-header.js');
else bad('missing project-header.js script');
if (index.includes('renameProjectModal')) ok('rename confirm modal in index');
else bad('missing rename modal');
if (index.includes('project-header.css')) ok('project-header.css linked');
else bad('missing project-header.css');
if (header.includes('metaKey') && header.includes("'s'")) ok('save shortcut handler');
else bad('save shortcut missing');
if (header.includes('requestProjectRename')) ok('requestProjectRename defined');
else bad('requestProjectRename missing');
if (layout.includes('requestProjectRename')) ok('renameCurrentProject delegates');
else bad('layout rename not wired');
if (layout.includes('setSaveIndicator')) ok('persist uses setSaveIndicator');
else bad('setSaveIndicator not wired');

console.log(JSON.stringify({ pass: pass.length, fail: fail.length, failures: fail }, null, 2));
process.exit(fail.length ? 1 : 0);
