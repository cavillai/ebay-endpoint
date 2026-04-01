#!/usr/bin/env ts-node
/**
 * Setup script: download royalty-free music from Pixabay
 * Run: npx ts-node scripts/setup-music.ts
 * Or:  npm run setup-music
 */

import dotenv from "dotenv";
import { downloadMusicTracks, verifyMusicFiles } from "../src/server/music-downloader";

dotenv.config();

async function main() {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.error(`
❌ PIXABAY_API_KEY not set.

Get a free key at: https://pixabay.com/api/docs/
Then add to .env:   PIXABAY_API_KEY=your_key_here
`);
    process.exit(1);
  }

  console.log("🎵 Starting music download from Pixabay...\n");

  const { downloaded, skipped, failed } = await downloadMusicTracks(apiKey);

  console.log("\n─── Summary ───────────────────────────");
  if (downloaded.length) console.log(`✅ Downloaded: ${downloaded.join(", ")}`);
  if (skipped.length) console.log(`⏭  Skipped:    ${skipped.join(", ")}`);
  if (failed.length) console.log(`❌ Failed:     ${failed.join(", ")}`);

  const { ok, missing } = verifyMusicFiles();
  if (!ok) {
    console.error(`\n⚠  Missing files: ${missing.join(", ")}`);
    console.error("   Re-run with --force to retry failed downloads.");
    process.exit(1);
  }

  console.log("\n🎬 All music files ready. You can now render videos!\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
