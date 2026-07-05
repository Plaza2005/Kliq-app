import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = (name) => join(__dirname, `screenshot_${name}.png`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

await page.goto('http://localhost:8081/(tabs)/feed', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Open Settings via ≡
try {
  await page.getByText('≡').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('settings_new') });
  console.log('✓ settings with theme section');

  // Scroll down to see theme section
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('settings_theme') });
  console.log('✓ settings theme swatches');

  // Tap the profile card (first big card in settings)
  // Profile card is near the top — click by approximate coordinates
  await page.locator('text=SuperApp User').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('profile_main') });
  console.log('✓ profile screen');

  // Click the Videos tab
  try {
    await page.getByText('Videos', { exact: true }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: out('profile_videos') });
    console.log('✓ profile videos tab');
  } catch(e) { console.log('✗ videos tab:', e.message.split('\n')[0]); }

  // Click Edit Profile
  try {
    await page.getByText('Edit Profile').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: out('profile_edit') });
    console.log('✓ profile edit modal');
    await page.getByText('Cancel').click();
    await page.waitForTimeout(400);
  } catch(e) { console.log('✗ edit modal:', e.message.split('\n')[0]); }

  // Click back
  await page.getByText('‹').first().click();
  await page.waitForTimeout(600);

  // Try changing glow color to Violet
  await page.mouse.wheel(0, -200); // scroll back up
  await page.waitForTimeout(300);
  try {
    await page.getByText('Violet').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: out('settings_violet_glow') });
    console.log('✓ violet glow active');
  } catch(e) { console.log('✗ violet:', e.message.split('\n')[0]); }

} catch(e) {
  console.log('✗ settings flow:', e.message.split('\n')[0]);
  await page.screenshot({ path: out('error') });
}

await browser.close();
console.log('done');
