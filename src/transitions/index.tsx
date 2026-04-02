/**
 * Transition Graphics Library — Remotion compositions
 * Each renders as a short MP4 loop for use as overlay/transition.
 * 1080x1920 @ 30fps unless noted.
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { noise2D } from "@remotion/noise";

// ─── WIPES ────────────────────────────────────────────────────────────────

export const WipeLeft: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const x = interpolate(frame, [0, 20], [width, -width], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: x, width, backgroundColor: "#fff" }} />
    </AbsoluteFill>
  );
};

export const WipeRight: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const x = interpolate(frame, [0, 20], [-width, width], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, right: x, width, backgroundColor: "#fff" }} />
    </AbsoluteFill>
  );
};

export const WipeUp: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const y = interpolate(frame, [0, 20], [height, -height], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: y, height, backgroundColor: "#fff" }} />
    </AbsoluteFill>
  );
};

export const WipeDiagonal: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 25], [0, 100], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, #fff ${progress - 10}%, transparent ${progress + 10}%)`,
      }} />
    </AbsoluteFill>
  );
};

// ─── FLASHES ──────────────────────────────────────────────────────────────

export const WhiteFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 4, 8, 16], [0, 1, 0.8, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: `rgba(255,255,255,${opacity})` }} />;
};

export const BlackFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 4, 8, 16], [0, 1, 0.8, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${opacity})` }} />;
};

export const ColorFlash: React.FC<{ color?: string }> = ({ color = "#FFD700" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 3, 6, 14], [0, 1, 0.7, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
};

// ─── GLITCH ───────────────────────────────────────────────────────────────

export const Glitch01: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const slices = 12;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: slices }).map((_, i) => {
        const offset = noise2D("glitch", i * 0.3, frame * 0.5) * 60;
        const opacity = noise2D("op", i, frame * 0.3) > 0.3 ? 1 : 0;
        const h = height / slices;
        return (
          <div key={i} style={{
            position: "absolute",
            top: i * h, left: 0, right: 0, height: h,
            overflow: "hidden",
            transform: `translateX(${offset}px)`,
            opacity,
          }}>
            <div style={{
              width: "100%", height: "100%",
              background: `rgba(${Math.floor(noise2D("r",i,frame)*255)}, 0, ${Math.floor(noise2D("b",i,frame)*255)}, 0.6)`,
            }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Glitch02: React.FC = () => {
  const frame = useCurrentFrame();
  const rgbShift = noise2D("rgb", frame * 0.1, 0) * 20;
  const opacity = interpolate(frame, [0, 5, 25, 30], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "screen" }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: `rgba(255,0,0,0.5)`, transform: `translateX(${-rgbShift}px)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: `rgba(0,255,0,0.5)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: `rgba(0,0,255,0.5)`, transform: `translateX(${rgbShift}px)` }} />
    </AbsoluteFill>
  );
};

export const Glitch03: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const bars = Array.from({ length: 8 }, (_, i) => ({
    y: noise2D("y", i, frame * 0.2) * height,
    h: Math.abs(noise2D("h", i, frame * 0.15)) * 80 + 5,
    opacity: noise2D("o", i, frame * 0.4) > 0 ? 0.8 : 0,
  }));
  return (
    <AbsoluteFill>
      {bars.map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: 0, right: 0,
          top: b.y, height: b.h,
          backgroundColor: i % 2 === 0 ? "#fff" : "#0ff",
          opacity: b.opacity,
          mixBlendMode: "overlay" as const,
        }} />
      ))}
    </AbsoluteFill>
  );
};

// ─── LIGHT LEAKS ──────────────────────────────────────────────────────────

const LeakBase: React.FC<{ color: string; seed?: number }> = ({ color, seed = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 35, 45], [0, 0.9, 0.7, 0], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 45], [0.8, 1.3], { extrapolateRight: "clamp" });
  const x = (seed % 3) * 30 - 30;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{
        position: "absolute",
        width: 800, height: 1400,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at 40% 30%, ${color}cc 0%, ${color}44 40%, transparent 70%)`,
        left: `${20 + x}%`,
        top: "-10%",
        transform: `scale(${scale}) rotate(${seed * 15}deg)`,
        mixBlendMode: "screen" as const,
      }} />
    </AbsoluteFill>
  );
};

export const LeakOrange: React.FC = () => <LeakBase color="#FF6B00" seed={0} />;
export const LeakWhite: React.FC  = () => <LeakBase color="#FFFFFF" seed={1} />;
export const LeakGold: React.FC   = () => <LeakBase color="#FFD700" seed={2} />;
export const LeakPink: React.FC   = () => <LeakBase color="#FF1493" seed={3} />;

// ─── OVERLAYS ─────────────────────────────────────────────────────────────

export const GrainOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: gw, height } = useVideoConfig();
  // Animated noise grid
  const cells = 40;
  const cw = gw / cells;
  const ch = height / cells;
  return (
    <AbsoluteFill style={{ opacity: 0.08 }}>
      {Array.from({ length: cells * cells }).map((_, i) => {
        const col = i % cells;
        const row = Math.floor(i / cells);
        const v = noise2D("grain", col + frame * 0.7, row + frame * 0.3);
        return (
          <div key={i} style={{
            position: "absolute",
            left: col * cw, top: row * ch,
            width: cw, height: ch,
            backgroundColor: `rgba(255,255,255,${Math.abs(v)})`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

export const ScanlinesOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const scrollY = (frame * 2) % (height * 2);
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: 0.15 }}>
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: -scrollY, height: height * 3,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.8) 3px, rgba(0,0,0,0.8) 4px)",
      }} />
    </AbsoluteFill>
  );
};

export const VHSStatic: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const lines = 20;
  return (
    <AbsoluteFill style={{ opacity: 0.12 }}>
      {Array.from({ length: lines }).map((_, i) => {
        const y = noise2D("vhs", i, frame * 0.8) * height;
        const w = Math.abs(noise2D("w", i, frame * 0.5)) * width * 0.4 + 20;
        const x = noise2D("x", i, frame * 0.6) * width;
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y,
            width: w, height: 2,
            backgroundColor: "#fff",
            opacity: Math.abs(noise2D("o", i, frame * 0.4)) * 0.8,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ─── SHAPE REVEALS ────────────────────────────────────────────────────────

export const CircleReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: w, height } = useVideoConfig();
  const maxR = Math.sqrt(w * w + height * height) / 2 + 50;
  const radius = interpolate(frame, [0, 30], [0, maxR], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <svg width={w} height={height}>
        <defs>
          <mask id="circle-mask">
            <rect width={w} height={height} fill="black" />
            <circle cx={w / 2} cy={height / 2} r={radius} fill="white" />
          </mask>
        </defs>
        <rect width={w} height={height} fill="white" mask="url(#circle-mask)" />
      </svg>
    </AbsoluteFill>
  );
};

export const SlashReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const progress = interpolate(frame, [0, 25], [0, width + height], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        <defs>
          <mask id="slash-mask">
            <rect width={width} height={height} fill="black" />
            <polygon
              points={`0,${height} ${progress},0 ${progress + 200},0 200,${height}`}
              fill="white"
            />
          </mask>
        </defs>
        <rect width={width} height={height} fill="white" mask="url(#slash-mask)" />
      </svg>
    </AbsoluteFill>
  );
};

export const InkReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drops = 6;
  return (
    <AbsoluteFill>
      <svg width={width} height={height}>
        <defs>
          <mask id="ink-mask">
            <rect width={width} height={height} fill="black" />
            {Array.from({ length: drops }).map((_, i) => {
              const delay = i * 3;
              const r = interpolate(Math.max(0, frame - delay), [0, 20], [0, 500], { extrapolateRight: "clamp" });
              const cx = (width / (drops - 1)) * i;
              const cy = (i % 2 === 0 ? 0.3 : 0.6) * height;
              return <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 1.3} fill="white" />;
            })}
          </mask>
        </defs>
        <rect width={width} height={height} fill="white" mask="url(#ink-mask)" />
      </svg>
    </AbsoluteFill>
  );
};
