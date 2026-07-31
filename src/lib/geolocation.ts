import { isIos, isStandalonePwa } from "./push";

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
}

export type GeolocationErrorCode =
  | "unsupported"
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "pwa_required";

export class GeolocationError extends Error {
  code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function geolocationHint(): string | null {
  if (!("geolocation" in navigator)) {
    return "Your browser does not support location sharing.";
  }

  if (isIos() && !isStandalonePwa()) {
    return "On iPhone, add Couple Rodeo to your Home Screen first — location sharing works in the installed app, not in Safari.";
  }

  return null;
}

export function getCurrentLocation(
  timeoutMs = 15_000,
): Promise<GeolocationResult> {
  const hint = geolocationHint();
  if (hint) {
    throw new GeolocationError(
      isIos() && !isStandalonePwa() ? "pwa_required" : "unsupported",
      hint,
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new GeolocationError(
                "permission_denied",
                isIos()
                  ? "Location access denied. Open Settings → Couple Rodeo → Location and choose “While Using the App”, then try again."
                  : "Location access denied. Allow location for this site in your browser settings, then try again.",
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new GeolocationError(
                "unavailable",
                "Could not determine your location. Try moving near a window or going outdoors, then retry.",
              ),
            );
            break;
          case error.TIMEOUT:
            reject(
              new GeolocationError(
                "timeout",
                "Location request timed out. Check that Location Services are on and try again.",
              ),
            );
            break;
          default:
            reject(
              new GeolocationError(
                "unavailable",
                "Could not get your location. Please try again.",
              ),
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      },
    );
  });
}
