import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

const PURPLE = "#681FCB";
const PINK = "#F73A8A";
const DARK = "#0a0a0a";

export const productShowcaseSchema = z.object({
  title: z.string(),
  price: z.string(),
  currency: z.string().default("USD"),
  imageUrl: z.string(),
  condition: z.string(),
  sellerUsername: z.string(),
  feedbackScore: z.number(),
  feedbackPercentage: z.string(),
  shippingCost: z.string(),
  shippingType: z.string(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
});

export type ProductShowcaseProps = z.infer<typeof productShowcaseSchema>;

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  title,
  price,
  currency,
  imageUrl,
  condition,
  sellerUsername,
  feedbackScore,
  feedbackPercentage,
  shippingCost,
  shippingType,
  rating,
  reviewCount,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timings
  const imageScale = spring({ frame, fps, from: 1.08, to: 1, durationInFrames: 90 });
  const titleY = spring({ frame: frame - 20, fps, from: 60, to: 0, durationInFrames: 40 });
  const priceScale = spring({ frame: frame - 50, fps, from: 0, to: 1, durationInFrames: 35, config: { overshootClamping: false } });
  const detailsOpacity = interpolate(frame, [80, 120], [0, 1], { extrapolateRight: "clamp" });
  const detailsY = interpolate(frame, [80, 120], [30, 0], { extrapolateRight: "clamp" });
  const shippingOpacity = interpolate(frame, [110, 140], [0, 1], { extrapolateRight: "clamp" });
  const sellerOpacity = interpolate(frame, [130, 160], [0, 1], { extrapolateRight: "clamp" });

  const titleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const priceOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  // Star rating display
  const stars = rating ? Math.round(rating) : 0;
  const starDisplay = Array.from({ length: 5 }, (_, i) => i < stars ? "★" : "☆").join("");

  return (
    <AbsoluteFill style={{ backgroundColor: DARK, fontFamily: "Inter, sans-serif" }}>

      {/* Background gradient */}
      <div style={{
        position: "absolute", width: "100%", height: "100%",
        background: `radial-gradient(ellipse at 50% 30%, rgba(104,31,203,0.15) 0%, transparent 70%)`,
      }} />

      {/* Product Image — top half */}
      <div style={{
        position: "absolute", top: 150, left: 60, right: 60,
        height: 720, borderRadius: 24, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        transform: `scale(${imageScale})`,
      }}>
        {imageUrl ? (
          <Img
            src={imageUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 48, fontWeight: 700,
          }}>
            No Image
          </div>
        )}

        {/* Condition badge */}
        <div style={{
          position: "absolute", top: 16, right: 16,
          backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8,
          padding: "6px 14px", color: "#fff", fontSize: 28, fontWeight: 600,
          backdropFilter: "blur(4px)",
        }}>
          {condition}
        </div>
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 920, left: 60, right: 60,
        color: "#fff", fontSize: 44, fontWeight: 800, lineHeight: 1.2,
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
      }}>
        {title.length > 80 ? title.slice(0, 77) + "..." : title}
      </div>

      {/* Price */}
      <div style={{
        position: "absolute", top: 1100, left: 60,
        transform: `scale(${priceScale})`,
        opacity: priceOpacity,
        transformOrigin: "left center",
      }}>
        <span style={{
          color: PINK, fontSize: 72, fontWeight: 800,
          textShadow: `0 0 30px rgba(247,58,138,0.4)`,
        }}>
          {currency === "USD" ? "$" : currency}{price}
        </span>
      </div>

      {/* Rating */}
      {rating && (
        <div style={{
          position: "absolute", top: 1100, right: 60,
          opacity: priceOpacity,
          textAlign: "right",
        }}>
          <div style={{ color: "#FFD700", fontSize: 40, lineHeight: 1 }}>
            {starDisplay}
          </div>
          {reviewCount && (
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 28, marginTop: 4 }}>
              {reviewCount.toLocaleString()} reviews
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{
        position: "absolute", top: 1195, left: 60, right: 60,
        height: 1, backgroundColor: "rgba(255,255,255,0.1)",
        opacity: detailsOpacity,
      }} />

      {/* Shipping */}
      <div style={{
        position: "absolute", top: 1220, left: 60, right: 60,
        display: "flex", alignItems: "center", gap: 16,
        opacity: shippingOpacity,
        transform: `translateY(${detailsY}px)`,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: `rgba(104,31,203,0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>📦</div>
        <div>
          <div style={{ color: shippingCost === "Free" ? "#4ade80" : "#fff", fontSize: 36, fontWeight: 700 }}>
            {shippingCost === "Free" ? "Free Shipping" : `Shipping: $${shippingCost}`}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 28 }}>{shippingType}</div>
        </div>
      </div>

      {/* Seller info */}
      <div style={{
        position: "absolute", top: 1360, left: 60, right: 60,
        display: "flex", alignItems: "center", gap: 16,
        opacity: sellerOpacity,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: "#fff", fontWeight: 700,
        }}>
          {sellerUsername.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 32, fontWeight: 600 }}>
            {sellerUsername}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 26 }}>
            {feedbackScore.toLocaleString()} feedback · {feedbackPercentage} positive
          </div>
        </div>
      </div>

      {/* Bottom safe zone: eBay branding */}
      <div style={{
        position: "absolute", bottom: 200, left: 60, right: 60,
        textAlign: "center", opacity: sellerOpacity,
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
          borderRadius: 50, padding: "10px 40px",
          color: "#fff", fontSize: 30, fontWeight: 700,
          letterSpacing: 1,
        }}>
          View on eBay
        </div>
      </div>

    </AbsoluteFill>
  );
};
