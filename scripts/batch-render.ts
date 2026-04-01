/**
 * Batch Video Renderer — CSV-driven
 * Reads "Item Number" from a CSV in data/, fetches each item from eBay via
 * Railway API, renders one video per listing.
 *
 * Usage:
 *   npm run render:batch -- --storeName=RenewFit
 *   npm run render:batch -- --storeName=RenewFit --file=data/my-listings.csv
 *   npm run render:batch -- --storeName=RenewFit --keyword=dress  (no CSV)
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from "fs";
import https from "https";
import http from "http";
import path from "path";

const RAILWAY_BASE = "https://ebay-endpoint-production.up.railway.app";

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.replace("--", "").split("=") as [string, string])
);

const storeName = args.storeName || args.store;
const keyword = args.keyword || args.k;
const outputDir = args.output || "out";
const template = args.template || "ViralHookMachine";
const csvFile = args.file;

if (!storeName) {
  console.error("❌ --storeName is required. Example: npm run render:batch -- --storeName=RenewFit");
  process.exit(1);
}

// ── CSV Parser ─────────────────────────────────────────────────────────────
function readItemNumbers(file: string): string[] {
  const content = readFileSync(file, "utf-8");
  const lines = content.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const col = header.findIndex((h) => h.toLowerCase() === "item number" || h.toLowerCase() === "item_number" || h.toLowerCase() === "itemnumber");
  if (col === -1) {
    console.error(`❌ CSV must have an "Item Number" column. Found: ${header.join(", ")}`);
    process.exit(1);
  }
  return lines.slice(1)
    .map((l) => l.split(",")[col]?.trim().replace(/"/g, ""))
    .filter(Boolean);
}

// Find CSV files in data/ folder
function findCsvFile(): string | null {
  const dataDir = path.join(process.cwd(), "data");
  try {
    const files = readdirSync(dataDir).filter((f) => f.endsWith(".csv") && !f.includes("template"));
    if (files.length === 0) return null;
    if (files.length === 1) return path.join(dataDir, files[0]);
    // Multiple CSVs — use most recently modified
    const sorted = files
      .map((f) => ({ f, mtime: require("fs").statSync(path.join(dataDir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    console.log(`📄 Multiple CSVs found, using most recent: ${sorted[0].f}`);
    return path.join(dataDir, sorted[0].f);
  } catch {
    return null;
  }
}

// ── HTTP fetch helper ──────────────────────────────────────────────────────
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    }).on("error", reject);
  });
}

// ── Fetch product by itemId or keyword ────────────────────────────────────
async function fetchProduct(itemId?: string, kw?: string) {
  const params = new URLSearchParams({ template });
  if (storeName) params.set("storeName", storeName);
  if (itemId) params.set("itemId", itemId);
  else if (kw) params.set("keyword", kw);
  else throw new Error("Need itemId or keyword");

  const data = await fetchJson(`${RAILWAY_BASE}/product-data?${params}`);
  if (data.error) throw new Error(data.error);
  return data.props;
}

// ── Render a single product ───────────────────────────────────────────────
async function renderItem(itemId: string | undefined, index: number, total: number) {
  console.log(`\n[${index + 1}/${total}] ${itemId ? `Item ${itemId}` : `keyword: "${keyword}"`}`);

  const p = await fetchProduct(itemId, keyword);
  const props = {
    ...p,
    imageUrl: p.imageUrl.replace("s-l225", "s-l500"),
    additionalImages: (p.additionalImages || []).slice(0, 5).map((u: string) => u.replace("s-l225", "s-l500")),
    categoryName: p.categoryName,
  };

  const slug = itemId
    ? `${storeName}-${itemId}`
    : `${storeName}-${p.title.split(" ").slice(0, 3).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "")}`;
  const outFile = path.join(outputDir, `${slug}.mp4`);
  const propsFile = path.join(outputDir, `.props-${slug}.json`);

  writeFileSync(propsFile, JSON.stringify(props, null, 2));

  console.log(`   Title: "${p.title.slice(0, 60)}"`);
  console.log(`   Price: ${p.currency === "USD" ? "$" : p.currency}${p.price}`);
  console.log(`   Category: ${p.categoryName || "N/A"}`);
  console.log(`   Images: ${1 + (p.additionalImages?.length || 0)}`);

  execSync(
    `npx remotion render src/index.ts ${template} --output=${outFile} --props=${propsFile}`,
    { stdio: "inherit" }
  );

  try { require("fs").unlinkSync(propsFile); } catch {}
  console.log(`   ✅ Saved: ${outFile}`);
  return outFile;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬 Batch Video Render — ${storeName}\n`);
  mkdirSync(outputDir, { recursive: true });

  // Determine item list
  let itemIds: (string | undefined)[] = [];

  const resolvedCsv = csvFile || findCsvFile();
  if (resolvedCsv) {
    console.log(`📄 Reading CSV: ${resolvedCsv}`);
    itemIds = readItemNumbers(resolvedCsv);
    console.log(`   Found ${itemIds.length} item numbers\n`);
  } else if (keyword) {
    console.log(`🔍 No CSV found — rendering single video for keyword: "${keyword}"\n`);
    itemIds = [undefined]; // will use keyword
  } else {
    console.error("❌ Provide a CSV file in data/ folder, use --file=path/to/file.csv, or use --keyword=dress");
    console.error("   Example CSV first column: Item Number");
    process.exit(1);
  }

  const results: string[] = [];
  let failed = 0;

  for (let i = 0; i < itemIds.length; i++) {
    try {
      const out = await renderItem(itemIds[i], i, itemIds.length);
      results.push(out);
    } catch (err) {
      console.error(`   ❌ Failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`🎯 Batch Complete — ${results.length} rendered, ${failed} failed\n`);
  results.forEach((f) => console.log(`  ✅ ${f}`));
  if (failed > 0) console.log(`\n  ⚠️  ${failed} items failed — check Item Numbers are valid eBay IDs`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
