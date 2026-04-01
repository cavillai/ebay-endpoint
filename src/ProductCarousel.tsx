import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  Sequence,
} from "remotion";
import { z } from "zod";

const PURPLE = "#681FCB";
const PINK = "#F73A8A";
const DARK = "#0a0a0a";

const ebayProductSchema = z.object({
  itemId: z.string(),
  title: z.string(),
  price: z.string(),
  currency: z.string(),
  imageUrl: z.string(),
  condition: z.string(),
  sellerUsername: z.string(),
  feedbackPercentage: z.string(),
  shippingCost: z.string(),
});

export const productCarouselSchema = z.object({
  products: z.array(ebayProductSchema).min(1).max(10),
  storeName: z.string().optional(),
  framesPerProduct: z.number().default(90),
});

export type ProductCarouselProps = z.infer<typeof productCarouselSchema>;

const ProductCard: React.FC<{
  product: z.infer<typeof ebayProductSchema>;
  localFrame: number;
  fps: number;
  index: number;
  total: number;
}> = ({ product, localFrame, fps, index, total }) => {

  const slideIn = spring({ frame: localFrame, fps, from: 80, to: 0, durationInFrames: 30 });
  const contentOpacity = interpolate(localFrame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(localFrame, [70, 90], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      backgroundColor: DARK,
      fontFamily: "Inter, sans-serif",
      opacity: exitOpacity,
    }}>
      {/* Background gradient */}
      <div style={{
        position: "absolute", width: "100%", height: "100%",
        background: `radial-gradient(ellipse at 50% 40%, rgba(104,31,203,0.12) 0%, transparent 65%)`,
      }} />

      {/* Progress dots */}
      <div style={{
        position: "absolute", top: 160, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 12,
      }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === index ? 32 : 10,
            height: 10, borderRadius: 5,
            backgroundColor: i === index ? PINK : "rgba(255,255,255,0.3)",
            transition: "width 0.3s",
          }} />
        ))}
      </div>

      {/* Product image */}
      <div style={{
        position: "absolute", top: 210, left: 60, right: 60,
        height: 680, borderRadius: 20, overflow: "hidden",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        transform: `translateX(${slideIn}px)`,
      }}>
        {product.imageUrl ? (
          <Img
            src={product.imageUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 40,
          }}>No Image</div>
        )}

        {/* Condition badge */}
        <div style={{
          position: "absolute", top: 14, left: 14,
          backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 6,
          padding: "4px 12px", color: "#fff", fontSize: 26, fontWeight: 600,
        }}>
          {product.condition}
        </div>
      </div>

      {/* Product title */}
      <div style={{
        position: "absolute", top: 940, left: 60, right: 60,
        color: "#fff", fontSize: 40, fontWeight: 700, lineHeight: 1.25,
        opacity: contentOpacity,
        transform: `translateX(${slideIn}px)`,
      }}>
        {product.title.length > 70 ? product.title.slice(0, 67) + "..." : product.title}
      </div>

      {/* Price + Shipping row */}
      <div style={{
        position: "absolute", top: 1120, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: contentOpacity,
      }}>
        <div style={{ color: PINK, fontSize: 64, fontWeight: 800, lineHeight: 1 }}>
          {product.currency === "USD" ? "$" : product.currency}{product.price}
        </div>
        <div style={{
          backgroundColor: product.shippingCost === "Free"
            ? "rgba(74,222,128,0.15)"
            : "rgba(255,255,255,0.08)",
          border: `1px solid ${product.shippingCost === "Free" ? "#4ade80" : "rgba(255,255,255,0.2)"}`,
          borderRadius: 10, padding: "8px 20px",
          color: product.shippingCost === "Free" ? "#4ade80" : "#fff",
          fontSize: 28, fontWeight: 600,
        }}>
          {product.shippingCost === "Free" ? "Free Shipping" : `+$${product.shippingCost} ship`}
        </div>
      </div>

      {/* Seller */}
      <div style={{
        position: "absolute", top: 1260, left: 60, right: 60,
        display: "flex", alignItems: "center", gap: 14,
        opacity: contentOpacity,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 20, fontWeight: 700,
        }}>
          {product.sellerUsername.charAt(0).toUpperCase()}
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 28 }}>
          {product.sellerUsername} · {product.feedbackPercentage} positive
        </div>
      </div>

      {/* CTA button */}
      <div style={{
        position: "absolute", bottom: 200, left: 60, right: 60,
        opacity: contentOpacity,
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${PURPLE}, ${PINK})`,
          borderRadius: 50, padding: "18px 40px",
          color: "#fff", fontSize: 36, fontWeight: 700,
          textAlign: "center",
          boxShadow: `0 8px 30px rgba(247,58,138,0.3)`,
        }}>
          Shop on eBay
        </div>
      </div>

    </AbsoluteFill>
  );
};

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  storeName,
  framesPerProduct = 90,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      {/* Store name header */}
      {storeName && (
        <div style={{
          position: "absolute", top: 170, left: 0, right: 0,
          textAlign: "center", zIndex: 10,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <span style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 30, fontWeight: 400,
            fontFamily: "Inter, sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}>
            {storeName}
          </span>
        </div>
      )}

      {products.map((product, i) => {
        const start = i * framesPerProduct;
        return (
          <Sequence key={product.itemId} from={start} durationInFrames={framesPerProduct}>
            <ProductCard
              product={product}
              localFrame={frame - start}
              fps={30}
              index={i}
              total={products.length}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
