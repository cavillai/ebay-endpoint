import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import os from "os";
import path from "path";
import { getFromCache, isInCache, saveToCache } from "./cache";
import { handler } from "./handler";
import { helpText } from "./help-text";
import { getImageType, getMimeType } from "./image-types";
import { getImageHash } from "./make-hash";
import { sendFile } from "./send-file";
import {
  validateChallenge,
  handleAccountDeletionNotification,
} from "./ebay-notifications";

dotenv.config({ quiet: true });

const app = express();
const port = process.env.PORT || 8000;

const webpackBundling = bundle(path.join(process.cwd(), "src/index.ts"));
const tmpDir = fs.promises.mkdtemp(path.join(os.tmpdir(), "remotion-"));

enum Params {
  compositionname,
  format,
}

// This setting will reveal the real IP address of the user, so we can apply rate limiting.
app.set("trust proxy", 1);

// Not more than 20 requests per minute per user
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
  }),
);

// JSON body parser for eBay notification webhook
app.use(express.json());

// eBay Marketplace Account Deletion Notification Endpoints
// Challenge code verification: https://developer.ebay.com/develop/guides-v2/marketplace-user-account-deletion/marketplace-user-account-deletion
const EBAY_VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;
const EBAY_ENDPOINT_URL =
  process.env.EBAY_ENDPOINT_URL ||
  "http://localhost:8000/ebay-account-deletion";

app.get("/ebay-account-deletion", (req, res) => {
  const challengeCode = req.query.challenge_code as string;

  if (!challengeCode) {
    console.log(
      "[eBay] Challenge code missing from request. URL:",
      req.originalUrl
    );
    res.status(400).json({ error: "challenge_code parameter is required" });
    return;
  }

  if (!EBAY_VERIFICATION_TOKEN) {
    console.error(
      "[eBay] EBAY_VERIFICATION_TOKEN environment variable is not set"
    );
    res.status(500).json({ error: "Verification token not configured" });
    return;
  }

  try {
    const challengeResponse = validateChallenge(
      challengeCode,
      EBAY_VERIFICATION_TOKEN,
      EBAY_ENDPOINT_URL
    );

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] eBay Challenge Code Validation Success`);
    console.log(`[${timestamp}] Challenge Code: ${challengeCode}`);
    console.log(`[${timestamp}] Response Hash: ${challengeResponse}`);

    res.status(200).json({ challengeResponse });
  } catch (error) {
    console.error("[eBay] Challenge validation error:", error);
    res.status(500).json({ error: "Failed to validate challenge code" });
  }
});

app.post("/ebay-account-deletion", (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[${timestamp}] eBay Account Deletion Notification Received`);
    handleAccountDeletionNotification(req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(
      `[${timestamp}] Error processing account deletion notification:`,
      error
    );
    res.status(500).json({ error: "Failed to process notification" });
  }
});

// The image is rendered when /[CompositionName].[imageformat] is called.
// Props are passed via query string.
app.get(
  `/:${Params.compositionname}.:${Params.format}(png|jpe?g)`,
  handler(async (req, res) => {
    const inputProps = req.query;
    const compName = req.params[Params.compositionname];
    const imageFormat = getImageType(req.params[Params.format]);

    res.set("content-type", getMimeType(imageFormat));

    // Calculate a unique identifier for our image,
    // if it exists, return it from cache
    const hash = getImageHash(
      JSON.stringify({
        compName,
        imageFormat,
        inputProps,
      }),
    );

    if (await isInCache(hash)) {
      const file = await getFromCache(hash);
      return sendFile(res, file);
    }

    const output = path.join(await tmpDir, hash);

    const webpackBundle = await webpackBundling;
    const composition = await selectComposition({
      id: compName,
      inputProps,
      serveUrl: webpackBundle,
    });
    await renderStill({
      composition,
      serveUrl: webpackBundle,
      output,
      inputProps,
      imageFormat,
    });

    await sendFile(res, fs.createReadStream(output));
    await saveToCache(hash, await fs.promises.readFile(output));
    await fs.promises.unlink(output);
  }),
);

ensureBrowser().then(() => {
  app.listen(port);
  console.log(helpText(Number(port)));
});
