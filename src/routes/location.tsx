import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMapsUrl,
  formatAccuracyM,
  formatCoordinates,
  formatLocationAge,
  isLocationStale,
} from "../../shared/location";
import { LocationMap } from "../components/LocationMap";
import { usePushRefresh } from "../components/PushListener";
import {
  deleteMyLocationShare,
  fetchLatestLocationShares,
  fetchMe,
  shareLocation,
  type LocationShare,
  type MeResponse,
} from "../lib/api";
import {
  GeolocationError,
  geolocationHint,
  getCurrentLocation,
} from "../lib/geolocation";
import { hasSession } from "../lib/partner";

export const Route = createFileRoute("/location")({
  component: LocationPage,
});

function LocationPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [shares, setShares] = useState<LocationShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [sharing, setSharing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadShares = useCallback(async () => {
    const data = await fetchLatestLocationShares();
    setShares(data.shares);
  }, []);

  const reloadAll = useCallback(async () => {
    await loadShares();
  }, [loadShares]);

  useEffect(() => {
    if (!hasSession()) {
      navigate({ to: "/connect" });
      return;
    }

    Promise.all([fetchMe(), loadShares()])
      .then(([meData]) => {
        if (!meData.partnerConnected) {
          navigate({ to: "/pairing" });
          return;
        }
        setMe(meData);
      })
      .catch((err) => {
        console.error(err);
        navigate({ to: "/connect" });
      })
      .finally(() => setLoading(false));
  }, [navigate, loadShares]);

  usePushRefresh(() => {
    reloadAll().catch(console.error);
  });

  const myShare = useMemo(
    () => shares.find((share) => share.from_partner_id === me?.partnerId) ?? null,
    [shares, me?.partnerId],
  );

  const partnerShare = useMemo(
    () => shares.find((share) => share.from_partner_id !== me?.partnerId) ?? null,
    [shares, me?.partnerId],
  );

  async function handleShare() {
    setError("");
    setStatus("");

    const hint = geolocationHint();
    if (hint) {
      setError(hint);
      return;
    }

    setSharing(true);
    setStatus("Getting your location…");

    try {
      const coords = await getCurrentLocation();
      setStatus("Sending to your partner…");
      await shareLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: coords.accuracyM,
        label: label.trim() || undefined,
      });
      setLabel("");
      setStatus("Location shared!");
      await loadShares();
    } catch (err) {
      if (err instanceof GeolocationError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not share location. Please try again.");
      }
      setStatus("");
    } finally {
      setSharing(false);
    }
  }

  async function handleRemove() {
    setError("");
    setRemoving(true);
    try {
      await deleteMyLocationShare();
      await loadShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove location");
    } finally {
      setRemoving(false);
    }
  }

  if (loading || !me) {
    return (
      <div className="page location-page">
        <p className="hint">{loading ? "Loading…" : "Redirecting…"}</p>
      </div>
    );
  }

  return (
    <div className="page location-page">
      <h1>Location</h1>
      <p className="hint location-intro">
        Share your current location once with your partner. This is not live
        tracking — your partner only sees the pin from when you tapped share.
      </p>

      <section className="card location-share-card">
        <h2>Share my location</h2>
        <label className="field">
          <span className="field-label">Note (optional)</span>
          <input
            type="text"
            value={label}
            maxLength={80}
            placeholder="At the airport, outside the café…"
            onChange={(event) => setLabel(event.target.value)}
            disabled={sharing}
          />
        </label>
        <button
          type="button"
          className="btn primary"
          onClick={handleShare}
          disabled={sharing}
        >
          {sharing ? "Sharing…" : "Share my location"}
        </button>
        {status && <p className="hint success">{status}</p>}
        {geolocationHint() && (
          <p className="hint location-pwa-hint">{geolocationHint()}</p>
        )}
      </section>

      <LocationShareCard
        title={`${me.partnerName ?? "Partner"}'s location`}
        share={partnerShare}
        emptyMessage="Your partner hasn't shared a location yet."
      />

      <LocationShareCard
        title="Your last share"
        share={myShare}
        emptyMessage="You haven't shared a location yet."
        onRemove={myShare ? handleRemove : undefined}
        removing={removing}
      />

      {error && <p className="hint error">{error}</p>}
    </div>
  );
}

function LocationShareCard({
  title,
  share,
  emptyMessage,
  onRemove,
  removing,
}: {
  title: string;
  share: LocationShare | null;
  emptyMessage: string;
  onRemove?: () => void;
  removing?: boolean;
}) {
  if (!share) {
    return (
      <section className="card location-pin-card">
        <h2>{title}</h2>
        <p className="hint">{emptyMessage}</p>
      </section>
    );
  }

  const stale = isLocationStale(share.created_at);
  const accuracy = formatAccuracyM(share.accuracy_m);

  return (
    <section className="card location-pin-card">
      <div className="location-pin-header">
        <h2>{title}</h2>
        <span className="location-meta">
          {formatLocationAge(share.created_at)}
          {stale && <span className="location-stale"> · may be outdated</span>}
        </span>
      </div>

      {share.label && <p className="location-label">{share.label}</p>}

      <LocationMap
        latitude={share.latitude}
        longitude={share.longitude}
        accuracyM={share.accuracy_m}
        label={share.label ?? share.from_label}
      />

      <p className="hint location-coords">
        {formatCoordinates(share.latitude, share.longitude)}
        {accuracy && ` · ${accuracy}`}
      </p>

      <div className="location-actions">
        <a
          className="btn ghost"
          href={buildMapsUrl(share.latitude, share.longitude)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Maps
        </a>
        {onRemove && (
          <button
            type="button"
            className="btn ghost"
            onClick={onRemove}
            disabled={removing}
          >
            {removing ? "Removing…" : "Remove my share"}
          </button>
        )}
      </div>
    </section>
  );
}
