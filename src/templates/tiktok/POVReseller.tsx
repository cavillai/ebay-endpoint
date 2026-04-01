// Template 15 — POV Reseller (TikTok 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { PINK, StoreBadge, TikTokCaption, formatPrice } from "../shared/utils";

export const POVReseller: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, condition, brand, size, color: itemColor,
}) => {
  const frame = useCurrentFrame();

  // Image background fades in from 50% to 100% opacity at frame 90
  const imgOpacity = interpolate(frame, [0, 30], [0.6, 0.6], { extrapolateRight: "clamp" });
  const imgFullOpacity = interpolate(frame, [85, 130], [0.6, 1], { extrapolateRight: "clamp" });
  const finalOpacity = frame < 90 ? imgOpacity : imgFullOpacity;

  // Specs slide in from right, staggered
  const specs = [brand, condition, size, itemColor].filter(Boolean) as string[];

  const arrowOpacity = interpolate(frame, [270, 310], [0, 1], { extrapolateRight: "clamp" });
  const arrowBounce = 1 + Math.sin(frame * 0.1) * 0.1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Background image */}
      <div style={{ position: "absolute", inset: 0, opacity: finalOpacity }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      </div>

      {/* POV text 0-90 */}
      {frame < 90 && (
        <div style={{
          position: "absolute", top: "38%", left: 60, right: 60, textAlign: "center",
          transform: "translateY(-50%)",
        }}>
          <TikTokCaption
            text={`POV: You found this for ${formatPrice(price, currency)}`}
            startFrame={0} framesPerWord={9}
          />
        </div>
      )}

      {/* Item specs 90-270 */}
      {frame >= 90 && frame < 270 && specs.map((spec, i) => {
        const specOpacity = interpolate(frame, [90 + i * 30, 120 + i * 30], [0, 1], { extrapolateRight: "clamp" });
        const specX = interpolate(frame, [90 + i * 30, 120 + i * 30], [120, 0], { extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            position: "absolute", left: 60 + specX, right: 60,
            top: 900 + i * 110,
            backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 12,
            padding: "16px 28px", opacity: specOpacity,
          }}>
            <span style={{ color: "#fff", fontSize: 40, fontWeight: 700 }}>{spec}</span>
          </div>
        );
      })}

      {/* CTA 270-450 */}
      {frame >= 270 && (
        <div style={{
          position: "absolute", bottom: 220, left: 0, right: 0, textAlign: "center",
          opacity: interpolate(frame, [270, 300], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <div style={{ color: PINK, fontSize: 42, fontWeight: 900, marginBottom: 16 }}>
            Now live at {storeName}
          </div>
          <div style={{ opacity: arrowOpacity, transform: `scale(${arrowBounce})`, fontSize: 48 }}>👇</div>
          <div style={{ opacity: arrowOpacity }}>
            <StoreBadge storeName={storeName} storeLogo={storeLogo} style={{ justifyContent: "center" }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
