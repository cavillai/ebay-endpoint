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
import Anthropic from "@anthropic-ai/sdk";

const RAILWAY_BASE = "https://ebay-endpoint-production.up.railway.app";

// ── Color palettes (Phase 3) ───────────────────────────────────────────────
const PALETTES = [
  { name: "GOLD_RUSH",   bg: "#111111", accent: "#FFD700" },
  { name: "NEON_PINK",   bg: "#0d0d0d", accent: "#FF1493" },
  { name: "TEAL_WAVE",   bg: "#071a1a", accent: "#00CED1" },
  { name: "DARK_FIRE",   bg: "#000000", accent: "#FF4500" },
  { name: "MIDNIGHT",    bg: "#0a0a1a", accent: "#7B68EE" },
  { name: "ROSE_GOLD",   bg: "#1a0a0a", accent: "#B76E79" },
  { name: "DEEP_PURPLE", bg: "#0d0010", accent: "#9400D3" },
];

// ── Hook pool (Phase 2) ────────────────────────────────────────────────────
const ALL_HOOKS = [
  "THEY PRICED THIS WRONG",    "YOU'LL SCREENSHOT THIS",
  "THIS PRICE IS ILLEGAL",      "STILL HERE?? WOW",
  "QUIET LUXURY. LOUD SAVINGS","WAIT BEFORE YOU SCROLL",
  "FIRST COME. BEST DRESSED.",  "MY LOSS IS YOUR GAIN",
  "SOMEONE DONATED THIS",       "PRE-LOVED BUT MAKE IT FASHION",
  "OLD MONEY. NEW PRICE.",      "THIS WON'T BE HERE TOMORROW",
  "GUESS THE PRICE 👇",         "THE TAG SAYS EVERYTHING",
];

// ── TikTok CTA pool (Phase 5) ─────────────────────────────────────────────
const TIKTOK_CTAS = [
  "GRAB THIS BEFORE IT'S GONE", "ONLY ONE LEFT",
  "STILL ON EBAY — LINK IN BIO","LINK IN BIO NOW 👇",
  "THIS WON'T BE HERE TOMORROW","SEARCH ON EBAY 🔍",
];
const IG_CTAS = [
  "Shop on eBay — Link in Bio", "Now Available — Link in Bio 👇",
  "Find it at the Link in Bio", "Available Now — See Bio",
];

// Batch state for anti-repetition
let usedHooks: string[] = [];
let usedCTAs: string[] = [];
let lastPaletteIdx = -1;
let lastMusicTrack = "";

const VIDEO_STYLES = ["classic", "neon", "cinematic", "split"] as const;

// Transition MP4 categories to randomly pick from
const TRANSITION_CATEGORIES = ["wipes", "flashes", "glitch", "leaks", "shapes"] as const;

function scanTransitions(): string[] {
  try {
    const base = "public/assets/transitions";
    const all: string[] = [];
    for (const cat of TRANSITION_CATEGORIES) {
      const dir = `${base}/${cat}`;
      try {
        readdirSync(dir)
          .filter((f) => f.endsWith(".mp4"))
          .forEach((f) => all.push(`assets/transitions/${cat}/${f}`));
      } catch {}
    }
    return all;
  } catch { return []; }
}

let lastStyleIdx = -1;
let lastTransitionIdx = -1;

function pickPalette(seed: number) {
  let idx = seed % PALETTES.length;
  if (idx === lastPaletteIdx) idx = (idx + 1) % PALETTES.length;
  lastPaletteIdx = idx;
  return PALETTES[idx];
}

function pickVideoStyle(seed: number): string {
  let idx = seed % VIDEO_STYLES.length;
  if (idx === lastStyleIdx) idx = (idx + 1) % VIDEO_STYLES.length;
  lastStyleIdx = idx;
  return VIDEO_STYLES[idx];
}

function pickTransitionMp4(transitions: string[], seed: number): string {
  if (transitions.length === 0) return "";
  let idx = seed % transitions.length;
  if (idx === lastTransitionIdx) idx = (idx + 1) % transitions.length;
  lastTransitionIdx = idx;
  return transitions[idx];
}

