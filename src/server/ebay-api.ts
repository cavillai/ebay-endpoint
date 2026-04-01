import https from "https";
import { EBayProduct, EBaySearchResult, EBayTokenResponse } from "./ebay-types";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Fetch an OAuth2 client credentials token from eBay
 */
async function fetchAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );
  const body = "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope";

  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      hostname: "api.ebay.com",
      path: "/identity/v1/oauth2/token",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed: EBayTokenResponse = JSON.parse(data);
          if (!parsed.access_token) {
            reject(new Error(`eBay OAuth failed: ${data}`));
            return;
          }
          resolve(parsed.access_token);
          // Cache token for (expires_in - 60) seconds
          tokenExpiresAt = Date.now() + (parsed.expires_in - 60) * 1000;
        } catch (e) {
          reject(new Error(`Failed to parse eBay token response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Get a valid access token, refreshing if needed
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  cachedToken = await fetchAccessToken();
  return cachedToken;
}

/**
 * Make an authenticated GET request to the eBay API
 */
async function ebayGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: "api.ebay.com",
      path,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                `eBay API error ${res.statusCode}: ${JSON.stringify(parsed)}`
              )
            );
            return;
          }
          resolve(parsed as T);
        } catch (e) {
          reject(new Error(`Failed to parse eBay API response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

/**
 * Transform raw eBay API item into our EBayProduct shape
 */
function transformItem(item: any): EBayProduct {
  return {
    itemId: item.itemId || "",
    title: item.title || "No title",
    price: item.price?.value || item.currentBidPrice?.value || "0.00",
    currency: item.price?.currency || "USD",
    imageUrl:
      item.image?.imageUrl || item.additionalImages?.[0]?.imageUrl || "",
    condition: item.condition || "Not specified",
    seller: {
      username: item.seller?.username || "unknown",
      feedbackScore: item.seller?.feedbackScore || 0,
      feedbackPercentage: item.seller?.feedbackPercentage || "0%",
    },
    shipping: {
      cost:
        item.shippingOptions?.[0]?.shippingCost?.value === "0.00"
          ? "Free"
          : item.shippingOptions?.[0]?.shippingCost?.value || "See listing",
      type: item.shippingOptions?.[0]?.shippingServiceCode || "Standard",
    },
    itemUrl: item.itemWebUrl || "",
  };
}

/**
 * Search eBay items by store name and keyword
 */
export async function searchItems(
  storeName: string,
  keyword: string,
  limit = 5
): Promise<EBaySearchResult> {
  const encodedStore = encodeURIComponent(storeName);
  const encodedKeyword = encodeURIComponent(keyword);
  const path = `/buy/browse/v1/item_summary/search?q=${encodedKeyword}&filter=sellers:{${encodedStore}}&limit=${limit}&fieldgroups=EXTENDED`;

  const response: any = await ebayGet(path);

  const items: EBayProduct[] = (response.itemSummaries || []).map(transformItem);

  return {
    total: response.total || 0,
    items,
  };
}

/**
 * Search eBay items by keyword only (no store filter)
 */
export async function searchItemsByKeyword(
  keyword: string,
  limit = 5
): Promise<EBaySearchResult> {
  const encodedKeyword = encodeURIComponent(keyword);
  const path = `/buy/browse/v1/item_summary/search?q=${encodedKeyword}&limit=${limit}&fieldgroups=EXTENDED`;

  const response: any = await ebayGet(path);

  const items: EBayProduct[] = (response.itemSummaries || []).map(transformItem);

  return {
    total: response.total || 0,
    items,
  };
}

/**
 * Get a single eBay item by ID
 */
export async function getItem(itemId: string): Promise<EBayProduct> {
  const path = `/buy/browse/v1/item/${encodeURIComponent(itemId)}`;
  const response: any = await ebayGet(path);
  return transformItem(response);
}
