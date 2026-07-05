import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = (name) => join(__dirname, `screenshot_${name}.png`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

// Go straight to feed, bypassing auth redirect
await page.goto('http://localhost:8081/(tabs)/feed', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: out('1_feed') });

// Click tab bar items by their position (bottom bar)
const tabs = ['Discover', 'Chat', 'Feed', 'Market', 'Wallet', 'Stream'];
const screenshots = ['4_discovery', '5_chat', '1_feed', '2_marketplace', '3_wallet', '6_stream'];

// Get all clickable elements containing these labels
for (let i = 0; i < tabs.length; i++) {
  try {
    // Try clicking by exact text content
    await page.getByText(tabs[i], { exact: true }).last().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: out(screenshots[i]) });
    console.log(`✓ ${tabs[i]}`);
  } catch (e) {
    console.log(`✗ ${tabs[i]}: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: out(screenshots[i] + '_error') });
  }
}

await browser.close();
console.log('done');
