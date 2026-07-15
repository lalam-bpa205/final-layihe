import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import { notify } from '../../notify';
import { PageHeader, Button, EmptyState, SkeletonRows } from '../../components/ui';
import { VehicleStatusBadge, fmtDateTime } from './transportShared';

// Leaflet-in default marker ikon URL-ləri Vite build-də qırılır — data-URI SVG pin işlədirik.
const pinSvg = (color) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 1C8.3 1 2 7.3 2 15c0 9.7 12.3 24.2 12.8 24.8a1.6 1.6 0 0 0 2.4 0C17.7 39.2 30 24.7 30 15 30 7.3 23.7 1 16 1z"/>
      <circle cx="16" cy="15" r="6" fill="#ffffff"/>
    </svg>`,
  )}`;

// Status → pin rəngi (VEHICLE_STATUS tonları ilə uyğun)
const STATUS_COLOR = {
  1: '#16a34a', // Aktiv — yaşıl
  2: '#2563eb', // Səfərdə — mavi
  3: '#d97706', // Təmirdə — narıncı
  4: '#64748b', // Deaktiv — boz
};

const makeIcon = (status) =>
  L.icon({
    iconUrl: pinSvg(STATUS_COLOR[status] ?? '#2563eb'),
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });

const fmtKm = (v) => `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 1 })} km`;
const fmtSpeed = (v) => `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 0 })} km/s`;

