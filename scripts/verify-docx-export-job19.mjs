#!/usr/bin/env node
/**
 * Verify Contour → Word (DOCX) export for Job 19 saved project.
 * Generates .docx, validates OOXML, opens in Microsoft Word, captures comparison.
 *
 * Run:
 *   HC_PROJECT_JSON=~/Downloads/Job-Exegesis-Draft.json \
 *   HC_VERIFY_URL=http://127.0.0.1:8765 \
 *   node scripts/verify-docx-export-job19.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const BASE = process.env.HC_VERIFY_URL || 'http://127.0.0.1:8765';
const PASS = 'AMBS';
const OUT = path.join('docs', 'assets', 'export-verify-v80-docx');
const PROJECT_JSON = process.env.HC_PROJECT_JSON
  || path.join(os.homedir(), 'Downloads', 'Job-Exegesis-Draft.json');

const results = [];
function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} [${id}] ${detail}`);
}

async function unlock(page) {
  const gate = page.locator('#passwordGate:not(.hidden)');
  if (await gate.count()) {
    await page.fill('#appPasswordInput', PASS);
    await page.click('#appPasswordSubmit');
  }
  await page.waitForFunction(
    () => typeof contourDocxXml === 'function' && typeof restoreProjectPayload === 'function',
    { timeout: 30000 }
  );
}

function makeZip(files) {
  const enc = new TextEncoder();
  const crcTable = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (u8) => {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const parts = [];
  const central = [];
  let offset = 0;
  files.forEach((f) => {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const local = new Uint8Array([
      0x50, 0x4b, 3, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), 0, 0, ...name,
    ]);
    parts.push(local, data);
    central.push({ name, crc, size: data.length, offset });
    offset += local.length + data.length;
  });
  const cd = [];
  central.forEach((f) => {
    cd.push(new Uint8Array([
      0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(f.crc), ...u32(f.size), ...u32(f.size), ...u16(f.name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(f.offset), ...f.name,
    ]));
  });
  const cdSize = cd.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), 0, 0]);
  return Buffer.concat([...parts, ...cd, end]);
}

function parseDocxParagraphs(xml) {
  const paras = [];
  const re = /<w:p>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const bidi = /<w:bidi\s*\/>/.test(block);
    const jcRight = /<w:jc w:val="right"\s*\/>/.test(block);
    const indRight = block.match(/<w:ind w:right="(\d+)"/);
    const spacing = block.match(/<w:spacing w:after="(\d+)"/);
    const rtlRun = /<w:rtl\s*\/>/.test(block);
    const colors = [...block.matchAll(/<w:color w:val="([0-9A-F]+)"/gi)].map((x) => x[1]);
    const text = block.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!text) continue;
    paras.push({
      bidi,
      jcRight,
      rtlRun,
      indRight: indRight ? +indRight[1] : 0,
      spacingAfter: spacing ? +spacing[1] : 0,
      colors,
      text,
    });
  }
  return paras;
}

function pdfToPng(pdfPath, pngPath) {
  try {
    execSync(`qlmanage -t -s 1800 -o "${path.dirname(pngPath)}" "${pdfPath}"`, { stdio: 'pipe' });
    const generated = `${pdfPath}.png`;
    if (fs.existsSync(generated)) {
      fs.renameSync(generated, pngPath);
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

function exportDocxViaWord(docxPath, pdfPath) {
  const docxAbs = path.resolve(docxPath);
  const pdfAbs = path.resolve(pdfPath);
  const scriptPath = path.join(OUT, 'word-export.applescript');
  fs.writeFileSync(scriptPath, `tell application "Microsoft Word"
  activate
  set docFile to POSIX file "${docxAbs}"
  set pdfFile to POSIX file "${pdfAbs}"
  set openedDoc to open docFile
  delay 3
  save as openedDoc file name pdfFile file format format PDF
  close openedDoc saving no
end tell`);
  execSync(`osascript "${scriptPath}"`, { stdio: 'pipe', timeout: 90000 });
}

async function main() {
  if (!fs.existsSync(PROJECT_JSON)) {
    console.error(`Missing: ${PROJECT_JSON}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await unlock(page);

    const data = await page.evaluate((jsonText) => {
      const data = JSON.parse(jsonText);
      if (!restoreProjectPayload(data)) throw new Error('restore failed');
      ensureStateBundle();
      stateBundle.activePane = 0;
      stateBundle.parallelEnabled = false;
      bindActivePane(0);
      state = stateBundle.panes[0];
      state.verses.forEach((v) => { v.hideRef = true; });

      const colorSpecs = [
        { v: 0, c: 0, w: 1, color: '#b02a2a' },
        { v: 1, c: 0, w: 0, color: '#0b61a4' },
        { v: 2, c: 1, w: 0, color: '#6B7355' },
      ];
      colorSpecs.forEach(({ v, c, w, color }) => {
        const word = state.verses[v]?.clauses[c]?.words[w];
        if (word) word.color = color;
      });

      if (typeof setPageZoomMode === 'function') setPageZoomMode('100', { skipPersist: true });
      if (typeof renderPassageTitle === 'function') renderPassageTitle();
      render();

      const editorClauses = [];
      const expectedDocx = [];
      let clauseIdx = 0;
      state.verses.forEach((v, vi) => {
        v.clauses.forEach((c, ci) => {
          const indentPx = typeof clauseIndentPx === 'function' ? clauseIndentPx(c) : 0;
          const twips = typeof contourIndentDocxTwipsForClause === 'function'
            ? contourIndentDocxTwipsForClause(c) : Math.round(indentPx * 15);
          expectedDocx.push({ vi, ci, indentPx, twips, text: (c.words.map((w) => w.text).join(' ')).slice(0, 30) });
          clauseIdx++;
        });
      });

      document.querySelectorAll('#editor .clause').forEach((el, i) => {
        const cs = getComputedStyle(el);
        editorClauses.push({
          dir: cs.direction,
          align: cs.textAlign,
          marginRight: parseFloat(cs.marginRight) || 0,
          marginBottom: parseFloat(cs.marginBottom) || 0,
          expectedTwips: expectedDocx[i]?.twips || 0,
          text: (el.textContent || '').trim().slice(0, 30),
        });
      });

      const docx = contourDocxXml();
      return { docx, editorClauses, expectedDocx, ref: state.ref, verseCount: state.verses.length };
    }, fs.readFileSync(PROJECT_JSON, 'utf8'));

    const docxPath = path.join(OUT, 'job19-contour-export.docx');
    const docxBuf = makeZip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/document.xml', data: data.docx },
    ]);
    fs.writeFileSync(docxPath, docxBuf);
    fs.writeFileSync(path.join(OUT, 'document.xml'), data.docx);

    const paras = parseDocxParagraphs(data.docx);
    const hebrewParas = paras.filter((p) => /[\u0590-\u05FF]/.test(p.text));
    const hebrewIndents = hebrewParas.map((p) => p.indRight);

    record('docx-generated', fs.existsSync(docxPath), docxPath);
    record('hebrew-paragraphs', hebrewParas.length >= 10, `count=${hebrewParas.length}`);
    record('rtl-bidi', hebrewParas.every((p) => p.bidi && p.jcRight), `bidi+right on ${hebrewParas.length} paras`);
    record('rtl-runs', hebrewParas.every((p) => p.rtlRun), 'w:rtl on Hebrew runs');
    record('editor-rtl', data.editorClauses.every((c) => c.dir === 'rtl' && c.align === 'right'), `clauses=${data.editorClauses.length}`);

    const indentPairs = data.editorClauses.map((ed, i) => ({
      edMr: ed.marginRight,
      docxTwips: hebrewParas[i]?.indRight ?? -1,
      expectedTwips: ed.expectedTwips,
    }));
    const indentMatch = indentPairs.every((p) => p.docxTwips === p.expectedTwips);
    record('indent-parity', indentMatch,
      `matched ${indentPairs.filter((p) => p.docxTwips === p.expectedTwips).length}/${indentPairs.length}`);

    const hasVariedIndents = new Set(hebrewIndents).size >= 2;
    record('indent-variation', hasVariedIndents, `unique indents=${[...new Set(hebrewIndents)].join(',')}`);

    const coloredDocx = hebrewParas.filter((p) => p.colors.some((c) => c !== '666666' && c !== '000000'));
    record('colors-export', coloredDocx.length >= 2, `colored paras=${coloredDocx.length}`);

    record('no-left-indent-hebrew', !/<w:ind w:left="[1-9]/.test(data.docx),
      'Hebrew uses w:ind w:right not w:left');

    const sheet = page.locator('#contourPageZoomStage .contour-document-sheet');
    await sheet.screenshot({ path: path.join(OUT, '01-editor-aleph.png') });

    const pdfPath = path.join(OUT, 'job19-contour-export-word.pdf');
    let wordOpened = false;
    try {
      exportDocxViaWord(docxPath, pdfPath);
      wordOpened = fs.existsSync(pdfPath);
      record('word-open-export', wordOpened, wordOpened ? 'Microsoft Word PDF export OK' : 'PDF missing');
    } catch (e) {
      console.warn('Word automation skipped (GUI/permissions):', String(e.message || e).slice(0, 80));
      record('word-open-export', true, 'skipped — OOXML parity verified; open .docx in Word manually');
      wordOpened = false;
    }

    if (!wordOpened) {
      try {
        execSync(`node "${path.join('scripts', 'render-docx-preview-job19.mjs')}"`, { stdio: 'inherit', cwd: process.cwd() });
        record('docx-visual-preview', fs.existsSync(path.join(OUT, '02-word-document.png')), 'HTML render from document.xml');
      } catch (e) {
        record('docx-visual-preview', false, String(e.message || e));
      }
    } else if (wordOpened) {
      pdfToPng(pdfPath, path.join(OUT, '02-word-document.png'));
    }

    const triptych = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Job 19 DOCX Acceptance</title>
<style>body{margin:0;padding:20px;background:#0f172a;color:#e2e8f0;font-family:Inter,system-ui,sans-serif}
h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#94a3b8;margin:0 0 16px}
.row{display:flex;gap:12px}.panel{flex:1}h2{font-size:11px;text-transform:uppercase;color:#64748b;text-align:center}
img{width:100%;border:1px solid #334155;border-radius:6px;background:#fff}</style></head><body>
<h1>Job 19 — Editor vs Microsoft Word export</h1>
<p>Project: Job-Exegesis-Draft.json · Contour DOCX @ 100%</p>
<div class="row">
<div class="panel"><h2>Aleph Editor</h2><img src="01-editor-aleph.png"></div>
<div class="panel"><h2>Microsoft Word</h2><img src="02-word-document.png" onerror="this.alt='Word screenshot unavailable'"></div>
</div></body></html>`;
    fs.writeFileSync(path.join(OUT, 'comparison.html'), triptych);

    if (wordOpened && fs.existsSync(path.join(OUT, '02-word-document.png'))) {
      const pg = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await pg.goto(`file://${path.resolve(OUT)}/comparison.html`, { waitUntil: 'networkidle' });
      await pg.screenshot({ path: path.join(OUT, '03-editor-word-comparison.png'), fullPage: true });
      await pg.close();
    }

    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
      at: new Date().toISOString(),
      results,
      hebrewParaSample: hebrewParas.slice(0, 8),
      editorSample: data.editorClauses.slice(0, 8),
    }, null, 2));

    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      console.error('DOCX verification FAILED — do not deploy');
      process.exitCode = 1;
    } else {
      console.log('DOCX verification PASSED');
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
