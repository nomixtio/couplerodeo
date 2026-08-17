import {
  PLAN_CAPTION_MAX_LENGTH,
  PLAN_MAX_IMAGE_BYTES,
  PLAN_MAX_IMAGES,
  PLAN_MAX_VIDEOS,
} from "../shared/plans";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function isAllowedImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase());
}

export function normalizeMediaCaption(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PLAN_CAPTION_MAX_LENGTH) return null;
  return trimmed;
}

export interface ImagesBinding {
  hosted: {
    upload: (
      body: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
      options?: { filename?: string; metadata?: Record<string, string> },
    ) => Promise<{
      id: string;
      variants?: string[];
    }>;
    image: (imageId: string) => {
      delete: () => Promise<unknown>;
    };
  };
}

export interface StreamBinding {
  createDirectUpload: (options: {
    maxDurationSeconds: number;
    meta?: Record<string, string>;
    creator?: string;
  }) => Promise<{
    uploadURL: string;
    id: string;
  }>;
  video: (videoId: string) => {
    details: () => Promise<{
      id: string;
      readyToStream?: boolean;
      status?: { state?: string };
      hlsPlaybackUrl?: string;
      dashPlaybackUrl?: string;
      thumbnail?: string;
      meta?: Record<string, string>;
    }>;
    delete: () => Promise<unknown>;
  };
}

export async function deleteHostedImage(
  images: ImagesBinding | undefined,
  imageId: string | null,
): Promise<void> {
  if (!images || !imageId) return;
  try {
    await images.hosted.image(imageId).delete();
  } catch (err) {
    console.warn("Failed to delete hosted image:", imageId, err);
  }
}

export async function deleteStreamVideo(
  stream: StreamBinding | undefined,
  streamId: string | null,
): Promise<void> {
  if (!stream || !streamId) return;
  try {
    await stream.video(streamId).delete();
  } catch (err) {
    console.warn("Failed to delete stream video:", streamId, err);
  }
}

export function countMediaLimits(
  imageCount: number,
  videoCount: number,
): { ok: true } | { ok: false; error: string } {
  if (imageCount >= PLAN_MAX_IMAGES) {
    return { ok: false, error: `Maximum ${PLAN_MAX_IMAGES} photos per plan` };
  }
  if (videoCount >= PLAN_MAX_VIDEOS) {
    return { ok: false, error: `Maximum ${PLAN_MAX_VIDEOS} videos per plan` };
  }
  return { ok: true };
}

export function validateImageUpload(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (!isAllowedImageType(file.type)) {
    return { ok: false, error: "Unsupported image type" };
  }
  if (file.size > PLAN_MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 10 MB or smaller" };
  }
  return { ok: true };
}
