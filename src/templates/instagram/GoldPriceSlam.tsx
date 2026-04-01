// Template 2 — Gold Price Slam (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { GOLD, NAVY, StoreBadge, ConditionBadge, formatPrice } from "../shared/utils";

export const GoldPriceSlam: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, originalPrice, currency = "USD",
  imageUrl, condition,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image slides in from left 0-60
  const imgX = interpolate(frame, [0, 60], [-400, 0], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

  // Original price fades in 60-150
  const origOpacity = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: "clamp" });

  // Strike-through grows 100-150
  const strikeWidth = interpolate(frame, [100, 150], [0, 100], { extrapolateRight: "clamp" });

  // Sale price slams in from right 150-240 + screen shake
  const saleX = spring({ frame: frame - 150, fps, from: 300, to: 0, durationInFrames: 30, config: { damping: 8 } });
  const shakeX = frame >= 150 && frame < 158 ? Math.sin((frame - 150) * 3) * 8 : 0;

  // Condition badge 240-360
  const condOpacity = interpolate(frame, [240, 290], [0, 1], { extrapolateRight: "clamp" });
  const condY = interpolate(frame, [240, 290], [40, 0], { extrapolateRight: "clamp" });

  // Logo top right 360-450
  const logoOpacity = interpolate(frame, [360, 410], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, fontFamily: "Inter, sans-serif", transform: `translateX(${shakeX}px)` }}>

      {/* Product image */}
      <div style={{
        position: "absolute", top: 120, left: 60, width: 460, height: 500,
        borderRadius: 16, overflow: "hidden",
        transform: `translateX(${imgX}px)`, opacity: imgOpacity,
        boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 120, left: 560, right: 40,
        color: "#fff", fontSize: 34, fontWeight: 700, lineHeight: 1.3,
        opacity: imgOpacity,
      }}>
        {title.length > 50 ? title.slice(0, 47) + "..." : title}
      </div>

      {/* Original price with strikethrough */}
      {originalPrice && (
        <div style={{ position: "absolute", top: 380, left: 560, opacity: origOpacity }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: "#9ca3af", fontSize: 44, fontWeight: 700 }}>
              {formatPrice(originalPrice, currency)}
            </span>
            <div style={{
              position: "absolute", top: "50%", left: 0,
              width: `${strikeWidth}%`, height: 4,
              backgroundColor: "#ef4444", borderRadius: 2,
            }} />
          </div>
        </div>
      )}

      {/* Sale price slams in */}
      <div style={{
        position: "absolute", top: originalPrice ? 450 : 380, left: 560,
        transform: `translateX(${saleX}px)`,
        opacity: interpolate(frame, [150, 180], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ color: GOLD, fontSize: 72, fontWeight: 900, textShadow: `0 0 30px ${GOLD}80` }}>
          {formatPrice(price, currency)}
        </span>
      </div>

      {/* Condition badge */}
      <div style={{
        position: "absolute", bottom: 160, left: 60,
        opacity: condOpacity, transform: `translateY(${condY}px)`,
      }}>
        <ConditionBadge condition={condition} />
      </div>

      {/* Logo top right */}
      <div style={{ position: "absolute", top: 40, right: 40, opacity: logoOpacity }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
