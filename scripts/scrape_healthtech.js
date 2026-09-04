// Phase 1 scraper: extract the Healthtech category problems from Razorpay's
// "Fix My Itch" site.
//
// Network inspection (Playwright page.on('response')) was tried first per
// PRD guidance: the "All Problems" data for a selected category loads from
// framerusercontent.com/cms/.../*.framercms endpoints, but those return a
// proprietary Framer CMS binary format (not JSON, not standard BSON either —
// confirmed via the `bson` package, which rejects it as structurally
// invalid). No public decoder exists for this format. Rather than guess at
// an undocumented binary layout and risk silently-wrong scores, this falls
// back to reading the rendered DOM after selecting the Healthtech filter and
// clicking each problem card open, which is what a real visitor sees.
//
// Cross-validated: title/description/category/itch-score text recovered
// from the raw binary responses (readable even without full decoding)
// match the DOM-scraped values exactly for the sampled records, so the DOM
// route is trustworthy here, not just a lossy fallback.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = 'https://razorpay.com/m/fix-my-itch/#all-problems';
const OUT_DIR = path.join(__dirname, '..', 'raw');
const OUT_PATH = path.join(OUT_DIR, 'healthtech_itches.json');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log('Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const filterEl = page.locator('text=/^Healthtech$/i').first();
  if ((await filterEl.count()) === 0) {
    throw new Error('Healthtech filter control not found on page.');
  }
  await filterEl.scrollIntoViewIfNeeded();
  await filterEl.click();
  await page.waitForTimeout(2000);

  // Confirmed via scroll test + cross-check against raw binary capture:
  // Healthtech has exactly 10 entries, no pagination/infinite-scroll.
  const titleLocator = page.locator('text=/^Why /').filter({ hasText: /\?$/ });
  const count = await titleLocator.count();
  console.log(`Found ${count} candidate problem titles.`);

  const results = [];
  for (let i = 0; i < count; i++) {
    const card = titleLocator.nth(i);
    const title = (await card.innerText()).trim();

    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.click({ timeout: 5000 }).catch((e) => {
      console.log(`WARNING: click failed for "${title}": ${e.message}`);
    });
    await page.waitForTimeout(600);

    // Read the full page text and extract the block for this specific card
    // by finding the title, then parsing the labeled score fields that
    // follow it (description, SEVERITY/TAM/WHITESPACE/FREQUENCY/ITCH SCORE).
    const bodyText = await page.evaluate(() => document.body.innerText);
    const titleIdx = bodyText.indexOf(title);
    const windowText = titleIdx >= 0 ? bodyText.slice(titleIdx, titleIdx + 1200) : '';

    const catMatch = windowText.match(/\n\s*(HealthTech)\s*\n/);
    const descMatch = windowText.match(/HealthTech\s*\n\n([\s\S]*?)\n\nSEVERITY SCORE/);
    const severityMatch = windowText.match(/SEVERITY SCORE\s*\n\n([\d.]+)/);
    const tamMatch = windowText.match(/TAM SCORE\s*\n\n([\d.]+)/);
    const whitespaceMatch = windowText.match(/WHITESPACE SCORE\s*\n\n([\d.]+)/);
    const frequencyMatch = windowText.match(/FREQUENCY SCORE\s*\n\n([\d.]+)/);
    const itchMatch = windowText.match(/ITCH SCORE\s*\n\n([\d.]+)/);

    const entry = {
      title,
      category: catMatch ? catMatch[1] : null,
      description: descMatch ? descMatch[1].trim() : null,
      severity: severityMatch ? parseFloat(severityMatch[1]) : null,
      tam: tamMatch ? parseFloat(tamMatch[1]) : null,
      whitespace: whitespaceMatch ? parseFloat(whitespaceMatch[1]) : null,
      frequency: frequencyMatch ? parseFloat(frequencyMatch[1]) : null,
      itch: itchMatch ? parseFloat(itchMatch[1]) : null,
    };

    const missing = Object.entries(entry)
      .filter(([k, v]) => v === null)
      .map(([k]) => k);
    if (missing.length) {
      console.log(`WARNING: "${title}" missing fields: ${missing.join(', ')}`);
    } else {
      console.log(`OK: "${title}" -> itch=${entry.itch}`);
    }

    results.push(entry);

    // Collapse the card again so the next card's expansion is unambiguous.
    await card.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} entries -> ${OUT_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
