// Template 25 — Urgency Countdown (TikTok 1080x1920, 15s)
import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { TemplateProps } from "../shared/types";
import { StoreBadge, TikTokCaption, formatPrice, timeUntil } from "../shared/utils";

const FlipDigit: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    <div style={{
      backgroundColor: "#1a1a1a", borderRadius: 12, padding: "20px 28px",
      color: "#ef4444", fontSize: 80, fontWeight: 900,
      fontFamily: "'Courier New', monospace",
      boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
      minWidth: 110, textAlign: "center",
    }}>
      {value}
    </div>
    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
      {label}
    </div>
  </div>
);

export const UrgencyCountdown: React.FC<TemplateProps> = ({
  storeName, storeLogo, title, price, currency = "USD",
  imageUrl, itemEndDate, buyingOptions = [],
}) => {
  const frame = useCurrentFrame();
  const isAuction = buyingOptions.includes("AUCTION");
  const countdownData = itemEndDate ? timeUntil(itemEndDate) : null;
  const isUrgent = countdownData?.isUrgent;

  const borderPulse = 1 + Math.sin(frame * 0.08) * 0.03;
  const fadeIn = (start: number) => interpolate(frame, [start, start + 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", fontFamily: "Inter, sans-serif" }}>
      {/* Pulsing red border if urgent */}
      {isUrgent && (
        <div style={{
          position: "absolute", inset: 0,
          border: `${6 * borderPulse}px solid rgba(239,68,68,${0.5 + Math.sin(frame * 0.1) * 0.3})`,
          pointerEvents: "none", zIndex: 50,
          borderRadius: 4,
        }} />
      )}

      {/* Product image background */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: isUrgent ? "rgba(50,0,0,0.6)" : "rgba(0,0,0,0.6)" }} />
      </div>

      {/* Logo */}
      <div style={{ position: "absolute", top: 160, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fadeIn(0) }}>
        <StoreBadge storeName={storeName} storeLogo={storeLogo} />
      </div>

      {/* Countdown or Buy It Now */}
      <div style={{
        position: "absolute", top: "38%", left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 40,
        transform: "translateY(-50%)",
        opacity: fadeIn(20),
      }}>
        {isAuction && countdownData ? (
          <>
            <div style={{ color: "#ef4444", fontSize: 36, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
              ⏱ Auction Ending
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <FlipDigit value={String(countdownData.h).padStart(2, "0")} label="hrs" />
              <span style={{ color: "#ef4444", fontSize: 60, fontWeight: 900, marginBottom: 32 }}>:</span>
              <FlipDigit value={String(countdownData.m).padStart(2, "0")} label="min" />
              <span style={{ color: "#ef4444", fontSize: 60, fontWeight: 900, marginBottom: 32 }}>:</span>
              <FlipDigit value={String(countdownData.s).padStart(2, "0")} label="sec" />
            </div>
          </>
        ) : (
          <div style={{
            backgroundColor: "#2563eb", borderRadius: 20, padding: "20px 60px",
            color: "#fff", fontSize: 52, fontWeight: 900,
            boxShadow: "0 8px 30px rgba(37,99,235,0.4)",
          }}>
            Buy It Now
          </div>
        )}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", bottom: 280, left: 0, right: 0, textAlign: "center",
        color: "#fff", fontSize: 96, fontWeight: 900,
        textShadow: isUrgent ? "0 0 30px rgba(239,68,68,0.5)" : "none",
        opacity: fadeIn(40),
      }}>
        {formatPrice(price, currency)}
      </div>

      {/* Caption */}
      <div style={{
        position: "absolute", bottom: 190, left: 60, right: 60,
        opacity: fadeIn(60),
      }}>
        <TikTokCaption
          text={`Going fast at ${storeName}`}
          startFrame={60}
          framesPerWord={10}
          style={{ fontSize: 38 }}
        />
      </div>
    </AbsoluteFill>
  );
};
