/**
 * PROMPT 1 — The Viral Hook Machine (v3)
 * Rules: animations.md, audio.md, images.md, sequencing.md,
 *        light-leaks.md, fonts.md, transitions.md
 *
 * Fixes:
 * - Audio: switched to energetic.mp3, trimBefore skips slow intro
 * - Transitions: alternating slide/wipe/flip/clockWipe per image cut
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import { LightLeak } from "@remotion/light-leaks";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TemplateProps } from "../shared/types";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});

// ─── Constants ────────────────────────────────────────────────────────────
const SAFE_TOP = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES = 60;
const FRAMES_PER_IMAGE = 75;
const TRANSITION_FRAMES = 12; // overlap per transition
const HOOK_FRAMES = 30;
const PRICE_FRAMES = 60;
const DETAILS_FRAMES = 90;
const CTA_FRAMES = 45;

// Alternating transition presentations — each image cut feels different
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRANSITIONS: Array<() => { presentation: any; timing: any }> = [
  () => ({ presentation: slide({ direction: "from-right" }), timing: springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES }) }),
  () => ({ presentation: wipe({ direction: "from-left" }),   timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }) }),
  () => ({ presentation: flip({ direction: "from-bottom" }), timing: springTiming({ config: { damping: 180 }, durationInFrames: TRANSITION_FRAMES }) }),
  () => ({ presentation: clockWipe({ width: 1080, height: 1920 }), timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }) }),
  () => ({ presentation: slide({ direction: "from-left" }), timing: springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES }) }),
  () => ({ presentation: fade(),                             timing: linearTiming({ durationInFrames: TRANSITION_FRAMES }) }),
];

// ─── ImageSlide: Ken Burns + cross-fade per rules/images.md ───────────────
const ImageSlide: React.FC<{ src: string; index: number }> = ({ src, index }) => {
  const frame = useCurrentFrame();
  const startScale = index % 2 === 0 ? 1.15 : 1.0;
  const endScale = index % 2 === 0 ? 1.0 : 1.15;

  const scale = interpolate(frame, [0, FRAMES_PER_IMAGE], [startScale, endScale], {
    extrapolateRight: "clamp",
  });
  const panX = interpolate(frame, [0, FRAMES_PER_IMAGE], [index % 2 === 0 ? -20 : 20, 0], {
    extrapolateRight: "clamp",
  });
  const panY = interpolate(frame, [0, FRAMES_PER_IMAGE], [index % 3 === 0 ? -15 : 15, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${scale}) translateX(${panX}px) translateY(${panY}px)`,
        }}
      />
      {/* Gradient overlay for text readability */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.65) 100%)",
      }} />
    </AbsoluteFill>
  );
};

