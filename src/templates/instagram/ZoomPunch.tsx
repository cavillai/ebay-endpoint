// Template 8 — Zoom Punch (Instagram 9:16 1080x1920, 15s)
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

  const imgScale = interpolate(frame, [0, 180], [1.3, 1.0], { extrapolateRight: "clamp" });
  const titleScale = spring({ frame: frame - 90, fps, from: 1.1, to: 1, durationInFrames: 20 });
  const titleOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" });
  const priceY = spring({ frame: frame - 180, fps, from: -150, to: 0, durationInFrames: 30, config: { damping: 10 } });
  const priceOpacity = interpolate(frame, [180, 200], [0, 1], { extrapolateRight: "clamp" });

  const isEndingSoon = itemEndDate
    ? (new Date(itemEndDate).getTime() - Date.now()) < 3 * 24 * 3600 * 1000
    : false;
  const urgencyOpacity = interpolate(frame, [240, 270], [0, 1], { extrapolateRight: "clamp" });
  const urgencyPulse = 1 + Math.sin(frame * 0.1) * 0.05;

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
      {/* Ken Burns */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${imgScale})`, transformOrigin: "center" }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      </div>

      {/* Logo watermark */}
      <div style={{ position: "absolute", top: 170, right: 50, opacity: 0.4 }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Title punch */}
      <div style={{
        position: "absolute", top: "40%", left: 60, right: 60, textAlign: "center",
        color: "#fff", fontSize: 52, fontWeight: 900, lineHeight: 1.2,
        transform: `translateY(-50%) scale(${titleScale})`,
        opacity: titleOpacity,
        textShadow: "2px 2px 10px rgba(0,0,0,0.8)",
      }}>
        {title.length > 65 ? title.slice(0, 62) + "..." : title}
      </div>

      {/* Price drop */}
      <div style={{
        position: "absolute", bottom: isEndingSoon ? 340 : 240, left: 0, right: 0, textAlign: "center",
        color: "#4ade80", fontSize: 96, fontWeight: 900,
        transform: `translateY(${priceY}px)`,
        opacity: priceOpacity,
        textShadow: "0 0 40px rgba(74,222,128,0.5)",
      }}>
        {formatPrice(price, currency)}
      </div>

      {isEndingSoon && (
        <div style={{
          position: "absolute", bottom: 210, left: 0, right: 0, display: "flex", justifyContent: "center",
          opacity: urgencyOpacity, transform: `scale(${urgencyPulse})`,
        }}>
          <div style={{
            backgroundColor: "#ef4444", borderRadius: 50, padding: "12px 36px",
            color: "#fff", fontSize: 36, fontWeight: 700,
            boxShadow: "0 0 24px rgba(239,68,68,0.5)",
          }}>
            ⏱ Ending Soon
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
