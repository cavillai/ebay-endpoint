export interface EBayProduct {
  itemId: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  additionalImages: string[];
  condition: string;
  seller: {
    username: string;
    feedbackScore: number;
    feedbackPercentage: string;
  };
  shipping: {
    cost: string;
    type: string;
  };
  rating?: number;
  reviewCount?: number;
  itemUrl: string;
}

export interface EBaySearchResult {
  total: number;
  items: EBayProduct[];
}

export interface EBayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}
