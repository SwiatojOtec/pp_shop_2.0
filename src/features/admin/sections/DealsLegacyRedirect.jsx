import { Navigate, useLocation } from 'react-router-dom';

/**
 * `/admin/orders` used a `?tab=` query to switch between the orders table,
 * the rental applications table, and the calendar. The new "Угоди" section
 * (/admin/deals) uses `?type=` for the table split and a real `/calendar`
 * route for the calendar — this redirect translates old links, and passes
 * through any other query params (e.g. ?newClientId=) unchanged.
 */
export default function DealsLegacyRedirect() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    params.delete('tab');
    const rest = params.toString();

    if (tab === 'calendar') {
        return <Navigate to={`/admin/deals/calendar${rest ? `?${rest}` : ''}`} replace />;
    }
    if (tab === 'rental') {
        params.set('type', 'rent');
    }
    const search = params.toString();
    return <Navigate to={`/admin/deals${search ? `?${search}` : ''}`} replace />;
}
