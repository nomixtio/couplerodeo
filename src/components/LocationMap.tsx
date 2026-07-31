import { MapContainer, Marker, TileLayer, Circle } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  label?: string;
  className?: string;
}

export function LocationMap({
  latitude,
  longitude,
  accuracyM,
  label,
  className,
}: LocationMapProps) {
  const center: LatLngExpression = [latitude, longitude];

  return (
    <div className={className ?? "location-map-wrap"}>
      <MapContainer center={center} zoom={15} scrollWheelZoom={false}>
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
        <Marker position={center} title={label} />
      </MapContainer>
    </div>
  );
}
