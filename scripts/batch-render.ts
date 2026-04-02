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
import dotenv from "dotenv";
dotenv.config({ quiet: true }); // load .env so ANTHROPIC_API_KEY is available

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

// ── Product category detection ────────────────────────────────────────────
type ProductCategory = "CLOTHING" | "ELECTRONICS" | "COLLECTIBLES" | "HOME_GOODS";

function detectCategory(title: string, categoryName?: string): ProductCategory {
  const text = `${title} ${categoryName || ""}`.toLowerCase();

  const CLOTHING_KW    = ["dress","shirt","pants","jacket","shoes","bag","blouse",
    "sweater","hoodie","jeans","skirt","top","coat","blazer","suit","shorts",
    "leggings","cardigan","tee","pullover","vest","denim","sneaker","boot","heel",
    "sandal","hat","scarf","belt","wallet","purse","clutch"];
  const ELECTRONICS_KW = ["phone","laptop","tablet","camera","speaker","headphone",
    "ipad","iphone","samsung","gaming","console","monitor","keyboard","mouse",
    "charger","cable","router","earbuds","smartwatch","tv","television","drone"];
  const COLLECTIBLES_KW = ["card","vintage","collectible","memorabilia","signed",
    "limited","rare","edition","art","comic","figure","coin","stamp","record",
    "poster","autograph","jersey","bobblehead","pin","patch"];
  const HOME_KW = ["lamp","chair","table","pillow","blanket","pot","pan","shelf",
    "mirror","vase","towel","rug","curtain","frame","candle","planter","mug",
    "bowl","pitcher","bedding","duvet","mattress","drawer","cabinet"];

  const score = (kws: string[]) => kws.filter(k => text.includes(k)).length;

  const scores = {
    CLOTHING:     score(CLOTHING_KW),
    ELECTRONICS:  score(ELECTRONICS_KW),
    COLLECTIBLES: score(COLLECTIBLES_KW),
    HOME_GOODS:   score(HOME_KW),
  };

  // Check eBay category name first
  if (categoryName) {
    const cat = categoryName.toLowerCase();
    if (cat.includes("dress") || cat.includes("shirt") || cat.includes("clothing") ||
        cat.includes("shoe") || cat.includes("bag") || cat.includes("accessory") ||
        cat.includes("jacket") || cat.includes("sweater") || cat.includes("pants"))
      return "CLOTHING";
    if (cat.includes("electron") || cat.includes("phone") || cat.includes("computer") ||
        cat.includes("camera") || cat.includes("gaming"))
      return "ELECTRONICS";
    if (cat.includes("collect") || cat.includes("card") || cat.includes("coin") ||
        cat.includes("vintage") || cat.includes("memorabilia"))
      return "COLLECTIBLES";
    if (cat.includes("home") || cat.includes("kitchen") || cat.includes("furniture") ||
        cat.includes("garden") || cat.includes("decor"))
      return "HOME_GOODS";
  }

  const max = Math.max(...Object.values(scores));
  if (max === 0) return "CLOTHING"; // default for fashion resellers
  return (Object.keys(scores) as ProductCategory[])
    .find(k => scores[k] === max) || "CLOTHING";
}

// ── Category-specific hooks ────────────────────────────────────────────────
type HookType = "value" | "aesthetic" | "problem_solution";

const CATEGORY_HOOKS: Record<ProductCategory, Record<HookType, string[]>> = {
  CLOTHING: {
    value: [
      "This {brand} shouldn't be {price}",
      "Paying retail is for people who don't know about {store}",
      "They priced this wrong 🚨",
      "Someone donated this. Your gain.",
      "This price is actually illegal 😤",
    ],
    aesthetic: [
      "Quiet luxury. Loud savings.",
      "Old money aesthetic. New money price.",
      "The fit is giving everything",
      "Effortless. Elevated. Under {price}.",
      "Wear it once and they'll ask where you got it",
    ],
    problem_solution: [
      "Stop overpaying for fast fashion",
      "You'll wear this to 10 events. Worth every cent.",
      "Pre-loved but make it fashion",
      "Buy less. Buy better. Buy this.",
      "Circular fashion never looked this good",
    ],
  },
  ELECTRONICS: {
    value: [
      "This {item} for {price}?? Still works perfectly",
      "Why buy new when {price} gets you this",
      "Retail was 3x this. Someone's loss is your gain.",
      "Tested and working. Priced to move.",
    ],
    aesthetic: [
      "Your setup deserves this",
      "The upgrade you didn't know you needed",
      "Sleek. Powerful. {price}.",
      "Make your workspace actually work",
    ],
    problem_solution: [
      "Your current setup is slowing you down",
      "Stop paying monthly when you can own this for {price}",
      "This outlasts the cheap alternative every time",
      "Smarter choice. {price}.",
    ],
  },
  COLLECTIBLES: {
    value: [
      "You won't believe what this sold for last year",
      "This is rarer than people think",
      "First one I've seen at this price",
      "The price goes up. The stock doesn't.",
    ],
    aesthetic: [
      "This belongs in a display case. Not a landfill.",
      "The piece that completes the collection",
      "Condition like this is hard to find",
      "A piece of history for {price}",
    ],
    problem_solution: [
      "The longer you wait, the more expensive this gets",
      "They don't make these anymore",
      "Your collection has a missing piece. Found it.",
      "Don't sleep on this one",
    ],
  },
  HOME_GOODS: {
    value: [
      "Paid {price} for this. Worth triple.",
      "Your home called. It wants this.",
      "Retail was way more. You're welcome.",
      "Interior goals. {price} budget.",
    ],
    aesthetic: [
      "Your space is missing this",
      "This is the piece that ties the room together",
      "Upgrade your morning routine for {price}",
      "Good design shouldn't cost this little",
    ],
    problem_solution: [
      "Cheap version breaks in a year. This one won't.",
      "Stop replacing the same thing every season",
      "Why rent when you can own this for {price}",
      "Built to last. Priced to sell.",
    ],
  },
};

