/**
 * Batch Video Renderer — CSV-driven (v2)
 * Reads RenewFit eBay export CSV, uses CSV data directly (title, price,
 * condition, category) and fetches images from eBay API by searching
 * by title within the store.
 *
 * Usage:
 *   npm run render:batch -- --storeName=RenewFit
 *   npm run render:batch -- --storeName=RenewFit --file=data/listings.csv
 *   npm run render:batch -- --storeName=RenewFit --keyword=dress (no CSV)
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync, statSync } from "fs";
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
const maxItems = args.max ? parseInt(args.max) : undefined;

if (!storeName) {
  console.error("❌ --storeName is required. Example: npm run render:batch -- --storeName=RenewFit");
  process.exit(1);
}

// ── CSV Parser ─────────────────────────────────────────────────────────────
interface ListingRow {
  title: string;
  price: string;
  condition: string;
  categoryName: string;
  itemNumber?: string;
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/"/g, "").toLowerCase().replace(/[\s_-]+/g, " ");
}

function parseCsv(file: string): ListingRow[] {
  const content = readFileSync(file, "utf-8");
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(normalizeHeader);

  // Find relevant column indices (case-insensitive, flexible naming)
  const col = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h === name || h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const cols = {
    itemNumber: col(["item number", "item id", "listing id"]),
    title:      col(["title", "listing title"]),
    price:      col(["current price", "start price", "price"]),
    condition:  col(["condition"]),
    category:   col(["ebay category 1 name", "category 1 name", "category name", "category"]),
  };

  console.log("   Columns found:", Object.entries(cols)
    .filter(([, v]) => v !== -1)
    .map(([k, v]) => `${k}=${headers[v]}`)
    .join(", ")
  );

  const rows: ListingRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    // Handle commas inside quotes
    const cells = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
    const get = (i: number) => (cells[i] ?? "").replace(/^"|"$/g, "").trim();

    const title = cols.title !== -1 ? get(cols.title) : "";
    if (!title) continue;

    // Convert scientific notation item numbers to string
    let itemNumber: string | undefined;
    if (cols.itemNumber !== -1) {
      const raw = get(cols.itemNumber);
      if (raw) {
        // Handle scientific notation like 2.87152E+11
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 1e9) {
          itemNumber = Math.round(num).toString();
        } else {
          itemNumber = raw.replace(/[^0-9]/g, "");
        }
      }
    }

    rows.push({
      title,
      price: cols.price !== -1 ? get(cols.price) : "",
      condition: cols.condition !== -1 ? get(cols.condition) : "",
      categoryName: cols.category !== -1 ? get(cols.category) : "",
      itemNumber,
    });
  }

  return rows;
}

function findCsvFile(): string | null {
  const dataDir = path.join(process.cwd(), "data");
  try {
    const files = readdirSync(dataDir)
      .filter((f) => f.endsWith(".csv") && !f.includes("template"))
      .map((f) => ({ f, mtime: statSync(path.join(dataDir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    if (files.length === 0) return null;
    if (files.length > 1) console.log(`   Multiple CSVs found, using most recent: ${files[0].f}`);
    return path.join(dataDir, files[0].f);
  } catch { return null; }
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
        catch { reject(new Error(`Parse error: ${data.slice(0, 300)}`)); }
      });
    }).on("error", reject);
  });
}

// ── Fetch images from Railway API by searching title ──────────────────────
async function fetchImages(searchTitle: string): Promise<{ imageUrl: string; additionalImages: string[] }> {
  // Use first 4 meaningful words for a targeted search
  const words = searchTitle
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(the|and|for|with|size|in|of|a|an)$/i.test(w))
    .slice(0, 4)
    .join(" ");

  const params = new URLSearchParams({ template, storeName: storeName!, keyword: words });
  const data = await fetchJson(`${RAILWAY_BASE}/product-data?${params}`);

  if (data.error || !data.props?.imageUrl) {
    throw new Error(data.error || "No images returned");
  }

  return {
    imageUrl: data.props.imageUrl.replace("s-l225", "s-l500"),
    additionalImages: (data.props.additionalImages || [])
      .slice(0, 5)
      .map((u: string) => u.replace("s-l225", "s-l500")),
  };
}

// ── Render a single listing ────────────────────────────────────────────────
async function renderListing(row: ListingRow, index: number, total: number) {
  const label = row.title.slice(0, 55);
  console.log(`\n[${index + 1}/${total}] ${label}${label.length >= 55 ? "…" : ""}`);

  // Fetch images from eBay API
  console.log("   🔍 Fetching images...");
  const images = await fetchImages(row.title);

  const props = {
    storeName: storeName!,
    title: row.title,
    price: row.price || "0.00",
    currency: "USD",
    imageUrl: images.imageUrl,
    additionalImages: images.additionalImages,
    condition: row.condition || "Pre-owned",
    categoryName: row.categoryName,
  };

  console.log(`   Price: $${props.price} | Condition: ${props.condition}`);
  console.log(`   Category: ${props.categoryName || "N/A"}`);
  console.log(`   Images: ${1 + images.additionalImages.length}`);

  // Create slug — always include title so filenames are unique even when
  // item numbers collide due to Excel scientific notation truncation
  const titleSlug = row.title
    .split(" ").slice(0, 5).join("-")
    .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 45);
  const slug = `${storeName}-${String(index + 1).padStart(3, "0")}-${titleSlug}`;

  const outFile = path.join(outputDir, `${slug}.mp4`);
  const propsFile = path.join(outputDir, `.props-${index}.json`);

  writeFileSync(propsFile, JSON.stringify(props, null, 2));

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

  let rows: ListingRow[] = [];

  const resolvedCsv = csvFile || findCsvFile();
  if (resolvedCsv) {
    console.log(`📄 Reading: ${path.basename(resolvedCsv)}`);
    rows = parseCsv(resolvedCsv);
    if (maxItems) rows = rows.slice(0, maxItems);
    console.log(`   ${rows.length} listings found\n`);
  } else if (keyword) {
    console.log(`🔍 No CSV — rendering single video for keyword: "${keyword}"\n`);
    // Fetch from API directly for keyword mode
    const params = new URLSearchParams({ template, storeName: storeName!, keyword });
    const data = await fetchJson(`${RAILWAY_BASE}/product-data?${params}`);
    if (data.error) { console.error("❌", data.error); process.exit(1); }
    rows = [{
      title: data.props.title,
      price: data.props.price,
      condition: data.props.condition,
      categoryName: data.props.categoryName || "",
    }];
  } else {
    console.error("❌ Drop a CSV in data/ or use --keyword=dress");
    process.exit(1);
  }

  const results: string[] = [];
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      const out = await renderListing(rows[i], i, rows.length);
      results.push(out);
    } catch (err) {
      console.error(`   ❌ Failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`🎯 Batch Complete — ${results.length} rendered, ${failed} failed\n`);
  results.forEach((f) => console.log(`  ✅ ${path.basename(f)}`));
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
