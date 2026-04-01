import Anthropic from "@anthropic-ai/sdk";
import { EBayProduct } from "./ebay-types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type Platform = "tiktok" | "instagram";

export interface VideoScene {
  id: number;
  duration: string;
  onScreenText: string[];
  voiceover: string;
  visualDirection: string;
  emotionalTrigger: string;
}

export interface VideoScript {
  platform: Platform;
  hook: {
    text: string;
    duration: "0-3s";
    visualDirection: string;
    voiceover: string;
  };
  scenes: VideoScene[];
  cta: {
    text: string;
    urgency: string;
    visualDirection: string;
  };
  totalDuration: string;
  productHighlights: string[];
}

const SYSTEM_PROMPT = `You are an elite short-form video scriptwriter specializing in eBay product listings.
You create viral, scroll-stopping scripts for TikTok and Instagram Reels.

ABSOLUTE RULES:
- Max 6 words per on-screen text line
- Hook must create an open loop (question, curiosity, surprise)
- Never use "great product", "amazing deal", or generic phrases
- Punchy sentences only — no filler words
- Every scene must earn viewer attention
- Always return valid JSON matching the exact schema provided

EMOTIONAL TRIGGERS TO USE:
- Curiosity: "Why is this illegal cheap?"
- Scarcity: "Only 3 left"
- Value: "$200 item. $12."
- Surprise: "This shouldn't work but..."
- Social proof: "50K sold last month"`;

export async function generateVideoScript(
  product: EBayProduct,
  platform: Platform,
  storeName?: string
): Promise<VideoScript> {
  const platformStyle =
    platform === "tiktok"
      ? "TIKTOK STYLE: Aggressive hook, curiosity-driven, trend-aware, slightly informal, fast cuts, meme-aware language"
      : "INSTAGRAM STYLE: Clean, aesthetic, premium tone, smooth transitions, aspirational language";

  const prompt = `Generate a viral short-form video script for this eBay product.

PLATFORM: ${platform.toUpperCase()}
${platformStyle}

PRODUCT DATA:
- Title: ${product.title}
- Price: ${product.currency === "USD" ? "$" : product.currency}${product.price}
- Condition: ${product.condition}
- Seller: ${product.seller.username} (${product.seller.feedbackPercentage} positive, ${product.seller.feedbackScore} feedback)
- Shipping: ${product.shipping.cost === "Free" ? "Free shipping" : `$${product.shipping.cost} shipping`}
${product.rating ? `- Rating: ${product.rating}/5 (${product.reviewCount?.toLocaleString()} reviews)` : ""}
${storeName ? `- Store: ${storeName}` : ""}

SCRIPT REQUIREMENTS:
1. Hook (0-3 seconds): Pattern interrupt, curiosity-driven open loop. Must stop the scroll immediately.
2. 5-8 scenes with: on-screen text (max 6 words per line), voiceover, visual direction, emotional trigger
3. CTA: Clear, urgent, direct. Link to eBay listing.

CRITICAL STYLE RULES:
- On-screen text: SHORT, BOLD, max 6 words per line, 1-3 lines max per scene
- Voiceover: Conversational, punchy, 1-2 short sentences per scene
- Visual direction: Specific camera movements (zoom in, pan left, cut to, overlay text)
- Emotional triggers: Use curiosity, scarcity, value, or surprise — not generic praise

Return ONLY valid JSON with this exact structure:
{
  "platform": "${platform}",
  "hook": {
    "text": "string (max 6 words, creates open loop)",
    "duration": "0-3s",
    "visualDirection": "string",
    "voiceover": "string"
  },
  "scenes": [
    {
      "id": 1,
      "duration": "Xs",
      "onScreenText": ["line 1", "line 2"],
      "voiceover": "string",
      "visualDirection": "string",
      "emotionalTrigger": "curiosity|scarcity|value|surprise|social_proof"
    }
  ],
  "cta": {
    "text": "string",
    "urgency": "string",
    "visualDirection": "string"
  },
  "totalDuration": "Xs",
  "productHighlights": ["highlight 1", "highlight 2", "highlight 3"]
}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract the JSON from the response
  let scriptJson = "";
  for (const block of response.content) {
    if (block.type === "text") {
      scriptJson = block.text;
      break;
    }
  }

  // Strip markdown code blocks if present
  scriptJson = scriptJson
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const script: VideoScript = JSON.parse(scriptJson);
  return script;
}

export async function generateScriptForStore(
  products: EBayProduct[],
  platform: Platform,
  storeName: string
): Promise<VideoScript> {
  // Use the best product (first one) for the main script
  return generateVideoScript(products[0], platform, storeName);
}
