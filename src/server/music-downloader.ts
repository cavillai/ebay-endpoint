/**
 * Pixabay Music Downloader
 * Sources and downloads royalty-free tracks before rendering.
 * API docs: https://pixabay.com/api/docs/#api_music
 */

import fs from "fs";
import https from "https";
import http from "http";
import path from "path";

const PIXABAY_API = "https://pixabay.com/api/music/";
const MUSIC_DIR = path.join(process.cwd(), "public", "music");

export interface PixabayTrack {
  id: number;
  title: string;
  duration: number;
  bpm: number | null;
  audio: { url: string; size: number };
  tags: string;
  genre: string;
}

interface PixabayResponse {
  totalHits: number;
  hits: PixabayTrack[];
}

// Music categories we need
export const MUSIC_CATALOG = {
  "energetic.mp3": {
    label: "High Energy Hook",
    genre: "electronic",
    keywords: "energetic upbeat fast",
    bpmMin: 100,
    bpmMax: 130,
    maxDuration: 60,
  },
  "chill.mp3": {
    label: "Smooth Product Reveal",
    genre: "ambient",
    keywords: "chill smooth relaxing",
    bpmMin: 70,
    bpmMax: 90,
    maxDuration: 60,
  },
  "hype.mp3": {
    label: "Price Reveal & CTA",
    genre: "hip-hop",
    keywords: "hype trap beats",
    bpmMin: 100,
    bpmMax: 130,
    maxDuration: 60,
  },
} as const;

export type MusicFile = keyof typeof MUSIC_CATALOG;

/**
 * Search Pixabay for music tracks
 */
async function searchPixabay(
  apiKey: string,
  genre: string,
  keywords: string,
  maxDuration: number
): Promise<PixabayTrack[]> {
  const params = new URLSearchParams({
    key: apiKey,
    genre,
    q: keywords,
    duration_to: String(maxDuration),
    per_page: "20",
    safesearch: "true",
  });

  const url = `${PIXABAY_API}?${params.toString()}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed: PixabayResponse = JSON.parse(data);
            resolve(parsed.hits || []);
          } catch {
            reject(new Error(`Failed to parse Pixabay response: ${data.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Pick the best track matching BPM requirements
 */
function pickBestTrack(
  tracks: PixabayTrack[],
  bpmMin: number,
  bpmMax: number
): PixabayTrack | null {
  if (tracks.length === 0) return null;

  // Prefer tracks with BPM in range, then filter by duration
  const inRange = tracks.filter(
    (t) => t.bpm === null || (t.bpm >= bpmMin && t.bpm <= bpmMax)
  );

  const candidates = inRange.length > 0 ? inRange : tracks;

  // Return the first one with an audio URL
  return candidates.find((t) => t.audio?.url) || null;
}

/**
 * Download a file from a URL and save to disk
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          downloadFile(response.headers.location!, destPath)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

/**
 * Main: download all required music tracks
 */
export async function downloadMusicTracks(
  apiKey: string,
  force = false
): Promise<{ downloaded: string[]; skipped: string[]; failed: string[] }> {
  const results = { downloaded: [] as string[], skipped: [] as string[], failed: [] as string[] };

  // Ensure music directory exists
  fs.mkdirSync(MUSIC_DIR, { recursive: true });

  for (const [filename, config] of Object.entries(MUSIC_CATALOG)) {
    const destPath = path.join(MUSIC_DIR, filename);

    // Skip if already exists and not forcing
    if (!force && fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      console.log(`[Music] ⏭  Skipping ${filename} (already exists)`);
      results.skipped.push(filename);
      continue;
    }

    console.log(`[Music] 🔍 Searching Pixabay for: ${config.label} (${config.genre})`);

    try {
      const tracks = await searchPixabay(
        apiKey,
        config.genre,
        config.keywords,
        config.maxDuration
      );

      if (tracks.length === 0) {
        // Fallback: search without genre filter
        console.log(`[Music] ⚠  No results for genre "${config.genre}", trying fallback search...`);
        const fallback = await searchPixabay(apiKey, "", config.keywords, config.maxDuration);
        if (fallback.length === 0) {
          console.error(`[Music] ❌ No tracks found for ${filename}`);
          results.failed.push(filename);
          continue;
        }
        tracks.push(...fallback);
      }

      const track = pickBestTrack(tracks, config.bpmMin, config.bpmMax);
      if (!track || !track.audio?.url) {
        console.error(`[Music] ❌ No suitable track found for ${filename}`);
        results.failed.push(filename);
        continue;
      }

      console.log(
        `[Music] ⬇  Downloading "${track.title}" ` +
          `(${track.duration}s${track.bpm ? `, ${track.bpm} BPM` : ""}) → ${filename}`
      );

      await downloadFile(track.audio.url, destPath);

      const size = (fs.statSync(destPath).size / 1024).toFixed(0);
      console.log(`[Music] ✅ Saved ${filename} (${size} KB)`);
      results.downloaded.push(filename);

      // Small delay between requests to be polite to the API
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`[Music] ❌ Failed to download ${filename}:`, (err as Error).message);
      results.failed.push(filename);
    }
  }

  return results;
}

/**
 * Verify all required music files exist and are valid
 */
export function verifyMusicFiles(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const filename of Object.keys(MUSIC_CATALOG)) {
    const filePath = path.join(MUSIC_DIR, filename);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1000) {
      missing.push(filename);
    }
  }

  return { ok: missing.length === 0, missing };
}

/**
 * Map template energy level to the right music file
 */
export function getMusicForTemplate(templateName: string): string {
  const hypeTemplates = [
    "ViralHookMachine", "UrgencyCountdown", "RapidFireFive",
    "ThreeBeatTextSlam", "GoldPriceSlam",
  ];
  const chillTemplates = [
    "MinimalLuxury", "ConditionSpotlight", "PolaroidGallery",
    "ASMRSlowReveal", "CleanProductReveal",
  ];

  if (hypeTemplates.includes(templateName)) return "hype.mp3";
  if (chillTemplates.includes(templateName)) return "chill.mp3";
  return "energetic.mp3";
}
