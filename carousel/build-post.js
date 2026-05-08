/**
 * Untangle — Daily Post Builder
 *
 * Does everything in one command:
 *  1. Exports today's carousel slides as PNGs
 *  2. Renders the Remotion reel to MP4
 *  3. Writes carousel-caption.txt + reel-caption.txt
 *  4. Saves it all to carousel/MM-DD-YY/
 *
 * Run: node build-post.js
 *
 * ── TO CHANGE FOR A NEW POST DAY ──────────────────────────────────────────
 *  Update TODAY_CAROUSEL and REEL_COMP below. That's it.
 * ─────────────────────────────────────────────────────────────────────────
 */

const { execSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs   = require("fs");

// ═══════════════════════════════════════════════════════════════
//  CONFIGURE FOR TODAY
// ═══════════════════════════════════════════════════════════════

const TODAY_CAROUSEL = {
  file:   "carousel-checklist.html",   // HTML file in this folder
  prefix: "checklist",                 // PNG filename prefix  e.g. checklist-01.png
};

const REEL_COMP = "BeforeAfterReel";  // Remotion composition ID (from Root.tsx)

// Caption text — update these when you change content
const CAROUSEL_CAPTION = `You might be in a thought spiral right now.

Swipe through and see how many feel familiar:

☐  You replay conversations from days ago
☐  You apologise for things that were not your fault
☐  You rehearse what to say before you say it
☐  You lie awake solving problems that have not happened yet
☐  You feel exhausted from thinking, not doing

If you checked more than two, this is a thought spiral. Not a character flaw. Not something you have to live with forever.

The Stop Overthinking guide gives you 7 days of CBT-backed exercises to break the loop. 10 minutes a day. Link in bio.

—

#overthinking #thoughtspiral #mentalhealth #anxietyrelief #cbt #stopoverthinking #quietmind #anxietymanagement #selfhelp #mindset #mentalhealthtips #innerpeace #digitaldownload #untangle`;

const REEL_CAPTION = `You wake up already tired.

You push through anyway.

You rest. But nothing refills.

You smile at work. You collapse at home.

This is not weakness. This is what running on empty looks like.

The Running on Empty guide gives you 7 days of honest, practical steps to find what is draining you and rebuild energy that actually lasts. 10 minutes a day. Link in bio.

—

#burnout #burnoutrecovery #runningonempty #exhausted #mentalhealth #energymanagement #selfcare #cbt #mentalhealthtips #burnoutawareness #selfhelp #mindset #innerpeace #untangle`;

// ═══════════════════════════════════════════════════════════════
//  DATED OUTPUT FOLDER
// ═══════════════════════════════════════════════════════════════

const now    = new Date();
const mm     = String(now.getMonth() + 1).padStart(2, "0");
const dd     = String(now.getDate()).padStart(2, "0");
const yy     = String(now.getFullYear()).slice(-2);
const folder = `${mm}-${dd}-${yy}`;
const outDir = path.resolve(__dirname, folder);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Untangle Post Builder`);
console.log(`  Folder: carousel/${folder}/`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// ═══════════════════════════════════════════════════════════════
//  STEP 1 — CAROUSEL PNGs
// ═══════════════════════════════════════════════════════════════

async function exportCarousel() {
  console.log(`[1/3] Exporting carousel → ${TODAY_CAROUSEL.file}`);

  const htmlPath = path.resolve(__dirname, TODAY_CAROUSEL.file);
  if (!fs.existsSync(htmlPath)) {
    console.error(`  ✗ File not found: ${TODAY_CAROUSEL.file}`);
    return;
  }

  const browser = await chromium.launch();
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const count = await page.locator(".slide").count();
  if (count === 0) {
    console.error("  ✗ No .slide elements found.");
    await browser.close();
    return;
  }

  for (let i = 0; i < count; i++) {
    const num  = String(i + 1).padStart(2, "0");
    const file = path.join(outDir, `${TODAY_CAROUSEL.prefix}-${num}.png`);
    const slide = page.locator(".slide").nth(i);
    await slide.scrollIntoViewIfNeeded();
    await slide.screenshot({ path: file });
    console.log(`  ✓ ${TODAY_CAROUSEL.prefix}-${num}.png`);
  }

  await browser.close();
  console.log(`  Done — ${count} slides exported.\n`);
}

// ═══════════════════════════════════════════════════════════════
//  STEP 2 — REMOTION REEL
// ═══════════════════════════════════════════════════════════════

function renderReel() {
  console.log(`[2/3] Rendering reel → ${REEL_COMP}`);

  const reelOut = path.join(outDir, "reel.mp4");
  const reelDir = path.resolve(__dirname, "reel-design");

  if (!fs.existsSync(reelDir)) {
    console.error("  ✗ reel-design/ folder not found. Run: npm create video@latest");
    return;
  }

  console.log(`  Output: ${reelOut}`);
  console.log("  (This takes ~1 min — grab a coffee)\n");

  try {
    execSync(
      `npx remotion render ${REEL_COMP} "${reelOut}" --log=verbose`,
      { cwd: reelDir, stdio: "inherit" }
    );
    console.log(`\n  ✓ reel.mp4 saved.\n`);
  } catch (e) {
    console.error("\n  ✗ Render failed. Check errors above.");
  }
}

// ═══════════════════════════════════════════════════════════════
//  STEP 3 — CAPTIONS
// ═══════════════════════════════════════════════════════════════

function writeCaptions() {
  console.log(`[3/3] Writing captions`);

  fs.writeFileSync(path.join(outDir, "carousel-caption.txt"), CAROUSEL_CAPTION, "utf8");
  console.log("  ✓ carousel-caption.txt");

  fs.writeFileSync(path.join(outDir, "reel-caption.txt"), REEL_CAPTION, "utf8");
  console.log("  ✓ reel-caption.txt\n");
}

// ═══════════════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════════════

(async () => {
  await exportCarousel();
  renderReel();
  writeCaptions();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  All done!  carousel/${folder}/`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
})();
