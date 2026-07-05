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

// Feed: tap @creator_1 username in bottom-left of video card
try {
  await page.getByText('@').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('other_profile_from_feed') });
  console.log('✓ other profile from feed');

  // Scroll down to see post grid
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('other_profile_grid') });
  console.log('✓ other profile grid');

  // Click Videos tab
  await page.getByText('Videos').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('other_profile_videos') });
  console.log('✓ other profile videos tab');

  // Click Follow button
  await page.getByText('Follow').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('other_profile_following') });
  console.log('✓ follow button');

  // Close
  await page.getByText('‹').click();
  await page.waitForTimeout(600);
} catch(e) {
  console.log('✗ feed profile:', e.message.split('\n')[0]);
  await page.screenshot({ path: out('error_feed') });
}

// Discovery: tap a grid cell
try {
  await page.getByText('Discover').last().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out('discovery_screen') });

  // Tap first cell
  const cells = page.locator('[style*="backgroundColor"]').first();
  await page.locator('text=How to start').click({ timeout: 5000 }).catch(() => {});
  // fallback: click by position in the grid area
  await page.mouse.click(65, 200);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('other_profile_from_discovery') });
  console.log('✓ other profile from discovery');

  await page.getByText('‹').click().catch(() => {});
  await page.waitForTimeout(500);
} catch(e) {
  console.log('✗ discovery profile:', e.message.split('\n')[0]);
  await page.screenshot({ path: out('error_discovery') });
}

// Chat: tap a DM avatar
try {
  await page.getByText('Chat').last().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out('chat_list') });

  // Click avatar of creator_1 (second in list, first non-group)
  // Find by position - avatar is at left side of row
  // Let's try clicking @creator_1 text
  await page.mouse.click(40, 320); // approximate position of avatar in second row
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('other_profile_from_chat') });
  console.log('✓ other profile from chat');
} catch(e) {
  console.log('✗ chat profile:', e.message.split('\n')[0]);
  await page.screenshot({ path: out('error_chat') });
}

await browser.close();
console.log('done');