// ─── Word-by-word caption ─────────────────────────────────────────────────
const WordCaption: React.FC<{ text: string; startFrame: number }> = ({ text, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const wordIdx = Math.floor((frame - startFrame) / 8);

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", justifyContent: "center",
      gap: 8, fontFamily, fontWeight: 900, fontSize: 48, lineHeight: 1.2,
      textAlign: "center", color: "#fff",
      textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    }}>
      {words.map((word, i) => {
        const isActive = i === wordIdx;
        const wordScale = isActive
          ? spring({ frame: frame - (startFrame + i * 8), fps, from: 1.3, to: 1, durationInFrames: 10 })
          : 1;
        return (
          <span key={i} style={{
            opacity: i <= wordIdx ? 1 : 0,
            display: "inline-block",
            transform: `scale(${isActive ? wordScale : 1})`,
            color: isActive ? "#FFE500" : "#fff",
          }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Main Composition ─────────────────────────────────────────────────────
export const ViralHookMachine: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, additionalImages = [], condition,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const allImages = [imageUrl, ...additionalImages].filter(Boolean);
  const imageCount = allImages.length;

  // Gallery duration accounts for transition overlaps
  const galleryDuration = imageCount * FRAMES_PER_IMAGE - (imageCount - 1) * TRANSITION_FRAMES;

  const GALLERY_START = HOOK_FRAMES;
  const GALLERY_END = GALLERY_START + galleryDuration;
  const PRICE_START = GALLERY_END;
  const DETAILS_START = PRICE_START + PRICE_FRAMES;
  const CTA_START = DETAILS_START + DETAILS_FRAMES;

  // Active image index for progress dots
  const activeImageIdx = Math.min(
    Math.floor(Math.max(0, frame - GALLERY_START) / (FRAMES_PER_IMAGE - TRANSITION_FRAMES)),
    imageCount - 1
  );

  // Animated gradient background
  const gradientAngle = interpolate(frame, [0, durationInFrames], [0, 360]);

  // Hook: "WAIT 👀" explodes 300% → 100%
  const hookScale = spring({ frame, fps, from: 3.0, to: 1.0, durationInFrames: HOOK_FRAMES, config: { damping: 12, stiffness: 200 } });

  // Screen shake on price reveal
  const shakeX = frame >= PRICE_START && frame <= PRICE_START + 15
    ? Math.sin(frame * 2.8) * interpolate(frame, [PRICE_START, PRICE_START + 15], [8, 0])
    : 0;

  // Price count-up
  const priceNum = parseFloat(price);
  const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const priceProgress = easeOutExpo(Math.min(1, Math.max(0, (frame - PRICE_START) / 60)));
  const displayPrice = priceNum * priceProgress;

  // Sticker badges
  const badges = [
    { label: condition, bg: "#4ade80", color: "#000" },
    { label: storeName, bg: "#681FCB", color: "#fff" },
    { label: currency === "USD" ? `$${price}` : `${currency} ${price}`, bg: "#FFE500", color: "#000" },
  ];

  // CTA pulse
  const pulse = Math.sin(frame * 0.15) * 0.08 + 1.0;
  const logoScale = spring({ frame: Math.max(0, frame - CTA_START), fps, from: 0, to: 1, durationInFrames: 20, config: { stiffness: 200, damping: 15 } });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${gradientAngle}deg, #0a0a0a, #1a0a2e)`,
      fontFamily,
      transform: `translateX(${shakeX}px)`,
      overflow: "hidden",
    }}>

      {/* ── AUDIO: energetic.mp3, trimBefore skips slow intro ─────────
          trimBefore=300 skips first 10s to hit the beat immediately   */}
      <Audio
        src={staticFile("music/energetic.mp3")}
        volume={0.65}
        trimBefore={300}
        loop
      />

      {/* ════ SCENE 1 — HOOK (frames 0–30) ════════════════════════════ */}
      <Sequence from={0} durationInFrames={HOOK_FRAMES + 10} premountFor={5}>
        <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
          <div style={{
            fontSize: 96, fontWeight: 900, color: "#fff",
            transform: `scale(${hookScale})`,
            letterSpacing: -2, textAlign: "center",
          }}>
            WAIT 👀
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════ SCENE 2 — IMAGE GALLERY with alternating transitions ═════ */}
      {frame >= GALLERY_START && frame < GALLERY_END + 20 && (
        <Sequence from={GALLERY_START} durationInFrames={galleryDuration + 20} premountFor={15}>
          <AbsoluteFill>
            {/* TransitionSeries: alternating slide/wipe/flip/clockWipe/fade */}
            <TransitionSeries>
              {allImages.map((imgUrl, index) => {
                const t = TRANSITIONS[index % TRANSITIONS.length]();
                return (
                  <React.Fragment key={index}>
                    <TransitionSeries.Sequence durationInFrames={FRAMES_PER_IMAGE} premountFor={TRANSITION_FRAMES}>
                      <ImageSlide src={imgUrl} index={index} />
                    </TransitionSeries.Sequence>
                    {index < allImages.length - 1 && (
                      <TransitionSeries.Transition
                        presentation={t.presentation}
                        timing={t.timing}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </TransitionSeries>

            {/* LightLeak flashes at each transition point — separate layer */}
            {allImages.slice(1).map((_, index) => {
              const transitionFrame = (index + 1) * (FRAMES_PER_IMAGE - TRANSITION_FRAMES);
              return (
                <Sequence key={`leak-${index}`} from={transitionFrame - 4} durationInFrames={18} premountFor={4}>
                  <AbsoluteFill>
                    <LightLeak durationInFrames={18} seed={index + 1} hueShift={index * 72} />
                  </AbsoluteFill>
                </Sequence>
              );
            })}

            {/* Title word-by-word — safe zone top */}
            <div style={{ position: "absolute", top: SAFE_TOP + 10, left: SAFE_SIDES, right: SAFE_SIDES, textAlign: "center" }}>
              <WordCaption
                text={title.length > 55 ? title.slice(0, 52) + "…" : title}
                startFrame={20}
              />
            </div>

            {/* Progress dots — safe zone bottom */}
            <div style={{
              position: "absolute", bottom: SAFE_BOTTOM + 20,
              left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10,
            }}>
              {allImages.map((_, i) => (
                <div key={i} style={{
                  width: i === activeImageIdx ? 28 : 10,
                  height: 10, borderRadius: 5,
                  backgroundColor: "#fff",
                  opacity: i === activeImageIdx ? 1 : 0.4,
                }} />
              ))}
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ════ SCENE 3 — PRICE REVEAL ══════════════════════════════════ */}
      <Sequence from={PRICE_START} durationInFrames={PRICE_FRAMES + 5} premountFor={10}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20, padding: "40px 60px", textAlign: "center",
            transform: `scale(${spring({ frame: useCurrentFrame(), fps, from: 0.5, to: 1, durationInFrames: 20, config: { stiffness: 200, damping: 15 } })})`,
          }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Only</div>
            <div style={{
              color: "#00FF88", fontSize: 80, fontWeight: 800,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
              textShadow: "0 0 40px rgba(0,255,136,0.5)",
            }}>
              {currency === "USD" ? "$" : currency}{displayPrice.toFixed(2)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 28, marginTop: 8 }}>{condition}</div>
          </div>

          {/* Particle burst */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const f = useCurrentFrame();
              const dist = interpolate(f, [10, 50], [0, 180], { extrapolateRight: "clamp" });
              const op = interpolate(f, [10, 30, 50], [0, 1, 0], { extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  position: "absolute", width: 8, height: 8, borderRadius: "50%",
                  background: "#FFD700", opacity: op,
                  transform: `translate(${Math.cos(angle) * dist - 4}px, ${Math.sin(angle) * dist - 4}px)`,
                }} />
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════ SCENE 4 — STICKER BADGE DROPS ══════════════════════════ */}
      <Sequence from={DETAILS_START} durationInFrames={DETAILS_FRAMES + 5} premountFor={10}>
        <AbsoluteFill>
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            transform: "translateY(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
            paddingLeft: SAFE_SIDES, paddingRight: SAFE_SIDES,
          }}>
            {badges.map((badge, i) => {
              const lf = useCurrentFrame();
              const badgeSpring = spring({ frame: Math.max(0, lf - i * 20), fps, config: { damping: 14, stiffness: 180 } });
              const badgeY = interpolate(badgeSpring, [0, 1], [-200, 0]);
              return (
                <div key={i} style={{
                  backgroundColor: badge.bg, color: badge.color,
                  borderRadius: 100, padding: "14px 36px",
                  fontSize: 36, fontWeight: 800,
                  transform: `translateY(${badgeY}px) rotate(${i % 2 === 0 ? -4 : 4}deg)`,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                }}>
                  {badge.label}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ════ SCENE 5 — CTA ═══════════════════════════════════════════ */}
      <Sequence from={CTA_START} durationInFrames={CTA_FRAMES} premountFor={10}>
        <AbsoluteFill style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)",
          justifyContent: "flex-end", alignItems: "center",
          paddingBottom: SAFE_BOTTOM + 20,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, transform: `scale(${logoScale})` }}>
            <div style={{
              background: "linear-gradient(135deg, #681FCB, #F73A8A)",
              borderRadius: 50, padding: "20px 56px",
              color: "#fff", fontSize: 44, fontWeight: 900,
              transform: `scale(${pulse})`,
              boxShadow: "0 8px 40px rgba(247,58,138,0.4)",
              textAlign: "center",
            }}>
              Shop {storeName} → Link in bio 👇
            </div>
            {storeLogo ? (
              <Img src={storeLogo} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }} />
            ) : (
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 28, fontWeight: 600 }}>
                {storeName} on eBay
              </div>
            )}
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
