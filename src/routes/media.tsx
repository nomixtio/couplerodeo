import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { mediaSourceLabel } from "../../shared/media";
import { MediaFilePicker } from "../components/MediaFilePicker";
import { MediaGallery } from "../components/MediaGallery";
import { PageFilter } from "../components/PageFilter";
import { PageLoader } from "../components/PageLoader";
import { usePushRefresh } from "../components/PushListener";
import {
  createLibraryVideoUpload,
  deleteMedia,
  fetchCoupleMedia,
  fetchMe,
  fetchMediaItem,
  isImageFile,
  isVideoFile,
  uploadLibraryImage,
  uploadVideoToStream,
  type MeResponse,
  type MediaItem,
} from "../lib/api";
import {
  MEDIA_FILTER_LABELS,
  parseMediaFilter,
  type MediaFilter,
} from "../lib/media-nav";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/media")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: parseMediaFilter(
      typeof search.filter === "string" ? search.filter : undefined,
    ),
  }),
  component: MediaPage,
});

const MEDIA_FILTER_OPTIONS = (
  Object.keys(MEDIA_FILTER_LABELS) as MediaFilter[]
).map((value) => ({ value, label: MEDIA_FILTER_LABELS[value] }));

const EMPTY_COPY: Record<MediaFilter, string> = {
  all: "No photos or videos yet. Tap + to add some.",
  plan: "No plan media yet.",
  update: "No update photos or videos yet.",
  other: "No other media yet. Tap + to add some.",
  removed: "No removed media.",
};

function MediaPage() {
  const navigate = useNavigate();
  const { filter } = Route.useSearch();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const loadMedia = useCallback(async () => {
    const data = await fetchCoupleMedia(filter);
    setMedia(data.media);
  }, [filter]);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    fetchMe()
      .then((meData) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      });
  }, [navigate]);

  useEffect(() => {
    if (!me) return;
    setLoading(true);
    loadMedia()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [me, loadMedia]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadMedia().catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadMedia]);

  usePushRefresh(() => {
    loadMedia().catch(console.error);
  });

  function selectFilter(next: MediaFilter) {
    navigate({ to: "/media", search: { filter: next } });
  }

  const refreshItem = useCallback(async (mediaId: string) => {
    const result = await fetchMediaItem(mediaId);
    setMedia((current) =>
      current.map((item) => (item.id === result.media.id ? result.media : item)),
    );
    return result.media;
  }, []);

  async function handleDelete(mediaId: string) {
    setError("");
    await deleteMedia(mediaId);
    await loadMedia();
  }

  async function handleSelectFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}…`);

        if (isImageFile(file)) {
          await uploadLibraryImage(file);
        } else if (isVideoFile(file)) {
          const { uploadURL } = await createLibraryVideoUpload();
          await uploadVideoToStream(uploadURL, file);
        } else {
          throw new Error(`Unsupported file: ${file.name}`);
        }
      }
      await loadMedia();
      if (filter !== "all" && filter !== "other") {
        navigate({ to: "/media", search: { filter: "other" } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress("");
    }
  }

  if (!me) {
    return (
      <div className="page media-page">
        <PageLoader label={loading ? "Loading" : "Redirecting"} />
      </div>
    );
  }

  return (
    <div className="page media-page">
      <div className="page-header">
        <h1>Media</h1>
        <div className="notes-header-actions">
          <PageFilter
            value={filter}
            options={MEDIA_FILTER_OPTIONS}
            label="Filter media"
            onChange={selectFilter}
          />
          <MediaFilePicker
            uploading={uploading}
            progress={progress}
            error={error}
            onSelectFiles={(files) => handleSelectFiles(files).catch(console.error)}
          />
        </div>
      </div>

      <MediaGallery
        items={media}
        loading={loading}
        empty={<p className="hint plan-media-empty">{EMPTY_COPY[filter]}</p>}
        onRefreshItem={refreshItem}
        onDelete={filter === "removed" ? undefined : handleDelete}
        sourceLabel={(item) => mediaSourceLabel(item.source, item.plan_title)}
      />
    </div>
  );
}
