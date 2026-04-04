/**
 * Category Carousel Renderer
 *
 * Two data modes:
 *   (default)   Fetch live listings from eBay Browse API using .env credentials
 *   --mode=csv  Read listings from the most-recent CSV in data/  (must be explicitly requested)
 *
 * Every render picks from randomization libraries:
 *   color palette · video style · audio track · hook text · CTA phrase
 *   price animation · detail adjective · light-leak seed/hue (per cut)
 *
 * Usage:
 *   npm run render:test-carousel                              fetch live from eBay API (default)
 *   npm run render:test-carousel -- --mode=csv               use CSV from data/ instead
 *   npm run render:test-carousel -- --category=ELECTRONICS   target a broad category
 *   npm run render:test-carousel -- --sub=DRESSES            skip sub-category prompt
 *   npm run render:test-carousel -- --max=5                  override max listings in carousel
 *
 *   npm run render:test-carousel -- --listing                single listing mode:
 *                                                            shows all store listings, you pick one,
 *                                                            renders a carousel of that product's
 *                                                            own images (primary + secondary angles)
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync, statSync } from "fs";
import * as readline from "readline";
import https from "https";
import http from "http";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { random } from "remotion";   // deterministic seeded RNG for Chaos Engine
import dotenv from "dotenv";
dotenv.config({ quiet: true });

/** Single-line interactive prompt — resolves with user's input */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer); });
  });
}

// ── Frame math (mirrors CategoryCarousel.tsx — keep in sync) ──────────────
function getFrameBounds(n: number, fpp: number) {
  const CAROUSEL_START = 90;  // 3s hook
  const CAROUSEL_END   = CAROUSEL_START + n * fpp;
  const PRICE_START    = CAROUSEL_END;
  const DETAILS_START  = PRICE_START   + 60;
  const CTA_START      = DETAILS_START + 60;
  const TOTAL          = CTA_START     + 90;
  return { CAROUSEL_START, CAROUSEL_END, PRICE_START, DETAILS_START, CTA_START, TOTAL };
}

const RAILWAY_BASE = "https://ebay-endpoint-production.up.railway.app";
const OUTPUT_DIR   = "out";

// ── CLI args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => a.replace("--", "").split("=") as [string, string])
);
type ProductCategory = "CLOTHING" | "ELECTRONICS" | "COLLECTIBLES" | "HOME_GOODS";
const storeName      = args.storeName || "RenewFit";
const targetCategory = (args.category || "CLOTHING") as ProductCategory;
const maxListings    = Math.min(Math.max(parseInt(args.max || "3"), 2), 5);
const modeFlag       = args.mode as "api" | "csv" | undefined;
// Season flag: --season=spring | summer | fall | winter
const seasonFlag     = args.season as "spring" | "summer" | "fall" | "winter" | undefined;
// Pick flag: --pick=random or --pick=N — makes --listing non-interactive
const pickFlag       = args.pick as string | undefined;

// ══════════════════════════════════════════════════════════════════════════
// RANDOMIZATION LIBRARIES
// Each dimension picks from its own pool using a fresh Math.random() seed.
// ══════════════════════════════════════════════════════════════════════════

// ── Color palettes — expanded with ui-ux-pro-max data (161 palettes → curated 26 dark-bg video-ready) ─
const ALL_PALETTES = {
  // ── Original 10 ──────────────────────────────────────────────────────────
  DARK_FIRE:        { bg: "#000000", accent: "#FF4500" },
  MIDNIGHT:         { bg: "#0a0a1a", accent: "#7B68EE" },
  GOLD_RUSH:        { bg: "#111111", accent: "#FFD700" },
  NEON_PINK:        { bg: "#0d0d0d", accent: "#FF1493" },
  TEAL_WAVE:        { bg: "#071a1a", accent: "#00CED1" },
  CLEAN_WHITE:      { bg: "#FAFAFA", accent: "#000000" },
  ROSE_GOLD:        { bg: "#1a0a0a", accent: "#B76E79" },
  DEEP_PURPLE:      { bg: "#0d0010", accent: "#9400D3" },
  FOREST:           { bg: "#0a1a0a", accent: "#228B22" },
  OCEAN:            { bg: "#000d1a", accent: "#006994" },
  // ── ui-ux-pro-max: Fashion / Lifestyle ───────────────────────────────────
  CRIMSON_STREAM:   { bg: "#000000", accent: "#E11D48" },  // Video Streaming/OTT
  IVORY_LENS:       { bg: "#000000", accent: "#F8FAFC" },  // Photography Studio — clean monochrome
  SCARLET_GAME:     { bg: "#0F0F23", accent: "#F43F5E" },  // Gaming — deep navy + vivid rose
  GOLD_THEATER:     { bg: "#0F0F23", accent: "#CA8A04" },  // Theater/Cinema — deep night + gold
  EMERALD_BEAT:     { bg: "#0F0F23", accent: "#22C55E" },  // Music Streaming — dark + electric green
  AMBER_CAST:       { bg: "#0F0F23", accent: "#F97316" },  // Podcast Platform — dark + warm orange
  VIOLET_CRYPTO:    { bg: "#0F172A", accent: "#8B5CF6" },  // Fintech/Crypto — slate + violet
  GOLD_NFT:         { bg: "#0F0F23", accent: "#FBBF24" },  // NFT/Web3 — deep space + amber
  COBALT_RIDE:      { bg: "#0F172A", accent: "#2563EB" },  // Ride Hailing — slate + electric blue
  CYAN_LENS:        { bg: "#0F172A", accent: "#0891B2" },  // Photo Editor — slate + cyan
  LIME_GYM:         { bg: "#1F2937", accent: "#22C55E" },  // Fitness/Gym — charcoal + lime
  CYBER_RED:        { bg: "#000000", accent: "#FF3333" },  // Cybersecurity — black + hot red
  MAGENTA_QUANTUM:  { bg: "#050510", accent: "#FF00FF" },  // Quantum — near-black + magenta
  AZURE_SPACE:      { bg: "#0B0B10", accent: "#3B82F6" },  // Space Tech — void black + azure
  TEAL_GREEN_FIN:   { bg: "#0F172A", accent: "#059669" },  // Finance — slate + teal green
  EMERALD_GIG:      { bg: "#020617", accent: "#22C55E" },  // Financial Dashboard — near-black + emerald
} as const;
type PaletteName = keyof typeof ALL_PALETTES;

const CATEGORY_PALETTES: Record<ProductCategory, PaletteName[]> = {
  CLOTHING:     ["NEON_PINK", "GOLD_RUSH", "ROSE_GOLD", "MIDNIGHT",
                 "CRIMSON_STREAM", "IVORY_LENS", "SCARLET_GAME", "GOLD_NFT", "AMBER_CAST"],
  ELECTRONICS:  ["MIDNIGHT", "TEAL_WAVE", "OCEAN", "DARK_FIRE",
                 "COBALT_RIDE", "CYAN_LENS", "AZURE_SPACE", "CYBER_RED", "EMERALD_GIG"],
  COLLECTIBLES: ["GOLD_RUSH", "DEEP_PURPLE", "DARK_FIRE",
                 "GOLD_THEATER", "VIOLET_CRYPTO", "GOLD_NFT", "MAGENTA_QUANTUM"],
  HOME_GOODS:   ["FOREST", "CLEAN_WHITE", "OCEAN", "ROSE_GOLD",
                 "LIME_GYM", "TEAL_GREEN_FIN", "EMERALD_BEAT", "IVORY_LENS"],
};

// ── Seasonal hook texts — used when --season flag is set ─────────────────
// storeName is always a variable — never a literal
const SEASONAL_HOOKS: Record<"spring"|"summer"|"fall"|"winter", string[]> = {
  spring: [
    `${storeName} Spring Sale is here.`,
    "Fresh finds. Spring prices.",
    "New season. New looks. Real savings.",
    `Spring into ${storeName}.`,
    "Pre-loved pieces for spring season.",
    "Stop waiting. Spring sale starts now.",
  ],
  summer: [
    `${storeName} Summer Sale is live.`,
    "Hot deals. Cool prices.",
    "Summer looks at summer savings.",
    `Heat up your wardrobe at ${storeName}.`,
    "Pre-loved summer pieces. Real savings.",
    "Stop paying full price this summer.",
  ],
  fall: [
    `${storeName} Fall Sale is here.`,
    "Fall into savings. Pre-loved prices.",
    "New season. New look. Same great value.",
    `Autumn finds at ${storeName}.`,
    "Pre-loved fall pieces for less.",
    "This fall — dress better for less.",
  ],
  winter: [
    `${storeName} Winter Sale is live.`,
    "Cold outside. Hot deals inside.",
    "Winter looks at winter prices.",
    `Bundle up for less at ${storeName}.`,
    "Pre-loved winter pieces. Real savings.",
    "Stay warm. Spend less.",
  ],
};

// ── Video styles — 4 options ─────────────────────────────────────────────
const ALL_VIDEO_STYLES = ["classic", "neon", "cinematic", "split"] as const;
type VideoStyleId = typeof ALL_VIDEO_STYLES[number];

// Category-preferred order (still random within preference, fallback to all)
const CATEGORY_STYLES: Record<ProductCategory, VideoStyleId[]> = {
  CLOTHING:     ["neon",      "split",     "classic", "cinematic"],
  ELECTRONICS:  ["cinematic", "neon",      "classic", "split"],
  COLLECTIBLES: ["classic",   "cinematic", "split",   "neon"],
  HOME_GOODS:   ["cinematic", "classic",   "split",   "neon"],
};

// ── Audio — energy-matched per category ──────────────────────────────────
// Tracks marked ⚠ have known scary/dark intros — kept with large start offsets but
// deprioritized. New Pixabay tracks (fashion-beat-*, etc.) download via npm run setup-music.
// getMusicFiles() scans public/music/ at runtime — new downloads are auto-discovered.
const CATEGORY_MUSIC: Record<ProductCategory, string[]> = {
  CLOTHING: [
    // Core — upbeat, safe intros
    "trap.mp3", "trapanomics.mp3", "hip-hop-03.mp3",
    "molly-hip-hop.mp3", "young-trizzy.mp3",
    // New Pixabay — fashion-specific upbeat (downloaded via setup-music)
    "fashion-beat-01.mp3", "fashion-beat-02.mp3", "fashion-pop-01.mp3",
    "drip-hop-01.mp3", "swag-beat-01.mp3", "bounce-trap-01.mp3",
    "reseller-vibe-01.mp3", "thrift-hop-01.mp3",
    "upbeat-pop-01.mp3", "upbeat-pop-02.mp3",
    "hype-up-01.mp3", "good-vibes-01.mp3", "sunny-trap-01.mp3",
    "rnb-smooth-01.mp3", "rnb-smooth-02.mp3", "lofi-hype-01.mp3",
    // Deprioritized (known problematic intros — large start offset applied)
    "purple-js.mp3", "hip-hop-02.mp3",
  ],
  ELECTRONICS: [
    "need-for-speed.mp3", "thunder.mp3", "g-eazy-nba-type.mp3",
    "21.mp3", "like-a-loop-machine.mp3",
    "tech-beat-01.mp3", "electro-hype-01.mp3", "future-beat-01.mp3",
    "hype-up-01.mp3", "bounce-trap-01.mp3",
  ],
  COLLECTIBLES: [
    "never-going-broke.mp3", "complicated.mp3", "praise-the-lord.mp3",
    "billy-the-kid.mp3",
    "retro-hop-01.mp3", "vintage-soul-01.mp3",
    "thrift-hop-01.mp3", "lofi-hype-01.mp3",
    // cbpd has creepy section — deprioritized
    "cbpd.mp3",
  ],
  HOME_GOODS: [
    "sweet-september.mp3", "rnb.mp3", "tonight.mp3", "trap-hamza.mp3",
    "acoustic-pop-01.mp3", "indie-pop-01.mp3", "chill-vibes-01.mp3",
    "rnb-smooth-01.mp3", "rnb-smooth-02.mp3", "good-vibes-01.mp3",
  ],
};

