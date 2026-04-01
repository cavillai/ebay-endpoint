// Template 8 — Zoom Punch (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, formatPrice } from "../shared/utils";

export const ZoomPunch: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, itemEndDate,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns: 130% → 100% over 180 frames
  const imgScale = interpolate(frame, [0, 180], [1.3, 1.0], { extrapolateRight: "clamp" });

  // Title punches in at frame 90
  const titleScale = spring({ frame: frame - 90, fps, from: 1.1, to: 1, durationInFrames: 20 });
  const titleOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" });

  // Price gravity drop at 180
  const priceY = spring({ frame: frame - 180, fps, from: -120, to: 0, durationInFrames: 30, config: { damping: 10 } });
  const priceOpacity = interpolate(frame, [180, 200], [0, 1], { extrapolateRight: "clamp" });

  // Check if ending soon
  const isEndingSoon = itemEndDate ? (new Date(itemEndDate).getTime() - Date.now()) < 3 * 24 * 3600 * 1000 : false;
  const urgencyOpacity = interpolate(frame, [240, 270], [0, 1], { extrapolateRight: "clamp" });
  const urgencyPulse = 1 + Math.sin(frame * 0.1) * 0.05;

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Ken Burns image */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${imgScale})`, transformOrigin: "center" }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      </div>

      {/* Logo watermark top-right */}
      <div style={{ position: "absolute", top: 40, right: 40, opacity: 0.4 }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Title punch */}
      <div style={{
        position: "absolute", top: "38%", left: 50, right: 50, textAlign: "center",
        color: "#fff", fontSize: 44, fontWeight: 900, lineHeight: 1.2,
        transform: `translateY(-50%) scale(${titleScale})`,
        opacity: titleOpacity,
        textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
      }}>
        {title.length > 60 ? title.slice(0, 57) + "..." : title}
      </div>

      {/* Price drop */}
      <div style={{
        position: "absolute", bottom: isEndingSoon ? 220 : 140, left: 0, right: 0, textAlign: "center",
        color: "#4ade80", fontSize: 80, fontWeight: 900,
        transform: `translateY(${priceY}px)`,
        opacity: priceOpacity,
        textShadow: "0 0 30px rgba(74,222,128,0.5)",
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Ending soon badge */}
      {isEndingSoon && (
        <div style={{
          position: "absolute", bottom: 100, left: 0, right: 0, display: "flex", justifyContent: "center",
          opacity: urgencyOpacity, transform: `scale(${urgencyPulse})`,
        }}>
          <div style={{
            backgroundColor: "#ef4444", borderRadius: 50, padding: "10px 30px",
            color: "#fff", fontSize: 32, fontWeight: 700,
            boxShadow: "0 0 20px rgba(239,68,68,0.5)",
          }}>
            ⏱ Ending Soon
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
