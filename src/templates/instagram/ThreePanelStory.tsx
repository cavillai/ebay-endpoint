// Template 7 — Three-Panel Story (Instagram 9:16 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { PINK, StoreBadge, ConditionBadge, formatPrice, FlashOverlay } from "../shared/utils";

export const ThreePanelStory: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, condition, conditionDescription, shippingCost,
}) => {
  const frame = useCurrentFrame();
  const ACT = 150;
  const act = frame < ACT ? 1 : frame < ACT * 2 ? 2 : 3;
  const localFrame = frame % ACT;
  const fade = (start: number) => interpolate(localFrame, [start, start + 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif" }}>
      {act === 1 && (
        <AbsoluteFill>
          <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div style={{
            position: "absolute", top: 160, left: 0, right: 0, textAlign: "center",
            color: "rgba(255,255,255,0.5)", fontSize: 30, letterSpacing: 8,
            textTransform: "uppercase", opacity: fade(10),
          }}>
            The Item
          </div>
          <div style={{
            position: "absolute", top: "50%", left: 60, right: 60, textAlign: "center",
            transform: "translateY(-50%)",
            color: "#fff", fontSize: 52, fontWeight: 800, lineHeight: 1.2,
            opacity: fade(30),
          }}>
            {title.length > 70 ? title.slice(0, 67) + "..." : title}
          </div>
        </AbsoluteFill>
      )}

      {act === 2 && (
        <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
          <div style={{
            position: "absolute", top: 160, left: 0, right: 0, textAlign: "center",
            color: "rgba(255,255,255,0.5)", fontSize: 30, letterSpacing: 8, textTransform: "uppercase",
            opacity: fade(10),
          }}>
            The Condition
          </div>
          <div style={{
            position: "absolute", top: "44%", left: 0, right: 0,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 30,
            transform: "translateY(-50%)",
          }}>
            <div style={{ opacity: fade(20) }}>
              <ConditionBadge condition={condition} style={{ fontSize: 56, padding: "18px 56px" }} />
            </div>
            {conditionDescription && (
              <div style={{
                color: "rgba(255,255,255,0.7)", fontSize: 36, textAlign: "center",
                paddingLeft: 60, paddingRight: 60, opacity: fade(40), lineHeight: 1.4,
              }}>
                {conditionDescription}
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {act === 3 && (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, #0f0f0f, #1a0a2e)` }}>
          <div style={{
            position: "absolute", top: 160, left: 0, right: 0, textAlign: "center",
            color: "rgba(255,255,255,0.5)", fontSize: 30, letterSpacing: 8, textTransform: "uppercase",
            opacity: fade(10),
          }}>
            The Deal
          </div>
          <div style={{
            position: "absolute", top: "42%", left: 0, right: 0, textAlign: "center",
            color: PINK, fontSize: 120, fontWeight: 900,
            textShadow: `0 0 60px ${PINK}60`,
            transform: "translateY(-50%)", opacity: fade(20),
          }}>
            {formatPrice(price, currency)}
          </div>
          {shippingCost && (
            <div style={{
              position: "absolute", top: "62%", left: 0, right: 0, textAlign: "center",
              color: "rgba(255,255,255,0.7)", fontSize: 38, opacity: fade(40),
            }}>
              {shippingCost === "Free" ? "✓ Free Shipping" : `+ $${shippingCost} shipping`}
            </div>
          )}
          <div style={{
            position: "absolute", bottom: 200, left: 0, right: 0, display: "flex", justifyContent: "center",
            opacity: fade(60),
          }}>
            <StoreBadge storeName={storeName} storeLogo={storeLogo} />
          </div>
        </AbsoluteFill>
      )}

      <FlashOverlay frame={frame} flashFrame={ACT} />
      <FlashOverlay frame={frame} flashFrame={ACT * 2} />
    </AbsoluteFill>
  );
};
