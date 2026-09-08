import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AdminPageHeader } from '../../../components/admin';
import AdminOrders from './AdminOrders';
import AdminRentalApplications from './AdminRentalApplications';
import '../../../pages/admin/Admin.css';
import '../styles/RentalApplicationForm.css';

const TABS = [
    { key: 'all', label: 'Всі' },
    { key: 'rent', label: 'Оренда' },
    { key: 'calendar', label: 'Календар' },
];

function resolveTab(raw) {
    const value = String(raw || 'all').toLowerCase();
    if (value === 'rent') return 'rent';
    return 'all';
}

export default function OrdersRentalList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = useMemo(() => resolveTab(searchParams.get('type')), [searchParams]);

    function setTab(next) {
        if (next === 'calendar') {
            navigate('/admin/deals/calendar');
            return;
        }
        const params = new URLSearchParams(searchParams);
        if (next === 'all') params.delete('type');
        else params.set('type', next);
        setSearchParams(params, { replace: true });
    }

    const subtitle = tab === 'rent'
        ? 'Договори та заявки на оренду інструменту'
        : 'Замовлення магазину та оренди';

    return (
        <div className="orders-rental-list">
            <AdminPageHeader
                title="Угоди"
                subtitle={subtitle}
                actions={
                    tab === 'rent' ? (
                        <Link
                            to="/admin/deals/new?type=rent"
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

            {tab === 'all' && <AdminOrders hideHeader />}
            {tab === 'rent' && <AdminRentalApplications hideHeader />}
        </div>
    );
}
