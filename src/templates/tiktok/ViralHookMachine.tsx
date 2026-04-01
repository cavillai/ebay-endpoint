/**
 * PROMPT 1 — The Viral Hook Machine
 * Rules loaded: animations.md, audio.md, light-leaks.md, images.md
 *
 * All animations driven by useCurrentFrame() — NO CSS transitions.
 * spring() for all entrances. Ken Burns on product image.
 * Safe zones: 150px top, 170px bottom, 60px sides.
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LightLeak } from "@remotion/light-leaks";
import { TemplateProps } from "../shared/types";

// ─── Safe Zone Constants ───────────────────────────────────────────────────
const SAFE_TOP = 150;
const SAFE_BOTTOM = 170;
const SAFE_SIDES = 60;

// ─── TikTok-style word-by-word caption ────────────────────────────────────
const WordByWordCaption: React.FC<{
  text: string;
  startFrame: number;
  framesPerWord?: number;
  fontSize?: number;
}> = ({ text, startFrame, framesPerWord = 8, fontSize = 56 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const wordIndex = Math.floor((frame - startFrame) / framesPerWord);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        fontFamily: "Inter, sans-serif",
        fontWeight: 900,
        fontSize,
        lineHeight: 1.2,
        textAlign: "center",
        color: "#fff",
        textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
      }}
    >
      {words.map((word, i) => {
        const isActive = i === wordIndex;
        const isVisible = i <= wordIndex;
        // 4-frame scale bounce: 130% → 100%
        const wordScale = isActive
          ? spring({
              frame: frame - (startFrame + i * framesPerWord),
              fps,
              from: 1.3,
              to: 1,
              durationInFrames: 12,
              config: { overshootClamping: false },
            })
          : 1;

        return (
          <span
            key={i}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `scale(${isActive ? wordScale : 1})`,
              display: "inline-block",
              color: isActive ? "#FFE500" : "#fff",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
export const ViralHookMachine: React.FC<TemplateProps> = ({
  storeName,
  storeLogo,
  title,
  price,
  currency = "USD",
  imageUrl,
  condition,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Frame markers (in frames at 30fps) ──
  const HOOK_END = 2 * fps;       // 0–60
  const REVEAL_END = 8 * fps;     // 60–240
  const ENERGY_END = 12 * fps;    // 240–360
  const CTA_START = 12 * fps;     // 360–450
  const LIGHT_LEAK_FRAME = Math.round(2.2 * fps); // frame 66

  // ── HOOK: "WAIT." slams in 200% → 100% in 8 frames ──
  const hookScale = spring({
    frame,
    fps,
    from: 2,
    to: 1,
    durationInFrames: 8,
    config: { overshootClamping: true },
  });
  // White pulse on beat 1 (frame 0-4)
  const whitePulse = interpolate(frame, [0, 2, 6], [1, 0.8, 0], {
    extrapolateRight: "clamp",
  });

  // ── REVEAL: Ken Burns — 140% pull back to 100% over 180 frames ──
  const kenBurnsScale = interpolate(
    frame,
    [HOOK_END, HOOK_END + 180],
    [1.4, 1.0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const imageOpacity = interpolate(frame, [HOOK_END, HOOK_END + 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── ENERGY: price counter $0 → price with easeOutExpo ──
  const priceNum = parseFloat(price);
  const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const priceProgress = easeOutExpo(
    Math.min(
      1,
      Math.max(0, (frame - REVEAL_END) / 60)
    )
  );
  const animatedPrice = (priceNum * priceProgress).toFixed(2);

  // Condition badge slides up with spring (stiffness: 200, damping: 20)
  const conditionY = spring({
    frame: frame - REVEAL_END - 20,
    fps,
    from: 120,
    to: 0,
    durationInFrames: 30,
    config: { stiffness: 200, damping: 20 },
  });
  const conditionOpacity = interpolate(
    frame,
    [REVEAL_END + 20, REVEAL_END + 40],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Logo heartbeat 100% → 105% → 100% every 30 frames
  const heartbeatCycle = frame % 30;
  const logoScale =
    frame >= REVEAL_END
      ? 1 + interpolate(heartbeatCycle, [0, 8, 15, 23, 30], [0, 0.05, 0, 0.02, 0])
      : 1;
  const logoOpacity = interpolate(frame, [REVEAL_END, REVEAL_END + 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── CTA: char-by-char typeout + zoom ──
  const ctaText = "Link in bio 👇";
  const charsVisible = Math.floor(
    interpolate(frame, [CTA_START, CTA_START + 40], [0, ctaText.length], {
      extrapolateRight: "clamp",
    })
  );
  const ctaFrameZoom = interpolate(frame, [CTA_START, durationInFrames], [1, 1.03], {
    extrapolateRight: "clamp",
  });
  // Pulsing arrow (2fps = every 15 frames)
  const arrowOpacity = Math.floor(frame / 15) % 2 === 0 ? 1 : 0.3;

  // ── AUDIO: music volume defined for when audio is enabled ──
  // Duck to 25% during captions, 70% otherwise
  // const captionsActive = frame >= HOOK_END && frame < ENERGY_END;
  // const musicVolume = captionsActive ? 0.25 : 0.7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        fontFamily: "Inter, sans-serif",
        transform: `scale(${ctaFrameZoom})`,
        transformOrigin: "center center",
        overflow: "hidden",
      }}
    >
      {/* ── AUDIO ── place royalty-free track at public/music/energetic-beat.mp3 */}
      {/* Uncomment once music file is added:
      <Sequence from={0} durationInFrames={durationInFrames}>
        <Audio src={staticFile("music/energetic-beat.mp3")} volume={musicVolume} loop />
      </Sequence>
      */}

      {/* ── SCENE 1: HOOK (0–2s) ── */}
      {frame < HOOK_END && (
        <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
          {/* White pulse flash */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#fff",
              opacity: whitePulse,
            }}
          />
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: "#fff",
              transform: `scale(${hookScale})`,
              letterSpacing: -2,
            }}
          >
            WAIT.
          </div>
        </AbsoluteFill>
      )}

      {/* ── SCENE 2–3: PRODUCT IMAGE + CAPTIONS (2s–12s) ── */}
      {frame >= HOOK_END && (
        <>
          {/* Ken Burns product image */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              opacity: imageOpacity,
            }}
          >
            <Img
              src={imageUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${kenBurnsScale})`,
                transformOrigin: "center center",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%)",
              }}
            />
          </div>

          {/* Light leak at 2.2s */}
          {frame >= LIGHT_LEAK_FRAME && frame < LIGHT_LEAK_FRAME + 30 && (
            <AbsoluteFill>
              <LightLeak durationInFrames={30} seed={3} hueShift={30} />
            </AbsoluteFill>
          )}

          {/* Title — word by word, safe zone top */}
          {frame >= HOOK_END + 20 && frame < ENERGY_END && (
            <div
              style={{
                position: "absolute",
                top: SAFE_TOP + 20,
                left: SAFE_SIDES,
                right: SAFE_SIDES,
                textAlign: "center",
              }}
            >
              <WordByWordCaption
                text={title.length > 60 ? title.slice(0, 57) + "..." : title}
                startFrame={HOOK_END + 20}
                framesPerWord={10}
                fontSize={56}
              />
            </div>
          )}
        </>
      )}

      {/* ── SCENE 3: ENERGY (8s–12s) ── */}
      {frame >= REVEAL_END && frame < CTA_START && (
        <>
          {/* Animated price counter */}
          <div
            style={{
              position: "absolute",
              top: "44%",
              left: 0,
              right: 0,
              textAlign: "center",
              transform: "translateY(-50%)",
            }}
          >
            <div
              style={{
                fontSize: 112,
                fontWeight: 900,
                color: "#4ade80",
                textShadow: "0 0 40px rgba(74,222,128,0.6)",
                lineHeight: 1,
              }}
            >
              {currency === "USD" ? "$" : currency}
              {animatedPrice}
            </div>
          </div>

          {/* Condition badge slides up */}
          <div
            style={{
              position: "absolute",
              bottom: SAFE_BOTTOM + 200,
              left: SAFE_SIDES,
              right: SAFE_SIDES,
              display: "flex",
              justifyContent: "center",
              transform: `translateY(${conditionY}px)`,
              opacity: conditionOpacity,
            }}
          >
            <div
              style={{
                backgroundColor: "#4ade80",
                borderRadius: 100,
                padding: "10px 32px",
                color: "#000",
                fontSize: 36,
                fontWeight: 800,
              }}
            >
              {condition}
            </div>
          </div>

          {/* Logo heartbeat pulse */}
          {storeLogo ? (
            <Img
              src={storeLogo}
              style={{
                position: "absolute",
                bottom: SAFE_BOTTOM + 120,
                left: "50%",
                transform: `translateX(-50%) scale(${logoScale})`,
                width: 80,
                height: 80,
                borderRadius: 16,
                objectFit: "cover",
                opacity: logoOpacity,
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                bottom: SAFE_BOTTOM + 120,
                left: "50%",
                transform: `translateX(-50%) scale(${logoScale})`,
                backgroundColor: "#681FCB",
                borderRadius: 16,
                padding: "10px 28px",
                color: "#fff",
                fontSize: 32,
                fontWeight: 800,
                opacity: logoOpacity,
              }}
            >
              {storeName}
            </div>
          )}
        </>
      )}

      {/* ── SCENE 4: CTA (12s–15s) ── */}
      {frame >= CTA_START && (
        <>
          {/* Dark overlay for CTA readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            }}
          />

          {/* Typeout text */}
          <div
            style={{
              position: "absolute",
              bottom: SAFE_BOTTOM + 100,
              left: SAFE_SIDES,
              right: SAFE_SIDES,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: "#fff",
                textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                lineHeight: 1.2,
                letterSpacing: -1,
              }}
            >
              {ctaText.slice(0, charsVisible)}
            </div>

            {/* Pulsing arrow */}
            <div
              style={{
                fontSize: 56,
                marginTop: 16,
                opacity: arrowOpacity,
              }}
            >
              👇
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
