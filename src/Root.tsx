import React from "react";
import { Composition, Still } from "remotion";
import { myCompSchema, PreviewCard } from "./PreviewCard";
import { ProductShowcase, productShowcaseSchema } from "./ProductShowcase";
import { ProductCarousel, productCarouselSchema } from "./ProductCarousel";

// ─── Instagram Templates ──────────────────────────────────────────────────
import { CleanProductReveal }  from "./templates/instagram/CleanProductReveal";
import { GoldPriceSlam }       from "./templates/instagram/GoldPriceSlam";
import { ConditionSpotlight }  from "./templates/instagram/ConditionSpotlight";
import { PolaroidGallery }     from "./templates/instagram/PolaroidGallery";
import { MinimalLuxury }       from "./templates/instagram/MinimalLuxury";
import { SpecsTicker }         from "./templates/instagram/SpecsTicker";
import { ThreePanelStory }     from "./templates/instagram/ThreePanelStory";
import { ZoomPunch }           from "./templates/instagram/ZoomPunch";
import { NeonNightMarket }     from "./templates/instagram/NeonNightMarket";
import { SwipeCarouselSim }    from "./templates/instagram/SwipeCarouselSim";

// ─── TikTok Templates ────────────────────────────────────────────────────
import { HookWordByWord }      from "./templates/tiktok/HookWordByWord";
import { POVReseller }         from "./templates/tiktok/POVReseller";
import { RapidFireFive }       from "./templates/tiktok/RapidFireFive";
import { CommentReplyBait }    from "./templates/tiktok/CommentReplyBait";
import { UrgencyCountdown }    from "./templates/tiktok/UrgencyCountdown";

const TEMPLATE_DEFAULTS = {
  storeName: "My eBay Store",
  title: "Sample Product — Great Deal",
  price: "29.99",
  currency: "USD",
  imageUrl: "https://via.placeholder.com/800x800",
  condition: "Like New",
  brand: "Sample Brand",
};

const IG_DIMS = { width: 1080, height: 1080, fps: 30, durationInFrames: 450 };
const TT_DIMS = { width: 1080, height: 1920, fps: 30, durationInFrames: 450 };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ─── Legacy Compositions ──────────────────────────────────────── */}
      <Still
        id="PreviewCard"
        component={PreviewCard}
        width={1200}
        height={627}
        schema={myCompSchema}
        defaultProps={{
          title: "Welcome to Remotion" as const,
          description: "Edit Video.tsx to change template" as const,
          color: "#0B84F3" as const,
        }}
      />
      <Composition id="ProductShowcase" component={ProductShowcase}
        width={1080} height={1920} fps={30} durationInFrames={240}
        schema={productShowcaseSchema}
        defaultProps={{ title: "Sample Product", price: "29.99", currency: "USD", imageUrl: "", condition: "New", sellerUsername: "seller", feedbackScore: 100, feedbackPercentage: "99%", shippingCost: "Free", shippingType: "Standard" }}
      />
      <Composition id="ProductCarousel" component={ProductCarousel}
        width={1080} height={1920} fps={30} durationInFrames={270}
        schema={productCarouselSchema}
        defaultProps={{ storeName: "My Store", framesPerProduct: 90, products: [] }}
      />

      {/* ─── Instagram Templates ──────────────────────────────────────── */}
      <Composition id="CleanProductReveal"  component={CleanProductReveal  as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="GoldPriceSlam"       component={GoldPriceSlam       as any} {...IG_DIMS} defaultProps={{ ...TEMPLATE_DEFAULTS, originalPrice: "89.99" }} />
      <Composition id="ConditionSpotlight"  component={ConditionSpotlight  as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="PolaroidGallery"     component={PolaroidGallery     as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="MinimalLuxury"       component={MinimalLuxury       as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="SpecsTicker"         component={SpecsTicker         as any} {...IG_DIMS} defaultProps={{ ...TEMPLATE_DEFAULTS, itemSpecifics: { Color: "Black", Size: "M", Material: "Cotton" } }} />
      <Composition id="ThreePanelStory"     component={ThreePanelStory     as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="ZoomPunch"           component={ZoomPunch           as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="NeonNightMarket"     component={NeonNightMarket     as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="SwipeCarouselSim"    component={SwipeCarouselSim    as any} {...IG_DIMS} defaultProps={TEMPLATE_DEFAULTS} />

      {/* ─── TikTok Templates ─────────────────────────────────────────── */}
      <Composition id="HookWordByWord"      component={HookWordByWord      as any} {...TT_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="POVReseller"         component={POVReseller         as any} {...TT_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="RapidFireFive"       component={RapidFireFive       as any} {...TT_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="CommentReplyBait"    component={CommentReplyBait    as any} {...TT_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
      <Composition id="UrgencyCountdown"    component={UrgencyCountdown    as any} {...TT_DIMS} defaultProps={TEMPLATE_DEFAULTS} />
    </>
  );
};
