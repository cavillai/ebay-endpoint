// Template 2 — Gold Price Slam (Instagram 9:16 1080x1920, 15s)
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

  const imgX = interpolate(frame, [0, 60], [-500, 0], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  const origOpacity = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: "clamp" });
  const strikeWidth = interpolate(frame, [100, 150], [0, 100], { extrapolateRight: "clamp" });
  const saleX = spring({ frame: frame - 150, fps, from: 300, to: 0, durationInFrames: 30, config: { damping: 8 } });
  const shakeX = frame >= 150 && frame < 158 ? Math.sin((frame - 150) * 3) * 8 : 0;
  const condOpacity = interpolate(frame, [240, 290], [0, 1], { extrapolateRight: "clamp" });
  const condY = interpolate(frame, [240, 290], [40, 0], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [360, 410], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, fontFamily: "Inter, sans-serif", transform: `translateX(${shakeX}px)` }}>

      {/* Product image — top half */}
      <div style={{
        position: "absolute", top: 150, left: 60, right: 60, height: 820,
        borderRadius: 20, overflow: "hidden",
        transform: `translateX(${imgX}px)`, opacity: imgOpacity,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 1020, left: 60, right: 60,
        color: "#fff", fontSize: 40, fontWeight: 700, lineHeight: 1.3,
        opacity: imgOpacity,
      }}>
        {title.length > 55 ? title.slice(0, 52) + "..." : title}
      </div>

      {/* Original price with strikethrough */}
      {originalPrice && (
        <div style={{ position: "absolute", top: 1180, left: 60, opacity: origOpacity }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: "#9ca3af", fontSize: 52, fontWeight: 700 }}>
              {formatPrice(originalPrice, currency)}
            </span>
            <div style={{
              position: "absolute", top: "50%", left: 0,
              width: `${strikeWidth}%`, height: 5,
              backgroundColor: "#ef4444", borderRadius: 2,
            }} />
          </div>
        </div>
      )}

      {/* Sale price slams in */}
      <div style={{
        position: "absolute", top: originalPrice ? 1280 : 1180, left: 60,
        transform: `translateX(${saleX}px)`,
        opacity: interpolate(frame, [150, 180], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ color: GOLD, fontSize: 88, fontWeight: 900, textShadow: `0 0 40px ${GOLD}80` }}>
          {formatPrice(price, currency)}
        </span>
      </div>

      {/* Condition badge */}
      <div style={{
        position: "absolute", bottom: 310, left: 60,
        opacity: condOpacity, transform: `translateY(${condY}px)`,
      }}>
        <ConditionBadge condition={condition} style={{ fontSize: 32, padding: "10px 24px" }} />
      </div>

      {/* Logo */}
      <div style={{ position: "absolute", top: 170, right: 50, opacity: logoOpacity }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>
    </AbsoluteFill>
  );
};
