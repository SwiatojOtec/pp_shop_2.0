import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin } from 'lucide-react';
import { geocodeApi } from '../../../../services/api';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite doesn't resolve Leaflet's default marker icon URLs automatically —
// rebuild them from the bundled package assets (one-time, module-level).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const GEOCODE_DEBOUNCE_MS = 600;

/** Geocodes a free-text address (debounced) via the server's Nominatim proxy. */
function useGeocodedAddress(address) {
    const [state, setState] = useState({ loading: false, point: null, error: null });

    useEffect(() => {
        const trimmed = (address || '').trim();
        if (!trimmed) {
            setState({ loading: false, point: null, error: null });
            return undefined;
        }
        let cancelled = false;
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const timer = setTimeout(() => {
            geocodeApi.lookup(trimmed)
                .then((res) => {
                    if (!cancelled) setState({ loading: false, point: res, error: null });
                })
                .catch((err) => {
                    if (!cancelled) setState({ loading: false, point: null, error: err.message || 'Не вдалося визначити адресу' });
                });
        }, GEOCODE_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [address]);

    return state;
}

function FitBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (!points.length) return;
        if (points.length === 1) {
            map.setView(points[0], 13);
        } else {
            map.fitBounds(points, { padding: [40, 40] });
        }
    }, [map, points]);
    return null;
}

function formatDuration(seconds) {
    const totalMin = Math.round(seconds / 60);
    if (totalMin < 60) return `${totalMin} хв`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h} год ${m} хв` : `${h} год`;
}

function formatDistance(meters) {
    return `${(meters / 1000).toFixed(1)} км`;
}

/**
 * Мітки Майданчик/Пункт доставки + маршрут і ETA від складу до пункту
 * доставки (реальний рейс водія — маршрут до майданчика окремо не рахуємо).
 * Геокодування — через server/routes/geocodeRoutes.js (Nominatim proxy),
 * маршрут — напряму з публічного OSRM (підтримує CORS, без ключа).
 */
export default function DealRouteMap({ originAddress, originPoint, siteAddress, deliveryAddress }) {
    // A known-fixed point (the warehouse) skips geocoding entirely — Nominatim
    // doesn't reliably resolve every real Cyrillic address by free-text search.
    const geocodedOrigin = useGeocodedAddress(originPoint ? '' : originAddress);
    const origin = originPoint ? { loading: false, point: originPoint, error: null } : geocodedOrigin;
    const site = useGeocodedAddress(siteAddress);
    const delivery = useGeocodedAddress(deliveryAddress);

    const [route, setRoute] = useState({ loading: false, geometry: null, duration: null, distance: null, error: null });

    useEffect(() => {
        if (!origin.point || !delivery.point) {
            setRoute({ loading: false, geometry: null, duration: null, distance: null, error: null });
            return undefined;
        }
        let cancelled = false;
        setRoute((prev) => ({ ...prev, loading: true, error: null }));
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.point.lon},${origin.point.lat};${delivery.point.lon},${delivery.point.lat}?overview=full&geometries=geojson`;
        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                const r0 = data?.routes?.[0];
                if (!r0) {
                    setRoute({ loading: false, geometry: null, duration: null, distance: null, error: 'Маршрут не знайдено' });
                    return;
                }
                const coords = r0.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                setRoute({ loading: false, geometry: coords, duration: r0.duration, distance: r0.distance, error: null });
            })
            .catch(() => {
                if (!cancelled) setRoute({ loading: false, geometry: null, duration: null, distance: null, error: 'Не вдалося побудувати маршрут' });
            });
        return () => {
            cancelled = true;
        };
    }, [origin.point, delivery.point]);

    const hasAnyAddress = !!(siteAddress || '').trim() || !!(deliveryAddress || '').trim();
    if (!hasAnyAddress) return null;

    const points = [site.point, delivery.point, origin.point]
        .filter(Boolean)
        .map((p) => [p.lat, p.lon]);

    return (
        <div className="ds-card deal-card">
            <div className="ds-card-h"><h2>Карта й маршрут</h2></div>
            <div className="ds-card-b">
                {(origin.loading || site.loading || delivery.loading) && (
                    <div className="deal-client-status">
                        <Loader2 size={14} className="animate-spin" /> Визначаємо адреси…
                    </div>
                )}
                {site.error && siteAddress && (
                    <div className="deal-client-status deal-map-address-error">
                        <MapPin size={14} /> Майданчик: {site.error}
                    </div>
                )}
                {delivery.error && deliveryAddress && (
                    <div className="deal-client-status deal-map-address-error">
                        <MapPin size={14} /> Пункт доставки: {delivery.error}
                    </div>
                )}
                {origin.error && !originPoint && (
                    <div className="deal-client-status deal-map-address-error">
                        <MapPin size={14} /> Склад: {origin.error}
                    </div>
                )}

                {points.length > 0 && (
                    <>
                        <div className="deal-map-wrap">
                            <MapContainer
                                center={points[0]}
                                zoom={12}
                                scrollWheelZoom={false}
                                style={{ height: 280, width: '100%', borderRadius: 'var(--ds-radius-md)' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />
                                {site.point && (
                                    <Marker position={[site.point.lat, site.point.lon]}>
                                        <Popup>Майданчик</Popup>
                                    </Marker>
                                )}
                                {delivery.point && (
                                    <Marker position={[delivery.point.lat, delivery.point.lon]}>
                                        <Popup>Пункт доставки</Popup>
                                    </Marker>
                                )}
                                {route.geometry && <Polyline positions={route.geometry} color="#c0202b" />}
                                <FitBounds points={points} />
                            </MapContainer>
                        </div>
                        {route.loading && <p className="deal-modal-hint">Розраховуємо маршрут…</p>}
                        {route.duration != null && (
                            <p className="deal-map-route-summary">
                                Від складу: {formatDistance(route.distance)} · ≈{formatDuration(route.duration)} в дорозі
                            </p>
                        )}
                        {route.error && <p className="deal-modal-hint">{route.error}</p>}
                    </>
                )}
            </div>
        </div>
    );
}
