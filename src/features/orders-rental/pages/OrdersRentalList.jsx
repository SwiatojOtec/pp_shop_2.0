import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin';
import AdminOrders from './AdminOrders';
import AdminRentalApplications from './AdminRentalApplications';
import '../../../pages/admin/Admin.css';
import '../styles/RentalApplicationForm.css';

const TABS = [
    { key: 'orders', label: 'Замовлення' },
    { key: 'rental', label: 'Заявки оренди' },
];

export default function OrdersRentalList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = useMemo(() => {
        const raw = String(searchParams.get('tab') || 'orders').toLowerCase();
        return raw === 'rental' ? 'rental' : 'orders';
    }, [searchParams]);

    function setTab(next) {
        const params = new URLSearchParams(searchParams);
        if (next === 'orders') params.delete('tab');
        else params.set('tab', next);
        // Keep newClientId etc. for orders composer
        setSearchParams(params, { replace: true });
    }

    return (
        <div className="orders-rental-list">
            <AdminPageHeader
                title="Замовлення та оренда"
                subtitle={tab === 'rental'
                    ? 'Договори та заявки на оренду інструменту'
                    : 'Замовлення магазину та оренди'}
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

            {tab === 'orders' ? (
                <AdminOrders hideHeader />
            ) : (
                <AdminRentalApplications hideHeader />
            )}
        </div>
    );
}
