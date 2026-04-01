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
  getNotificationStats,
} from "./ebay-notifications";
import { searchItems, searchItemsByKeyword, getItem } from "./ebay-api";
import { searchVideoSchema, itemVideoSchema } from "./ebay-validation";
import { renderMedia, selectComposition as selectComp } from "@remotion/renderer";
import { generateVideoScript, generateScriptForStore, Platform } from "./script-generator";
import { downloadMusicTracks, verifyMusicFiles } from "./music-downloader";
import { z } from "zod";
import { TEMPLATE_REGISTRY, TemplateName, TEMPLATE_NAMES } from "../templates/registry";

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

// Monitoring endpoint to check notification history
app.get("/ebay-notifications/stats", (req, res) => {
  res.status(200).json(getNotificationStats());
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: {
      ebay_notifications: "/ebay-account-deletion",
      monitoring: "/ebay-notifications/stats",
      health: "/health",
    },
  });
});

// ─── Template Library Endpoints ─────────────────────────────────────────────

const templateVideoSchema = z.object({
  template: z.string(),
  keyword: z.string().optional(),
  storeName: z.string().optional(),
  itemId: z.string().optional(),
  platform: z.enum(["tiktok", "instagram"]).optional(),
  format: z.enum(["mp4", "png"]).default("mp4"),
});

// GET /music/status — check which music files are present
app.get("/music/status", (req, res) => {
  const { ok, missing } = verifyMusicFiles();
  res.json({ ok, missing, message: ok ? "All music files ready" : `Missing: ${missing.join(", ")}` });
});

// POST /music/setup — download all music tracks from Pixabay
app.post(
  "/music/setup",
  handler(async (req, res) => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: "PIXABAY_API_KEY not configured in environment" });
      return;
    }
    const force = req.query.force === "true";
    console.log(`[Music] Starting Pixabay download (force=${force})...`);
    const results = await downloadMusicTracks(apiKey, force);
    const { ok, missing } = verifyMusicFiles();
    res.json({ ...results, allReady: ok, missing });
  })
);

// GET /product-data — fetch eBay product as Remotion-ready JSON props (for local rendering)
app.get(
  "/product-data",
  handler(async (req, res) => {
    const parsed = templateVideoSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
      return;
    }
    const { template, keyword, storeName, itemId } = parsed.data;
    let product;
    if (itemId) {
      product = await getItem(itemId);
    } else if (keyword) {
      const result = storeName
        ? await searchItems(storeName, keyword, 1)
        : await searchItemsByKeyword(keyword, 1);
      if (result.items.length === 0) { res.status(404).json({ error: "No products found" }); return; }
      product = result.items[0];
    } else {
      res.status(400).json({ error: "Provide keyword or itemId" }); return;
    }
    const tmpl = TEMPLATE_REGISTRY[template as TemplateName];
    const props = {
      storeName: storeName || product.seller.username,
      title: product.title,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      additionalImages: product.additionalImages || [],
      condition: product.condition,
      shippingCost: product.shipping.cost,
      shippingType: product.shipping.type,
      sellerUsername: product.seller.username,
      feedbackScore: product.seller.feedbackScore,
      feedbackPercentage: product.seller.feedbackPercentage,
    };
    res.json({ template: tmpl?.id || template, props });
  })
);

// GET /templates — list all available templates
app.get("/templates", (req, res) => {
  const list = TEMPLATE_NAMES.map((name) => ({
    name,
    ...TEMPLATE_REGISTRY[name],
  }));
  res.json({ templates: list, total: list.length });
});

// GET /generate-video/template — render any named template with live eBay data
app.get(
  "/generate-video/template",
  handler(async (req, res) => {
    const parsed = templateVideoSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
      return;
    }

    const { template, keyword, storeName, itemId, format } = parsed.data;

    if (!TEMPLATE_NAMES.includes(template as TemplateName)) {
      res.status(400).json({
        error: `Unknown template "${template}"`,
        availableTemplates: TEMPLATE_NAMES,
      });
      return;
    }

    const tmpl = TEMPLATE_REGISTRY[template as TemplateName];

    // Fetch product data
    let product;
    if (itemId) {
      product = await getItem(itemId);
    } else if (keyword) {
      const result = storeName
        ? await searchItems(storeName, keyword, 5)
        : await searchItemsByKeyword(keyword, 5);
      if (result.items.length === 0) {
        res.status(404).json({ error: "No products found" });
        return;
      }
      product = result.items[0];
    } else {
      res.status(400).json({ error: "Provide either keyword or itemId" });
      return;
    }

    const inputProps = {
      storeName: storeName || product.seller.username,
      title: product.title,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      additionalImages: [],
      condition: product.condition,
      brand: undefined,
      shippingCost: product.shipping.cost,
      shippingType: product.shipping.type,
      sellerUsername: product.seller.username,
      feedbackScore: product.seller.feedbackScore,
      feedbackPercentage: product.seller.feedbackPercentage,
      buyingOptions: [],
    };

    const ts = new Date().toISOString();
    console.log(`[${ts}] Rendering template "${template}" for "${product.title.slice(0, 40)}"`);

    await renderAndSend(res, tmpl.id, inputProps, format);
  })
);

// ─── eBay Script Generation Endpoints ───────────────────────────────────────

