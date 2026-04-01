// Central registry mapping template names to composition IDs, dimensions, and durations
export const TEMPLATE_REGISTRY = {
  // ─── Instagram (1080x1920 — 9:16 Reels) ────────────────────────────────
  CleanProductReveal:  { id: "CleanProductReveal",  platform: "instagram", w: 1080, h: 1920, frames: 450 },
  GoldPriceSlam:       { id: "GoldPriceSlam",       platform: "instagram", w: 1080, h: 1920, frames: 450 },
  ConditionSpotlight:  { id: "ConditionSpotlight",  platform: "instagram", w: 1080, h: 1920, frames: 450 },
  PolaroidGallery:     { id: "PolaroidGallery",     platform: "instagram", w: 1080, h: 1920, frames: 450 },
  MinimalLuxury:       { id: "MinimalLuxury",       platform: "instagram", w: 1080, h: 1920, frames: 450 },
  SpecsTicker:         { id: "SpecsTicker",         platform: "instagram", w: 1080, h: 1920, frames: 450 },
  ThreePanelStory:     { id: "ThreePanelStory",     platform: "instagram", w: 1080, h: 1920, frames: 450 },
  ZoomPunch:           { id: "ZoomPunch",           platform: "instagram", w: 1080, h: 1920, frames: 450 },
  NeonNightMarket:     { id: "NeonNightMarket",     platform: "instagram", w: 1080, h: 1920, frames: 450 },
  SwipeCarouselSim:    { id: "SwipeCarouselSim",    platform: "instagram", w: 1080, h: 1920, frames: 450 },

  // ─── TikTok (1080x1920) ─────────────────────────────────────────────────
  HookWordByWord:      { id: "HookWordByWord",      platform: "tiktok", w: 1080, h: 1920, frames: 450 },
  POVReseller:         { id: "POVReseller",          platform: "tiktok", w: 1080, h: 1920, frames: 450 },
  RapidFireFive:       { id: "RapidFireFive",       platform: "tiktok", w: 1080, h: 1920, frames: 450 },
  CommentReplyBait:    { id: "CommentReplyBait",    platform: "tiktok", w: 1080, h: 1920, frames: 450 },
  UrgencyCountdown:    { id: "UrgencyCountdown",    platform: "tiktok", w: 1080, h: 1920, frames: 450 },
} as const;

export type TemplateName = keyof typeof TEMPLATE_REGISTRY;
export const TEMPLATE_NAMES = Object.keys(TEMPLATE_REGISTRY) as TemplateName[];