function pickHook(title: string, index: number): string {
  const available = ALL_HOOKS.filter(h => (usedHooks.filter(u => u === h).length < 2));
  const seed = (title.charCodeAt(0) || 0) + index;
  const hook = available[seed % available.length] || ALL_HOOKS[index % ALL_HOOKS.length];
  usedHooks.push(hook);
  return hook;
}

function pickCTA(platform: string, storeName: string, index: number): string {
  const pool = platform === "tiktok" ? TIKTOK_CTAS : IG_CTAS;
  const available = pool.filter(c => (usedCTAs.filter(u => u === c).length < 2));
  const cta = (available[index % available.length] || pool[index % pool.length])
    .replace("{storeName}", storeName);
  usedCTAs.push(cta);
  return cta;
}

function pickMusic(musicFiles: string[], index: number): string {
  const available = musicFiles.filter(f => f !== lastMusicTrack);
  const track = available[index % available.length] || musicFiles[0];
  lastMusicTrack = track;
  return track;
}

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.replace("--", "").split("=") as [string, string])
);

const storeName = args.storeName || args.store;
const keyword = args.keyword || args.k;
const outputDir = args.output || "out";
const template = args.template || "EbayProductVideo";
const platform = (args.platform || "tiktok") as "tiktok" | "instagram";
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

// ── Scan music files at runtime (never hardcoded) ─────────────────────────
function getMusicFiles(): string[] {
  try {
    return require("fs").readdirSync("public/music/")
      .filter((f: string) => f.endsWith(".mp3") || f.endsWith(".wav"));
  } catch { return ["party-time.mp3"]; }
}

// ── Render a single listing ────────────────────────────────────────────────
async function renderListing(row: ListingRow, index: number, total: number) {
  const label = row.title.slice(0, 55);
  console.log(`\n[${index + 1}/${total}] ${label}${label.length >= 55 ? "…" : ""}`);

  // Fetch images from eBay API
  console.log("   🔍 Fetching images...");
  const images = await fetchImages(row.title);
  const allImageUrls = [
    images.imageUrl.replace("s-l225", "s-l500"),
    ...images.additionalImages.map((u: string) => u.replace("s-l225", "s-l500")),
  ].filter(Boolean);

  // Math.random() ensures different selections on EVERY render run
  const rand = Math.floor(Math.random() * 9999) + index * 100;
  const renderSeed = rand;

  const musicFiles    = getMusicFiles();
  const transitions   = scanTransitions();
  const palette       = pickPalette(rand);
  const videoStyle    = pickVideoStyle(rand + 3);
  const transitionMp4 = pickTransitionMp4(transitions, rand + 7);
  const hook          = pickHook(row.title, rand % 15);
  const ctaText       = pickCTA(platform, storeName!, rand % 8);
  const audioFile     = `music/${pickMusic(musicFiles, rand % musicFiles.length)}`;

  // Pick price animation from library
  const PRICE_ANIMS = ["count-up","drop-bounce","slot-machine","typewriter","slam","split-reveal","glitch"];
  const priceAnimationId = PRICE_ANIMS[rand % PRICE_ANIMS.length];

  console.log(`   🎨 ${palette.name} | 🎬 ${videoStyle} | 🎞️  ${transitionMp4.split("/").pop() || "light-leak"}`);
  console.log(`   💰 Price anim: ${priceAnimationId}`);
  console.log(`   🪝 "${hook}" | 📣 "${ctaText}"`);
  console.log(`   🎵 ${audioFile}`);
  console.log(`   Price: $${row.price} | Condition: ${row.condition} | Images: ${allImageUrls.length}`);

  const props = {
    storeName:    storeName!,
    platform,
    title:        row.title,
    price:        parseFloat(row.price) || 0,
    condition:    row.condition || "Pre-owned",
    brand:        "",
    size:         "",
    imageUrls:    allImageUrls,
    audioFile,
    hook,
    ctaText,
    accentColor:  palette.accent,
    bgColor:      palette.bg,
    categoryName:  row.categoryName || "",
    videoStyle,
    transitionMp4,
    renderSeed,
    priceAnimationId,
  };

  const titleSlug = row.title
    .split(" ").slice(0, 5).join("-")
    .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 45);
  const slug     = `${storeName}-${String(index + 1).padStart(3, "0")}-${titleSlug}`;
  const outFile  = path.join(outputDir, `${slug}.mp4`);
  const propsFile = path.join(outputDir, `.props-${index}.json`);

  writeFileSync(propsFile, JSON.stringify(props, null, 2));

  execSync(
    `npx remotion render src/index.ts ${template} --output=${outFile} --props=${propsFile}`,
    { stdio: "inherit" }
  );

  try { require("fs").unlinkSync(propsFile); } catch {}
  console.log(`   ✅ Saved: ${outFile}`);

  // Generate and save platform captions alongside the video
  const captionFile = outFile.replace(".mp4", "-captions.txt");
  console.log("   ✍️  Generating captions...");
  try {
    const captions = await generateCaptions(
      { ...props, audioFile, videoStyle, priceAnimationId },
      storeName!
    );
    writeFileSync(captionFile, captions);
    console.log(`   ✅ Captions: ${path.basename(captionFile)}`);
  } catch (err) {
    console.warn(`   ⚠️  Caption generation failed: ${(err as Error).message}`);
  }

  return outFile;
}

