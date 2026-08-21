import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin';
import AdminOrders from './AdminOrders';
import AdminRentalApplications from './AdminRentalApplications';
import RentalCalendar from './RentalCalendar';
import '../../../pages/admin/Admin.css';
import '../styles/RentalApplicationForm.css';

const TABS = [
    { key: 'orders', label: 'Замовлення' },
    { key: 'rental', label: 'Заявки оренди' },
    { key: 'calendar', label: 'Календар' },
];

function resolveTab(raw) {
    const value = String(raw || 'orders').toLowerCase();
    if (value === 'rental' || value === 'calendar') return value;
    return 'orders';
}

export default function OrdersRentalList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = useMemo(() => resolveTab(searchParams.get('tab')), [searchParams]);

    function setTab(next) {
        const params = new URLSearchParams(searchParams);
        if (next === 'orders') params.delete('tab');
        else params.set('tab', next);
        setSearchParams(params, { replace: true });
    }

    const subtitle = tab === 'rental'
        ? 'Договори та заявки на оренду інструменту'
        : tab === 'calendar'
            ? 'Бронювання та зайнятість інструменту по датах'
            : 'Замовлення магазину та оренди';

    return (
        <div className="orders-rental-list">
            <AdminPageHeader
                title="Замовлення та оренда"
                subtitle={subtitle}
                actions={
                    tab === 'rental' ? (
                        <Link
                            to="/admin/rental-applications/new"
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                        >
                            <Plus size={16} /> Створити заявку
                        </Link>
                    ) : null
                }
            />

            <div className="rental-tabs-nav" style={{ marginBottom: 16 }}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        className={`rental-tab-btn${tab === t.key ? ' is-active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'orders' && <AdminOrders hideHeader />}
            {tab === 'rental' && <AdminRentalApplications hideHeader />}
            {tab === 'calendar' && <RentalCalendar />}
        </div>
    );
}
