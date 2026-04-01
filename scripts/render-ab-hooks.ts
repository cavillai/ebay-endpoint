#!/usr/bin/env node
/**
 * Multi-variant A/B/C hook renderer
 * Generates 3 versions of the same video with different hook emotional triggers:
 *   A — Curiosity (open loop)
 *   B — Value shock
 *   C — Scarcity / FOMO
 *
 * Usage:
 *   node -r dotenv/config dist/scripts/render-ab-hooks.js \
 *     --storeName=RenewFit --keyword=dress --output=out
 *
 * Or via npm: npm run render:ab -- --storeName=RenewFit --keyword=dress
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import dotenv from "dotenv";
import { searchItems, searchItemsByKeyword } from "../src/server/ebay-api";
import { HOOK_VARIANTS, HookVariant } from "../src/templates/tiktok/ViralHookMachine";

dotenv.config();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace("--", "").split("="))
);

const storeName = args.storeName || args.store;
const keyword = args.keyword || args.k || "apparel";
const outputDir = args.output || "out";
const template = args.template || "ViralHookMachine";

async function main() {
  console.log(`\n🎬 A/B/C Hook Render — ${storeName || "any store"} × "${keyword}"\n`);

  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    console.error("❌ EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in .env");
    process.exit(1);
  }

  // Fetch live eBay product
  console.log("🔍 Fetching product data from eBay...");
  const result = storeName
    ? await searchItems(storeName, keyword, 1)
    : await searchItemsByKeyword(keyword, 1);

  if (result.items.length === 0) {
    console.error(`❌ No products found for "${keyword}"`);
    process.exit(1);
  }

  const p = result.items[0];
  const baseProps = {
    storeName: storeName || p.seller.username,
    title: p.title,
    price: p.price,
    currency: p.currency,
    imageUrl: p.imageUrl.replace("s-l225", "s-l500"),
    additionalImages: (p.additionalImages || [])
      .slice(0, 4)
      .map((u: string) => u.replace("s-l225", "s-l500")),
    condition: p.condition,
    shippingCost: p.shipping.cost,
    sellerUsername: p.seller.username,
    feedbackPercentage: p.seller.feedbackPercentage,
  };

  console.log(`✅ Product: "${p.title.slice(0, 60)}"`);
  console.log(`   Price: $${p.price} | Images: ${1 + (p.additionalImages?.length || 0)}\n`);

  mkdirSync(outputDir, { recursive: true });

  const variants: HookVariant[] = ["a", "b", "c"];
  const results: string[] = [];

  for (const variant of variants) {
    const hook = HOOK_VARIANTS[variant][
      baseProps.title.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) %
      HOOK_VARIANTS[variant].length
    ];

    const props = { ...baseProps, hookVariant: variant };
    const propsFile = path.join(outputDir, `props-${variant}.json`);
    const outFile = path.join(outputDir, `${storeName || "product"}-hook-${variant}.mp4`);

    writeFileSync(propsFile, JSON.stringify(props));

    console.log(`🎬 Rendering Hook ${variant.toUpperCase()}: "${hook}"`);

    execSync(
      `npx remotion render src/index.ts ${template} --output=${outFile} --props=${propsFile}`,
      { stdio: "inherit" }
    );

    // Clean up props file
    require("fs").unlinkSync(propsFile);
    results.push(outFile);
    console.log(`✅ Saved: ${outFile}\n`);
  }

  console.log("═══════════════════════════════════════");
  console.log("🎯 A/B/C Hook Variants Ready for Testing\n");
  variants.forEach((v, i) => {
    const hook = HOOK_VARIANTS[v][
      baseProps.title.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) %
      HOOK_VARIANTS[v].length
    ];
    console.log(`  Hook ${v.toUpperCase()} [${["Curiosity","Value","Scarcity"][i]}]: "${hook}"`);
    console.log(`  → ${results[i]}`);
  });
  console.log("\nUpload all 3 and track which drives most clicks!");
}

main().catch(console.error);
