import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  label?: string;
  className?: string;
  interactive?: boolean;
}

function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize();
    const frame = requestAnimationFrame(refresh);
    const timer = window.setTimeout(refresh, 180);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

export function LocationMap({
  latitude,
  longitude,
  accuracyM,
  label,
  className,
  interactive = true,
}: LocationMapProps) {
  const center: LatLngExpression = [latitude, longitude];

  return (
    <div className={className ?? "location-map-wrap"}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        attributionControl={interactive}
      >
        <InvalidateSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {accuracyM != null && accuracyM > 0 && (
          <Circle
            center={center}
            radius={accuracyM}
            pathOptions={{ color: "#e85d75", fillColor: "#e85d75", fillOpacity: 0.12 }}
          />
        )}
        <Marker position={center} title={label} icon={defaultIcon} />
      </MapContainer>
    </div>
  );
}