// ── Hook texts — expanded with copywriting frameworks (copy-frameworks.md)
// Formulas applied: Stop/Start · Never Again · Turn X into Y · What If ·
// Outcome-Focused · Problem-Focused · Proof-Focused · Audience-Focused
const CATEGORY_HOOKS: Record<ProductCategory, string[]> = {
  CLOTHING: [
    // Original
    `The ${storeName} Haul.\nNew drops, pre-loved prices.`,
    "Your next fit is already here.",
    `Paying retail is for people who\ndon't know about ${storeName}`,
    "Pre-loved but make it fashion.",
    "Stop overpaying for fast fashion.",
    // Stop/Start (copy-frameworks: "Stop [pain]. Start [pleasure].")
    "Stop paying retail.\nStart dressing better.",
    "Stop buying fast fashion.\nStart owning real style.",
    // Never Again (copy-frameworks: "Never {unpleasant event} again")
    "Never overpay for a dress again.",
    "Never settle for one outfit again.",
    // Turn X into Y (copy-frameworks: "Turn {input} into {outcome}")
    "Turn $25 into a look\nthat costs $150.",
    "Turn pre-loved into your\nbest-dressed moment.",
    // What If (copy-frameworks: "What if you could {desirable outcome}?")
    "What if you could dress well\nfor under $30?",
    // Outcome-Focused (copy-frameworks: "{Achieve desirable outcome} without {pain point}")
    "Look amazing this week\nwithout breaking the bank.",
    // Proof-Focused (copy-frameworks: "{Key benefit of your product}")
    "41 dresses. All under $50.\nAll on eBay right now.",
    // Audience-Focused (copy-frameworks: "{Key feature} for {target audience}")
    "Pre-loved luxury finds\nfor smart shoppers.",
    // Problem-Focused (copy-frameworks: "{Question highlighting the main pain point}")
    "Tired of paying $80 for a dress\nyou'll wear twice?",
    // Finally formula (copy-frameworks: "Finally, {category} that {benefit}")
    "Finally, pre-loved clothing\nthat actually looks expensive.",
  ],
  ELECTRONICS: [
    // Original
    "Tested. Working. Priced to move.",
    "Upgrades that won't break the bank.",
    "Why buy new when this works perfectly?",
    "Your setup deserves this.",
    // Stop/Start
    "Stop overpaying for new.\nStart upgrading smart.",
    // Never Again
    "Never pay full retail\nfor tech again.",
    // Turn X into Y
    "Turn your old setup into\nsomething next-level.",
    // What If
    "What if your dream setup\ncost half the price?",
    // Outcome-Focused
    "Get a premium setup\nwithout the premium price.",
    // Proof-Focused
    "Tested. Verified. Still works\nperfectly — for less.",
    // Problem-Focused
    "Hate watching prices drop\nthe day after you buy?",
  ],
  COLLECTIBLES: [
    // Original
    "Rare finds. Real prices.",
    "They don't make these anymore.",
    "The longer you wait,\nthe more expensive this gets.",
    "Before the price goes up.",
    // Never Again
    "Never find this price again.\nTrust us.",
    // Turn X into Y
    "Turn a $20 find into\na $200 collection piece.",
    // What If
    "What if the rarest piece\nin your collection cost nothing?",
    // Proof-Focused
    "Gone tomorrow.\nAvailable today.",
    // Problem-Focused
    "Still hunting this piece\non every site?",
    // Scarcity (CRO: urgency/scarcity principle)
    "One listing.\nOne chance.",
  ],
  HOME_GOODS: [
    // Original
    "Upgrade your space today.",
    "Curated home finds. Real value.",
    "Your home called. It wants this.",
    "Good design shouldn't cost this much.",
    // Stop/Start
    "Stop living with furniture\nyou hate. Start here.",
    // Turn X into Y
    "Turn your living room into\nthe space you always wanted.",
    // What If
    "What if your home looked\nlike a magazine — for under $100?",
    // Outcome-Focused
    "Transform your space\nwithout an interior designer.",
    // Problem-Focused
    "Tired of your home\nlooking exactly the same?",
    // Finally formula
    "Finally, quality home pieces\nthat don't cost a fortune.",
  ],
};

// ── CTA phrases — expanded with copywriting action verbs + CRO principles ─
// CRO principle: imperative action verbs outperform passive ("See It" < "Claim Yours")
// Scarcity + outcome CTAs consistently outperform generic ones (page-cro: experiments.md)
const CATEGORY_CTA_PHRASES: Record<ProductCategory, string[]> = {
  CLOTHING:     [
    "Snag The Look",       // Original — action + outcome
    "Get The Fit",         // Original
    "Claim Yours.",        // Original — ownership language
    "Grab It Now",         // Original — urgency
    "Make It Yours",       // Ownership (CRO: ownership language reduces friction)
    "Own The Look",        // Strong ownership
    "Shop The Haul",       // Community language (TikTok-native)
    "Style Starts Here",   // Outcome-focused (copy-frameworks: achieve outcome)
  ],
  ELECTRONICS:  [
    "Upgrade Now",         // Original
    "Level Up At",         // Original
    "Get Yours At",        // Original
    "Shop Now At",         // Original
    "Claim This Deal",     // Scarcity framing (CRO: scarcity)
    "Build Your Setup",    // Outcome language
    "Own It Today",        // Ownership + urgency
  ],
  COLLECTIBLES: [
    "Before It's Gone",    // Original — scarcity (CRO: highest-performing for collectibles)
    "While They Last",     // Original — scarcity
    "Claim Yours.",        // Original — ownership
    "See It At",           // Original
    "Don't Miss This",     // Loss aversion (CRO: loss aversion > gain framing)
    "Grab It Before It's Gone", // Explicit scarcity
    "Last Chance",         // Hard scarcity signal
  ],
  HOME_GOODS:   [
    "Upgrade Your Space",  // Original — outcome
    "See It At",           // Original
    "Explore At",          // Original
    "Shop Now At",         // Original
    "Transform Your Home", // Outcome language (copy-frameworks: outcome-focused)
    "Make It Home",        // Emotional ownership
    "Refresh Your Space",  // Action + outcome
  ],
};

// ── Urgency CTA text — expanded pool (bottom of CTA scene) ───────────────
const URGENCY_CTA = [
  "LINK IN BIO 👇",
  "STILL ON EBAY — LINK IN BIO",
  "GRAB THIS BEFORE IT'S GONE",
  "ONLY ONE LEFT — LINK IN BIO",
  "SEARCH ON EBAY 🔍",
  // New — stronger scarcity / social proof (CRO: urgency + social proof)
  "SELLING FAST — LINK IN BIO",
  "SHOP BEFORE IT'S GONE 👇",
  "FIND IT ON EBAY NOW 🔍",
  "TAP THE LINK BEFORE IT SELLS",
];

// ── Price animations — 4 range-display styles ────────────────────────────
const PRICE_ANIMATION_IDS = ["count-up", "slam", "slide", "typewriter"] as const;

// ── Detail adjectives — expanded with ui-ux-pro-max style vocabulary ──────
// Sources: styles.csv mood keywords (elegant, vibrant, premium, bold, editorial)
//          typography.csv mood keywords (timeless, luxury, bold, creative, fresh)
const ADJECTIVES: Record<ProductCategory, string[]> = {
  CLOTHING:     [
    // Original
    "Stylish","Chic","Elevated","Timeless","Statement","Pre-loved","Iconic","Fresh",
    // ui-ux-pro-max: luxury/editorial/fashion moods
    "Luxe","Editorial","Coveted","Curated","Bold","Effortless","Polished","Distinctive",
  ],
  ELECTRONICS:  [
    // Original
    "Sleek","Powerful","Premium","Next-Level","Smart","Tested","Verified",
    // ui-ux-pro-max: tech/precision moods
    "Precision","Flagship","High-Performance","Certified","Immersive","Pro-Grade",
  ],
  COLLECTIBLES: [
    // Original
    "Rare","Iconic","Coveted","Limited","Museum-Worthy","Authentic",
    // ui-ux-pro-max: editorial/heritage moods
    "Heritage","Vintage","One-of-a-Kind","Pristine","Collector-Grade","Storied",
  ],
  HOME_GOODS:   [
    // Original
    "Refined","Curated","Quality","Timeless","Elevated","Artisan",
    // ui-ux-pro-max: lifestyle/wellness/organic moods
    "Considered","Handcrafted","Minimal","Warm","Organic","Designer-Inspired",
  ],
};

// ── True random pick ──────────────────────────────────────────────────────
function rng<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ══════════════════════════════════════════════════════════════════════════
// LISTING ROW TYPE
// ══════════════════════════════════════════════════════════════════════════
interface ListingRow {
  title:        string;
  price:        string;
  condition:    string;
  categoryName: string;
  itemNumber?:  string;
  heroImageUrl?: string; // pre-filled in API mode, fetched in CSV mode
}

// ══════════════════════════════════════════════════════════════════════════
// CATEGORY DETECTION
// ══════════════════════════════════════════════════════════════════════════
// CATEGORY + SUB-CATEGORY DETECTION
// ══════════════════════════════════════════════════════════════════════════

function detectCategory(title: string, categoryName?: string): ProductCategory {
  if (categoryName) {
    const cat = categoryName.toLowerCase();
    if (cat.match(/dress|shirt|clothing|shoe|bag|jacket|sweater|pants|accessory|top|blouse|denim/))
      return "CLOTHING";
    if (cat.match(/electron|phone|computer|camera|gaming|tablet|laptop/))
      return "ELECTRONICS";
    if (cat.match(/collect|card|coin|vintage|memorabilia|rare|limited/))
      return "COLLECTIBLES";
    if (cat.match(/home|kitchen|furniture|garden|decor|bedding|tool/))
      return "HOME_GOODS";
  }
  const text = `${title} ${categoryName || ""}`.toLowerCase();
  const score = (kws: string[]) => kws.filter(k => text.includes(k)).length;
  const scores = {
    CLOTHING:     score(["dress","shirt","pants","jacket","shoes","bag","blouse","sweater",
                          "hoodie","jeans","skirt","top","coat","blazer","leggings","tee","denim"]),
    ELECTRONICS:  score(["phone","laptop","tablet","camera","speaker","headphone","ipad",
                          "iphone","samsung","gaming","console","monitor","keyboard"]),
    COLLECTIBLES: score(["card","vintage","collectible","memorabilia","signed","limited",
                          "rare","edition","art","comic","figure","coin","stamp"]),
    HOME_GOODS:   score(["lamp","chair","table","pillow","blanket","pot","pan","shelf",
                          "mirror","vase","towel","rug","curtain","candle","mug"]),
  };
  const max = Math.max(...Object.values(scores));
  if (max === 0) return "CLOTHING";
  return (Object.keys(scores) as ProductCategory[]).find(k => scores[k] === max) || "CLOTHING";
}