// ── Template-based caption fallback (no API key needed) ───────────────────
function buildTemplateCaptions(
  props: { title: string; price: number; storeName: string; hook: string;
           ctaText: string; brand?: string; categoryName?: string; audioFile: string;
           videoStyle: string; priceAnimationId: string; },
  store: string
): string {
  const cleanTitle = props.title.split("|")[0].trim();
  const brand = props.brand || "";
  const cat   = props.categoryName || "fashion";
  const price = `$${props.price.toFixed(2)}`;
  const s = store;

  // Platform-specific caption copy
  const igCaptions = [
    `This ${brand} find just dropped at ${s} and it is absolutely stunning ✨ ${cleanTitle.slice(0,50)} — yours for only ${price}. Quality pre-loved fashion at a fraction of the retail price. Shop the link in bio before it's gone 👇`,
    `We don't gatekeep deals at ${s} 🛍️ ${price} for this gorgeous ${brand || cat} piece. The kind of find that makes your wardrobe and your wallet happy. Link in bio — tap before someone else grabs it.`,
    `Sustainable fashion never looked this good. ${cleanTitle.slice(0,55)} available now at ${s} for ${price}. Shop pre-loved, shop smart. Link in bio 💫`,
  ];
  const ttCaptions = [
    `${price}?? ${s} really said less is more 😭 #ebay #thriftfinds #fyp`,
    `POV: You found this at ${s} for ${price} 👀 link in bio #ebayfinds #thrift #fashion`,
    `${s} dropping ${price} ${cat} and I can't 🔥 #ebay #resell #fyp #fashion`,
  ];

  // Deterministic pick based on title length
  const idx = props.title.length % 3;
  const igCaption  = igCaptions[idx];
  const ttCaption  = ttCaptions[idx];

  const igHashtags = [
    `#${s.toLowerCase()} #ebay #ebayfinds #thriftedstyle #secondhandfashion`,
    `#preloved #sustainablefashion #consignmentshop #resale #vintagestyle`,
    `#ootd #fashionfinds #dealoftheday #shopsmall #thrift`,
    `#${brand.toLowerCase().replace(/\s+/g,"") || "fashion"} #${cat.toLowerCase().replace(/\s+/g,"")}`
  ].join(" ");

  const ttHashtags = `#fyp #ebay #ebayfinds #thrift #${cat.toLowerCase().replace(/\s+/g,"")} #fashion #resell`;

  return `${igCaption}\n\n${igHashtags}

---TIKTOK---
${ttCaption}

${ttHashtags}`;
}

