import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = (name) => join(__dirname, `screenshot_${name}.png`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

// Go straight to feed
await page.goto('http://localhost:8081/(tabs)/feed', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Screenshot feed with studio button visible
await page.screenshot({ path: out('feed_with_studio_btn') });
console.log('✓ feed with studio button');

// Click the studio button (◈ icon in feed header)
try {
  await page.getByText('◈').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('studio_dashboard') });
  console.log('✓ studio dashboard');

  // Click Analytics tab
  await page.getByText('Analytics', { exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('studio_analytics') });
  console.log('✓ studio analytics');

  // Click Monetize tab
  await page.getByText('Monetize', { exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('studio_monetize') });
  console.log('✓ studio monetize');

  // Click Live tab
  await page.getByText('Live', { exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('studio_live') });
  console.log('✓ studio live');

  // Go back
  await page.getByText('‹').click();
  await page.waitForTimeout(800);
} catch (e) {
  console.log('✗ studio flow:', e.message.split('\n')[0]);
  await page.screenshot({ path: out('studio_error') });
}

// Also open Settings and check studio entry point
try {
  await page.getByText('≡').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('settings_with_studio') });
  console.log('✓ settings with studio entry');
} catch (e) {
  console.log('✗ settings:', e.message.split('\n')[0]);
}

await browser.close();
console.log('done');