/**
 * Finer sub-category within a broad category.
 *
 * CLOTHING rules (in priority order):
 *  1. Gender detected FIRST — men's items get MENS_* prefix so they
 *     never appear alongside women's items in the same carousel.
 *  2. "dress" as ADJECTIVE vs NOUN — "dress pants / dress shirt / dress shoes"
 *     must NOT match DRESSES.
 *  3. Item type matched within the correct gender bucket.
 */
function detectSubCategory(title: string, categoryName: string, broad: ProductCategory): string {
  const t = `${title} ${categoryName}`.toLowerCase();

  if (broad === "CLOTHING") {
    // ── 1. Gender ──────────────────────────────────────────────────────
    const isMens = /\bmen.?s\b|\bmenswear\b|\bboys?\b/.test(t) && !/\bwomen/.test(t);

    // ── 2. "dress" as adjective (dress pants / dress shirt / dress shoes)
    const dressIsAdjective = /\bdress\s+(pant|shirt|shoe|trouser|chino|sock|coat)/.test(t);
    const isDressGarment   = !dressIsAdjective &&
      /\bdress\b|\bgown\b|\bmaxi\b|\bmidi\b|\bsundress\b/.test(t);

    // ── 3a. Men's item types ────────────────────────────────────────────
    if (isMens) {
      if (/\bsuit\b|\bblaz(er|e)\b|\bsports?\s*coat\b|\btuxedo\b|\bformal/.test(t))   return "MENS_FORMAL";
      if (/\bpants?\b|\bjeans?\b|\bshorts?\b|\btrousers?\b|\bchinos?\b|\bslacks?\b/.test(t) ||
          dressIsAdjective && /\bpant/.test(t))                                         return "MENS_BOTTOMS";
      if (/\bshirt\b|\btop\b|\btee\b|\btank\b|\bpolo\b/.test(t) ||
          dressIsAdjective && /\bshirt/.test(t))                                        return "MENS_TOPS";
      if (/\bjacket\b|\bcoat\b|\bparka\b|\bpuffer\b|\bwindbreaker\b/.test(t))          return "MENS_OUTERWEAR";
      if (/\bsweater\b|\bhoodie\b|\bsweatshirt\b|\bcardigan\b|\bpullover\b|\bfleece\b/.test(t)) return "MENS_SWEATERS";
      if (/\bshoes?\b|\bboots?\b|\bsneakers?\b|\bsandals?\b|\bloafers?\b/.test(t) ||
          dressIsAdjective && /\bshoe/.test(t))                                         return "MENS_SHOES";
      if (isDressGarment) return "MENS_FORMAL"; // kilt, caftan, etc. worn by men
      return "MENS_OTHER";
    }

    // ── 3b. Women's / unisex item types ────────────────────────────────
    if (isDressGarment)                                                                 return "DRESSES";
    if (/\bsuit\b|\bblaz(er|e)\b|\btuxedo\b|formalwear\b/.test(t))                    return "FORMALWEAR";
    if (/\bjacket\b|\bcoat\b|\bparka\b|\bpuffer\b|\bwindbreaker\b|outerwear/.test(t)) return "OUTERWEAR";
    if (/\bsweater\b|\bhoodie\b|\bsweatshirt\b|\bcardigan\b|\bpullover\b|\bfleece\b/.test(t)) return "SWEATERS";
    if (/\bpants?\b|\bjeans?\b|\bshorts?\b|\btrousers?\b|\bskirt\b|\bleggings?\b/.test(t)) return "BOTTOMS";
    if (/\bshoes?\b|\bheels?\b|\bboots?\b|\bsneakers?\b|\bsandals?\b|\bflats?\b|\bloafers?\b|\bmules?\b/.test(t)) return "SHOES";
    if (/\bbags?\b|\bpurses?\b|\bclutch\b|\bhandbag\b|\btote\b|\bbackpack\b|\bwallet\b/.test(t)) return "BAGS";
    if (/\bscarf\b|\bhats?\b|\bbelts?\b|\bgloves?\b|\bsunglasses?\b|\bjewel|\bnecklace\b|\brings?\b|\bearring/.test(t)) return "ACCESSORIES";
    if (/\bactivewear\b|\byoga\b|\bathlet|\bsports?\s*bra\b|\bworkout\b/.test(t))     return "ACTIVEWEAR";
    if (/\bswimsuit\b|\bbikini\b|\bswimwear\b|\bswim\b/.test(t))                      return "SWIMWEAR";
    if (/\bshirt\b|\bblouse\b|\btop\b|\btee\b|\btank\b|\bcami\b|\bbodysuit\b/.test(t)) return "TOPS";
    return "TOPS"; // default women's
  }

  if (broad === "ELECTRONICS") {
    if (t.match(/iphone|samsung|galaxy|android|smartphone|cell phone/))  return "PHONES";
    if (t.match(/\blaptop\b|\bmacbook\b|\bchromebook\b/))                 return "LAPTOPS";
    if (t.match(/\btablet\b|\bipad\b/))                                   return "TABLETS";
    if (t.match(/headphone|earbud|airpod|speaker|audio/))                 return "AUDIO";
    if (t.match(/gaming|console|playstation|xbox|nintendo|ps[45]/))       return "GAMING";
    if (t.match(/\bcamera\b|\blens\b|\bdslr\b/))                          return "CAMERAS";
    if (t.match(/\bwatch\b|\bfitbit\b|\bgarmin\b|\bwearable\b/))          return "WEARABLES";
    return "ELECTRONICS_OTHER";
  }

  if (broad === "COLLECTIBLES") {
    if (t.match(/pokemon|trading card|baseball card|basketball card|\bcard\b/)) return "TRADING_CARDS";
    if (t.match(/\bvintage\b|\bantique\b/))                               return "VINTAGE";
    if (t.match(/\bfigure\b|\bfigurine\b|\bstatue\b|\bdoll\b/))           return "FIGURES";
    if (t.match(/memorabilia|signed|autograph|\bjersey\b/))               return "MEMORABILIA";
    return "COLLECTIBLES_OTHER";
  }

  if (broad === "HOME_GOODS") {
    if (t.match(/\bchair\b|\bsofa\b|\btable\b|\bdesk\b|\bshelf\b|\bfurniture\b/)) return "FURNITURE";
    if (t.match(/\bpot\b|\bpan\b|\bkitchen\b|\bcookware\b|\bappliance\b/)) return "KITCHEN";
    if (t.match(/\bpillow\b|\bblanket\b|\bbedding\b|\bsheet\b|\bduvet\b|\bcomforter\b/)) return "BEDDING";
    if (t.match(/\bdecor\b|\blamp\b|\bvase\b|\bcandle\b|\bframe\b|\bmirror\b/)) return "DECOR";
    return "HOME_OTHER";
  }

  return "OTHER";
}

/**
 * Calculate framesPerProduct so total video = ~20s (600 frames).
 * FIXED_FRAMES = hook(90) + price(60) + details(60) + cta(90) = 300
 * Remaining 300 frames split evenly across products:
 *   N=3 → 100 fpp = 3.3s each   (total 600 = 20s)
 *   N=4 →  75 fpp = 2.5s each   (total 600 = 20s)
 *   N=5 →  60 fpp = 2.0s each   (total 600 = 20s)
 */
function calcFramesPerProduct(numProducts: number): number {
  const TARGET_MAX_FRAMES = 600; // 20 seconds
  const FIXED_FRAMES      = 300; // hook(90) + price(60) + details(60) + cta(90)
  const MIN_FPP           = 42;
  const MAX_FPP           = 100;
  const available         = TARGET_MAX_FRAMES - FIXED_FRAMES;
  return Math.min(MAX_FPP, Math.max(MIN_FPP, Math.floor(available / numProducts)));
}

// ══════════════════════════════════════════════════════════════════════════
// MODE A — eBay Browse API (proxied through Railway)
// ══════════════════════════════════════════════════════════════════════════
async function fetchStoreListingsAPI(store: string): Promise<ListingRow[]> {
  console.log(`\n   📡 Fetching listings via Railway /store-listings...`);
  const url = `${RAILWAY_BASE}/store-listings?storeName=${encodeURIComponent(store)}&limit=75`;
  const data = await fetchJson(url);

  if (data.error) throw new Error(data.error);

  console.log(`   ✅ ${data.total} listings retrieved`);

  return (data.listings as any[]).map(item => ({
    title:        item.title || "",
    price:        item.price || "0",
    condition:    item.condition || "Pre-owned",
    categoryName: item.categoryName || "",
    itemNumber:   item.itemId,
    heroImageUrl: (item.imageUrl || "").replace("s-l225", "s-l500"),
  }));
}

// ══════════════════════════════════════════════════════════════════════════
// MODE B — CSV
// ══════════════════════════════════════════════════════════════════════════
function parseCsv(file: string): ListingRow[] {
  const content = readFileSync(file, "utf-8");
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const normalize = (h: string) => h.trim().replace(/"/g, "").toLowerCase().replace(/[\s_-]+/g, " ");
  const headers = lines[0].split(",").map(normalize);
  const col = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex(h => h === n || h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };
  const cols = {
    itemNumber: col(["item number","item id"]),
    title:      col(["title","listing title"]),
    price:      col(["current price","start price","price"]),
    condition:  col(["condition"]),
    category:   col(["ebay category 1 name","category 1 name","category name","category"]),
  };

  const rows: ListingRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
    const get = (i: number) => (cells[i] ?? "").replace(/^"|"$/g, "").trim();
    const title = cols.title !== -1 ? get(cols.title) : "";
    if (!title) continue;
    let itemNumber: string | undefined;
    if (cols.itemNumber !== -1) {
      const raw = get(cols.itemNumber);
      if (raw) {
        const num = parseFloat(raw);
        itemNumber = !isNaN(num) && num > 1e9
          ? Math.round(num).toString()
          : raw.replace(/[^0-9]/g, "");
      }
    }
    rows.push({
      title,
      price:        cols.price     !== -1 ? get(cols.price)    : "25.00",
      condition:    cols.condition !== -1 ? get(cols.condition) : "Pre-owned",
      categoryName: cols.category  !== -1 ? get(cols.category)  : "",
      itemNumber,
    });
  }
  return rows;
}