function pickHookForType(
  category: ProductCategory,
  hookType: HookType,
  title: string,
  price: number,
  storeName: string,
  seed: number
): string {
  const pool = CATEGORY_HOOKS[category][hookType];
  const raw  = pool[seed % pool.length];
  const brand = title.split(" ").slice(0, 2).join(" ");
  return raw
    .replace("{brand}", brand)
    .replace("{price}", `$${price.toFixed(2)}`)
    .replace("{store}", storeName)
    .replace("{item}", title.split(" ").slice(0, 3).join(" "));
}

// ── Render a 3-video carousel pack for one listing ─────────────────────────
async function renderCarouselPack(row: ListingRow, index: number, total: number) {
  const label = row.title.slice(0, 55);
  console.log(`\n[${ index + 1}/${total}] ${label}${label.length >= 55 ? "…" : ""}`);

  // Detect product category
  const category = detectCategory(row.title, row.categoryName);
  console.log(`   📦 Category: ${category}`);

  // Fetch images
  console.log("   🔍 Fetching images...");
  const images = await fetchImages(row.title);
  const allImageUrls = [
    images.imageUrl.replace("s-l225", "s-l500"),
    ...images.additionalImages.map((u: string) => u.replace("s-l225", "s-l500")),
  ].filter(Boolean);

  const musicFiles = getMusicFiles();
  const transitions = scanTransitions();

  // Build 3 unique video configs — each must differ on all dimensions
  const hookTypes: HookType[] = ["value", "aesthetic", "problem_solution"];
  const hookLabels = ["A (Value/Deal)", "B (Aesthetic/Vibe)", "C (Problem/Solution)"];

  const usedPalettes  = new Set<string>();
  const usedStyles    = new Set<string>();
  const usedMusic     = new Set<string>();
  const usedPriceAnim = new Set<string>();

  function pickUnique<T>(pool: T[], used: Set<string>, toKey = (x: T) => String(x), seed = 0): T {
    const available = pool.filter(x => !used.has(toKey(x)));
    const choices   = available.length > 0 ? available : pool;
    return choices[(seed + index * 7) % choices.length];
  }

  const PRICE_ANIMS  = ["count-up","drop-bounce","slot-machine","typewriter","slam","split-reveal","glitch"];
  const VIDEO_STYLES = ["classic","neon","cinematic","split"];
  const CTA_PHRASES  = [
    "Check Out","See It At","Grab Yours Here","Score One Now","Snag The Look",
    "Claim Yours.","Take A Peek,","Explore At","See The Details,",
    "While They Last,","Before It's Gone,","Limited Stock,",
    "Get It While Hot.","Level Up Your Style With","Upgrade Your Look At",
    "Start Your Journey At",
  ];
  const TIKTOK_CTAS = [
    "GRAB THIS BEFORE IT'S GONE","ONLY ONE LEFT",
    "STILL ON EBAY — LINK IN BIO","LINK IN BIO NOW 👇",
    "THIS WON'T BE HERE TOMORROW","SEARCH ON EBAY 🔍",
  ];
  const IG_CTAS = [
    "Shop on eBay — Link in Bio","Now Available — Link in Bio 👇",
    "Find it at the Link in Bio","Available Now — See Bio",
  ];

  const renderedFiles: string[] = [];

  for (let v = 0; v < 3; v++) {
    const hookType  = hookTypes[v];
    const hookLabel = hookLabels[v];
    const rand      = Math.floor(Math.random() * 9999) + index * 100 + v * 37;

    const palette     = pickUnique(PALETTES, usedPalettes, p => p.name, rand);
    const videoStyle  = pickUnique(VIDEO_STYLES, usedStyles, s => s, rand + 3) as string;
    const audioTrack  = pickUnique(musicFiles, usedMusic, s => s, rand + 5);
    const priceAnim   = pickUnique(PRICE_ANIMS, usedPriceAnim, s => s, rand + 9);
    const transition  = transitions.length > 0
      ? transitions[(rand + v * 11) % transitions.length] : "";
    const ctaPhrase   = CTA_PHRASES[(rand + v * 13) % CTA_PHRASES.length];
    const ctaText     = platform === "instagram"
      ? IG_CTAS[rand % IG_CTAS.length]
      : TIKTOK_CTAS[rand % TIKTOK_CTAS.length];
    const hookText    = pickHookForType(category, hookType, row.title,
      parseFloat(row.price) || 0, storeName!, rand);

    usedPalettes.add(palette.name);
    usedStyles.add(videoStyle);
    usedMusic.add(audioTrack);
    usedPriceAnim.add(priceAnim);

    console.log(`\n   🎬 Hook ${hookLabel}`);
    console.log(`   🪝 "${hookText}"`);
    console.log(`   🎨 ${palette.name} | 🎞️ ${videoStyle} | 🎵 ${audioTrack}`);

    const props = {
      storeName:       storeName!,
      platform,
      title:           row.title,
      price:           parseFloat(row.price) || 0,
      currency:        "USD",
      condition:       row.condition || "Pre-owned",
      brand:           "",
      size:            "",
      imageUrls:       allImageUrls,
      audioFile:       `music/${audioTrack}`,
      hook:            hookText,
      ctaText,
      accentColor:     palette.accent,
      bgColor:         palette.bg,
      categoryName:    row.categoryName || "",
      videoStyle,
      transitionMp4:   transition,
      renderSeed:      rand,
      priceAnimationId: priceAnim,
      ctaPhrase,
    };

    const titleSlug = row.title
      .split(" ").slice(0, 5).join("-")
      .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    const slug    = `${storeName}-${String(index + 1).padStart(3, "0")}-${titleSlug}`;
    const hookTag = `hook-${String.fromCharCode(97 + v)}`; // hook-a, hook-b, hook-c
    const outFile = path.join(outputDir, `${slug}-${hookTag}.mp4`);
    const propsFile = path.join(outputDir, `.props-${index}-${v}.json`);

    writeFileSync(propsFile, JSON.stringify(props, null, 2));

    execSync(
      `npx remotion render src/index.ts ${template} --output=${outFile} --props=${propsFile}`,
      { stdio: "inherit" }
    );

    try { require("fs").unlinkSync(propsFile); } catch {}
    console.log(`   ✅ Saved: ${path.basename(outFile)}`);
    renderedFiles.push(outFile);
  }

  // Single captions file covering all 3 hooks
  const titleSlug = row.title.split(" ").slice(0, 5).join("-")
    .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const captionFile = path.join(outputDir,
    `${storeName}-${String(index + 1).padStart(3, "0")}-${titleSlug}-captions.txt`);

  console.log("   ✍️  Generating captions...");
  try {
    const captionProps = {
      title: row.title,
      price: parseFloat(row.price) || 0,
      condition: row.condition || "Pre-owned",
      storeName: storeName!,
      hook: `[3-pack: value / aesthetic / problem-solution]`,
      ctaText: "GRAB IT BEFORE IT'S GONE",
      categoryName: row.categoryName,
      brand: "",
      audioFile: "hip-hop",
      videoStyle: "mixed",
      priceAnimationId: "mixed",
    };
    const captions = await generateCaptions(captionProps, storeName!);
    writeFileSync(captionFile, captions);
    console.log(`   ✅ Captions: ${path.basename(captionFile)}`);
  } catch (err) {
    console.warn(`   ⚠️  Captions failed: ${(err as Error).message}`);
  }

  return renderedFiles;
}

