/**
 * Playwright script to screenshot all onboarding prototype screens.
 *
 * Usage:
 *   1. Start the dev server: pnpm dev --filter=web
 *   2. Run: npx playwright test scripts/screenshot-prototypes.ts
 *
 * Or run directly with ts-node/tsx:
 *   npx tsx scripts/screenshot-prototypes.ts
 *
 * Output: apps/web/output/onboarding-screenshots/{direction-name}/{screen-id}.png
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.resolve(__dirname, "../output/onboarding-screenshots");

const FLOWS = [
  { slug: "1-try-it-immediately", dir: "1-try-it-immediately" },
  {
    slug: "2-someones-list",
    dir: "2-someones-list",
    splitBy: [
      { prefix: "2-r", dir: "2a-someones-list-referral" },
      { prefix: "2-o", dir: "2b-someones-list-organic" },
    ],
  },
  { slug: "3-go-out-more", dir: "3-go-out-more" },
  { slug: "4-everything-in-one-place", dir: "4-everything-in-one-place" },
  { slug: "5-habit-loop", dir: "5-habit-loop" },
  { slug: "6-tell-a-story", dir: "6-tell-a-story" },
  { slug: "7-free-community-supported", dir: "7-free-community-supported" },
  { slug: "a-instant-habit", dir: "a-instant-habit" },
  {
    slug: "b-instant-habit-referral",
    dir: "b-instant-habit-referral",
    splitBy: [
      { prefix: "b-r", dir: "b-instant-habit-referral-referral" },
      { prefix: "b-o", dir: "b-instant-habit-referral-organic" },
    ],
  },
  { slug: "c-story-speed", dir: "c-story-speed" },
] as const;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  for (const flow of FLOWS) {
    const page = await context.newPage();
    const url = `${BASE_URL}/onboarding-prototypes/${flow.slug}`;
    console.log(`Navigating to ${url}`);

    await page.goto(url, { waitUntil: "networkidle" });

    // Wait for fonts to load
    await page.waitForTimeout(1000);

    const screens = await page.locator("[data-screen-id]").all();
    console.log(`  Found ${screens.length} screens`);

    // Collect all screen IDs first
    const screenData: { id: string; locator: typeof screens[0] }[] = [];
    for (const screen of screens) {
      const id = await screen.getAttribute("data-screen-id");
      if (id) screenData.push({ id, locator: screen });
    }

    // If this flow has splitBy rules, bucket screens into subfolders
    const splitBy = "splitBy" in flow ? flow.splitBy : undefined;

    if (splitBy) {
      // Group screens by prefix match
      const buckets = new Map<string, typeof screenData>();
      for (const split of splitBy) {
        buckets.set(split.dir, []);
      }

      for (const s of screenData) {
        for (const split of splitBy) {
          if (s.id.startsWith(split.prefix)) {
            buckets.get(split.dir)!.push(s);
            break;
          }
        }
      }

      for (const [bucketDir, items] of buckets) {
        const outDir = path.join(OUTPUT_DIR, bucketDir);
        fs.mkdirSync(outDir, { recursive: true });
        for (let i = 0; i < items.length; i++) {
          const item = items[i]!;
          const seq = String(i + 1).padStart(2, "0");
          const filename = `${seq}-${item.id}.png`;
          await item.locator.screenshot({ path: path.join(outDir, filename), type: "png" });
          console.log(`  [${bucketDir}] Saved ${filename}`);
        }
      }
    } else {
      const outDir = path.join(OUTPUT_DIR, flow.dir);
      fs.mkdirSync(outDir, { recursive: true });
      for (let i = 0; i < screenData.length; i++) {
        const item = screenData[i]!;
        const seq = String(i + 1).padStart(2, "0");
        const filename = `${seq}-${item.id}.png`;
        await item.locator.screenshot({ path: path.join(outDir, filename), type: "png" });
        console.log(`  Saved ${filename}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
