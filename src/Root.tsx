import React from "react";
import { Composition, Still } from "remotion";
import { myCompSchema, PreviewCard } from "./PreviewCard";
import { ProductShowcase, productShowcaseSchema } from "./ProductShowcase";
import { ProductCarousel, productCarouselSchema } from "./ProductCarousel";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Still
        id="PreviewCard"
        component={PreviewCard}
        width={1200}
        height={627}
        schema={myCompSchema}
        defaultProps={{
          title: "Welcome to Remotion" as const,
          description: "Edit Video.tsx to change template" as const,
          color: "#0B84F3" as const,
        }}
      />

      {/* Single product vertical showcase */}
      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={240}
        schema={productShowcaseSchema}
        defaultProps={{
          title: "Sample Product Title — Great condition item for sale",
          price: "29.99",
          currency: "USD",
          imageUrl: "",
          condition: "New",
          sellerUsername: "top_seller",
          feedbackScore: 1200,
          feedbackPercentage: "99.8%",
          shippingCost: "Free",
          shippingType: "Standard Shipping",
          rating: 4.5,
          reviewCount: 342,
        }}
      />

      {/* Multi-product carousel */}
      <Composition
        id="ProductCarousel"
        component={ProductCarousel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={270}
        schema={productCarouselSchema}
        defaultProps={{
          storeName: "My eBay Store",
          framesPerProduct: 90,
          products: [
            {
              itemId: "1",
              title: "First Sample Product — Amazing deal",
              price: "19.99",
              currency: "USD",
              imageUrl: "",
              condition: "New",
              sellerUsername: "seller_one",
              feedbackPercentage: "99.5%",
              shippingCost: "Free",
            },
            {
              itemId: "2",
              title: "Second Sample Product — Limited time offer",
              price: "49.99",
              currency: "USD",
              imageUrl: "",
              condition: "Like New",
              sellerUsername: "seller_two",
              feedbackPercentage: "98.9%",
              shippingCost: "3.99",
            },
            {
              itemId: "3",
              title: "Third Sample Product — Best seller",
              price: "9.99",
              currency: "USD",
              imageUrl: "",
              condition: "Good",
              sellerUsername: "seller_three",
              feedbackPercentage: "97.2%",
              shippingCost: "Free",
            },
          ],
        }}
      />
    </>
  );
};
