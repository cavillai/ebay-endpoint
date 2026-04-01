// Template 1 — Clean Product Reveal (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { PURPLE, PINK, StoreBadge, formatPrice, usePulse } from "../shared/utils";

export const CleanProductReveal: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD", imageUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo fade in 0-30
  const logoOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  // Image scale 30-90 (80% → 100%)
  const imgScale = interpolate(frame, [30, 90], [0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const imgOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });

  // Title slide up from bottom 90-150
  const titleY = spring({ frame: frame - 90, fps, from: 60, to: 0, durationInFrames: 40 });
  const titleOpacity = interpolate(frame, [90, 130], [0, 1], { extrapolateRight: "clamp" });

  // Price fade in 150-210
  const priceOpacity = interpolate(frame, [150, 210], [0, 1], { extrapolateRight: "clamp" });

  // CTA pulse 330-450
  const ctaOpacity = interpolate(frame, [330, 360], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = usePulse(0.04);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Logo */}
      <div style={{ position: "absolute", top: 60, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: logoOpacity }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Product image */}
      <div style={{
        position: "absolute", top: 130, left: 80, right: 80, height: 600,
        borderRadius: 20, overflow: "hidden",
        boxShadow: `0 20px 60px rgba(104,31,203,0.4)`,
        transform: `scale(${imgScale})`,
        opacity: imgOpacity,
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", bottom: 240, left: 60, right: 60,
        textAlign: "center", color: "#fff", fontSize: 42, fontWeight: 800, lineHeight: 1.2,
        transform: `translateY(${titleY}px)`, opacity: titleOpacity,
      }}>
        {title.length > 60 ? title.slice(0, 57) + "..." : title}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", bottom: 165, left: 0, right: 0,
        textAlign: "center", color: "#4ade80", fontSize: 56, fontWeight: 900,
        opacity: priceOpacity,
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center",
        opacity: ctaOpacity, transform: `scale(${ctaScale})`,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
          borderRadius: 50, padding: "14px 40px",
          color: "#fff", fontSize: 32, fontWeight: 700,
        }}>
          Shop {storeName} on eBay
        </div>
      </div>
    </AbsoluteFill>
  );
};
