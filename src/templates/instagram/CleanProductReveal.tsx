// Template 1 — Clean Product Reveal (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TemplateProps } from "../shared/types";
import { PURPLE, PINK, StoreBadge, formatPrice, usePulse } from "../shared/utils";

export const CleanProductReveal: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD", imageUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [30, 90], [0.8, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const imgOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame: frame - 90, fps, from: 60, to: 0, durationInFrames: 40 });
  const titleOpacity = interpolate(frame, [90, 130], [0, 1], { extrapolateRight: "clamp" });
  const priceOpacity = interpolate(frame, [150, 210], [0, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [330, 360], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = usePulse(0.04);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Background gradient */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, rgba(104,31,203,0.15) 0%, transparent 70%)` }} />

      {/* Logo — safe zone top (150px) */}
      <div style={{ position: "absolute", top: 160, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: logoOpacity }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Product image — large, center of frame */}
      <div style={{
        position: "absolute", top: 260, left: 60, right: 60, height: 900,
        borderRadius: 24, overflow: "hidden",
        boxShadow: `0 24px 80px rgba(104,31,203,0.4)`,
        transform: `scale(${imgScale})`, opacity: imgOpacity,
      }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 1210, left: 60, right: 60, textAlign: "center",
        color: "#fff", fontSize: 46, fontWeight: 800, lineHeight: 1.2,
        transform: `translateY(${titleY}px)`, opacity: titleOpacity,
      }}>
        {title.length > 65 ? title.slice(0, 62) + "..." : title}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", top: 1400, left: 0, right: 0, textAlign: "center",
        color: "#4ade80", fontSize: 72, fontWeight: 900,
        textShadow: "0 0 30px rgba(74,222,128,0.4)",
        opacity: priceOpacity,
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* CTA — safe zone bottom (170px) */}
      <div style={{
        position: "absolute", bottom: 200, left: 0, right: 0, textAlign: "center",
        opacity: ctaOpacity, transform: `scale(${ctaScale})`,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
          borderRadius: 50, padding: "18px 50px",
          color: "#fff", fontSize: 36, fontWeight: 700,
        }}>
          Shop {storeName} on eBay
        </div>
      </div>
    </AbsoluteFill>
  );
};
