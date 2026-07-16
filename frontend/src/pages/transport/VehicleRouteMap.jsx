import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import { SkeletonRows } from '../../components/ui';
import { makeIcon, fmtKm, fmtSpeed } from './gpsShared';
import { fmtDateTime } from './transportShared';

// İz yüklənəndə xəritəni ona fokusla
function FitToTrack({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude])), {
      padding: [30, 30],
      maxZoom: 11,
    });
  }, [points, map]);
  return null;
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-sm font-bold tabular-nums text-slate-800">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

/**
 * GPS izini xəritədə göstərir — qət edilən məsafə və sürətlərlə.
 *
 * İki rejim:
 *  - `deliveryId` verilsə → MƏHZ həmin reysin izi
 *  - `vehicleId` verilsə → avtomobilin sonuncu reysinin izi
 */
export default function VehicleRouteMap({
  vehicleId,
  deliveryId,
  vehicleStatus = 2,
  height = 320,
  emptyText = 'Bu avtomobil üçün GPS izi yoxdur.',
}) {
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const url = deliveryId
      ? `/gps/deliveries/${deliveryId}/track`
      : vehicleId
        ? `/gps/vehicles/${vehicleId}/track`
        : null;
    if (!url) return;

    setLoading(true);
    setFailed(false);
    api
      .get(url)
      .then(({ data }) => setTrack(data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [vehicleId, deliveryId]);

  if (loading) {
    return (
      <div className="p-1">
        <SkeletonRows rows={3} cols={2} />
      </div>
    );
  }

  if (failed || !track || track.pointCount === 0) {
    return <p className="px-1 py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  }

  const line = track.points.map((p) => [p.latitude, p.longitude]);
  const last = track.points[track.points.length - 1];

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Qət edilən məsafə" value={fmtKm(track.totalDistanceKm)} />
        <Metric label="Orta sürət" value={fmtSpeed(track.averageSpeedKmh)} />
        <Metric label="Maks. sürət" value={fmtSpeed(track.maxSpeedKmh)} />
        <Metric label="GPS nöqtəsi" value={track.pointCount} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={[last.latitude, last.longitude]}
          zoom={9}
          scrollWheelZoom={false}
          style={{ height: `${height}px`, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToTrack points={track.points} />

          <Polyline positions={line} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.85 }} />

          <CircleMarker
            center={line[0]}
            radius={6}
            pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }}
          >
            <Popup>İzin başlanğıcı</Popup>
          </CircleMarker>

          <Marker position={[last.latitude, last.longitude]} icon={makeIcon(vehicleStatus)}>
            <Popup>
              <p className="font-semibold text-slate-800">{track.plateNumber}</p>
              <p className="tabular-nums">Qət edilib: {fmtKm(track.totalDistanceKm)}</p>
              <p className="tabular-nums text-slate-500">Son sürət: {fmtSpeed(last.speedKmh)}</p>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          İz: {fmtDateTime(track.startedAtUtc)} — {fmtDateTime(track.endedAtUtc)}
        </span>
        <Link to="/transport/gps" className="font-medium text-indigo-600 hover:underline">
          Bütün parkı xəritədə gör →
        </Link>
      </div>
    </div>
  );
}
