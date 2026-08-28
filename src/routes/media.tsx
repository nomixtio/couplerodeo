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
  parseMediaTypeFilter,
  toggleMediaTypeFilter,
  type MediaFilter,
  type MediaTypeFilter,
} from "../lib/media-nav";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/media")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: parseMediaFilter(
      typeof search.filter === "string" ? search.filter : undefined,
    ),
    type: parseMediaTypeFilter(
      typeof search.type === "string" ? search.type : undefined,
    ),
  }),
  component: MediaPage,
});

const MEDIA_FILTER_OPTIONS = (
  Object.keys(MEDIA_FILTER_LABELS) as MediaFilter[]
).map((value) => ({ value, label: MEDIA_FILTER_LABELS[value] }));

function emptyCopy(filter: MediaFilter, type: MediaTypeFilter): string {
  const kinds =
    type === "photos" ? "photos" : type === "videos" ? "videos" : "photos or videos";

  switch (filter) {
    case "plan":
      return type === "all" ? "No plan media yet." : `No plan ${kinds} yet.`;
    case "update":
      return type === "all"
        ? "No update photos or videos yet."
        : `No update ${kinds} yet.`;
    case "other":
      return `No other ${kinds} yet. Tap + to add some.`;
    case "removed":
      return type === "all" ? "No removed media." : `No removed ${kinds}.`;
    default:
      return `No ${kinds} yet. Tap + to add some.`;
  }
}

function MediaPage() {
  const navigate = useNavigate();
  const { filter, type } = Route.useSearch();
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
    navigate({ to: "/media", search: { filter: next, type } });
  }

  function selectType(next: "photos" | "videos") {
    navigate({
      to: "/media",
      search: { filter, type: toggleMediaTypeFilter(type, next) },
    });
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
        navigate({ to: "/media", search: { filter: "other", type } });
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

  const visibleMedia =
    type === "photos"
      ? media.filter((item) => item.type === "image")
      : type === "videos"
        ? media.filter((item) => item.type === "video")
        : media;

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
            active={filter !== "all" || type !== "all"}
          >
            <div className="page-filter-group" role="group" aria-label="Media type">
              <label
                className={`page-filter-check${
                  type === "all" || type === "photos" ? " active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={type === "all" || type === "photos"}
                  disabled={type === "photos"}
                  onChange={() => selectType("photos")}
                />
                Photos
              </label>
              <label
                className={`page-filter-check${
                  type === "all" || type === "videos" ? " active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={type === "all" || type === "videos"}
                  disabled={type === "videos"}
                  onChange={() => selectType("videos")}
                />
                Videos
              </label>
            </div>
            <div className="page-filter-divider" />
          </PageFilter>
          <MediaFilePicker
            uploading={uploading}
            progress={progress}
            error={error}
            onSelectFiles={(files) => handleSelectFiles(files).catch(console.error)}
          />
        </div>
      </div>

      <MediaGallery
        items={visibleMedia}
        loading={loading}
        empty={<p className="hint plan-media-empty">{emptyCopy(filter, type)}</p>}
        square
        onRefreshItem={refreshItem}
        onDelete={filter === "removed" ? undefined : handleDelete}
        sourceLabel={(item) => mediaSourceLabel(item.source, item.plan_title)}
      />
    </div>
  );
}