const generateScriptSchema = z.object({
  keyword: z.string().min(1),
  storeName: z.string().optional(),
  platform: z.enum(["tiktok", "instagram"]).default("tiktok"),
  itemCount: z.coerce.number().min(1).max(5).default(1),
});

const generateScriptByItemSchema = z.object({
  itemId: z.string().min(1),
  platform: z.enum(["tiktok", "instagram"]).default("tiktok"),
});

// GET /generate-script/search — generate AI video script from product search
app.get(
  "/generate-script/search",
  handler(async (req, res) => {
    const parsed = generateScriptSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
      return;
    }

    const { keyword, storeName, platform, itemCount } = parsed.data;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Generating ${platform} script for keyword: "${keyword}"`);

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
      return;
    }

    const result = storeName
      ? await searchItems(storeName, keyword, itemCount)
      : await searchItemsByKeyword(keyword, itemCount);

    if (result.items.length === 0) {
      res.status(404).json({ error: "No products found" });
      return;
    }

    const script = storeName
      ? await generateScriptForStore(result.items, platform as Platform, storeName)
      : await generateVideoScript(result.items[0], platform as Platform);

    console.log(`[${timestamp}] Script generated — ${script.scenes.length} scenes, ${script.totalDuration}`);
    res.status(200).json(script);
  })
);

// GET /generate-script/item — generate AI video script for a specific eBay item
app.get(
  "/generate-script/item",
  handler(async (req, res) => {
    const parsed = generateScriptByItemSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
      return;
    }

    const { itemId, platform } = parsed.data;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Generating ${platform} script for item: ${itemId}`);

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
      return;
    }

    const product = await getItem(itemId);
    const script = await generateVideoScript(product, platform as Platform);

    console.log(`[${timestamp}] Script generated — ${script.scenes.length} scenes, ${script.totalDuration}`);
    res.status(200).json(script);
  })
);

// ─── eBay Video Generation Endpoints ────────────────────────────────────────

// Helper: render a video or still to buffer and send it
async function renderAndSend(
  res: any,
  compName: string,
  inputProps: Record<string, unknown>,
  format: "mp4" | "png"
) {
  const webpackBundle = await webpackBundling;
  const output = path.join(await tmpDir, `${Date.now()}-${compName}.${format}`);

  if (format === "png") {
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
      imageFormat: "png",
    });
    res.set("content-type", "image/png");
  } else {
    const composition = await selectComp({
      id: compName,
      inputProps,
      serveUrl: webpackBundle,
    });
    await renderMedia({
      composition,
      serveUrl: webpackBundle,
      codec: "h264",
      outputLocation: output,
      inputProps,
    });
    res.set("content-type", "video/mp4");
    res.set("Content-Disposition", `attachment; filename="${compName}.mp4"`);
  }

  await sendFile(res, fs.createReadStream(output));
  await fs.promises.unlink(output);
}

// GET /generate-video/search — search eBay products & generate video
app.get(
  "/generate-video/search",
  handler(async (req, res) => {
    const parsed = searchVideoSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
      return;
    }

    const { storeName, keyword, style, itemCount, format } = parsed.data;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Generating ${style} video — keyword: "${keyword}" store: "${storeName || "all"}"`);

    // Fetch products from eBay
    const result = storeName
      ? await searchItems(storeName, keyword, itemCount)
      : await searchItemsByKeyword(keyword, itemCount);

    if (result.items.length === 0) {
      res.status(404).json({ error: "No products found for the given query" });
      return;
    }

    if (style === "showcase") {
      // Single product showcase (first result)
      const product = result.items[0];
      const inputProps = {
        title: product.title,
        price: product.price,
        currency: product.currency,
        imageUrl: product.imageUrl,
        condition: product.condition,
        sellerUsername: product.seller.username,
        feedbackScore: product.seller.feedbackScore,
        feedbackPercentage: product.seller.feedbackPercentage,
        shippingCost: product.shipping.cost,
        shippingType: product.shipping.type,
        rating: product.rating,
        reviewCount: product.reviewCount,
      };
      await renderAndSend(res, "ProductShowcase", inputProps, format);
    } else {
      // Carousel of products
      const products = result.items.map((p) => ({
        itemId: p.itemId,
        title: p.title,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        condition: p.condition,
        sellerUsername: p.seller.username,
        feedbackPercentage: p.seller.feedbackPercentage,
        shippingCost: p.shipping.cost,
      }));
      const inputProps = {
        products,
        storeName: storeName || keyword,
        framesPerProduct: 90,
      };
      await renderAndSend(res, "ProductCarousel", inputProps, format);
    }
  })
);

// GET /generate-video/item — generate video for a specific eBay item ID
app.get(
  "/generate-video/item",
  handler(async (req, res) => {
    const parsed = itemVideoSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
      return;
    }

    const { itemId, format } = parsed.data;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Generating showcase video for item: ${itemId}`);

    const product = await getItem(itemId);

    const inputProps = {
      title: product.title,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      condition: product.condition,
      sellerUsername: product.seller.username,
      feedbackScore: product.seller.feedbackScore,
      feedbackPercentage: product.seller.feedbackPercentage,
      shippingCost: product.shipping.cost,
      shippingType: product.shipping.type,
      rating: product.rating,
      reviewCount: product.reviewCount,
    };

    await renderAndSend(res, "ProductShowcase", inputProps, format);
  })
);

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
