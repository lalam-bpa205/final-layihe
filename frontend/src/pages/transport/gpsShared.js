import L from 'leaflet';

// Leaflet-in default marker ikon URL-ləri Vite build-də qırılır — data-URI SVG pin işlədirik.
const pinSvg = (color) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 1C8.3 1 2 7.3 2 15c0 9.7 12.3 24.2 12.8 24.8a1.6 1.6 0 0 0 2.4 0C17.7 39.2 30 24.7 30 15 30 7.3 23.7 1 16 1z"/>
      <circle cx="16" cy="15" r="6" fill="#ffffff"/>
    </svg>`,
  )}`;

// Status → pin rəngi (VEHICLE_STATUS tonları ilə uyğun)
export const STATUS_COLOR = {
  1: '#16a34a', // Aktiv — yaşıl
  2: '#2563eb', // Səfərdə — mavi
  3: '#d97706', // Təmirdə — narıncı
  4: '#64748b', // Deaktiv — boz
};

export const makeIcon = (status) =>
  L.icon({
    iconUrl: pinSvg(STATUS_COLOR[status] ?? '#2563eb'),
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });

export const fmtKm = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 1 })} km`;

export const fmtSpeed = (v) =>
  `${Number(v ?? 0).toLocaleString('az-AZ', { maximumFractionDigits: 0 })} km/s`;
