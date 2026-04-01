/**
 * Multi-variant A/B/C hook renderer
 * Fetches live product data from Railway API, renders 3 hook variants locally.
 *
 * Usage:
 *   node dist/scripts/render-ab-hooks.js --storeName=RenewFit --keyword=dress
 *   npm run render:ab -- --storeName=RenewFit --keyword=dress
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import https from "https";
import http from "http";

const RAILWAY_BASE = "https://ebay-endpoint-production.up.railway.app";

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.replace("--", "").split("=") as [string, string])
);

const storeName = args.storeName || args.store;
const keyword = args.keyword || args.k || "apparel";
const outputDir = args.output || "out";
const template = args.template || "ViralHookMachine";

// Hook variant pools — 3 emotional triggers
const HOOK_VARIANTS = {
  a: ["HOW IS THIS STILL HERE", "POV: YOU FOUND THIS", "WAIT BEFORE YOU SCROLL", "YOU NEED TO SEE THIS PRICE", "THIS SHOULDN'T EXIST"],
  b: ["THIS SHOULDN'T BE THIS CHEAP", "THEY PRICED THIS WRONG", "I CAN'T BELIEVE THIS DEAL", "STEAL OF THE DAY", "HALF THE RETAIL PRICE"],
  c: ["LAST ONE IN STOCK", "THIS WON'T LAST LONG", "GONE IN 24 HOURS", "SOMEONE WILL GRAB THIS", "DON'T SLEEP ON THIS"],
} as const;

type HookVariant = keyof typeof HOOK_VARIANTS;

function pickHook(title: string, variant: HookVariant): string {
  const pool = HOOK_VARIANTS[variant];
  const seed = title.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    }).on("error", reject);
  });
}

async function main() {
  console.log(`\n🎬 A/B/C Hook Render — ${storeName || "any store"} × "${keyword}"\n`);

  // Build Railway URL for product data
  const params = new URLSearchParams({ template, keyword });
  if (storeName) params.set("storeName", storeName);
  const url = `${RAILWAY_BASE}/product-data?${params}`;

  console.log("🔍 Fetching live product data from eBay...");
  const data = await fetchJson(url);

  if (data.error) {
    console.error("❌ Error:", data.error);
    process.exit(1);
  }

  const p = data.props;
  // Upgrade image quality
  const baseProps = {
    ...p,
    imageUrl: p.imageUrl.replace("s-l225", "s-l500"),
    additionalImages: (p.additionalImages || [])
      .slice(0, 4)
      .map((u: string) => u.replace("s-l225", "s-l500")),
  };

  console.log(`✅ Product: "${p.title.slice(0, 65)}"`);
  console.log(`   Price: ${p.currency === "USD" ? "$" : p.currency}${p.price}`);
  console.log(`   Images: ${1 + (p.additionalImages?.length || 0)} from same listing\n`);

  mkdirSync(outputDir, { recursive: true });

  const variants: HookVariant[] = ["a", "b", "c"];
  const results: { variant: string; hook: string; file: string }[] = [];

  for (const variant of variants) {
    const hook = pickHook(p.title, variant);
    const props = { ...baseProps, hookVariant: variant };
    const propsFile = `${outputDir}/props-${variant}.json`;
    const label = ["Curiosity", "Value", "Scarcity"][variants.indexOf(variant)];
    const outFile = `${outputDir}/${storeName || "product"}-hook-${variant}.mp4`;

    writeFileSync(propsFile, JSON.stringify(props, null, 2));

    console.log(`🎬 [Hook ${variant.toUpperCase()}] ${label}: "${hook}"`);
    execSync(
      `npx remotion render src/index.ts ${template} --output=${outFile} --props=${propsFile}`,
      { stdio: "inherit" }
    );

    try { require("fs").unlinkSync(propsFile); } catch {}
    results.push({ variant: variant.toUpperCase(), hook, file: outFile });
    console.log(`✅ Saved: ${outFile}\n`);
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("🎯 3 Hook Variants Ready — Upload All, Test Each\n");
  results.forEach(({ variant, hook, file }, i) => {
    const labels = ["Curiosity (open loop)", "Value (price shock)", "Scarcity (FOMO)"];
    console.log(`  Hook ${variant} — ${labels[i]}`);
    console.log(`  "${hook}"`);
    console.log(`  → ${file}\n`);
  });
  console.log("Track watch-time & clicks. Double down on the winner! 🚀");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
