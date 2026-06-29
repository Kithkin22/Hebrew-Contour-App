#!/usr/bin/env node
/** Quick smoke test for File menu New Project UX (requires: npx playwright install chromium) */
import { chromium } from 'playwright';

const URL = process.env.TEST_URL || 'http://127.0.0.1:9876/index.html';
const PASS = 'AMBS';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await page.fill('#appPasswordInput', PASS);
  await page.click('#appPasswordSubmit');
  await page.waitForSelector('#appRoot:not(.hidden)', { timeout: 15000 });

  await page.click('#projectMenuTrigger');
  await page.waitForSelector('#projectFileMenuDropdown[aria-hidden="false"]');

  const menuText = await page.locator('#projectFileMenuDropdown').innerText();
  const order = ['New Project', 'Open Recent', 'Save Project', 'Save As', 'Export', 'Import', 'Rename Project', 'Duplicate Project', 'Delete Project', 'Project Settings'];
  let last = -1;
  for (const label of order) {
    const idx = menuText.indexOf(label);
    if (idx < 0) throw new Error('Missing menu item: ' + label);
    if (idx < last) throw new Error('Menu order wrong at: ' + label);
    last = idx;
  }
  if (/Clear Table/i.test(menuText)) throw new Error('Clear Table still visible in File menu');

  await page.click('[data-action="new-project"]');
  await page.waitForSelector('#newProjectModal.show');
  const title = await page.locator('#newProjectModalTitle').innerText();
  if (title !== 'Create a new project?') throw new Error('Wrong modal title: ' + title);

  await page.click('#newProjectCancel');
  await page.waitForSelector('#newProjectModal:not(.show)');

  await page.click('#projectMenuTrigger');
  await page.click('[data-action="new-project"]');
  await page.waitForSelector('#newProjectModal.show');
  await page.click('#newProjectDontSave');
  await page.waitForSelector('#newProjectModal:not(.show)');

  const projectName = await page.locator('#currentProjectName').innerText();
  if (!/^Untitled/.test(projectName)) throw new Error('Expected Untitled project name, got: ' + projectName);

  console.log('PASS: File menu structure, no Clear Table, New Project modal works, blank project name:', projectName);
  await browser.close();
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
