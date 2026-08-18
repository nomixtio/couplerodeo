export interface GiphyGif {
  id: string;
  title: string;
  url: string;
}

interface GiphyApiResponse {
  data?: Array<{
    id: string;
    title: string;
    images?: {
      fixed_height?: { url?: string };
      downsized?: { url?: string };
    };
  }>;
}

function mapGiphyResponse(payload: GiphyApiResponse): GiphyGif[] {
  const gifs: GiphyGif[] = [];

  for (const item of payload.data ?? []) {
    const url =
      item.images?.fixed_height?.url ?? item.images?.downsized?.url ?? null;
    if (!url) continue;
    gifs.push({
      id: item.id,
      title: item.title?.trim() || "GIF",
      url,
    });
  }

  return gifs;
}

async function fetchGiphy(
  apiKey: string,
  path: string,
  params: URLSearchParams,
): Promise<GiphyGif[]> {
  if (!apiKey?.trim()) {
    throw new Error("GIPHY_API_KEY not configured");
  }

  params.set("api_key", apiKey.trim());
  params.set("limit", "20");
  params.set("rating", "g");

  const response = await fetch(
    `https://api.giphy.com/v1/gifs/${path}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Giphy API returned ${response.status}`);
  }

  const payload = (await response.json()) as GiphyApiResponse;
  return mapGiphyResponse(payload);
}

export async function searchGiphy(
  apiKey: string,
  query: string,
  offset = 0,
): Promise<GiphyGif[]> {
  const params = new URLSearchParams({
    q: query.trim() || "love",
    offset: String(Math.max(0, offset)),
    lang: "en",
  });

  return fetchGiphy(apiKey, "search", params);
}

export async function trendingGiphy(
  apiKey: string,
  offset = 0,
): Promise<GiphyGif[]> {
  const params = new URLSearchParams({
    offset: String(Math.max(0, offset)),
  });

  return fetchGiphy(apiKey, "trending", params);
}
