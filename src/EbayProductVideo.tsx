/**
 * EbayProductVideo — full rebuild per Master Prompt v1.0
 * 5 scenes, 510 frames, 17 seconds, 1080x1920
 * Hook(0-60) → Gallery(60-270) → Price(270-330) → Details(330-390) → CTA(390-510)
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import { LightLeak } from "@remotion/light-leaks";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { z } from "zod";

// ── Fonts — loaded at module level, blocks render until ready ─────────────
const { fontFamily: bebas } = loadBebas();
const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

// ── Zod schema — validates all props from batch render ─────────────────────
export const ebayProductSchema = z.object({
  storeName:   z.string(),
  platform:    z.enum(["tiktok", "instagram"]).default("tiktok"),
  title:       z.string(),
  price:       z.coerce.number(),
  condition:   z.string().default("Pre-owned"),
  brand:       z.string().optional().default(""),
  size:        z.string().optional().default(""),
  imageUrls:   z.array(z.string()).min(1),
  audioFile:   z.string().default("music/party-time.mp3"),
  hook:        z.string(),
  ctaText:     z.string(),
  accentColor: z.string().default("#FFD700"),
  bgColor:     z.string().default("#111111"),
  categoryName: z.string().optional().default(""),
  videoStyle:  z.enum(["classic","neon","cinematic","split"]).default("classic"),
  transitionMp4: z.string().optional().default(""), // e.g. "assets/transitions/wipes/wipe-left.mp4"
  renderSeed:  z.coerce.number().default(0),         // unique per render for true variety
});

export type EbayProductVideoProps = z.infer<typeof ebayProductSchema>;

// ── Video style configurations ────────────────────────────────────────────
export type VideoStyle = "classic" | "neon" | "cinematic" | "split";

export const VIDEO_STYLES: Record<VideoStyle, {
  label: string;
  hookFontSize: number;
  hookLetterSpacing: number;
  transitionStyle: string;
  galleryOverlay: string;
  priceCardBorder: string;
  badgeRotation: number;
}> = {
  classic: {
    label: "Classic Energy",
    hookFontSize: 120,
    hookLetterSpacing: 4,
    transitionStyle: "light-leak",
    galleryOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 25%, transparent 70%, rgba(0,0,0,0.55) 100%)",
    priceCardBorder: "1px solid rgba(255,255,255,0.2)",
    badgeRotation: 2,
  },
  neon: {
    label: "Neon Club",
    hookFontSize: 110,
    hookLetterSpacing: 8,
    transitionStyle: "light-leak-hue",
    galleryOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.7) 100%)",
    priceCardBorder: "2px solid rgba(255,255,255,0.4)",
    badgeRotation: 4,
  },
  cinematic: {
    label: "Cinematic",
    hookFontSize: 96,
    hookLetterSpacing: 12,
    transitionStyle: "fade",
    galleryOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.65) 100%)",
    priceCardBorder: "1px solid rgba(255,255,255,0.15)",
    badgeRotation: 0,
  },
  split: {
    label: "Split Screen",
    hookFontSize: 128,
    hookLetterSpacing: 2,
    transitionStyle: "flash",
    galleryOverlay: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 68%, rgba(0,0,0,0.5) 100%)",
    priceCardBorder: "2px solid rgba(255,255,255,0.3)",
    badgeRotation: 3,
  },
};

// ── Scene frame constants ─────────────────────────────────────────────────
const HOOK_START    = 0;
const GALLERY_START = 60;
const PRICE_START   = 270;
const DETAILS_START = 330;
const CTA_START     = 390;

// Safe zones
const SAFE_TOP    = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES  = 60;

// ══════════════════════════════════════════════════════════════════════════
// SCENE 2 SUB-COMPONENT — ImageSlide with Ken Burns
// ══════════════════════════════════════════════════════════════════════════
const ImageSlide: React.FC<{
  src: string;
  index: number;
  total: number;
  framesPerImage: number;
  accentColor: string;
  storeName: string;
}> = ({ src, index, total, framesPerImage, accentColor, storeName }) => {
  const frame = useCurrentFrame();
  const even = index % 2 === 0;

  // Ken Burns — alternate zoom direction per image
  const scale = interpolate(
    frame, [0, framesPerImage],
    even ? [1.12, 1.0] : [1.0, 1.12],
    { extrapolateRight: "clamp" }
  );
  const panX = interpolate(
    frame, [0, framesPerImage],
    even ? [-30, 0] : [30, 0],
    { extrapolateRight: "clamp" }
  );
  const panY = interpolate(
    frame, [0, framesPerImage],
    index % 3 === 0 ? [-20, 0] : [20, 0],
    { extrapolateRight: "clamp" }
  );

  // Cross-fade — NEVER shows void frame
  const opacity = interpolate(
    frame,
    [0, 8, framesPerImage - 12, framesPerImage],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>

      {/* Product image — fills entire frame, no letterboxing */}
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)`,
        }}
      />

      {/* Gradient overlay — less aggressive so product images shine */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 22%, transparent 72%, rgba(0,0,0,0.5) 100%)",
      }} />

      {/* Store watermark — top-left, prominent, pill background */}
      <div style={{
        position: "absolute",
        top: SAFE_TOP + 10,
        left: SAFE_SIDES,
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: 100,
        paddingLeft: 22,
        paddingRight: 22,
        paddingTop: 10,
        paddingBottom: 10,
        border: `1.5px solid rgba(255,255,255,0.25)`,
      }}>
        <span style={{
          fontFamily: bebas,
          fontSize: 44,
          fontWeight: 900,
          color: "#FFFFFF",
          letterSpacing: 4,
          textTransform: "uppercase",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}>
          {storeName}
        </span>
      </div>

      {/* Progress dots — inside bottom safe zone */}
      <div style={{
        position: "absolute",
        bottom: SAFE_BOTTOM + 15,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}>
        {Array.from({ length: total }).map((_, di) => (
          <div
            key={di}
            style={{
              width:  di === index ? 10 : 6,
              height: di === index ? 10 : 6,
              borderRadius: "50%",
              background: di === index ? accentColor : "rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>

    </AbsoluteFill>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPOSITION
// ══════════════════════════════════════════════════════════════════════════
export const EbayProductVideo: React.FC<EbayProductVideoProps> = ({
  storeName, platform, title, price, condition, brand, size,
  imageUrls, audioFile, hook, ctaText, accentColor, bgColor,
  videoStyle = "classic", categoryName = "",
  transitionMp4 = "", renderSeed = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const allImages = imageUrls.filter(Boolean);
  const FRAMES_PER_IMAGE = Math.floor(210 / allImages.length);
  const style = VIDEO_STYLES[videoStyle];

  // Style-specific overlay asset and text treatment
  const STYLE_OVERLAY: Record<string, string> = {
    classic:   "",                                       // no overlay
    neon:      "assets/transitions/overlays/scanlines.mp4",
    cinematic: "assets/transitions/overlays/grain-overlay.mp4",
    split:     "assets/transitions/overlays/vhs-static.mp4",
  };
  const overlayAsset = STYLE_OVERLAY[videoStyle] || "";

  // Style-specific price card colors
  const STYLE_PRICE_COLOR: Record<string, string> = {
    classic:   "#00FF88",
    neon:      accentColor,
    cinematic: "#FFFFFF",
    split:     "#FFD700",
  };
  const priceColor = STYLE_PRICE_COLOR[videoStyle] || "#00FF88";

  // Cinematic letterbox bars (top/bottom 80px black bars)
  const showLetterbox = videoStyle === "cinematic";
  const lastImage  = allImages[allImages.length - 1];
  const firstImage = allImages[0];

  // ── SCENE 1: Hook animations ──────────────────────────────────────────
  const hookScale = spring({
    frame,
    fps,
    from: 4.0,
    to: 1.0,
    config: { damping: 10, stiffness: 200 },
  });

  // ── SCENE 3: Price ─────────────────────────────────────────────────────
  const shakeX =
    frame >= 310 && frame <= 322
      ? Math.sin(frame * 2.8) * interpolate(frame, [310, 322], [10, 0])
      : 0;

  const priceProgress = spring({
    frame: frame - 275,
    fps,
    config: { damping: 80, stiffness: 100 },
  });
  const displayPrice = interpolate(priceProgress, [0, 1], [0, price]);


  // ── SCENE 4: Details ───────────────────────────────────────────────────
  const makeBadgeX = (delay: number) => {
    const s = spring({
      frame: frame - (335 + delay),
      fps,
      config: { damping: 14, stiffness: 180 },
    });
    return interpolate(s, [0, 1], [400, 0]);
  };

  // Scene 4 badges — condition appears exactly ONCE here, nowhere else
  const conditionColor = condition.toLowerCase().includes("excellent") || condition.toLowerCase().includes("like new")
    ? "#00C851"
    : condition.toLowerCase().includes("good") ? "#FFD700" : "#FF8C00";

  const detailBadges = [
    brand ? { label: brand, color: accentColor, textColor: "#000", delay: 0 } : null,
    size  ? { label: `Size ${size}`, color: "#FFFFFF", textColor: "#000", delay: 12 } : null,
    { label: condition, color: conditionColor, textColor: "#000", delay: size ? 24 : brand ? 12 : 0 },
  ].filter(Boolean) as Array<{ label: string; color: string; textColor: string; delay: number }>;


  // ── SCENE 5: CTA ───────────────────────────────────────────────────────
  const nameScale = spring({
    frame: frame - 393,
    fps,
    config: { damping: 14, stiffness: 180 },
  });
  const ctaProgress = spring({
    frame: frame - 405,
    fps,
    config: { damping: 14, stiffness: 160 },
  });
  const ctaSlide = interpolate(ctaProgress, [0, 1], [100, 0]);
  const bouncingArrow = Math.sin(frame * 0.25) * 18;
  const pulseBorder = Math.sin(frame * 0.2) * 0.5 + 0.5;
  const fadeOut = interpolate(frame, [500, 510], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: inter, overflow: "hidden" }}>

      {/* ── AUDIO: starts immediately at frame 0, ducks during gallery ── */}
      {/* f is audio-relative frames — use composition frame values directly */}
      <Audio
        src={staticFile(audioFile)}
        volume={(f) =>
          interpolate(
            f,
            [0, 6,              // quick fade-in so audio hits immediately
             GALLERY_START, GALLERY_START + 8,   // duck when gallery captions appear
             PRICE_START - 5,  PRICE_START + 5], // restore before price slam
            [0, 0.68, 0.68, 0.22, 0.22, 0.68],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
        loop
      />

      {/* ── Style overlay: scanlines / grain / vhs (looped, full video) ── */}
      {overlayAsset && (
        <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
          <Video
            src={staticFile(overlayAsset)}
            style={{ width: "100%", height: "100%", objectFit: "cover",
              opacity: videoStyle === "neon" ? 0.18 : videoStyle === "cinematic" ? 0.1 : 0.12,
              mixBlendMode: "screen" }}
            volume={0}
            loop
          />
        </AbsoluteFill>
      )}

      {/* ── Cinematic letterbox bars (top + bottom) ── */}
      {showLetterbox && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, backgroundColor: "#000", zIndex: 49 }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "#000", zIndex: 49 }} />
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SCENE 1 — HOOK (frames 0–60)
          Pure bgColor background — NO product image
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={HOOK_START} durationInFrames={60} premountFor={5}>
        <AbsoluteFill
          style={{
            backgroundColor: bgColor,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Radial glow */}
          <div style={{
            position: "absolute",
            width: 600, height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}44 0%, transparent 70%)`,
            left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
          }} />

          {/* Style-specific hook accent (neon scanlines / cinematic bars) */}
          {videoStyle === "neon" && (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
              pointerEvents: "none",
            }} />
          )}
          {videoStyle === "cinematic" && (
            <>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, backgroundColor: "#000" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "#000" }} />
            </>
          )}
          {videoStyle === "split" && (
            <div style={{
              position: "absolute", left: "50%", top: 0, bottom: 0, width: 3,
              background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`,
              transform: "translateX(-50%)",
            }} />
          )}

          {/* Hook text — style-specific size, shadow, entrance */}
          <div style={{
            fontFamily: bebas,
            fontSize: style.hookFontSize,
            color: videoStyle === "neon" ? accentColor : "#FFFFFF",
            letterSpacing: style.hookLetterSpacing,
            textAlign: "center",
            paddingLeft: SAFE_SIDES,
            paddingRight: SAFE_SIDES,
            transform: videoStyle === "cinematic"
              ? `translateY(${interpolate(hookScale, [1, 4], [0, -80])}px) scale(${hookScale})`
              : `scale(${hookScale})`,
            lineHeight: 1.1,
            textShadow: videoStyle === "neon"
              ? `0 0 20px ${accentColor}, 0 0 60px ${accentColor}80, 0 0 120px ${accentColor}40, 0 0 200px ${accentColor}20`
              : videoStyle === "cinematic"
              ? `0 2px 0 rgba(255,255,255,0.2), 0 4px 30px rgba(0,0,0,0.9)`
              : videoStyle === "split"
              ? `4px 4px 0 ${accentColor}, -4px -4px 0 ${accentColor}88`
              : `0 0 40px ${accentColor}`,
          }}>
            {hook}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════
          SCENE 2 — GALLERY (frames 60–270)
          All images cycle with Ken Burns + light leaks
      ════════════════════════════════════════════════════════════ */}
      {allImages.map((url, i) => (
        <Sequence
          key={i}
          from={GALLERY_START + i * FRAMES_PER_IMAGE}
          durationInFrames={FRAMES_PER_IMAGE + 15}
          premountFor={15}
        >
          <ImageSlide
            src={url}
            index={i}
            total={allImages.length}
            framesPerImage={FRAMES_PER_IMAGE}
            accentColor={accentColor}
            storeName={storeName}
          />
        </Sequence>
      ))}

      {/* Image transitions — varied per renderSeed + style */}
      {allImages.slice(1).map((_, i) => {
        const transFrame = GALLERY_START + (i + 1) * FRAMES_PER_IMAGE - 8;
        // Use renderSeed + image index for unique hue/seed per render
        const leakSeed = ((renderSeed + i * 13 + 7) % 20) + 1;
        const hue = ((renderSeed * 37 + i * 73) % 360);

        if (transitionMp4 && i === 0) {
          // Use the selected transition MP4 asset on the first cut
          return (
            <Sequence key={`trans-mp4-${i}`} from={transFrame - 4} durationInFrames={30} premountFor={10}>
              <AbsoluteFill>
                <Video
                  src={staticFile(transitionMp4)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "screen" }}
                  volume={0}
                />
              </AbsoluteFill>
            </Sequence>
          );
        }

        if (videoStyle === "split") {
          // Flash cut — white flash
          return (
            <Sequence key={`trans-${i}`} from={transFrame} durationInFrames={6} premountFor={3}>
              <AbsoluteFill>
                <div style={{ position: "absolute", inset: 0, backgroundColor: "#fff",
                  opacity: interpolate(useCurrentFrame(), [0, 3, 6], [0, 1, 0], { extrapolateRight: "clamp" }) }} />
              </AbsoluteFill>
            </Sequence>
          );
        }
        if (videoStyle === "cinematic") {
          return (
            <Sequence key={`trans-${i}`} from={transFrame - 4} durationInFrames={24} premountFor={5}>
              <AbsoluteFill>
                <LightLeak durationInFrames={24} seed={leakSeed} hueShift={Math.min(hue, 359)} />
              </AbsoluteFill>
            </Sequence>
          );
        }
        // classic + neon — light leak with renderSeed-driven hue
        return (
          <Sequence key={`leak-${i}`} from={transFrame} durationInFrames={18} premountFor={5}>
            <AbsoluteFill>
              <LightLeak durationInFrames={18} seed={leakSeed} hueShift={Math.min(hue, 359)} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* ════════════════════════════════════════════════════════════
          SCENE 3 — PRICE REVEAL (frames 270–330)
          Last gallery image stays as background
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={PRICE_START} durationInFrames={60} premountFor={10}>
        <AbsoluteFill style={{ transform: `translateX(${shakeX}px)` }}>

          {/* Background — last gallery image */}
          <Img src={lastImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

          {/* Dark overlay */}
          <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />

          {/* Price card — glassmorphism */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 24,
              padding: "40px 60px",
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: inter, fontSize: 28,
                color: "rgba(255,255,255,0.7)", marginBottom: 8,
              }}>
                Only
              </div>
              <div style={{
                fontFamily: bebas,
                fontSize: 112,
                color: priceColor,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                textShadow: `0 0 60px ${priceColor}88`,
              }}>
                ${displayPrice.toFixed(2)}
              </div>
            </div>
          </AbsoluteFill>

          {/* 20 particle burst */}
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const pf = useCurrentFrame();
              const dist = interpolate(pf, [0, 30], [0, 220], { extrapolateRight: "clamp" });
              const pOp = interpolate(pf, [0, 15, 30], [0, 1, 0], { extrapolateRight: "clamp" });
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: 10, height: 10,
                    borderRadius: "50%",
                    background: accentColor,
                    opacity: pOp,
                    transform: `translate(${Math.cos(angle) * dist - 5}px, ${Math.sin(angle) * dist - 5}px)`,
                  }}
                />
              );
            })}
          </AbsoluteFill>

          {/* No badge here — price + particles only in Scene 3 */}

        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════
          SCENE 4 — DETAILS (frames 330–390)
          Badges stagger in from right with spring
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={DETAILS_START} durationInFrames={60} premountFor={10}>
        <AbsoluteFill>

          {/* Background image */}
          <Img
            src={allImages[Math.max(0, allImages.length - 2)]}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.65)" }} />

          {/* Badge stack */}
          <AbsoluteFill style={{
            paddingLeft: SAFE_SIDES,
            paddingRight: SAFE_SIDES,
            paddingTop: SAFE_TOP,
            paddingBottom: SAFE_BOTTOM,
            justifyContent: "center",
            alignItems: "flex-start",
            flexDirection: "column",
            gap: 20,
          }}>
            {detailBadges.map(({ label, color, textColor, delay }, i) => (
              <div
                key={i}
                style={{
                  transform: `translateX(${makeBadgeX(delay)}px) rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                  background: color,
                  color: textColor,
                  borderRadius: 100,
                  padding: "14px 36px",
                  fontFamily: inter,
                  fontSize: 36, fontWeight: 700,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
                }}
              >
                {label}
              </div>
            ))}
          </AbsoluteFill>

          {/* No mid-brand here — storeName already in gallery watermark & CTA */}

        </AbsoluteFill>
      </Sequence>

      {/* ════════════════════════════════════════════════════════════
          SCENE 5 — CTA (frames 390–450)
          Product image BG, store name LARGE, bouncing arrow,
          pulsing border, fades out last 10 frames
      ════════════════════════════════════════════════════════════ */}
      <Sequence from={CTA_START} durationInFrames={120} premountFor={10}>
        <AbsoluteFill style={{ opacity: fadeOut }}>

          {/* Background — first product image */}
          <Img src={firstImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

          {/* Dark vignette overlay */}
          <AbsoluteFill style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.88) 100%)",
          }} />

          {/* Pulsing border */}
          <AbsoluteFill style={{
            boxShadow: `inset 0 0 0 4px ${accentColor}`,
            opacity: pulseBorder,
            pointerEvents: "none",
          }} />

          {/* ── STORE NAME: upper-center, isolated from other text ── */}
          {/* Occupies top 45% of safe zone — nothing else here */}
          <div style={{
            position: "absolute",
            top: SAFE_TOP + 60,
            left: SAFE_SIDES,
            right: SAFE_SIDES,
            textAlign: "center",
          }}>
            {/* Style-specific graphic accent above store name */}
            {videoStyle === "neon" && (
              <div style={{
                fontFamily: inter, fontSize: 24, fontWeight: 600,
                color: accentColor, letterSpacing: 6,
                textTransform: "uppercase", marginBottom: 12,
                textShadow: `0 0 10px ${accentColor}`,
                opacity: interpolate(frame - 393, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
              }}>
                ◈ available now ◈
              </div>
            )}
            {videoStyle === "cinematic" && (
              <div style={{
                width: 80, height: 2, background: accentColor,
                margin: "0 auto 16px", opacity: nameScale,
              }} />
            )}

            {/* STORE NAME — 104px, spring entrance, its own clear zone */}
            <div style={{
              fontFamily: bebas,
              fontSize: 104,
              color: "#FFFFFF",
              letterSpacing: 6,
              lineHeight: 1,
              transform: `scale(${nameScale})`,
              textShadow: `0 0 50px ${accentColor}99, 0 4px 20px rgba(0,0,0,0.95)`,
            }}>
              {storeName}
            </div>

            {/* Thin divider line separating store name from CTA */}
            <div style={{
              width: "60%", height: 2,
              background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
              margin: "18px auto",
              opacity: interpolate(frame - 400, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
            }} />
          </div>

          {/* ── CTA TEXT + ARROW: lower-center, clearly separated ── */}
          {/* Occupies bottom 35% of safe zone — well below store name */}
          <div style={{
            position: "absolute",
            bottom: SAFE_BOTTOM + 90,
            left: SAFE_SIDES,
            right: SAFE_SIDES,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}>
            {/* "[StoreName] on eBay" — the primary CTA */}
            <div style={{
              fontFamily: bebas,
              fontSize: 64,
              color: "#FFFFFF",
              letterSpacing: 4,
              textAlign: "center",
              transform: `translateY(${ctaSlide}px)`,
              textShadow: `0 0 30px ${accentColor}80, 0 2px 16px rgba(0,0,0,0.95)`,
              lineHeight: 1.1,
            }}>
              {storeName}{" "}
              <span style={{ color: accentColor }}>on eBay</span>
            </div>

            {/* Urgency sub-line (ctaText e.g. "GRAB IT BEFORE IT'S GONE") */}
            <div style={{
              fontFamily: inter,
              fontSize: 32,
              fontWeight: 700,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: 2,
              textAlign: "center",
              transform: `translateY(${ctaSlide}px)`,
              textTransform: "uppercase",
              lineHeight: 1,
              opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
            }}>
              {ctaText}
            </div>

            {/* eBay logo */}
            <div style={{
              opacity: interpolate(frame, [15, 30], [0, 0.9], { extrapolateRight: "clamp" }),
              transform: `translateY(${ctaSlide}px)`,
            }}>
              <Img
                src={staticFile("assets/brands/ebay-logo-white.png")}
                style={{ width: 160, height: "auto" }}
              />
            </div>

            {/* Bouncing arrow */}
            <div style={{
              fontSize: 60,
              transform: `translateY(${bouncingArrow}px)`,
              color: accentColor,
              lineHeight: 1,
            }}>
              ↓
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
