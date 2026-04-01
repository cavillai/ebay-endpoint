// Template 3 — Condition Spotlight (Instagram 1080x1080, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, ConditionBadge, formatPrice } from "../shared/utils";

export const ConditionSpotlight: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, additionalImages = [], condition,
}) => {
  const frame = useCurrentFrame();
  const allImages = [imageUrl, ...additionalImages].slice(0, 4);
  const framesPerImage = 90; // 3 seconds each at 30fps

  const currentImageIdx = Math.min(Math.floor(frame / framesPerImage), allImages.length - 1);
  const localFrame = frame % framesPerImage;

  // Cross-fade between images
  const currentOpacity = interpolate(localFrame, [0, 15, framesPerImage - 15, framesPerImage], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const showConditionBadge = localFrame > 30 && localFrame < framesPerImage - 15;
  const badgeOpacity = interpolate(localFrame, [30, 50, framesPerImage - 20, framesPerImage - 10], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  // Title pinned top — always visible after frame 10
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  // Price pinned bottom — always visible after frame 10
  const priceOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });

  // End card logo
  const totalImages = allImages.length;
  const endStart = totalImages * framesPerImage;
  const logoOpacity = interpolate(frame, [endStart, endStart + 30], [0, 1], { extrapolateRight: "clamp" });
  const isEndCard = frame >= endStart;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", fontFamily: "Inter, sans-serif" }}>
      {/* Image */}
      {allImages.map((src, i) => {
        if (i !== currentImageIdx) return null;
        return (
          <div key={i} style={{ position: "absolute", inset: 0 }}>
            <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: currentOpacity }} />
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          </div>
        );
      })}

      {/* Title pinned top */}
      <div style={{
        position: "absolute", top: 60, left: 50, right: 50,
        color: "#fff", fontSize: 36, fontWeight: 800, lineHeight: 1.2, textAlign: "center",
        textShadow: "2px 2px 6px rgba(0,0,0,0.8)",
        opacity: titleOpacity,
      }}>
        {title.length > 70 ? title.slice(0, 67) + "..." : title}
      </div>

      {/* Condition badge centered */}
      {showConditionBadge && !isEndCard && (
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          display: "flex", justifyContent: "center",
          transform: "translateY(-50%)",
          opacity: badgeOpacity,
        }}>
          <ConditionBadge condition={condition} style={{ fontSize: 40, padding: "12px 32px" }} />
        </div>
      )}

      {/* Price pinned bottom */}
      <div style={{
        position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center",
        color: "#4ade80", fontSize: 56, fontWeight: 900,
        textShadow: "0 0 20px rgba(74,222,128,0.4)",
        opacity: priceOpacity,
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* End card */}
      {isEndCard && (
        <div style={{
          position: "absolute", bottom: 160, left: 0, right: 0,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          opacity: logoOpacity,
        }}>
          <StoreBadge storeName={storeName} storeLogo={storeLogo} />
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 28, fontStyle: "italic" }}>
            Authenticated & Priced Right
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
