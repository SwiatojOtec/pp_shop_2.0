import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { analyticsApi, sellersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { getStatusLabel, ORDER_STATUS } from '../../features/admin/model/status';
import PageHeader from '../../features/admin/ui/PageHeader';
import KpiCard from '../../features/admin/analytics/KpiCard';
import RankingTable from '../../features/admin/analytics/RankingTable';
import ProductAnalyticsSearch from '../../features/admin/analytics/ProductAnalyticsSearch';
import { DATE_RANGE_PRESETS, defaultRange, bucketToRange } from '../../features/admin/analytics/dateRangePresets';
import '../../features/admin/analytics/analytics.css';

const TONE_VAR = {
    info: 'var(--ds-info)',
    warning: 'var(--ds-warning)',
    success: 'var(--ds-success)',
    violet: 'var(--ds-violet)',
    teal: 'var(--ds-teal)',
    neutral: 'var(--ds-text-muted)',
    danger: 'var(--ds-danger)',
};

const CHART_ANIM = { animationDuration: 700, animationEasing: 'ease-out' };

function money(v) {
    return `${Number(v || 0).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`;
}

function percent(v) {
    return v == null ? '—' : `${Number(v).toLocaleString('uk-UA', { maximumFractionDigits: 1 })}%`;
}

function bucketLabel(bucket, granularity) {
    if (granularity === 'month') {
        const [y, m] = bucket.split('-');
        return new Date(Number(y), Number(m) - 1, 1).toLocaleString('uk-UA', { month: 'short', year: '2-digit' });
    }
    const d = new Date(bucket);
    return d.toLocaleString('uk-UA', { day: 'numeric', month: 'short' });
}

export default function AdminAnalytics() {
    const { showToast } = useToast();
    const [preset, setPreset] = useState('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [drilldown, setDrilldown] = useState(null); // { from, to, label } — клік по точці графіка
    const [sellerFilter, setSellerFilter] = useState('all');
    const [sellers, setSellers] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        sellersApi.list().then((rows) => setSellers(Array.isArray(rows) ? rows : [])).catch(() => setSellers([]));
    }, []);

    const sellerOptions = useMemo(() => {
        const fopCount = sellers.filter((s) => s.type === 'fop').length;
        const tovCount = sellers.filter((s) => s.type === 'tov').length;
        return [
            { value: 'all', label: 'Усі юрособи' },
            ...(fopCount > 1 ? [{ value: 'fop', label: 'Усі ФОП' }] : []),
            ...(tovCount > 1 ? [{ value: 'tov', label: 'Усі ТОВ' }] : []),
            ...sellers.map((s) => ({ value: s.id, label: s.label })),
        ];
    }, [sellers]);

    const range = useMemo(() => {
        if (drilldown) return drilldown;
        if (preset === 'custom') {
            return customFrom && customTo ? { from: customFrom, to: customTo } : defaultRange();
        }
        const found = DATE_RANGE_PRESETS.find((p) => p.value === preset);
        return found?.range ? found.range() : defaultRange();
    }, [preset, customFrom, customTo, drilldown]);

    function handlePresetClick(value) {
        setDrilldown(null);
        setPreset(value);
    }

    function handleChartClick(chartState) {
        // recharts v3 dropped `activePayload` from the click state — the
        // index into the chart's own data array is the only reliable way
        // left to recover which point was clicked.
        const idx = chartState?.activeTooltipIndex;
        if (idx == null) return;
        const point = seriesForChart[Number(idx)];
        if (!point?.bucket) return;
        setDrilldown(bucketToRange(point.bucket, granularity));
    }

    const productId = selectedProduct?.id || null;

    useEffect(() => {
        setLoading(true);
        analyticsApi.summary({ ...range, productId, seller: sellerFilter })
            .then(setData)
            .catch((err) => showToast(err.message || 'Не вдалося завантажити аналітику', 'warning'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range.from, range.to, productId, sellerFilter]);

    const granularity = data?.range?.granularity || 'day';

    const seriesForChart = useMemo(
        () => (data?.revenueSeries || []).map((b) => ({ ...b, label: bucketLabel(b.bucket, granularity) })),
        [data, granularity]
    );

    const funnelForChart = useMemo(
        () => (data?.statusFunnel || []).map((f) => ({ ...f, label: getStatusLabel('order', f.status) })),
        [data]
    );

    // У режимі «по товару» вся вибірка й так звужена до одного товару —
    // категорії/бренди/топ товарів/постачальники стали б рядком-дублем, тож
    // замінюємо їх власною зведеною карткою товару.
    const productSummary = productId ? data?.topProducts?.[0] : null;

    return (
        <div>
            <PageHeader
                title="Аналітика"
                subtitle={[
                    productId ? `Товар: ${selectedProduct.name}` : null,
                    drilldown ? drilldown.label : (data ? `Період: ${data.range.from} — ${data.range.to}` : null),
                ].filter(Boolean).join(' · ')}
            />

            <div className="analytics-toolbar">
                <ProductAnalyticsSearch
                    selectedProduct={selectedProduct}
                    onSelect={setSelectedProduct}
                    onClear={() => setSelectedProduct(null)}
                />

                <label className="analytics-seller-filter">
                    <span className="analytics-muted">Юрособа</span>
                    <select
                        className="catalog-select"
                        value={sellerFilter}
                        onChange={(e) => setSellerFilter(e.target.value)}
                    >
                        {sellerOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="analytics-range-bar">
                {DATE_RANGE_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        type="button"
                        className={`ds-btn ds-btn--sm${!drilldown && preset === p.value ? ' ds-btn--primary' : ' ds-btn--secondary'}`}
                        onClick={() => handlePresetClick(p.value)}
                    >
                        {p.label}
                    </button>
                ))}
                {!drilldown && preset === 'custom' && (
                    <div className="analytics-custom-range">
                        <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="catalog-input" />
                        <span>—</span>
                        <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="catalog-input" />
                    </div>
                )}
                {drilldown && (
                    <span className="analytics-drilldown-chip">
                        {drilldown.label}
                        <button type="button" className="ds-icon-btn" onClick={() => setDrilldown(null)} title="До всього періоду">
                            <X size={14} />
                        </button>
                    </span>
                )}
            </div>

            {loading || !data ? (
                <p className="analytics-loading">Завантаження...</p>
            ) : (
                <>
                    <div className="analytics-kpi-grid">
                        <KpiCard
                            label={productId ? 'Виручка по товару' : 'Виручка (без ПДВ)'}
                            rawValue={productId ? (productSummary?.revenue || 0) : data.kpis.netRevenue}
                            format={money}
                        />
                        <KpiCard
                            label="Реальний прибуток"
                            rawValue={productId ? (productSummary?.profit || 0) : data.kpis.profit}
                            format={money}
                            hint={
                                productId
                                    ? (productSummary?.costKnown
                                        ? `Маржа ${percent(roundPct(productSummary.profit, productSummary.revenue))} · податок вже віднято`
                                        : 'Немає даних про собівартість цього товару')
                                    : (data.kpis.marginPercent != null
                                        ? `Маржа ${percent(data.kpis.marginPercent)} · податок ${money(data.kpis.tax)} вже віднято`
                                        : 'Немає даних про собівартість')
                            }
                        />
                        {!productId && (
                            <KpiCard label="Середній чек" rawValue={data.kpis.avgOrderValue} format={money} />
                        )}
                        <KpiCard
                            label="Угоди"
                            rawValue={productId ? (data.kpis.matchedOrdersCount || 0) : data.kpis.dealsCount}
                            format={(v) => Math.round(v)}
                            hint={productId ? 'угод з цим товаром' : `з них оплачених: ${data.kpis.paidDealsCount}`}
                        />
                        {productId && (
                            <KpiCard
                                label="Продано, шт"
                                rawValue={productSummary?.qty || 0}
                                format={(v) => Math.round(v)}
                            />
                        )}
                        {!productId && (
                            <KpiCard
                                label="Магазин / Оренда"
                                value={`${money(data.kpis.shopRevenue)} / ${money(data.kpis.rentRevenue)}`}
                            />
                        )}
                        {!productId && (
                            <KpiCard
                                label="Інструмент в оренді зараз"
                                value={`${data.kpis.productsCurrentlyOut} з ${data.kpis.rentableProductCount}`}
                                hint="позицій каталогу, не залежить від обраного періоду"
                            />
                        )}
                    </div>

                    <div className="analytics-charts-grid">
                        <div className="ds-card analytics-chart-card">
                            <div className="ds-card-h">
                                <h2>Виручка в часі</h2>
                                <span className="analytics-muted">Клікніть на графік, щоб побачити лише цей {granularity === 'month' ? 'місяць' : granularity === 'week' ? 'тиждень' : 'день'}</span>
                            </div>
                            <div className="ds-card-b">
                                <div className="analytics-chart-wrap analytics-chart-wrap--clickable">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={seriesForChart} onClick={handleChartClick}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
                                            <YAxis tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
                                            <Tooltip
                                                formatter={(v) => money(v)}
                                                contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}
                                                labelStyle={{ color: 'var(--ds-text)' }}
                                                itemStyle={{ color: 'var(--ds-text)' }}
                                            />
                                            <Legend />
                                            <Area type="monotone" dataKey="shop" name="Магазин" stackId="1" stroke="var(--ds-info)" fill="var(--ds-info-soft)" {...CHART_ANIM} />
                                            <Area type="monotone" dataKey="rent" name="Оренда" stackId="1" stroke="var(--ds-accent)" fill="var(--ds-accent-soft)" {...CHART_ANIM} />
                                            <Area type="monotone" dataKey="profit" name="Прибуток" stroke="var(--ds-success)" fill="none" strokeDasharray="4 3" {...CHART_ANIM} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="ds-card analytics-chart-card">
                            <div className="ds-card-h"><h2>Воронка угод</h2></div>
                            <div className="ds-card-b">
                                <div className="analytics-chart-wrap">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={funnelForChart} layout="vertical" margin={{ left: 24 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border)" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
                                            <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12, fill: 'var(--ds-text-muted)' }} />
                                            <Tooltip
                                                contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)' }}
                                                labelStyle={{ color: 'var(--ds-text)' }}
                                                itemStyle={{ color: 'var(--ds-text)' }}
                                            />
                                            <Bar dataKey="count" name="Кількість" radius={[0, 4, 4, 0]} {...CHART_ANIM}>
                                                {funnelForChart.map((f) => (
                                                    <Cell key={f.status} fill={TONE_VAR[ORDER_STATUS[f.status]?.tone] || TONE_VAR.neutral} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {productId ? (
                        <div className="analytics-tables-grid">
                            <div className="ds-card analytics-table-wide">
                                <div className="ds-card-h"><h2>Хто купував цей товар</h2></div>
                                <div className="ds-card-b">
                                    <RankingTable
                                        rows={data.topClients}
                                        nameKey="name"
                                        nameLabel="Клієнт"
                                        extraColumn={{ key: 'orders', label: 'Угод', align: 'right' }}
                                        emptyTitle="У цей період товар ще ніхто не купував"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="analytics-tables-grid">
                            <div className="ds-card">
                                <div className="ds-card-h"><h2>Категорії</h2></div>
                                <div className="ds-card-b">
                                    <RankingTable rows={data.byCategory} nameKey="category" nameLabel="Категорія" />
                                </div>
                            </div>

                            <div className="ds-card">
                                <div className="ds-card-h"><h2>Бренди</h2></div>
                                <div className="ds-card-b">
                                    <RankingTable rows={data.byBrand} nameKey="brand" nameLabel="Бренд" />
                                </div>
                            </div>

                            <div className="ds-card">
                                <div className="ds-card-h"><h2>Топ товарів</h2></div>
                                <div className="ds-card-b">
                                    <RankingTable rows={data.topProducts} nameKey="name" nameLabel="Товар" />
                                </div>
                            </div>

                            <div className="ds-card">
                                <div className="ds-card-h"><h2>Топ клієнтів</h2></div>
                                <div className="ds-card-b">
                                    <RankingTable
                                        rows={data.topClients}
                                        nameKey="name"
                                        nameLabel="Клієнт"
                                        extraColumn={{ key: 'orders', label: 'Угод', align: 'right' }}
                                    />
                                </div>
                            </div>

                            <div className="ds-card analytics-table-wide">
                                <div className="ds-card-h">
                                    <h2>Постачальники</h2>
                                    <span className="analytics-muted">Прибуток лише по товарах на перепродаж, не по інструменту оренди</span>
                                </div>
                                <div className="ds-card-b">
                                    <RankingTable rows={data.bySupplier} nameKey="name" nameLabel="Постачальник" />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function roundPct(part, whole) {
    if (!whole) return null;
    return Math.round((part / whole) * 1000) / 10;
}
