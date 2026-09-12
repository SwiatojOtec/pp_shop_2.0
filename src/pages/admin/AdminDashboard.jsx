import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../services/api';
import PageHeader from '../../features/admin/ui/PageHeader';
import '../../features/admin/dashboard/dashboard.css';

function monthTitle(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('uk-UA', { month: 'long' });
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardApi.get()
            .then((res) => setData(res))
            .catch(() => setData({ attention: [], today: null, shop: null }))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <PageHeader
                title="Робочий стіл"
                subtitle={`Вітаємо${user ? `, ${user.name}${user.lastName ? ' ' + user.lastName : ''}` : ''}!`}
            />

            {loading ? (
                <p className="dashboard-loading">Завантаження...</p>
            ) : (
                <div className="dashboard-grid">
                    <div className="dashboard-attention-card">
                        <h2 className="dashboard-attention-title">Потребує уваги</h2>
                        {data.attention.length === 0 ? (
                            <div className="dashboard-attention-empty">
                                <CheckCircle2 size={18} />
                                Усе під контролем
                            </div>
                        ) : (
                            <div className="dashboard-attention-list">
                                {data.attention.map((row, i) => (
                                    <Link key={i} to={row.to} className="dashboard-attention-row">
                                        <span className={`dashboard-attention-bar dashboard-attention-bar--${row.tone}`} />
                                        <span className="dashboard-attention-body">
                                            <span className="dashboard-attention-row-title">{row.title}</span>
                                            <span className="dashboard-attention-row-detail">{row.detail}</span>
                                        </span>
                                        <ChevronRight size={16} className="dashboard-attention-row-arrow" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dashboard-numbers">
                        {data.today && (
                            <div className="dashboard-numbers-block">
                                <h3 className="dashboard-numbers-title">
                                    Сьогодні · {new Date(data.today.date).toLocaleDateString('uk-UA')}
                                </h3>
                                <div className="dashboard-numbers-grid">
                                    <div className="dashboard-number">
                                        <span className="dashboard-number-value">{data.today.toIssue}</span>
                                        <span className="dashboard-number-label">Видати інструмент</span>
                                    </div>
                                    <div className="dashboard-number">
                                        <span className="dashboard-number-value">{data.today.toReturn}</span>
                                        <span className="dashboard-number-label">Прийняти назад</span>
                                    </div>
                                    <div className="dashboard-number">
                                        <span className="dashboard-number-value">{data.today.activeRentals}</span>
                                        <span className="dashboard-number-label">Активних оренд</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {data.shop && (
                            <div className="dashboard-numbers-block">
                                <h3 className="dashboard-numbers-title">Магазин · {monthTitle(data.shop.month)}</h3>
                                <div className="dashboard-numbers-grid">
                                    <div className="dashboard-number">
                                        <span className="dashboard-number-value">{data.shop.orders}</span>
                                        <span className="dashboard-number-label">Замовлень</span>
                                    </div>
                                    <div className="dashboard-number">
                                        <span className="dashboard-number-value">{data.shop.paid}</span>
                                        <span className="dashboard-number-label">Оплачено</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