// ── Caption generator — Claude API when key set, template fallback otherwise ─
async function generateCaptions(
  props: {
    title: string; price: number; condition: string;
    storeName: string; hook: string; ctaText: string;
    categoryName?: string; brand?: string;
    audioFile: string; videoStyle: string; priceAnimationId: string;
  },
  store: string
): Promise<string> {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const header = `═══════════════════════════════════════════════════════════
VIDEO POST GUIDE — ${props.title.split("|")[0].trim().slice(0, 60)}
Generated: ${now}
Store: ${store} on eBay  |  Price: $${props.price.toFixed(2)}
Video Style: ${props.videoStyle}  |  Price Anim: ${props.priceAnimationId}
Hook Used: ${props.hook}
═══════════════════════════════════════════════════════════`;

  const footer = `
═══════════════════════════════════════════════════════════
LIBRARIES & ASSETS USED IN THIS VIDEO:
  🎵 Music:        ${props.audioFile}
  🎬 Style:        ${props.videoStyle} (${
    props.videoStyle === "neon"      ? "scanlines overlay + electric glow" :
    props.videoStyle === "cinematic" ? "film grain + letterbox bars" :
    props.videoStyle === "split"     ? "VHS static + flash cuts" :
                                       "clean + light leaks"})
  💰 Price Anim:   ${props.priceAnimationId}
  🪄 Hook Type:    ${props.hook}
  📣 CTA:          ${props.ctaText}

POSTING TIPS:
  • Post TikTok FIRST for higher organic reach, then Instagram Reels
  • Best times: Tue–Thu 7–9pm EST  |  Sat–Sun 10am–12pm EST
  • Reply to ALL comments in first 30 min to boost the algorithm
  • Pin your eBay store link in bio BEFORE posting
  • Use the TikTok caption + 3-5 hashtags for Instagram Stories
  • Test both captions below as A/B — track which drives more clicks

CAPTION PERFORMANCE TRACKING:
  • Check TikTok Analytics → Video → Traffic Source after 24h
  • Instagram: Professional Dashboard → Reach → Follows from Post
  • Goal: 3–5% click-through to link-in-bio
═══════════════════════════════════════════════════════════`;

  // ── Try Claude API if key is available ──────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const productContext = [
        `Title: ${props.title.split("|")[0].trim()}`,
        `Price: $${props.price.toFixed(2)}`,
        props.brand       ? `Brand: ${props.brand}`             : "",
        props.categoryName? `Category: ${props.categoryName}`   : "",
        `Store: ${store} on eBay`,
        `Video hook: ${props.hook}`,
        `CTA: ${props.ctaText}`,
      ].filter(Boolean).join("\n");

      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content:
`You are an elite social media copywriter for an eBay fashion reseller store.

Product:
${productContext}

Write two READY-TO-POST captions. Be specific to this item — no generic filler.

INSTAGRAM CAPTION (3-4 punchy sentences):
- Open with the style/value angle, not the item name
- Include price naturally mid-copy
- Conversational but polished tone
- End: "Link in bio 👇" or "Shop the link in bio"
- Then 18-22 targeted hashtags on a new line

TIKTOK CAPTION (1-2 lines only — TikTok truncates at ~150 chars):
- Ultra punchy, trend-aware, casual
- Include price if it shocks
- Then 6-8 hashtags including #fyp #ebay

Format EXACTLY as:
---INSTAGRAM---
[caption + hashtags]

---TIKTOK---
[caption + hashtags]` }],
      });

      const aiText = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as any).text).join("");

      return `${header}\n\n${aiText}${footer}`;
    } catch (err) {
      console.warn(`   ⚠️  Claude API error — using template captions: ${(err as Error).message}`);
    }
  }

  // ── Template fallback (always works, no API key needed) ──────────────────
  const templateCaptions = buildTemplateCaptions(
    { ...props, audioFile: props.audioFile, videoStyle: props.videoStyle, priceAnimationId: props.priceAnimationId },
    store
  );

  return `${header}

${templateCaptions}${footer}`;
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