// ── Scan transition MP4 assets ────────────────────────────────────────────
function scanTransitions(): string[] {
  const CATS = ["wipes","flashes","glitch","leaks","shapes"];
  const all: string[] = [];
  for (const cat of CATS) {
    try {
      require("fs").readdirSync(`public/assets/transitions/${cat}`)
        .filter((f: string) => f.endsWith(".mp4"))
        .forEach((f: string) => all.push(`assets/transitions/${cat}/${f}`));
    } catch {}
  }
  return all;
}

// ── Scan music files at runtime (never hardcoded) ─────────────────────────
function getMusicFiles(): string[] {
  try {
    return require("fs").readdirSync("public/music/")
      .filter((f: string) => f.endsWith(".mp3") || f.endsWith(".wav"));
  } catch { return ["party-time.mp3"]; }
}

// ── Render a single listing ────────────────────────────────────────────────

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

  // Log category breakdown
  const catCount: Record<string, number> = {};
  rows.forEach(r => {
    const cat = detectCategory(r.title, r.categoryName);
    catCount[cat] = (catCount[cat] || 0) + 1;
  });
  console.log("📦 Category breakdown:", Object.entries(catCount)
    .map(([k, v]) => `${k}: ${v}`).join(" | "));
  console.log(`🎬 Rendering ${rows.length} listings × 3 hooks = ${rows.length * 3} videos\n`);

  for (let i = 0; i < rows.length; i++) {
    try {
      const files = await renderCarouselPack(rows[i], i, rows.length);
      results.push(...files);
    } catch (err) {
      console.error(`   ❌ Failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`🎯 Batch Complete — ${results.length} videos (${results.length / 3} packs), ${failed} packs failed\n`);
  results.forEach((f) => console.log(`  ✅ ${path.basename(f)}`));
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
