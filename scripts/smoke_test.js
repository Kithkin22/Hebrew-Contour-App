#!/usr/bin/env node
/** Smoke test: load app modules in order and verify key globals exist. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const scripts = [
  'js/data/books.js',
  'js/data/wlc-text.js',
  'js/app/core.js',
  'js/app/undo.js',
  'js/app/layout.js',
  'js/app/file-menu.js',
  'js/app/arcs.js',
  'js/app/keyboard.js',
  'js/app/annotations.js',
  'js/app/theme.js',
  'js/app/inspector.js',
  'js/app/inspector-morph.js',
  'js/app/ui-init.js',
];

const required = [
  'WLC_TEXT',
  'BOOK_NAMES',
  'state',
  'render',
  'setWorkspaceTab',
  'buildAnnotationTabs',
  'scheduleEditorLayoutFix',
  'undoLastChange',
  'initTopMenus',
];

const sandbox = {
  console,
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: () => {}, setAttribute: () => {} }),
    body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
    documentElement: { style: { setProperty: () => {} }, classList: { add: () => {}, remove: () => {} } },
    addEventListener: () => {},
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  location: { href: 'http://localhost/' },
  navigator: { userAgent: 'smoke-test' },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: clearTimeout,
  matchMedia: () => ({ matches: false, addListener: () => {} }),
  URL: global.URL,
  Blob: global.Blob,
  FileReader: function () { this.readAsText = () => {}; },
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  alert: () => {},
  confirm: () => true,
  prompt: () => null,
  open: () => null,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
  ResizeObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
  IntersectionObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
};

sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

for (const rel of scripts) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.error('MISSING:', rel);
    process.exit(1);
  }
  const code = fs.readFileSync(file, 'utf8');
  try {
    vm.runInContext(code, context, { filename: rel });
  } catch (err) {
    console.error('RUNTIME ERROR in', rel + ':', err.message);
    process.exit(1);
  }
}

const missing = required.filter((name) => sandbox[name] === undefined);
if (missing.length) {
  console.error('Missing globals:', missing.join(', '));
  process.exit(1);
}

if (!sandbox.WLC_TEXT || sandbox.WLC_TEXT.length < 1_000_000) {
  console.error('WLC_TEXT appears truncated');
  process.exit(1);
}

console.log('Smoke test OK:', required.length, 'globals verified, WLC_TEXT', sandbox.WLC_TEXT.length, 'chars');
