export interface StoreProps {
  storeName: string;
  storeLogo?: string;
  storeColor?: string; // brand accent color, defaults to PURPLE
}

export interface ProductProps {
  title: string;
  price: string;
  currency?: string;
  originalPrice?: string;
  imageUrl: string;
  additionalImages?: string[];
  condition: string;
  conditionDescription?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  itemSpecifics?: Record<string, string>;
  shippingCost?: string;
  shippingType?: string;
  sellerUsername?: string;
  feedbackScore?: number;
  feedbackPercentage?: string;
  rating?: number;
  reviewCount?: number;
  itemEndDate?: string;
  buyingOptions?: string[]; // ["AUCTION", "FIXED_PRICE"]
  itemUrl?: string;
}

export interface TemplateProps extends StoreProps, ProductProps {}