// Seçim dəyişəndə xəritəni müvafiq mövqeyə/izə fokusla.
function MapFocus({ track, markers }) {
  const map = useMap();
  useEffect(() => {
    if (track?.points?.length) {
      const bounds = L.latLngBounds(track.points.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    } else if (markers.length) {
      const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [track, markers, map]);
  return null;
}

export default function GpsTrackingPage() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [track, setTrack] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const firstLoad = useRef(true);

  const loadMarkers = () => {
    api
      .get('/gps/latest')
      .then(({ data }) => setMarkers(data))
      .catch(() => notify.error('GPS mövqeləri yüklənə bilmədi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMarkers();
    firstLoad.current = false;
  }, []);

  const selectVehicle = (vehicleId) => {
    setSelectedId(vehicleId);
    setTrackLoading(true);
    setTrack(null);
    api
      .get(`/gps/vehicles/${vehicleId}/track`)
      .then(({ data }) => setTrack(data))
      .catch(() => notify.error('GPS izi yüklənə bilmədi.'))
      .finally(() => setTrackLoading(false));
  };

  const clearSelection = () => {
    setSelectedId(null);
    setTrack(null);
  };

  const simulate = () => {
    if (!selectedId) return;
    setSimulating(true);
    api
      .post(`/gps/vehicles/${selectedId}/simulate`)
      .then(({ data }) => {
        setTrack(data);
        notify.success('Yeni GPS izi generasiya olundu.');
        loadMarkers();
      })
      .catch(() => notify.error('Simulyasiya alınmadı.'))
      .finally(() => setSimulating(false));
  };

  const center = useMemo(() => {
    if (markers.length) {
      const lat = markers.reduce((s, m) => s + m.latitude, 0) / markers.length;
      const lng = markers.reduce((s, m) => s + m.longitude, 0) / markers.length;
      return [lat, lng];
    }
    return [40.4, 48.5]; // Azərbaycan mərkəzi
  }, [markers]);

  const trackLine = track?.points?.map((p) => [p.latitude, p.longitude]) ?? [];

  return (
    <div>
      <PageHeader
        title="GPS izləmə"
        description="Avtomobillərin canlı mövqeyi — markerə vurub qət etdiyi marşrutu və məsafəni görün"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* Sol panel — avtomobil siyahısı / seçilən izin xülasəsi */}
        <div className="order-2 lg:order-1 space-y-4">
          {selectedId && (
            <TrackSummary
              track={track}
              loading={trackLoading}
              marker={markers.find((m) => m.vehicleId === selectedId)}
              onBack={clearSelection}
              onSimulate={simulate}
              simulating={simulating}
            />
          )}

          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-sm font-semibold tracking-tight text-slate-800">
                Avtomobillər ({markers.length})
              </h3>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {loading ? (
                <div className="p-3">
                  <SkeletonRows rows={4} />
                </div>
              ) : markers.length === 0 ? (
                <EmptyState
                  icon="📍"
                  title="GPS məlumatı yoxdur"
                  description="Hələ heç bir avtomobil üçün GPS izi yaradılmayıb."
                />
              ) : (
                <ul className="space-y-1">
                  {markers.map((m) => {
                    const active = m.vehicleId === selectedId;
                    return (
                      <li key={m.vehicleId}>
                        <button
                          onClick={() => selectVehicle(m.vehicleId)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            active ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: STATUS_COLOR[m.status] ?? '#2563eb' }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {m.plateNumber}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {m.brand} {m.model}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-slate-700">
                              {fmtKm(m.totalDistanceKm)}
                            </p>
                            <p className="text-xs text-slate-400">{fmtSpeed(m.speedKmh)}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Xəritə */}
        <div className="order-1 lg:order-2 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <MapContainer
            center={center}
            zoom={8}
            scrollWheelZoom
            style={{ height: '620px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFocus track={track} markers={markers} />

            {/* Seçilmiş izin marşrutu */}
            {trackLine.length > 1 && (
              <>
                <Polyline positions={trackLine} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
                <CircleMarker
                  center={trackLine[0]}
                  radius={7}
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1 }}
                >
                  <Popup>Başlanğıc</Popup>
                </CircleMarker>
              </>
            )}

            {/* Markerlər */}
            {markers.map((m) => (
              <Marker
                key={m.vehicleId}
                position={[m.latitude, m.longitude]}
                icon={makeIcon(m.status)}
                eventHandlers={{ click: () => selectVehicle(m.vehicleId) }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800">{m.plateNumber}</p>
                    <p className="text-slate-500">
                      {m.brand} {m.model}
                    </p>
                    <p>
                      <VehicleStatusBadge status={m.status} />
                    </p>
                    <p className="tabular-nums">
                      Qət edilib: <b>{fmtKm(m.totalDistanceKm)}</b>
                    </p>
                    <p className="tabular-nums text-slate-500">Cari sürət: {fmtSpeed(m.speedKmh)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

// Seçilmiş avtomobilin izinin xülasəsi (məsafə, sürət, vaxt).
function TrackSummary({ track, loading, marker, onBack, onSimulate, simulating }) {
  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🛰️</span>
          <h3 className="text-sm font-semibold tracking-tight text-slate-800">
            {marker?.plateNumber ?? track?.plateNumber ?? 'Marşrut'}
          </h3>
        </div>
        <button onClick={onBack} className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ✕ bağla
        </button>
      </div>
      <div className="p-5">
        {loading ? (
          <SkeletonRows rows={3} />
        ) : !track || track.pointCount === 0 ? (
          <p className="text-sm text-slate-400">GPS izi tapılmadı.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Qət edilən məsafə" value={fmtKm(track.totalDistanceKm)} tone="blue" />
              <Metric label="Orta sürət" value={fmtSpeed(track.averageSpeedKmh)} />
              <Metric label="Maks. sürət" value={fmtSpeed(track.maxSpeedKmh)} />
              <Metric label="Nöqtə sayı" value={track.pointCount} />
            </div>
            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <p>Başlanğıc: {fmtDateTime(track.startedAtUtc)}</p>
              <p>Son mövqe: {fmtDateTime(track.endedAtUtc)}</p>
              {marker && (
                <p className="pt-1">
                  Status: <VehicleStatusBadge status={marker.status} />
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={onSimulate}
              disabled={simulating}
              className="mt-4 w-full"
            >
              {simulating ? 'Generasiya olunur…' : '🔄 Yeni GPS izi generasiya et'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tone === 'blue' ? 'bg-blue-50' : 'bg-slate-50'}`}>
      <p className={`text-lg font-bold tabular-nums ${tone === 'blue' ? 'text-blue-700' : 'text-slate-800'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}
