import { useState } from "react";
import { LOCATION_LABEL_MAX_LENGTH } from "../../shared/location";
import { shareLocation } from "../lib/api";
import {
  GeolocationError,
  geolocationHint,
  getCurrentLocation,
} from "../lib/geolocation";

interface LocationComposerProps {
  onSent?: () => void;
}

export function LocationComposer({ onSent }: LocationComposerProps) {
  const [label, setLabel] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const hint = geolocationHint();

  async function handleShare() {
    setError("");
    setStatus("");

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
      onSent?.();
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

  return (
    <div className="location-composer-sheet">
      <p className="hint location-intro">
        Share your current location once with your partner. This is not live
        tracking — they only see the pin from when you tapped share.
      </p>

      <label className="field-label" htmlFor="location-note">
        Note (optional)
        <textarea
          id="location-note"
          value={label}
          maxLength={LOCATION_LABEL_MAX_LENGTH}
          placeholder="At the airport, outside the café…"
          rows={3}
          onChange={(event) => setLabel(event.target.value)}
          disabled={sharing}
        />
      </label>

      <button
        type="button"
        className="btn primary"
        onClick={() => handleShare().catch(console.error)}
        disabled={sharing}
      >
        {sharing ? "Sharing…" : "Share my location"}
      </button>

      {status && <p className="hint success">{status}</p>}
      {error && <p className="hint error">{error}</p>}
      {hint && <p className="hint location-pwa-hint">{hint}</p>}
    </div>
  );
}