function findCsvFile(): string | null {
  const dataDir = path.join(process.cwd(), "data");
  try {
    const files = readdirSync(dataDir)
      .filter(f => f.endsWith(".csv") && !f.includes("template"))
      .map(f => ({ f, mtime: statSync(path.join(dataDir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return files.length ? path.join(dataDir, files[0].f) : null;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════════
// IMAGE FETCHING (CSV mode — API mode gets images directly from eBay)
// ══════════════════════════════════════════════════════════════════════════
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      let data = "";
      res.on("data", c => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error: ${data.slice(0, 300)}`)); }
      });
    }).on("error", reject);
  });
}

async function fetchHeroImage(title: string): Promise<string> {
  const words = title.split(/\s+/)
    .filter(w => w.length > 2 && !/^(the|and|for|with|size|in|of|a|an)$/i.test(w))
    .slice(0, 4).join(" ");
  const params = new URLSearchParams({ template: "EbayProductVideo", storeName, keyword: words });
  try {
    const data = await fetchJson(`${RAILWAY_BASE}/product-data?${params}`);
    if (data.error || !data.props?.imageUrl) throw new Error(data.error || "No image returned");
    return data.props.imageUrl.replace("s-l225", "s-l500");
  } catch (err) {
    console.warn(`\n      ⚠️  ${(err as Error).message}`);
    return "";
  }
}

/** Fetch primary + all secondary images for a single listing */
async function fetchAllImages(title: string): Promise<string[]> {
  const words = title.split(/\s+/)
    .filter(w => w.length > 2 && !/^(the|and|for|with|size|in|of|a|an)$/i.test(w))
    .slice(0, 4).join(" ");
  const params = new URLSearchParams({ template: "EbayProductVideo", storeName, keyword: words });
  try {
    const data = await fetchJson(`${RAILWAY_BASE}/product-data?${params}`);
    if (data.error || !data.props?.imageUrl) throw new Error(data.error || "No images returned");
    const fix  = (u: string) => u.replace("s-l225", "s-l500").replace("s-l300", "s-l500");
    const all  = [
      fix(data.props.imageUrl),
      ...((data.props.additionalImages || []) as string[]).map(fix),
    ].filter(Boolean);
    return all;
  } catch (err) {
    console.warn(`   ⚠️  ${(err as Error).message}`);
    return [];
  }
}

// ══════════════════════════════════════════════════════════════════════════
// MISC HELPERS
// ══════════════════════════════════════════════════════════════════════════
function getMusicFiles(): string[] {
  try {
    return readdirSync("public/music/").filter(f => f.endsWith(".mp3") || f.endsWith(".wav"));
  } catch { return ["trap.mp3"]; }
}

// ── Per-track start offsets — skip quiet/creepy intros ───────────────────
// start: minimum frame to seek to in the audio file (frames at 30fps)
// range: random extra frames added on top (so same track varies per render)
// Set start=0 for tracks that open with the beat immediately.
// Update these values as you identify intros that need skipping.
// ── TRACK START OFFSETS — skip quiet/dark/scary intros ───────────────────
// Every track starts at or after the beat drop to guarantee upbeat energy from frame 0.
// start = minimum frame to start from (skips intro)
// range = random additional frames added on top (so same track sounds different each render)
// Rule: if a track ever sounds dark/slow/quiet at the start of a video — increase `start`.
const TRACK_START_OFFSETS: Record<string, { start: number; range: number }> = {
  // ── CLOTHING / FASHION ─────────────────────────────────────────────────
  "trap.mp3":              { start: 30,  range: 60  }, // safe drop entry
  "trapanomics.mp3":       { start: 30,  range: 60  }, // safe drop entry
  "hip-hop-03.mp3":        { start: 30,  range: 90  },
  "molly-hip-hop.mp3":     { start: 30,  range: 60  },
  "young-trizzy.mp3":      { start: 30,  range: 60  },
  "purple-js.mp3":         { start: 90,  range: 90  }, // ⚠ reported scary — skip first 3s
  "hip-hop-02.mp3":        { start: 480, range: 180 }, // 16s dark build-up — skip entirely
  // ── ELECTRONICS ────────────────────────────────────────────────────────
  "need-for-speed.mp3":    { start: 30,  range: 60  },
  "thunder.mp3":           { start: 60,  range: 60  }, // has a dramatic low intro — skip 2s
  "g-eazy-nba-type.mp3":   { start: 30,  range: 90  },
  "21.mp3":                { start: 30,  range: 60  },
  "like-a-loop-machine.mp3": { start: 60, range: 60 },
  // ── COLLECTIBLES ───────────────────────────────────────────────────────
  "never-going-broke.mp3": { start: 30,  range: 60  },
  "complicated.mp3":       { start: 30,  range: 60  },
  "praise-the-lord.mp3":   { start: 30,  range: 60  },
  "billy-the-kid.mp3":     { start: 30,  range: 60  },
  "cbpd.mp3":              { start: 90,  range: 60  }, // short intro + has creepy section
  // ── HOME_GOODS ─────────────────────────────────────────────────────────
  "sweet-september.mp3":   { start: 60,  range: 90  }, // skip melody build
  "rnb.mp3":               { start: 30,  range: 90  },
  "tonight.mp3":           { start: 60,  range: 90  },
  "trap-hamza.mp3":        { start: 30,  range: 60  },
  // ── NEW PIXABAY TRACKS (downloaded via npm run setup-music) ────────────
  // All start after first beat to guarantee upbeat from frame 0
  "fashion-beat-01.mp3":   { start: 30,  range: 60  },
  "fashion-beat-02.mp3":   { start: 30,  range: 60  },
  "fashion-pop-01.mp3":    { start: 30,  range: 60  },
  "drip-hop-01.mp3":       { start: 30,  range: 60  },
  "swag-beat-01.mp3":      { start: 30,  range: 60  },
  "bounce-trap-01.mp3":    { start: 30,  range: 60  },
  "reseller-vibe-01.mp3":  { start: 30,  range: 60  },
  "thrift-hop-01.mp3":     { start: 30,  range: 60  },
  "upbeat-pop-01.mp3":     { start: 30,  range: 60  },
  "upbeat-pop-02.mp3":     { start: 30,  range: 60  },
  "hype-up-01.mp3":        { start: 30,  range: 60  },
  "good-vibes-01.mp3":     { start: 30,  range: 60  },
  "sunny-trap-01.mp3":     { start: 30,  range: 60  },
  "rnb-smooth-01.mp3":     { start: 30,  range: 60  },
  "rnb-smooth-02.mp3":     { start: 30,  range: 60  },
  "lofi-hype-01.mp3":      { start: 30,  range: 60  },
  "tech-beat-01.mp3":      { start: 30,  range: 60  },
  "electro-hype-01.mp3":   { start: 30,  range: 60  },
  "future-beat-01.mp3":    { start: 30,  range: 60  },
  "retro-hop-01.mp3":      { start: 30,  range: 60  },
  "vintage-soul-01.mp3":   { start: 30,  range: 60  },
  "acoustic-pop-01.mp3":   { start: 30,  range: 60  },
  "indie-pop-01.mp3":      { start: 30,  range: 60  },
  "chill-vibes-01.mp3":    { start: 30,  range: 60  },
};

/** Returns the frame in the audio file to start from, with a random offset within the safe zone */
function pickAudioStartFrom(track: string): number {
  const cfg = TRACK_START_OFFSETS[track] || { start: 0, range: 30 };
  return cfg.start + Math.floor(Math.random() * cfg.range);
}

// ── Anti-repeat music — persists last used track across renders ───────────
const LAST_TRACK_FILE = path.join(OUTPUT_DIR, ".last-track.txt");

function getLastTrack(): string {
  try { return readFileSync(LAST_TRACK_FILE, "utf-8").trim(); }
  catch { return ""; }
}

function saveLastTrack(track: string): void {
  try { writeFileSync(LAST_TRACK_FILE, track); } catch {}
}

/**
 * Pick a track from the pool, guaranteed different from the last render.
 * Falls back to unrestricted pick only when pool has exactly 1 track.
 */
function pickTrack(pool: string[]): string {
  const last     = getLastTrack();
  const eligible = pool.length > 1 ? pool.filter(t => t !== last) : pool;
  return rng(eligible);
}

function cleanCondition(raw: string): string {
  return raw
    .replace(/^pre-owned\s*-\s*/i, "")
    .replace(/^new\s*-\s*/i, "New — ")
    .trim() || "Pre-owned";
}

// ══════════════════════════════════════════════════════════════════════════
// TITLE SUMMARIZATION
// ══════════════════════════════════════════════════════════════════════════

/** Smart word-boundary truncation — fallback when no API key */
function smartTruncate(title: string, maxLen = 42): string {
  if (title.length <= maxLen) return title;
  // Strip trailing codes/SKUs after | or trailing numbers
  const cleaned = title.split("|")[0].replace(/\s+\d{4,}$/, "").trim();
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > maxLen * 0.65 ? cut.slice(0, lastSpace) + "…" : cut + "…";
}

/**
 * Use Claude Haiku to batch-summarize all titles in one API call.
 * Returns titles shortened to ~35–42 chars, keeping brand + item type + key feature.
 * Falls back to smartTruncate if ANTHROPIC_API_KEY is not set.
 */
async function summarizeTitles(
  titles: string[],
  category: ProductCategory
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log("   ℹ️  No ANTHROPIC_API_KEY — using smart truncation");
    return titles.map(t => smartTruncate(t));
  }

  const client = new Anthropic({ apiKey });

  const catHints: Record<ProductCategory, string> = {
    CLOTHING:     "Keep: brand, garment type, style/color, size if present",
    ELECTRONICS:  "Keep: brand, product type, key spec or model",
    COLLECTIBLES: "Keep: item type, brand/series, key descriptor",
    HOME_GOODS:   "Keep: brand, item type, key feature or material",
  };

  const prompt =
`Shorten these eBay product titles for social media video overlays.

Rules:
- Max 42 characters per title
- ${catHints[category]}
- Drop: SKU codes, item numbers, extra conditions, store names, repeated words
- Format: "Brand ItemType – Key Feature" or "Brand ItemType Size"
- Output ONLY the shortened title, one per line, same order as input
- No dots, no quotes, no numbering in your output

Titles:
${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 300,
      messages:   [{ role: "user", content: prompt }],
    });

    const text  = response.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    const lines = text.trim()
      .split("\n")
      .map(l => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);

    if (lines.length !== titles.length) {
      console.warn(`   ⚠️  Claude returned ${lines.length} titles for ${titles.length} inputs — using fallback`);
      return titles.map(t => smartTruncate(t));
    }

    return lines.map(l => (l.length > 50 ? smartTruncate(l, 42) : l));
  } catch (err) {
    console.warn(`   ⚠️  Claude title API error: ${(err as Error).message} — using fallback`);
    return titles.map(t => smartTruncate(t));
  }
}

// ══════════════════════════════════════════════════════════════════════════
// SINGLE LISTING MODE
// Shows all store listings, user picks one, renders a product-image carousel
// using EbayProductVideo (primary + secondary angles of that one product).
// ══════════════════════════════════════════════════════════════════════════
// POST GUIDE GENERATOR
// Writes a .txt alongside every rendered video with captions + asset log.
// Uses Claude Sonnet for captions when ANTHROPIC_API_KEY is set; falls back
// to template copy so the file is always generated.
// ══════════════════════════════════════════════════════════════════════════

// ── v5.7 Chaos Engine types ────────────────────────────────────────────────
interface ChaosConfig {
  uniqSeed:    number;   // 9-digit global chaos seed, never 0
  chaosFactor: number;   // variance multiplier 0.4–1.4
  visualDna:   string;   // base archetype
  modifiers:   string[]; // 1–3 layered modifiers
}

interface GuideParams {
  mode:            "carousel" | "single";
  // Chaos Engine (optional — added in v5.7)
  chaosConfig?:    ChaosConfig;
  storeName:       string;
  // Carousel fields
  subCategory?:    string;
  listings?:       Array<{ title: string; price: number }>;
  priceMin?:       number;
  priceMax?:       number;
  // Single listing fields
  title?:          string;
  price?:          number;
  condition?:      string;
  imageCount?:     number;
  // Shared render config
  hookText:        string;
  ctaPhrase:       string;
  ctaText:         string;
  audioFile:       string;
  videoStyle:      string;
  paletteName:     string;
  accentColor:     string;
  priceAnimId:     string;
  adjective?:      string;
  category:        ProductCategory;
  totalSecs:       string;
  renderSeed:      number;
}

async function generatePostGuide(params: GuideParams): Promise<string> {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const styleDesc: Record<string, string> = {
    classic:   "clean cuts + light leaks",
    neon:      "scanlines overlay + electric glow",
    cinematic: "film grain + letterbox bars",
    split:     "VHS static + flash cuts",
  };

  const isCarousel = params.mode === "carousel";

  // ── Header ─────────────────────────────────────────────────────────────
  const headerTitle = isCarousel
    ? `${params.subCategory} CAROUSEL — ${params.storeName}`
    : `SINGLE LISTING — ${(params.title || "").slice(0, 55)}`;

  const priceDisplay = isCarousel
    ? `$${params.priceMin?.toFixed(2)} – $${params.priceMax?.toFixed(2)}`
    : `$${params.price?.toFixed(2)}`;

  const header = [
    `═══════════════════════════════════════════════════════════`,
    `VIDEO POST GUIDE`,
    `Generated: ${now}`,
    `Store:     ${params.storeName} on eBay`,
    `Mode:      ${isCarousel ? `Category Carousel · ${params.listings?.length} listings` : `Single Listing · ${params.imageCount} product images`}`,
    isCarousel ? `Category:  ${params.category} › ${params.subCategory}` : `Category:  ${params.category}`,
    `Price:     ${priceDisplay}`,
    headerTitle,
    `═══════════════════════════════════════════════════════════`,
  ].join("\n");

  // ── Libraries & Assets footer ──────────────────────────────────────────
  const footer = [
    ``,
    `═══════════════════════════════════════════════════════════`,
    `LIBRARIES & ASSETS USED IN THIS VIDEO:`,
    `  🎵 Music:        ${params.audioFile}`,
    `  🎨 Palette:      ${params.paletteName} (accent ${params.accentColor})`,
    `  🎬 Style:        ${params.videoStyle} — ${styleDesc[params.videoStyle] || params.videoStyle}`,
    `  💰 Price Anim:   ${params.priceAnimId}`,
    `  🪄 Hook:         ${params.hookText.replace(/\n/g, " ")}`,
    `  📣 CTA Phrase:   ${params.ctaPhrase}`,
    `  📣 Urgency CTA:  ${params.ctaText}`,
    params.adjective ? `  ✨ Adjective:    ${params.adjective}` : "",
    `  🎲 Render Seed:  ${params.renderSeed}`,
    `  ⏱️  Duration:     ${params.totalSecs}s`,
    ...(params.chaosConfig ? [
      ``,
      `CHAOS ENGINE (v5.7):`,
      `  🌀 UNIQ_SEED:    ${params.chaosConfig.uniqSeed}`,
      `  ⚡ CHAOS_FACTOR: ${params.chaosConfig.chaosFactor.toFixed(3)}`,
      `  🧬 Base DNA:     ${params.chaosConfig.visualDna}`,
      `  🎭 Modifiers:    ${params.chaosConfig.modifiers.join(' · ') || 'none'}`,
      `  🎞️  Per-slide:   hyper-random Ken Burns, overlays, filters enabled`,
    ] : []),
    isCarousel && params.listings?.length
      ? [``, `LISTINGS IN THIS VIDEO:`].concat(
          params.listings.map((l, i) => `  ${i + 1}. ${l.title.slice(0, 60)}  ($${l.price.toFixed(2)})`)
        ).join("\n")
      : "",
    ``,
    `POSTING TIPS:`,
    `  • Post TikTok FIRST for higher organic reach, then Instagram Reels`,
    `  • Best times: Tue–Thu 7–9pm EST  |  Sat–Sun 10am–12pm EST`,
    `  • Reply to ALL comments in the first 30 min to boost the algorithm`,
    `  • Pin your eBay store link in bio BEFORE posting`,
    `  • Use the TikTok caption + 3–5 hashtags for Instagram Stories`,
    `  • A/B test both captions — track which drives more link-in-bio clicks`,
    ``,
    `CAPTION PERFORMANCE TRACKING:`,
    `  • TikTok Analytics → Video → Traffic Source (check after 24h)`,
    `  • Instagram: Professional Dashboard → Reach → Follows from Post`,
    `  • Goal: 3–5% click-through to link-in-bio`,
    `═══════════════════════════════════════════════════════════`,
  ].filter(l => l !== "").join("\n");

  // ── Claude Sonnet captions ─────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client  = new Anthropic({ apiKey });
      const catName = params.category.toLowerCase().replace("_", " ");

      const productContext = isCarousel
        ? [
            `Store: ${params.storeName} on eBay`,
            `Video type: Category carousel — ${params.listings?.length} ${params.subCategory?.toLowerCase()} items cycling`,
            `Category: ${catName}`,
            `Price range: ${priceDisplay}`,
            `Hook: ${params.hookText.replace(/\n/g, " ")}`,
            `CTA: ${params.ctaText}`,
            `Items shown:`,
            ...(params.listings || []).map(l => `  - ${l.title} ($${l.price.toFixed(2)})`),
          ].join("\n")
        : [
            `Store: ${params.storeName} on eBay`,
            `Video type: Single product image carousel`,
            `Title: ${params.title}`,
            `Price: $${params.price?.toFixed(2)}`,
            `Condition: ${params.condition}`,
            `Category: ${catName}`,
            `Hook: ${params.hookText.replace(/\n/g, " ")}`,
            `CTA: ${params.ctaText}`,
          ].join("\n");

      const prompt = isCarousel
        ? `You are an elite social media copywriter for an eBay ${catName} reseller store called ${params.storeName}.

Video context:
${productContext}

Write two READY-TO-POST captions for this category carousel video showing multiple ${params.subCategory?.toLowerCase()} items. Be specific to the items shown — no generic filler.

INSTAGRAM CAPTION (3–4 punchy sentences):
- Open with the category/value angle (e.g. "Your next dress obsession is waiting")
- Mention the price range naturally
- Conversational but polished
- End: "Link in bio 👇"
- Then 18–22 targeted hashtags on a new line

TIKTOK CAPTION (1–2 lines max — TikTok truncates at ~150 chars):
- Ultra punchy, trend-aware, casual
- Reference the price range if it's a deal
- Then 6–8 hashtags including #fyp #ebay

Format EXACTLY as:
---INSTAGRAM---
[caption + hashtags]

---TIKTOK---
[caption + hashtags]`
        : `You are an elite social media copywriter for an eBay reseller store called ${params.storeName}.

Product:
${productContext}

Write two READY-TO-POST captions for a product image carousel (multiple angles of one item).

INSTAGRAM CAPTION (3–4 punchy sentences):
- Open with the style/value angle, not the item name
- Include price naturally mid-copy
- Conversational but polished tone
- End: "Link in bio 👇"
- Then 18–22 targeted hashtags on a new line

TIKTOK CAPTION (1–2 lines only — TikTok truncates at ~150 chars):
- Ultra punchy, trend-aware, casual
- Include price if it shocks
- Then 6–8 hashtags including #fyp #ebay

Format EXACTLY as:
---INSTAGRAM---
[caption + hashtags]

---TIKTOK---
[caption + hashtags]`;

      const response = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1200,
        messages:   [{ role: "user", content: prompt }],
      });

      const aiText = response.content
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; text: string }).text)
        .join("");

      return `${header}\n\n${aiText}\n${footer}`;
    } catch (err) {
      console.warn(`   ⚠️  Claude captions failed — using template: ${(err as Error).message}`);
    }
  }

  // ── Template fallback ──────────────────────────────────────────────────
  const s    = params.storeName;
  const cat  = (params.subCategory || params.category).toLowerCase().replace("_", " ");
  const seed = (params.title || cat).length % 3;

  const igCaptions = isCarousel ? [
    `New drops just landed at ${s} and we are not gatekeeping 🛍️ ${params.listings?.length} gorgeous ${cat} pieces, all pre-loved and priced to move. From ${priceDisplay} — shop them all via the link in bio 👇`,
    `${s} haul incoming ✨ We've got ${params.listings?.length} ${cat} picks that deserve a spot in your wardrobe. Pre-loved quality, not pre-loved prices. ${priceDisplay} range — link in bio before they're gone.`,
    `Your next ${cat} obsession is already on eBay 💫 ${params.storeName} just dropped ${params.listings?.length} curated pieces from ${priceDisplay}. Sustainable, stylish, sorted. Link in bio 👇`,
  ] : [
    `This ${cat} find at ${s} is giving everything ✨ ${(params.title || "").slice(0,50)} — ${priceDisplay} and it's still available. Pre-loved quality you won't find at the mall. Link in bio 👇`,
    `We don't gatekeep deals at ${s} 🛍️ ${priceDisplay} for this gorgeous ${cat} piece. Shop pre-loved, shop smart. Link in bio before it's gone.`,
    `Sustainable fashion never looked this good. ${(params.title || "").slice(0,50)} at ${s} for only ${priceDisplay}. Link in bio 💫`,
  ];

  const ttCaptions = isCarousel ? [
    `${params.listings?.length} ${cat} picks from ${s} and we're not okay 😭 ${priceDisplay} #ebay #thrift #fyp`,
    `POV: ${s} dropping ${cat} starting at ${priceDisplay} 👀 link in bio #ebayfinds #fashion #fyp`,
    `${s} ${cat} haul and it's giving 🔥 ${priceDisplay} #ebay #resell #thrift #fyp`,
  ] : [
    `${priceDisplay}?? ${s} really said less is more 😭 #ebay #thriftfinds #fyp`,
    `POV: you found this at ${s} for ${priceDisplay} 👀 link in bio #ebayfinds #thrift #fashion`,
    `${s} dropping ${cat} for ${priceDisplay} and I can't 🔥 #ebay #resell #fyp`,
  ];

  const igHashtags = [
    `#${s.toLowerCase().replace(/\s/g,"")} #ebay #ebayfinds #thriftedstyle #secondhandfashion`,
    `#preloved #sustainablefashion #resale #vintagestyle #consignmentshop`,
    `#ootd #fashionfinds #dealoftheday #shopsmall #thrift`,
    `#${cat.replace(/\s/g,"")}fashion #${cat.replace(/\s/g,"")}style`,
  ].join(" ");
  const ttHashtags = `#fyp #ebay #ebayfinds #thrift #${cat.replace(/\s/g,"")} #fashion #resell`;

  const templateCaptions = `---INSTAGRAM---\n${igCaptions[seed]}\n\n${igHashtags}\n\n---TIKTOK---\n${ttCaptions[seed]}\n\n${ttHashtags}`;
  return `${header}\n\n${templateCaptions}\n${footer}`;
}

