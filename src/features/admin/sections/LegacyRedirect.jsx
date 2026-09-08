import { Navigate, useLocation, useParams } from 'react-router-dom';

/**
 * Redirects an old admin URL to its new home (docs/admin-redesign/00-plan.md,
 * "Таблиця відповідності маршрутів"), keeping whatever query string the old
 * link carried (e.g. ?warehouseId=, ?newClientId=).
 *
 * Props:
 *   to     – new pathname (no query string)
 *   extra  – (optional) extra query params to set on top of the carried-over ones
 */
export default function LegacyRedirect({ to, extra }) {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    if (extra) {
        for (const [key, value] of Object.entries(extra)) params.set(key, value);
    }
    const search = params.toString();
    return <Navigate to={`${to}${search ? `?${search}` : ''}`} replace />;
}

/**
 * Same as LegacyRedirect, for old `:id` card routes (e.g. /admin/rent/:id →
 * /admin/catalog/tools/:id) — keeps the id and the query string.
 */
export function IdLegacyRedirect({ toBase }) {
    const { id } = useParams();
    const location = useLocation();
    return <Navigate to={`${toBase}/${id}${location.search}`} replace />;
}
