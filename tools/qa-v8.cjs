const { chromium } = require('C:/Users/abroc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const assert = require('assert');

(async () => {
  fs.mkdirSync('qa/v8', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [], failed = [];
  desktop.on('pageerror', (error) => errors.push(error.message));
  desktop.on('response', (response) => { if (response.status() >= 400) failed.push([response.status(), response.url()]); });
  await desktop.goto('http://localhost:4174/', { waitUntil: 'domcontentloaded' });
  await desktop.screenshot({ path: 'qa/v8/loading.png' });
  await desktop.waitForFunction(() => document.querySelector('.v8-loader.is-complete'), { timeout: 45000 });
  await desktop.waitForTimeout(900);
  const shots = [['arrival', .08], ['threshold', .42], ['architecture', .48], ['material', .32], ['passage', .45], ['light', .25], ['sculpture', .45], ['life', .5], ['residences', .4], ['place', .32], ['finale', .42], ['viewing', .3]];
  for (const [id, p] of shots) {
    await desktop.evaluate(([id, p]) => {
      const element = document.getElementById(id);
      window.scrollTo({ top: element.offsetTop + Math.max(0, element.offsetHeight - innerHeight) * p, behavior: 'instant' });
    }, [id, p]);
    await desktop.waitForTimeout(500);
    await desktop.screenshot({ path: `qa/v8/${id}.png` });
  }
  await desktop.evaluate(() => {
    const section = document.getElementById('residences');
    window.scrollTo({ top: section.offsetTop + (section.offsetHeight - innerHeight) * .4, behavior: 'instant' });
  });
  await desktop.waitForTimeout(600);
  await desktop.locator('#residences [aria-label="Select floor 16"]').click();
  await desktop.waitForTimeout(250);
  const controlSelection = await desktop.evaluate(() => ({ label: document.querySelector('#residences .v8-selector__detail h3')?.textContent, floor: window.__afrahWorld?.selectedFloor }));
  assert.deepStrictEqual(controlSelection, { label: 'D.16', floor: 16 });
  await desktop.screenshot({ path: 'qa/v8/residences-selected.png' });
  const towerHit = await desktop.evaluate(() => {
    for (let y = 230; y <= 760; y += 14) for (let x = 850; x <= 1310; x += 14) {
      const floor = window.__afrahWorld?.pickFloor(x, y);
      const target = document.elementFromPoint(x, y);
      if (floor === 3 && target?.closest('#residences') && !target?.closest('button,a')) return { x, y, floor };
    }
    return null;
  });
  assert(towerHit, 'Expected a clickable lower residence floor on the 3D tower');
  await desktop.mouse.click(towerHit.x, towerHit.y);
  await desktop.waitForTimeout(200);
  const towerSelection = await desktop.evaluate(() => ({ label: document.querySelector('#residences .v8-selector__detail h3')?.textContent, floor: window.__afrahWorld?.selectedFloor }));
  assert.deepStrictEqual(towerSelection, { label: 'A.03', floor: 3 });
  await desktop.evaluate(() => {
    const passage = document.getElementById('passage');
    window.scrollTo({ top: passage.offsetTop + (passage.offsetHeight - innerHeight) * .985, behavior: 'instant' });
  });
  await desktop.waitForTimeout(600);
  await desktop.screenshot({ path: 'qa/v8/passage-exit.png' });
  const tunnelApertureScale = await desktop.evaluate(() => window.__afrahWorld?.tunnel.userData.aperture.scale.x);
  await desktop.goto('http://localhost:4174/residences');
  await desktop.locator('.v8-selector__diagram button').last().click();
  const selectedResidence = await desktop.locator('.v8-selector__detail h3').innerText();
  await desktop.screenshot({ path: 'qa/v8/residences-page.png' });
  await desktop.goto('http://localhost:4174/place');
  await desktop.locator('.v8-map__pin').last().click();
  const selectedPlace = await desktop.locator('.v8-map__detail h3').innerText();
  await desktop.screenshot({ path: 'qa/v8/place-page.png' });
  await desktop.goto('http://localhost:4174/viewing');
  await desktop.screenshot({ path: 'qa/v8/viewing-page.png' });
  await desktop.goto('http://localhost:4174/architecture');
  await desktop.screenshot({ path: 'qa/v8/architecture-page.png' });
  await desktop.goto('http://localhost:4174/gallery');
  await desktop.screenshot({ path: 'qa/v8/gallery-page.png' });
  await desktop.locator('.v8-nav__menu').click();
  const menuOpened = await desktop.locator('.v8-menu-overlay').evaluate((element) => element.classList.contains('is-open'));
  await desktop.keyboard.press('Escape');
  const menuClosed = await desktop.locator('.v8-menu-overlay').evaluate((element) => !element.classList.contains('is-open'));
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`));
  await mobile.goto('http://localhost:4174/', { waitUntil: 'domcontentloaded' });
  await mobile.waitForFunction(() => document.querySelector('.v8-loader.is-complete'), { timeout: 45000 });
  await mobile.waitForTimeout(1100);
  await mobile.screenshot({ path: 'qa/v8/mobile-arrival.png' });
  console.log(JSON.stringify({ errors, failed, selectedResidence, selectedPlace, controlSelection, towerHit, towerSelection, menuOpened, menuClosed, tunnelApertureScale, world: await mobile.evaluate(() => ({ building: !!window.__afrahWorld?.hasBuilding, sculpture: !!window.__afrahWorld?.hasSculpture })), desktopOverflow: await desktop.evaluate(() => document.documentElement.scrollWidth > innerWidth), mobileOverflow: await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth) }, null, 2));
  await browser.close();
})();