// ══════════════════════════════════════════════════════════════════════════
async function runSingleListingMode(allRows: ListingRow[], outputDir: string) {
  console.log(`\n🖼️  Single Listing Mode — product image carousel\n`);

  if (!allRows.length) {
    console.error("❌ No listings available to choose from"); process.exit(1);
  }

  // ── Optional: filter by --sub=DRESSES before showing menu ────────────
  const subFilter = (args.sub as string | undefined);
  let rows = allRows;
  if (subFilter) {
    const key = subFilter.toUpperCase().replace(/ /g, "_");
    rows = allRows.filter(r => {
      const sub = detectSubCategory(r.title, r.categoryName, detectCategory(r.title, r.categoryName));
      return sub === key;
    });
    if (!rows.length) {
      console.warn(`⚠️  No listings matched --sub=${key}, showing all ${allRows.length} listings`);
      rows = allRows;
    } else {
      console.log(`   Filtered to ${rows.length} listings matching --sub=${key}\n`);
    }
  }

  // ── Non-interactive pick via --pick=random or --pick=N ────────────────
  let chosen: ListingRow | undefined;
  const pick = pickFlag;
  if (pick) {
    if (pick === "random") {
      chosen = rows[Math.floor(Math.random() * rows.length)];
      console.log(`   🎲 Auto-pick (--pick=random): "${chosen.title.slice(0, 70)}"`);
    } else {
      const idx = parseInt(pick) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < rows.length) {
        chosen = rows[idx];
        console.log(`   🎯 Auto-pick (--pick=${pick}): "${chosen.title.slice(0, 70)}"`);
      } else {
        console.error(`❌ --pick=${pick} out of range (1–${rows.length})`); process.exit(1);
      }
    }
  }

  // ── Interactive menu (when --pick not set) ────────────────────────────
  if (!chosen) {
    const PAGE = 20;
    const totalPages = Math.ceil(rows.length / PAGE);
    let page = 0;

    while (!chosen) {
      const slice = rows.slice(page * PAGE, (page + 1) * PAGE);
      console.log(`┌─────┬───────────────────────────────────────────────┬─────────┐`);
      console.log(`│  #  │  Title                                        │  Price  │`);
      console.log(`├─────┼───────────────────────────────────────────────┼─────────┤`);
      slice.forEach((row, i) => {
        const num   = String(page * PAGE + i + 1).padStart(3);
        const title = row.title.slice(0, 45).padEnd(45);
        const price = (`$${parseFloat(row.price || "0").toFixed(2)}`).padStart(7);
        console.log(`│ ${num} │  ${title}│ ${price} │`);
      });
      console.log(`└─────┴───────────────────────────────────────────────┴─────────┘`);
      if (totalPages > 1) {
        console.log(`   Page ${page + 1}/${totalPages} · showing ${page * PAGE + 1}–${Math.min((page + 1) * PAGE, rows.length)} of ${rows.length}`);
      }
      const hint = totalPages > 1
        ? `Enter number, "n" next page, "p" prev page: `
        : `Choose a listing [1–${rows.length}]: `;
      const answer = (await prompt(hint)).trim().toLowerCase();
      if (answer === "n" && page < totalPages - 1)  { page++; continue; }
      if (answer === "p" && page > 0)               { page--; continue; }
      const idx = parseInt(answer) - 1;
      if (isNaN(idx) || idx < 0 || idx >= rows.length) {
        console.log(`   ⚠️  Invalid — enter a number between 1 and ${rows.length}`);
        continue;
      }
      chosen = rows[idx];
    }
  }

  console.log(`\n✅ Selected: "${chosen.title.slice(0, 70)}"`);
  console.log(`   Price: $${parseFloat(chosen.price || "0").toFixed(2)} · ${chosen.condition || "Pre-owned"}\n`);

  // Fetch all images (primary + secondary)
  console.log(`🔍 Fetching all product images...`);
  const imageUrls = await fetchAllImages(chosen.title);

  if (!imageUrls.length) {
    console.error("❌ No images found for this listing — try a different one"); process.exit(1);
  }

  // Cap at 4 images — Gallery scene = 210 frames, so 4 × 52 frames = 1.7s each.
  // More than 4 and the viewer can't properly see each angle before it cuts.
  // (Cross-fade math also requires ≥21 frames/image: 52-12=40 > 8 ✓)
  const cappedUrls = imageUrls.slice(0, 4);
  if (imageUrls.length > 4) {
    console.log(`   Found ${imageUrls.length} images — using best 4 (1.7s each)`);
  } else {
    console.log(`   Found ${cappedUrls.length} image${cappedUrls.length !== 1 ? "s" : ""}`);
  }
  cappedUrls.forEach((url, i) => console.log(`   ${i + 1}. ${url.slice(-60)}`));

  if (cappedUrls.length === 1) {
    console.warn(`\n   ⚠️  Only 1 image found. eBay may not have secondary images for this listing.`);
    console.warn(`   The video will still render but won't cycle through multiple angles.\n`);
  }

  // Summarize title
  console.log(`\n✏️  Summarizing title...`);
  const [shortTitle] = await summarizeTitles([chosen.title],
    detectCategory(chosen.title, chosen.categoryName));
  if (shortTitle !== chosen.title) {
    console.log(`   "${chosen.title.slice(0, 55)}…"`);
    console.log(`   → "${shortTitle}"`);
  }

  // Randomize video config
  const category      = detectCategory(chosen.title, chosen.categoryName);
  const renderSeed    = Math.floor(Math.random() * 9999);
  const paletteName   = rng(CATEGORY_PALETTES[category]);
  const palette       = { name: paletteName, ...ALL_PALETTES[paletteName] };
  const videoStyle    = rng(CATEGORY_STYLES[category]);
  const available      = getMusicFiles();
  const preferred      = CATEGORY_MUSIC[category].filter(f => available.includes(f));
  const audioTrack     = pickTrack(preferred.length ? preferred : available);
  const audioStartFrom = pickAudioStartFrom(audioTrack);
  const hookText      = rng(CATEGORY_HOOKS[category]);
  const ctaPhrase     = rng(CATEGORY_CTA_PHRASES[category]);
  const ctaText       = rng(URGENCY_CTA);
  const priceAnimId   = rng(PRICE_ANIMATION_IDS);

  console.log(`\n🎲 Randomization (seed: ${renderSeed}):`);
  console.log(`   Palette     ${palette.name.padEnd(14)} · Style: ${videoStyle}`);
  console.log(`   Audio       ${audioTrack}  (offset: ${audioStartFrom}f = ${(audioStartFrom/30).toFixed(1)}s)`);
  console.log(`   Price anim  ${priceAnimId}`);
  console.log(`   Hook        "${hookText.replace(/\n/g, " ")}"`);

  const fpi         = Math.floor(210 / cappedUrls.length);
  const totalFrames = 510 + 30;
  console.log(`\n📐 EbayProductVideo · ${cappedUrls.length} images`);
  console.log(`   Image 1: ${((fpi + 30) / 30).toFixed(1)}s  (hook hold) · Images 2–${cappedUrls.length}: ${(fpi / 30).toFixed(1)}s each`);
  console.log(`   Total: ${totalFrames} frames = ${(totalFrames / 30).toFixed(1)}s\n`);

  // Build EbayProductVideo props
  const props = {
    storeName,
    platform:         "tiktok" as const,
    title:            shortTitle,
    price:            parseFloat(chosen.price || "0") || 0,
    currency:         "USD",
    condition:        cleanCondition(chosen.condition),
    brand:            "",
    size:             "",
    imageUrls:        cappedUrls,
    audioFile:        `music/${audioTrack}`,
    hook:             hookText,
    ctaText,
    accentColor:      palette.accent,
    bgColor:          palette.bg,
    categoryName:     chosen.categoryName || "",
    videoStyle,
    transitionMp4:    "",
    renderSeed,
    priceAnimationId:       priceAnimId,
    ctaPhrase,
    firstImageExtraFrames:  30,
    audioStartFrom,
  };

  const titleSlug  = shortTitle.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 35);
  const timestamp  = new Date().toISOString().slice(11, 19).replace(/:/g, "");
  const outFile    = path.join(outputDir, `${storeName}-single-${titleSlug}-${timestamp}.mp4`);
  const propsFile  = path.join(outputDir, `.props-single-${timestamp}.json`);

  writeFileSync(propsFile, JSON.stringify(props, null, 2));
  console.log(`🎬 Rendering: ${path.basename(outFile)}`);

  execSync(
    `npx remotion render src/index.ts EbayProductVideo --output=${outFile} --props=${propsFile}`,
    { stdio: "inherit", cwd: process.cwd() }
  );

  try { require("fs").unlinkSync(propsFile); } catch {}
  saveLastTrack(audioTrack);

  // ── Post guide txt ────────────────────────────────────────────────────
  const guideFile = outFile.replace(/\.mp4$/, ".txt");
  console.log(`\n✍️  Generating post guide...`);
  const guide = await generatePostGuide({
    mode:        "single",
    storeName,
    title:       shortTitle,
    price:       parseFloat(chosen.price || "0") || 0,
    condition:   cleanCondition(chosen.condition),
    imageCount:  cappedUrls.length,
    hookText,
    ctaPhrase,
    ctaText,
    audioFile:   `music/${audioTrack}`,
    videoStyle,
    paletteName: palette.name,
    accentColor: palette.accent,
    priceAnimId: priceAnimId,
    category:    detectCategory(chosen.title, chosen.categoryName),
    totalSecs:   (540 / 30).toFixed(1),
    renderSeed,
  });
  writeFileSync(guideFile, guide);
  console.log(`   ✅ ${path.basename(guideFile)}`);

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║ ✅  Done: ${path.basename(outFile).padEnd(46)}║`);
  console.log(`║    ${(`${cappedUrls.length} images · 17s · ${palette.name} · ${audioTrack}`).slice(0, 50).padEnd(50)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║   CATEGORY CAROUSEL RENDERER — ${storeName.padEnd(26)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── Determine mode ─────────────────────────────────────────────────────
  const csvFile = findCsvFile();
  let mode: "api" | "csv";

  if (modeFlag === "csv") {
    if (!csvFile) { console.error("❌ --mode=csv specified but no CSV found in data/"); process.exit(1); }
    mode = "csv";
    console.log(`📄 Mode: CSV  (--mode=csv · ${path.basename(csvFile!)})\n`);
  } else {
    mode = "api";
    console.log(`📡 Mode: eBay Browse API  (default)\n`);
  }

  // ── Fetch listings ─────────────────────────────────────────────────────
  let allRows: ListingRow[];

  if (mode === "api") {
    console.log(`🔍 Fetching listings for seller "${storeName}" from eBay...`);
    allRows = await fetchStoreListingsAPI(storeName);
    if (allRows.length === 0) {
      console.error(`❌ No listings found for seller "${storeName}" on eBay`);
      process.exit(1);
    }
    console.log(`   ${allRows.length} unique listings retrieved\n`);
  } else {
    console.log(`📄 Reading: ${path.basename(csvFile!)}`);
    allRows = parseCsv(csvFile!);
    console.log(`   ${allRows.length} listings found\n`);
  }

  // ── Single listing mode — branch before category grouping ─────────────
  if ("listing" in args) {
    await runSingleListingMode(allRows, OUTPUT_DIR);
    return;
  }

  // ── Group by broad category, then sub-category ────────────────────────
  const broadGroups: Record<ProductCategory, ListingRow[]> = {
    CLOTHING: [], ELECTRONICS: [], COLLECTIBLES: [], HOME_GOODS: [],
  };
  for (const row of allRows) {
    const cat = detectCategory(row.title, row.categoryName);
    broadGroups[cat].push(row);
  }

  console.log(`📦 Broad category breakdown:`);
  (Object.entries(broadGroups) as [ProductCategory, ListingRow[]][]).forEach(([cat, rows]) => {
    if (rows.length) console.log(`   ${cat.padEnd(14)}: ${rows.length} listings`);
  });

  // Sub-categorize within the target broad category
  const broadGroup = broadGroups[targetCategory];
  if (broadGroup.length < 2) {
    console.error(`❌ ${targetCategory} only has ${broadGroup.length} listing(s) — need at least 2`);
    process.exit(1);
  }

  const subGroups: Record<string, ListingRow[]> = {};
  for (const row of broadGroup) {
    const sub = detectSubCategory(row.title, row.categoryName, targetCategory);
    if (!subGroups[sub]) subGroups[sub] = [];
    subGroups[sub].push(row);
  }

  // Sort: most listings first
  const subEntries = Object.entries(subGroups).sort((a, b) => b[1].length - a[1].length);
  const viableEntries = subEntries.filter(([, r]) => r.length >= 2);

  // ── Print numbered sub-category menu ─────────────────────────────────
  console.log(`\n┌─────────────────────────────────────────────────────────┐`);
  console.log(`│  ${targetCategory} sub-categories in ${storeName.padEnd(35)}│`);
  console.log(`├─────┬───────────────────────┬───────────────────────────┤`);
  console.log(`│  #  │  Sub-category         │  Listings                 │`);
  console.log(`├─────┼───────────────────────┼───────────────────────────┤`);
  subEntries.forEach(([sub, rows], i) => {
    const num      = String(i + 1).padStart(3);
    const subName  = sub.replace(/_/g, " ").padEnd(21);
    const count    = `${rows.length} listing${rows.length !== 1 ? "s" : ""}`.padEnd(25);
    const viable   = rows.length >= 2 ? "" : "  (skip — < 2)";
    console.log(`│ ${num} │  ${subName}│  ${count}│${viable}`);
  });
  console.log(`└─────┴───────────────────────┴───────────────────────────┘`);

  // ── Resolve chosen sub-category ───────────────────────────────────────
  const subArg = args.sub as string | undefined;
  let chosenSub: string;
  let chosenGroup: ListingRow[];

  if (subArg) {
    // --sub=DRESSES passed — skip prompt
    const key = subArg.toUpperCase().replace(/ /g, "_");
    if (!subGroups[key]) {
      console.error(`\n❌ Sub-category "${key}" not found. Valid options: ${subEntries.map(([s]) => s).join(", ")}`);
      process.exit(1);
    }
    chosenSub   = key;
    chosenGroup = subGroups[key];
    console.log(`\n✅ Using --sub=${chosenSub} (${chosenGroup.length} listings)\n`);
  } else {
    // Interactive prompt — ask user to pick or press Enter for random
    const answer = await prompt(
      `\nChoose a sub-category [1–${subEntries.length}], or press Enter to pick randomly: `
    );

    if (answer.trim() === "") {
      // Random from viable (≥2 listings)
      if (!viableEntries.length) {
        console.error("❌ No sub-category has 2+ listings");
        process.exit(1);
      }
      [chosenSub, chosenGroup] = viableEntries[Math.floor(Math.random() * viableEntries.length)];
      console.log(`\n🎲 Randomly picked: ${chosenSub}\n`);
    } else {
      const idx = parseInt(answer.trim()) - 1;
      if (isNaN(idx) || idx < 0 || idx >= subEntries.length) {
        console.error(`❌ Invalid choice "${answer.trim()}" — enter a number between 1 and ${subEntries.length}`);
        process.exit(1);
      }
      [chosenSub, chosenGroup] = subEntries[idx];
      if (chosenGroup.length < 2) {
        console.error(`❌ "${chosenSub}" only has ${chosenGroup.length} listing — need at least 2`);
        process.exit(1);
      }
      console.log(`\n✅ Selected: ${chosenSub} (${chosenGroup.length} listings)\n`);
    }
  }

  // Randomly pick count between 3 and min(5, available), respecting --max override
  const maxCount = Math.min(5, chosenGroup.length, maxListings);
  const minCount = Math.min(3, maxListings); // respect --max flag (--max=2 → minCount=2)
  const count    = maxCount >= minCount
    ? minCount + Math.floor(Math.random() * (maxCount - minCount + 1))
    : Math.min(maxListings, chosenGroup.length); // fallback honours --max, not all listings

  // Shuffle so different listings appear each run
  const shuffled = [...chosenGroup].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  console.log(`🎯 Randomly selected ${selected.length} from ${chosenSub}:`);
  selected.forEach((r, i) => console.log(`   ${i + 1}. ${r.title.slice(0, 72)}`));
  console.log();

  // ── Fetch images if CSV mode (API mode already has them) ───────────────
  if (mode === "csv") {
    console.log(`🔍 Fetching hero images via Railway API...`);
  }
  const products: Array<{ itemId: string; title: string; price: number; currency: string; imageUrl: string; condition: string }> = [];
  for (let i = 0; i < selected.length; i++) {
    const row = selected[i];
    let imageUrl = row.heroImageUrl || "";
    if (!imageUrl) {
      process.stdout.write(`   [${i + 1}/${selected.length}] ${row.title.slice(0, 52)}... `);
      imageUrl = await fetchHeroImage(row.title);
      process.stdout.write(imageUrl ? "✅\n" : "⚠️  (no image)\n");
    }
    products.push({
      itemId:    row.itemNumber || `item-${i}`,
      title:     row.title,
      price:     parseFloat(row.price) || 25,
      currency:  "USD",
      imageUrl,
      condition: cleanCondition(row.condition),
    });
  }

  // ── Summarize titles with Claude Haiku ───────────────────────────────
  console.log(`\n✏️  Summarizing titles with Claude...`);
  const rawTitles      = products.map(p => p.title);
  const shortTitles    = await summarizeTitles(rawTitles, targetCategory);
  shortTitles.forEach((short, i) => {
    const orig = rawTitles[i];
    const changed = short !== orig;
    console.log(`   ${i + 1}. ${changed ? `"${orig.slice(0, 50)}${orig.length > 50 ? "…" : ""}"` : "(unchanged)"}`);
    if (changed) console.log(`      → "${short}"`);
    products[i].title = short;
  });

  // ══════════════════════════════════════════════════════════════════════
  // RANDOMIZATION — per-section independent libraries (v5.1)
  // Every section (hook, carousel, price, details, CTA) picks its own
  // accent color independently. No two adjacent sections share a palette.
  // ══════════════════════════════════════════════════════════════════════
  const renderSeed = Math.floor(Math.random() * 9999);

  // ── Per-section palette picker — no adjacent duplicates ─────────────
  // Picks N palettes from the category pool ensuring each differs from its neighbor.
  function pickSectionPalettes(n: number): Array<{ name: PaletteName; bg: string; accent: string }> {
    const pool = CATEGORY_PALETTES[targetCategory] as readonly PaletteName[];
    const result: Array<{ name: PaletteName; bg: string; accent: string }> = [];
    let lastPick: PaletteName | null = null;
    for (let i = 0; i < n; i++) {
      const eligible = pool.filter(p => p !== lastPick);
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      result.push({ name: pick, ...ALL_PALETTES[pick] });
      lastPick = pick;
    }
    return result;
  }

  // 5 independent section palettes: [hook, carousel, price, details, cta]
  const sectionPalettes = pickSectionPalettes(5);
  const [hookPalette, carouselPalette, pricePalette, detailsPalette, ctaPalette] = sectionPalettes;

  // Global palette = carousel section (drives bgColor and the fallback accentColor)
  const palette = carouselPalette;

  // Video style — category-preferred pool
  const videoStyle    = rng(CATEGORY_STYLES[targetCategory]);

  // Audio — category energy-matched, guaranteed different from last render
  const available      = getMusicFiles();
  const preferred      = CATEGORY_MUSIC[targetCategory].filter(f => available.includes(f));
  const audioTrack     = pickTrack(preferred.length ? preferred : available);
  const audioFile      = `music/${audioTrack}`;
  const audioStartFrom = pickAudioStartFrom(audioTrack);

  // Hook text — seasonal sale text takes priority when --season is set
  const hookText = seasonFlag
    ? rng(SEASONAL_HOOKS[seasonFlag])
    : rng(CATEGORY_HOOKS[targetCategory]);

  // CTA phrase
  const ctaPhrase     = rng(CATEGORY_CTA_PHRASES[targetCategory]);

  // Urgency CTA text (bottom of CTA scene)
  const ctaText       = rng(URGENCY_CTA);

  // Price animation — 4 range-display styles
  const priceAnimationId = rng(PRICE_ANIMATION_IDS);

  // Price card layout — 4 visual styles (card is weighted 2× — most readable on mobile)
  const PRICE_CARD_STYLES = ["card", "card", "fullscreen", "minimal", "banner"] as const;
  const priceCardStyle    = rng(PRICE_CARD_STYLES);

  // Price subtext — only phrases that are ALWAYS true regardless of listing/seller.
  // Never claim shipping speed, return policy, or seller ratings we can't verify.
  // eBay Buyer Protection IS a platform-level guarantee on all purchases — safe to use.
  const PRICE_SUBTEXTS = [
    `Shop ${storeName} on eBay`,           // always true — store exists on eBay
    "Available Now · Limited Quantities",  // always true — reseller inventory is finite
    "eBay Buyer Protection Included",      // always true — eBay platform guarantee
    "Tap the Link in Bio to Shop",         // always true — it's a CTA
    `More Finds at ${storeName}`,          // always true
    "Browse the Full Collection",          // always true
    "On eBay Now · Link in Bio",           // always true
    `All from ${storeName}`,               // always true
  ] as const;
  const priceSubtext = rng(PRICE_SUBTEXTS);

  // Detail adjective — category-matched
  const detailAdjective = rng(ADJECTIVES[targetCategory]);

  // Hook Scene libraries — 3 independent picks
  const HOOK_TEXT_ANIMS  = ["scale-slam","word-drop","slide-up","glitch-in","fade-pop"] as const;
  const HOOK_BG_EFFECTS  = ["radial-glow","pulse-rings","corner-flash","diagonal-slash","grid-dots"] as const;
  const HOOK_FONT_STYLES = ["white-solid","accent-fill","white-glow","outline","large-spread"] as const;
  const hookTextAnim  = rng(HOOK_TEXT_ANIMS);
  const hookBgEffect  = rng(HOOK_BG_EFFECTS);
  const hookFontStyle = rng(HOOK_FONT_STYLES);

  // CTA layout variety — 3 structural options
  const CTA_LAYOUTS = ["stacked", "stacked", "left-punch", "minimal"] as const; // stacked weighted 2×
  const ctaLayout = rng(CTA_LAYOUTS);

  // CTA spring style — controls storeName entrance physics
  const CTA_SPRING_STYLES = ["snappy", "snappy", "bouncy", "smooth"] as const;
  const ctaSpringStyle = rng(CTA_SPRING_STYLES);

  // ════════════════════════════════════════════════════════════════════════
  // v5.7 CHAOS ENGINE — maximum uniqueness per render
  // ════════════════════════════════════════════════════════════════════════

  // 1. Global chaos seed — 9-digit, never 0, drives all deterministic picks
  const uniqSeed: number = Math.floor(Math.random() * 999999999) + 1;

  // 2. Chaos factor — variance multiplier applied to seeded calculations
  const chaosFactor: number = Math.random() * 1.0 + 0.4; // 0.4–1.4

  // 3. DNA — 12 archetypes (8 original + 4 new), category-weighted for fit
  const DNA_BY_CATEGORY: Record<ProductCategory, readonly string[]> = {
    CLOTHING:     ['viral-raw', 'viral-raw', 'streetwear', 'neon-club', 'editorial',
                   'luxury', 'magazine', 'documentary', 'cinematic',
                   'grunge-drop', 'baroque', 'y2k-glitch'],
    ELECTRONICS:  ['neon-club', 'viral-raw', 'cinematic', 'streetwear', 'editorial',
                   'documentary', 'magazine', 'minimal-tech', 'y2k-glitch', 'grunge-drop'],
    COLLECTIBLES: ['cinematic', 'documentary', 'editorial', 'luxury', 'magazine',
                   'viral-raw', 'streetwear', 'baroque', 'minimal-tech'],
    HOME_GOODS:   ['magazine', 'editorial', 'documentary', 'luxury', 'cinematic',
                   'viral-raw', 'minimal-tech', 'baroque'],
  };
  const dnaPool   = DNA_BY_CATEGORY[targetCategory];
  // Use Remotion's deterministic random() keyed by uniqSeed for reproducibility
  const visualDna = dnaPool[Math.floor(random(`dna-${uniqSeed}`) * dnaPool.length)];

  // 4. Modifiers — 1–3 layered on top of base DNA (weighted toward 2)
  const MODIFIERS_POOL = [
    'high-contrast', 'soft-glow', 'vintage-film', 'aggressive-zoom',
    'dark-mode-only', 'maximalist', 'subtle', 'glitch-core',
    'pastel-pop', 'metallic-glam', 'office-siren', 'whimsy-goth',
  ] as const;
  const numModifiers = Math.min(3, Math.floor(random(`modcount-${uniqSeed}`) * 3.5) + 1); // 1–3
  const modifiers: string[] = [];
  for (let mi = 0; mi < numModifiers; mi++) {
    const mod = MODIFIERS_POOL[Math.floor(random(`mod-${uniqSeed}-${mi}`) * MODIFIERS_POOL.length)];
    if (!modifiers.includes(mod)) modifiers.push(mod);
  }

  // 5. Uniqueness guardrail — re-roll if too similar to last 3 renders
  const recentTxts = (() => {
    try {
      return readdirSync(OUTPUT_DIR)
        .filter(f => f.endsWith(".txt"))
        .sort((a, b) => statSync(path.join(OUTPUT_DIR, b)).mtimeMs - statSync(path.join(OUTPUT_DIR, a)).mtimeMs)
        .slice(0, 3);
    } catch { return []; }
  })();

  let uniquenessRerolled = false;
  for (const txtFile of recentTxts) {
    try {
      const content = readFileSync(path.join(OUTPUT_DIR, txtFile), "utf8");
      const sameDna = content.includes(`Base DNA: ${visualDna}`);
      const sharedMods = modifiers.filter(m => content.includes(m));
      if (sameDna && sharedMods.length >= 2) {
        uniquenessRerolled = true;
        // Re-roll modifiers with a shifted seed
        modifiers.length = 0;
        const rerollSeed = uniqSeed + 7919; // prime shift
        for (let mi = 0; mi < numModifiers; mi++) {
          const mod = MODIFIERS_POOL[Math.floor(random(`reroll-${rerollSeed}-${mi}`) * MODIFIERS_POOL.length)];
          if (!modifiers.includes(mod)) modifiers.push(mod);
        }
        break;
      }
    } catch { /* skip unreadable files */ }
  }
  if (uniquenessRerolled) {
    console.warn(`🔄 Uniqueness re-roll triggered (similar to recent render)`);
  }

  // Scene flash — transition overlay between major scenes
  const SCENE_FLASHES = ["none","none","none","white","black","accent"] as const;
  const sceneFlash    = rng(SCENE_FLASHES); // weighted toward "none" — flash is high-impact, use sparingly

  // Per-product transition type within the carousel
  const PRODUCT_TRANSITIONS = ["leak","leak","leak","fade","flash","mixed"] as const;
  const productTransition   = rng(PRODUCT_TRANSITIONS); // weighted toward leak (original quality)

  // Body font — varied per render from ui-ux-pro-max typography pairings
  // Bold Statement pairing: Bebas Neue + (source sans, but we use Inter/Montserrat/Poppins/Raleway)
  const BODY_FONTS = ["inter","inter","montserrat","poppins","raleway"] as const;
  const bodyFont   = rng(BODY_FONTS); // weighted toward inter (most legible on mobile)

  // Light-leak seeds vary per cut via renderSeed — handled inside CategoryCarousel.tsx
  // Each cut: seed = ((renderSeed + i*13 + 7) % 20) + 1, hue = ((renderSeed*37 + i*73) % 360)

  const framesPerProduct = calcFramesPerProduct(products.length);
  const bounds           = getFrameBounds(products.length, framesPerProduct);
  const totalFrames      = bounds.TOTAL;
  const totalSecs        = (totalFrames / 30).toFixed(1);

  console.log(`\n🎲 Per-section randomization (seed: ${renderSeed}):`);
  console.log(`   ┌─────────────┬────────────────┬──────────────┐`);
  console.log(`   │ Section     │ Palette        │ Accent       │`);
  console.log(`   ├─────────────┼────────────────┼──────────────┤`);
  console.log(`   │ Hook        │ ${hookPalette.name.padEnd(14)} │ ${hookPalette.accent.padEnd(12)} │`);
  console.log(`   │ Carousel    │ ${carouselPalette.name.padEnd(14)} │ ${carouselPalette.accent.padEnd(12)} │`);
  console.log(`   │ Price       │ ${pricePalette.name.padEnd(14)} │ ${pricePalette.accent.padEnd(12)} │`);
  console.log(`   │ Details     │ ${detailsPalette.name.padEnd(14)} │ ${detailsPalette.accent.padEnd(12)} │`);
  console.log(`   │ CTA         │ ${ctaPalette.name.padEnd(14)} │ ${ctaPalette.accent.padEnd(12)} │`);
  console.log(`   └─────────────┴────────────────┴──────────────┘`);
  console.log(`   Video style      ${videoStyle}`);
  const lastUsed = getLastTrack();
  const noRepeatNote = lastUsed ? ` · excluded: ${lastUsed}` : " · (first render)";
  console.log(`   Audio            ${audioTrack} [${CATEGORY_MUSIC[targetCategory].length} tracks${noRepeatNote}]`);
  console.log(`   Audio offset     ${audioStartFrom}f = ${(audioStartFrom/30).toFixed(1)}s (skips intro)`);
  console.log(`   Price anim       ${priceAnimationId}  [${PRICE_ANIMATION_IDS.join(" | ")}]`);
  console.log(`   Price card       ${priceCardStyle}  [${[...new Set(PRICE_CARD_STYLES)].join(" | ")}]`);
  console.log(`   Price subtext    "${priceSubtext}"`);
  console.log(`   Adjective        ${detailAdjective}`);
  console.log(`   CTA phrase       "${ctaPhrase}"`);
  console.log(`   Urgency CTA      "${ctaText}"`);
  console.log(`   Hook             "${hookText.replace(/\n/g, " ")}"`);
  console.log(`   Scene flash      ${sceneFlash}  [${SCENE_FLASHES.filter((v,i,a)=>a.indexOf(v)===i).join(" | ")}]`);
  console.log(`   Product tx       ${productTransition}  [${PRODUCT_TRANSITIONS.filter((v,i,a)=>a.indexOf(v)===i).join(" | ")}]`);
  console.log(`   Body font        ${bodyFont}  [${BODY_FONTS.filter((v,i,a)=>a.indexOf(v)===i).join(" | ")}]`);
  console.log(`   Hook text anim   ${hookTextAnim}  [${HOOK_TEXT_ANIMS.join(" | ")}]`);
  console.log(`   Hook bg effect   ${hookBgEffect}  [${HOOK_BG_EFFECTS.join(" | ")}]`);
  console.log(`   Hook font style  ${hookFontStyle}  [${HOOK_FONT_STYLES.join(" | ")}]`);
  console.log(`   CTA layout      ${ctaLayout}  [${[...new Set(CTA_LAYOUTS)].join(" | ")}]`);
  console.log(`   CTA spring      ${ctaSpringStyle}  [${[...new Set(CTA_SPRING_STYLES)].join(" | ")}]`);
  console.log(`   🧬 Visual DNA     ${visualDna}  [base archetype]`);
  console.log(`   🎭 Modifiers      ${modifiers.join(' · ') || 'none'}`);
  console.log(`   🌀 UNIQ_SEED      ${uniqSeed}  |  CHAOS_FACTOR: ${chaosFactor.toFixed(3)}`);
  if (uniquenessRerolled) console.log(`   🔄 Uniqueness re-roll applied`);
  if (seasonFlag) console.log(`   🍂 Season         ${seasonFlag} sale template`);

  console.log(`\n📐 Duration: ${totalFrames} frames = ${totalSecs}s @ 30fps`);
  console.log(`   HOOK(90) + CAROUSEL(${products.length}×${framesPerProduct}=${products.length * framesPerProduct}) + PRICE(60) + DETAILS(60) + CTA(90)`);
  console.log(`   Sub-category: ${chosenSub} · ${products.length} listings · ${framesPerProduct / 30}s each\n`);

  // ── Render ─────────────────────────────────────────────────────────────
  const props = {
    storeName,
    category:            targetCategory,
    products,
    hookText,
    audioFile,
    accentColor:         palette.accent,
    bgColor:             palette.bg,
    videoStyle,
    renderSeed,
    ctaPhrase,
    ctaText,
    priceAnimationId,
    priceCardStyle,
    priceSubtext,
    detailAdjective,
    framesPerProduct,
    audioStartFrom,
    hookTextAnim,
    hookBgEffect,
    hookFontStyle,
    // Per-section accent colors — each section independently randomized
    hookAccentColor:     hookPalette.accent,
    carouselAccentColor: carouselPalette.accent,
    priceAccentColor:    pricePalette.accent,
    detailsAccentColor:  detailsPalette.accent,
    ctaAccentColor:      ctaPalette.accent,
    // New v5.1 dimensions
    sceneFlash,
    productTransition,
    bodyFont,
    // New v5.3 dimensions
    ctaLayout,
    ctaSpringStyle,
    // Visual DNA + v5.7 Chaos Engine
    visualDna,
    modifiers,
    uniqSeed,
    chaosFactor,
    ...(seasonFlag ? { season: seasonFlag } : {}),
  };

  const categorySlug = targetCategory.toLowerCase().replace("_", "-");
  const timestamp    = new Date().toISOString().slice(11, 19).replace(/:/g, "");
  const outFile      = path.join(OUTPUT_DIR, `${storeName}-${categorySlug}-${timestamp}.mp4`);
  const propsFile    = path.join(OUTPUT_DIR, `.props-carousel-${timestamp}.json`);

  writeFileSync(propsFile, JSON.stringify(props, null, 2));

  console.log(`🎬 Rendering: ${path.basename(outFile)}`);

  execSync(
    `npx remotion render src/index.ts CategoryCarousel --output=${outFile} --props=${propsFile}`,
    { stdio: "inherit", cwd: process.cwd() }
  );

  try { require("fs").unlinkSync(propsFile); } catch {}
  saveLastTrack(audioTrack);

  // ── Post guide txt ────────────────────────────────────────────────────
  const guideFile = outFile.replace(/\.mp4$/, ".txt");
  console.log(`\n✍️  Generating post guide...`);
  const guide = await generatePostGuide({
    mode:        "carousel",
    storeName,
    subCategory: chosenSub,
    listings:    products.map(p => ({ title: p.title, price: p.price })),
    priceMin:    Math.min(...products.map(p => p.price)),
    priceMax:    Math.max(...products.map(p => p.price)),
    hookText,
    ctaPhrase,
    ctaText,
    audioFile:   `music/${audioTrack}`,
    videoStyle,
    paletteName: palette.name,
    accentColor: palette.accent,
    priceAnimId: priceAnimationId,
    adjective:   detailAdjective,
    category:    targetCategory,
    totalSecs,
    renderSeed,
    chaosConfig: { uniqSeed, chaosFactor, visualDna, modifiers },
  });
  writeFileSync(guideFile, guide);
  console.log(`   ✅ ${path.basename(guideFile)}`);

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║ ✅  Done: ${path.basename(outFile).padEnd(46)}║`);
  console.log(`║    ${(`${products.length} listings · ${totalSecs}s · ${palette.name} · ${audioTrack}`).slice(0, 50).padEnd(50)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
}

main().catch(err => { console.error("\nFatal:", err.message); process.exit(1); });
