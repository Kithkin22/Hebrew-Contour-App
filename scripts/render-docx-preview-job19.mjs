#!/usr/bin/env node
/** Render DOCX document.xml as RTL HTML for visual comparison screenshot. */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUT = path.join('docs', 'assets', 'export-verify-v80-docx');
const xml = fs.readFileSync(path.join(OUT, 'document.xml'), 'utf8');

function twipsToPx(t) { return Math.round((t / 15) * 10) / 10; }

const paras = [];
const re = /<w:p>([\s\S]*?)<\/w:p>/g;
let m;
while ((m = re.exec(xml))) {
  const block = m[1];
  if (!/[\u0590-\u05FF]/.test(block)) continue;
  const ind = block.match(/<w:ind w:right="(\d+)"/);
  const spacing = block.match(/<w:spacing w:after="(\d+)"/);
  const runs = [...block.matchAll(/<w:r>([\s\S]*?)<\/w:r>/g)].map((rm) => {
    const r = rm[1];
    const color = r.match(/<w:color w:val="([0-9A-F]+)"/i);
    const text = r.replace(/<[^>]+>/g, '');
    let style = '';
    if (color) style = `color:#${color[1]};`;
    return `<span style="${style}">${text.replace(/&amp;/g, '&').replace(/&lt;/g, '<')}</span>`;
  }).join('');
  const mr = ind ? twipsToPx(+ind[1]) : 0;
  const mb = spacing ? twipsToPx(+spacing[1]) : 0;
  paras.push(`<p style="direction:rtl;text-align:right;margin:0 0 ${mb}px 0;margin-right:${mr}px;font-family:'SBL BibLit','Ezra SIL',serif;font-size:26px;line-height:2.1">${runs}</p>`);
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DOCX preview</title>
<style>body{margin:96px;background:#fff;max-width:816px;font-family:Arial,sans-serif}
.title{font-weight:bold;margin:0 0 24px;font-size:14px}</style></head><body>
<div class="title">Job 19:21–29</div>${paras.join('')}</body></html>`;
fs.writeFileSync(path.join(OUT, 'word-docx-preview.html'), html);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await page.goto(`file://${path.resolve(OUT)}/word-docx-preview.html`);
await page.screenshot({ path: path.join(OUT, '02-word-document.png'), fullPage: true });

const triptych = fs.readFileSync(path.join(OUT, 'comparison.html'), 'utf8');
await page.setContent(triptych.replace('onerror="this.alt=\'Word screenshot unavailable\'"', ''));
await page.screenshot({ path: path.join(OUT, '03-editor-word-comparison.png'), fullPage: true });
await browser.close();
console.log('Saved word preview screenshots');
