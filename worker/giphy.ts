export interface GiphyGif {
  id: string;
  title: string;
  url: string;
}

interface GiphySearchResponse {
  data?: Array<{
    id: string;
    title: string;
    images?: {
      fixed_height?: { url?: string };
      downsized?: { url?: string };
    };
  }>;
}

export async function searchGiphy(
  apiKey: string,
  query: string,
  offset = 0,
): Promise<GiphyGif[]> {
  if (!apiKey?.trim()) {
    throw new Error("GIPHY_API_KEY not configured");
  }

  const params = new URLSearchParams({
    api_key: apiKey.trim(),
    q: query.trim() || "love",
    limit: "20",
    offset: String(Math.max(0, offset)),
    rating: "g",
    lang: "en",
  });

  const response = await fetch(
    `https://api.giphy.com/v1/gifs/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Giphy API returned ${response.status}`);
  }

  const payload = (await response.json()) as GiphySearchResponse;
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
