/**
 * Untangle — Instagram Carousel Exporter
 * Reads carousel.html, screenshots each .slide div at 1080x1080, saves as slide-01.png etc.
 *
 * ONE-TIME SETUP:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * USAGE:
 *   node export-carousel.js
 *   node export-carousel.js --file my-carousel.html   (custom file)
 *   node export-carousel.js --size 1080               (default 1080, or 1350 for portrait)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const fileArg = args.indexOf('--file');
const sizeArg = args.indexOf('--size');

const htmlFile = fileArg !== -1 ? args[fileArg + 1] : 'carousel.html';
const size     = sizeArg !== -1 ? parseInt(args[sizeArg + 1]) : 1080;

const htmlPath = path.resolve(__dirname, htmlFile);
if (!fs.existsSync(htmlPath)) {
  console.error(`File not found: ${htmlPath}`);
  process.exit(1);
}

const outDir = path.resolve(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  // Set viewport to slide size so nothing clips
  await page.setViewportSize({ width: size, height: size });

  // Load the HTML file
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  // Wait for Google Fonts to load (gives fonts 2s to render)
  await page.waitForTimeout(2000);

  // Find all .slide elements
  const slideCount = await page.locator('.slide').count();
  if (slideCount === 0) {
    console.error('No elements with class .slide found in the HTML.');
    await browser.close();
    process.exit(1);
  }

  console.log(`Found ${slideCount} slides. Exporting at ${size}x${size}px...\n`);

  for (let i = 0; i < slideCount; i++) {
    const slide    = page.locator('.slide').nth(i);
    const num      = String(i + 1).padStart(2, '0');
    const outFile  = path.join(outDir, `slide-${num}.png`);

    // Scroll slide into view and screenshot exactly that element
    await slide.scrollIntoViewIfNeeded();
    await slide.screenshot({ path: outFile, type: 'png' });

    console.log(`  Saved: output/slide-${num}.png`);
  }

  await browser.close();
  console.log(`\nDone. ${slideCount} slides saved to /carousel/output/`);
  console.log('Upload them to Instagram in order as a carousel post.');
})();
