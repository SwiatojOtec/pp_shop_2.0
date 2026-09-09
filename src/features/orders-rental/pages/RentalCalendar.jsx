import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, FilePlus2, Trash2, Search, CalendarCheck2 } from 'lucide-react';
import { productsApi, rentalCalendarApi } from '../../../services/api';
import ConfirmDialog from '../../admin/ui/ConfirmDialog';
import Drawer from '../../admin/ui/Drawer';
import PageHeader from '../../admin/ui/PageHeader';
import Tabs from '../../admin/ui/Tabs';
import {
    toIsoDate, startOfMonth, addMonths, daysOfMonth, addDays, startOfWeek, daysInRange,
    rangesOverlap, buildTimelineRows,
} from '../model/calendarTimeline';
import '../styles/RentalCalendar.css';
import '../styles/resource-timeline.css';

const MONTHS_UA = [
    'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
    'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
];

const MODES = [
    { value: 'busy', label: 'Зайняті' },
    { value: 'categories', label: 'За категоріями' },
    { value: 'all', label: 'Всі' },
];

const RANGE_MODES = [
    { value: 'week', label: 'Тиждень' },
    { value: 'twoWeeks', label: '2 тижні' },
    { value: 'month', label: 'Місяць' },
];

const RANGE_DAY_WIDTH = { week: 130, twoWeeks: 80, month: 40 };

const STATUS_LABEL = {
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Прострочено',
    returned: 'Повернено',
    draft: 'Чернетка',
};

function emptyForm(productId = '', productName = '', dayIso = '') {
    return {
        productId, productName, rentFrom: dayIso, rentTo: dayIso,
        clientName: '', clientPhone: '', note: '',
    };
}

function filterProducts(products, query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
        .filter((p) =>
            String(p.name || '').toLowerCase().includes(q)
            || String(p.sku || '').toLowerCase().includes(q)
            || String(p.inventoryNumber || '').toLowerCase().includes(q))
        .slice(0, 8);
}

const fmtUa = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');

/** Bar content: «клієнт · № угоди» (docs/admin-redesign/05-fixes.md, п.3) —
 *  falls back to the event title/tool name for bookings that don't have a
 *  deal number yet. */
function barLabel(evt) {
    const client = evt.clientName || evt.title || evt.productName;
    return evt.applicationNumber ? `${client} · ${evt.applicationNumber}` : client;
}

export default function RentalCalendar() {
    const navigate = useNavigate();
    const [rangeMode, setRangeMode] = useState('week');
    const [anchor, setAnchor] = useState(() => new Date());
    const [mode, setMode] = useState('busy');
    const [events, setEvents] = useState([]);
    const [productTotals, setProductTotals] = useState({});
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState(() => new Set());

    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(() => emptyForm());
    const [productSearch, setProductSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const [detailEvent, setDetailEvent] = useState(null);
    const [convertingId, setConvertingId] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [openOrderId, setOpenOrderId] = useState(null);

    const [checkProductId, setCheckProductId] = useState('');
    const [checkProductName, setCheckProductName] = useState('');
    const [checkProductSearch, setCheckProductSearch] = useState('');
    const [checkFrom, setCheckFrom] = useState('');
    const [checkTo, setCheckTo] = useState('');
    const [checkQty, setCheckQty] = useState(1);
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkResult, setCheckResult] = useState(null);

    const todayIso = toIsoDate(new Date());
    const rangeStart = useMemo(
        () => (rangeMode === 'month' ? startOfMonth(anchor) : startOfWeek(anchor)),
        [rangeMode, anchor]
    );
    const days = useMemo(() => {
        if (rangeMode === 'week') return daysInRange(rangeStart, 7);
        if (rangeMode === 'twoWeeks') return daysInRange(rangeStart, 14);
        return daysOfMonth(rangeStart);
    }, [rangeMode, rangeStart]);
    const range = useMemo(() => ({
        from: toIsoDate(days[0] || rangeStart),
        to: toIsoDate(days[days.length - 1] || rangeStart),
    }), [days, rangeStart]);
    const dayColWidth = RANGE_DAY_WIDTH[rangeMode];
    const dayIndexByIso = useMemo(() => {
        const map = new Map();
        days.forEach((d, i) => map.set(toIsoDate(d), i));
        return map;
    }, [days]);

    const suggestedProducts = useMemo(() => filterProducts(products, productSearch), [products, productSearch]);
    const checkSuggestedProducts = useMemo(() => filterProducts(products, checkProductSearch), [products, checkProductSearch]);

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await rentalCalendarApi.events(range);
            setEvents(Array.isArray(data?.events) ? data.events : []);
            setProductTotals(data?.productTotals || {});
        } catch (err) {
            setError(err.message || 'Не вдалося завантажити календар');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { loadEvents(); }, [loadEvents]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await productsApi.list({ isRent: true, includeHiddenRent: true });
                if (!cancelled) setProducts(Array.isArray(list) ? list : []);
            } catch {
                if (!cancelled) setProducts([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const groups = useMemo(
        () => buildTimelineRows(events, products, mode, days, productTotals),
        [events, products, mode, days, productTotals]
    );

    // "За категоріями" opens with every group collapsed (docs/admin-redesign/
    // 03-screens.md, «Календар») — reset the collapse set each time that mode
    // is (re-)entered so switching away and back doesn't remember stale state.
    useEffect(() => {
        if (mode !== 'categories') return;
        setCollapsedCategories(new Set(groups.map((g) => g.category).filter(Boolean)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    function toggleCategory(category) {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    }

    function openCreateForm(productId = '', productName = '', dayIso = '') {
        setEditingId(null);
        setForm(emptyForm(productId, productName, dayIso || todayIso));
        setProductSearch(productName);
        setFormOpen(true);
        setError('');
    }

    function openEditHold(event) {
        if (!event?.bookingId) return;
        setDetailEvent(null);
        setEditingId(event.bookingId);
        setForm({
            productId: String(event.productId || ''),
            productName: event.productName || '',
            rentFrom: event.rentFrom || '',
            rentTo: event.rentTo || '',
            clientName: event.clientName || '',
            clientPhone: event.clientPhone || '',
            note: event.note || '',
        });
        setProductSearch(event.productName || '');
        setFormOpen(true);
        setError('');
    }

    function selectProduct(product) {
        setForm((f) => ({ ...f, productId: String(product.id), productName: product.name || '' }));
        setProductSearch(product.name || '');
    }

    function clearSelectedProduct() {
        setForm((f) => ({ ...f, productId: '', productName: '' }));
        setProductSearch('');
    }

    async function handleSaveBooking(e) {
        e.preventDefault();
        if (saving) return;
        if (!form.productId) {
            setError('Оберіть товар зі списку пошуку');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                productId: Number(form.productId),
                rentFrom: form.rentFrom,
                rentTo: form.rentTo,
                clientName: form.clientName,
                clientPhone: form.clientPhone,
                note: form.note,
            };
            if (editingId) {
                await rentalCalendarApi.updateBooking(editingId, payload);
            } else {
                await rentalCalendarApi.createBooking(payload);
            }
            setFormOpen(false);
            setEditingId(null);
            setProductSearch('');
            await loadEvents();
        } catch (err) {
            setError(err.message || 'Не вдалося зберегти бронь');
        } finally {
            setSaving(false);
        }
    }

    async function confirmCancelBooking() {
        if (!cancelTarget) return;
        setCancelBusy(true);
        try {
            await rentalCalendarApi.cancelBooking(cancelTarget);
            setDetailEvent(null);
            await loadEvents();
        } catch (err) {
            setError(err.message || 'Не вдалося скасувати бронь');
        } finally {
            setCancelBusy(false);
            setCancelTarget(null);
        }
    }

    async function handleConvert(bookingId) {
        if (!bookingId || convertingId) return;
        setConvertingId(bookingId);
        setError('');
        try {
            const { order } = await rentalCalendarApi.convertBooking(bookingId);
            setDetailEvent(null);
            await loadEvents();
            if (order?.id) setOpenOrderId(order.id);
        } catch (err) {
            setError(err.message || 'Не вдалося створити угоду');
        } finally {
            setConvertingId(null);
        }
    }

    async function runAvailabilityCheck() {
        if (!checkProductId || !checkFrom || !checkTo) return;
        setCheckLoading(true);
        setCheckResult(null);
        try {
            const data = await rentalCalendarApi.events({ from: checkFrom, to: checkTo });
            const all = Array.isArray(data?.events) ? data.events : [];
            const conflicts = all.filter((e) => Number(e.productId) === Number(checkProductId)
                && rangesOverlap(e.rentFrom, e.rentTo, checkFrom, checkTo));
            setCheckResult({ conflicts });
        } catch (err) {
            setCheckResult({ error: err.message || 'Не вдалося перевірити доступність' });
        } finally {
            setCheckLoading(false);
        }
    }

    function goPrevRange() {
        if (rangeMode === 'month') setAnchor((a) => addMonths(a, -1));
        else if (rangeMode === 'twoWeeks') setAnchor((a) => addDays(a, -14));
        else setAnchor((a) => addDays(a, -7));
    }

    function goNextRange() {
        if (rangeMode === 'month') setAnchor((a) => addMonths(a, 1));
        else if (rangeMode === 'twoWeeks') setAnchor((a) => addDays(a, 14));
        else setAnchor((a) => addDays(a, 7));
    }

    // ── Build the grid's explicit row/column placement ──────────────────────
    const numDays = days.length;
    let rowCursor = 1; // row 1 is the day header
    const groupHeaders = [];
    const rowLabels = [];
    const bars = [];
    const capacityCells = [];

    for (const group of groups) {
        const occupied = group.rows.reduce((sum, row) => sum + (row.events?.length > 0 ? 1 : 0), 0);
        const isCollapsed = group.category && collapsedCategories.has(group.category);
        if (group.category) {
            rowCursor += 1;
            groupHeaders.push({
                key: `g-${group.category}`,
                label: group.category,
                row: rowCursor,
                collapsed: isCollapsed,
                occupied,
                total: group.rows.length,
            });
        }
        if (isCollapsed) continue;

        for (const row of group.rows) {
            const startRow = rowCursor + 1;
            rowCursor += row.laneCount;
            rowLabels.push({ key: `row-${row.productId}`, row, startRow, rowSpan: row.laneCount });

            if (row.trackingMode === 'quantity') {
                days.forEach((d, dayIdx) => {
                    const iso = toIsoDate(d);
                    const used = row.dailyLoad.get(iso) || 0;
                    const total = row.total || 0;
                    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                    capacityCells.push({
                        key: `${row.productId}-${iso}`,
                        row: startRow,
                        col: dayIdx + 2,
                        used,
                        total,
                        pct,
                    });
                });
                continue;
            }

            for (const evt of row.events) {
                const fromIdx = evt.rentFrom < range.from ? 0 : (dayIndexByIso.get(evt.rentFrom) ?? 0);
                const toIdx = evt.rentTo > range.to ? numDays - 1 : (dayIndexByIso.get(evt.rentTo) ?? numDays - 1);
                if (toIdx < fromIdx) continue;
                bars.push({
                    key: evt.id,
                    evt,
                    row: startRow + evt.lane,
                    col: fromIdx + 2,
                    span: toIdx - fromIdx + 1,
                });
            }
        }
    }
    const totalRows = rowCursor;
    const hasAnyRows = groups.some((g) => g.rows.length > 0);
    const rangeLabel = (() => {
        if (rangeMode === 'month') return `${MONTHS_UA[rangeStart.getMonth()]} ${rangeStart.getFullYear()}`;
        const last = days[days.length - 1] || rangeStart;
        const sameMonth = rangeStart.getMonth() === last.getMonth() && rangeStart.getFullYear() === last.getFullYear();
        const fromStr = sameMonth ? `${rangeStart.getDate()}` : `${rangeStart.getDate()} ${MONTHS_UA[rangeStart.getMonth()]}`;
        return `${fromStr} — ${last.getDate()} ${MONTHS_UA[last.getMonth()]} ${last.getFullYear()}`;
    })();

    return (
        <div className="rt-page">
            <PageHeader
                title="Календар"
                subtitle="Завантаженість інструментів по днях"
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => openCreateForm()}>
                        <Plus size={16} /> Нова бронь
                    </button>
                )}
            />

            <div className="rt-toolbar">
                <div className="rental-calendar__nav">
                    <button type="button" className="rental-calendar__nav-btn" onClick={goPrevRange} aria-label="Попередній період">
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="rental-calendar__month">{rangeLabel}</h3>
                    <button type="button" className="rental-calendar__nav-btn" onClick={goNextRange} aria-label="Наступний період">
                        <ChevronRight size={18} />
                    </button>
                    <button type="button" className="rental-calendar__today-btn" onClick={() => setAnchor(new Date())}>
                        Сьогодні
                    </button>
                </div>

                <Tabs tabs={RANGE_MODES} value={rangeMode} onChange={setRangeMode} />
                <Tabs tabs={MODES} value={mode} onChange={setMode} />

                <div className="rt-legend">
                    <span className="rt-legend-item rt-legend-item--hold">Бронь</span>
                    <span className="rt-legend-item rt-legend-item--application">Заявка</span>
                    <span className="rt-legend-item rt-legend-item--overdue">Прострочено</span>
                </div>
            </div>

            <div className="rt-checker">
                <div className="rt-checker-field rt-checker-product">
                    Інструмент
                    <input
                        type="text"
                        value={checkProductSearch}
                        onChange={(e) => { setCheckProductSearch(e.target.value); setCheckProductId(''); setCheckProductName(''); }}
                        placeholder="Почніть вводити назву..."
                    />
                    {checkProductSearch && !checkProductId && checkSuggestedProducts.length > 0 && (
                        <div className="order-product-suggest">
                            {checkSuggestedProducts.map((p) => (
                                <div
                                    key={p.id}
                                    className="order-product-suggest__item"
                                    onClick={() => { setCheckProductId(String(p.id)); setCheckProductName(p.name); setCheckProductSearch(p.name); }}
                                >
                                    <div className="order-product-suggest__name">{p.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <label className="rt-checker-field">
                    Дата від
                    <input type="date" value={checkFrom} onChange={(e) => setCheckFrom(e.target.value)} />
                </label>
                <label className="rt-checker-field">
                    Дата до
                    <input type="date" value={checkTo} onChange={(e) => setCheckTo(e.target.value)} />
                </label>
                <label className="rt-checker-field rt-checker-field--qty">
                    Кількість
                    <input type="number" min="1" value={checkQty} onChange={(e) => setCheckQty(e.target.value)} />
                </label>
                <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    disabled={!checkProductId || !checkFrom || !checkTo || checkLoading}
                    onClick={runAvailabilityCheck}
                >
                    <CalendarCheck2 size={16} /> {checkLoading ? 'Перевіряємо…' : 'Перевірити'}
                </button>

                {checkResult && !checkResult.error && (
                    checkResult.conflicts.length === 0 ? (
                        <div className="rt-checker-result rt-checker-result--free">
                            «{checkProductName}» вільний на весь період {fmtUa(checkFrom)} — {fmtUa(checkTo)}.
                        </div>
                    ) : (
                        <div className="rt-checker-result rt-checker-result--busy">
                            Знайдено перетинів: {checkResult.conflicts.length} (потрібно {checkQty} шт. — звірте з фактичним залишком на складі).
                            <ul>
                                {checkResult.conflicts.map((c) => (
                                    <li key={c.id}>{fmtUa(c.rentFrom)} — {fmtUa(c.rentTo)}: {c.clientName || c.title}</li>
                                ))}
                            </ul>
                        </div>
                    )
                )}
                {checkResult?.error && <div className="rt-checker-result rt-checker-result--busy">{checkResult.error}</div>}
            </div>

            {error && <div className="rental-calendar__error">{error}</div>}

            <div className="rt-scroll">
                {loading && <div className="rt-loading">Завантаження…</div>}
                <div
                    className="rt-grid"
                    style={{ gridTemplateColumns: `220px repeat(${numDays}, ${dayColWidth}px)`, gridTemplateRows: `34px repeat(${Math.max(totalRows - 1, 0)}, 40px)` }}
                >
                    <div className="rt-head-label rt-place" style={{ '--rt-col': 1, '--rt-row': 1 }}>Інструмент</div>
                    {days.map((d, i) => {
                        const iso = toIsoDate(d);
                        const weekday = d.getDay();
                        const isWeekend = weekday === 0 || weekday === 6;
                        const isToday = iso === todayIso;
                        return (
                            <div
                                key={iso}
                                className={`rt-day-head rt-place${isWeekend ? ' rt-day-head--weekend' : ''}${isToday ? ' rt-day-head--today' : ''}`}
                                style={{ '--rt-col': i + 2, '--rt-row': 1 }}
                            >
                                {d.getDate()}
                            </div>
                        );
                    })}

                    {groupHeaders.map((g) => (
                        <button
                            type="button"
                            key={g.key}
                            className={`rt-group-label rt-group-label--toggle rt-place${g.collapsed ? ' rt-group-label--collapsed' : ''}`}
                            style={{ '--rt-col': 1, '--rt-row': g.row, '--rt-span': numDays + 1 }}
                            onClick={() => toggleCategory(g.label)}
                        >
                            <ChevronRight size={14} className="rt-group-chevron" />
                            {g.label}
                            <span className="rt-group-count">{g.occupied} з {g.total} зайнято</span>
                        </button>
                    ))}

                    {rowLabels.map(({ key, row, startRow, rowSpan }) => (
                        <div key={key} className="rt-row-label rt-place" style={{ '--rt-col': 1, '--rt-row': startRow, '--rt-row-span': rowSpan }}>
                            <div className="rt-row-label-name" title={row.name}>{row.name}</div>
                            {(row.inventoryNumber || row.sku) && (
                                <div className="rt-row-label-sku">
                                    {[row.inventoryNumber, row.sku !== row.inventoryNumber ? row.sku : null]
                                        .filter(Boolean).join(' · ')}
                                </div>
                            )}
                        </div>
                    ))}

                    {rowLabels.filter(({ row }) => row.trackingMode !== 'quantity').flatMap(({ row, startRow, rowSpan }) => (
                        Array.from({ length: rowSpan }).flatMap((_, laneIdx) => (
                            days.map((d, dayIdx) => {
                                const iso = toIsoDate(d);
                                const covered = row.events.some((e) => e.lane === laneIdx && e.rentFrom <= iso && e.rentTo >= iso);
                                if (covered) return null;
                                const weekday = d.getDay();
                                const isWeekend = weekday === 0 || weekday === 6;
                                return (
                                    <div
                                        key={`${row.productId}-${laneIdx}-${iso}`}
                                        className={`rt-cell rt-place${isWeekend ? ' rt-cell--weekend' : ''}`}
                                        style={{ '--rt-col': dayIdx + 2, '--rt-row': startRow + laneIdx }}
                                        title={`${row.name} · ${fmtUa(iso)} — вільно, клік створить бронь`}
                                        onClick={() => openCreateForm(String(row.productId), row.name, iso)}
                                    />
                                );
                            })
                        ))
                    ))}

                    {bars.map((b) => (
                        <div
                            key={b.key}
                            className={`rt-bar rt-place rt-bar--${b.evt.kind}`}
                            style={{ '--rt-col': b.col, '--rt-row': b.row, '--rt-span': b.span }}
                            title={`${b.evt.productName} · ${barLabel(b.evt)} · ${fmtUa(b.evt.rentFrom)} — ${fmtUa(b.evt.rentTo)}`}
                            onClick={() => setDetailEvent(b.evt)}
                        >
                            {barLabel(b.evt)}
                        </div>
                    ))}

                    {capacityCells.map((c) => {
                        const level = c.pct >= 90 ? 'full' : c.pct >= 60 ? 'hot' : '';
                        return (
                            <div
                                key={c.key}
                                className="rt-capcell rt-place"
                                style={{ '--rt-col': c.col, '--rt-row': c.row }}
                                title={`${c.used}/${c.total} зайнято`}
                            >
                                <div className={`rt-capbar${level ? ` rt-capbar--${level}` : ''}`}>
                                    <span style={{ height: `${c.pct}%` }} />
                                </div>
                                <small>{c.used}/{c.total}</small>
                            </div>
                        );
                    })}
                </div>

                {!loading && !hasAnyRows && (
                    <div className="rt-empty">
                        {mode === 'all'
                            ? 'У каталозі оренди поки немає жодного інструмента.'
                            : 'У цьому місяці немає завантажених інструментів. Перемкніть режим на «Всі», щоб побачити весь каталог.'}
                    </div>
                )}
            </div>

            <Drawer
                open={formOpen}
                onClose={() => { setFormOpen(false); setEditingId(null); setProductSearch(''); }}
                title={editingId ? 'Редагувати бронь' : 'Нова бронь'}
                width="md"
                footer={(
                    <div className="rental-calendar__form-actions">
                        <button type="submit" form="booking-form" className="ds-btn ds-btn--primary" disabled={saving}>
                            {saving ? 'Збереження…' : 'Зберегти бронь'}
                        </button>
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary"
                            onClick={() => { setFormOpen(false); setEditingId(null); setProductSearch(''); }}
                        >
                            Скасувати
                        </button>
                    </div>
                )}
            >
                <form id="booking-form" className="rental-calendar__form" onSubmit={handleSaveBooking}>
                    {error && <div className="rental-calendar__error">{error}</div>}

                    <div className="form-group">
                        <label>Товар</label>
                        {form.productId ? (
                            <div className="rental-calendar__picked">
                                <span>{form.productName || `ID ${form.productId}`}</span>
                                <button type="button" className="rental-calendar__icon-btn" onClick={clearSelectedProduct} title="Змінити товар">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="order-product-search-wrap">
                                <Search size={15} className="order-product-search-icon" />
                                <input
                                    type="text"
                                    className="order-product-search-input"
                                    placeholder="Пошук: назва, артикул або інв. №..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    autoComplete="off"
                                />
                                {suggestedProducts.length > 0 && (
                                    <div className="order-product-suggest">
                                        {suggestedProducts.map((p) => (
                                            <div key={p.id} className="order-product-suggest__item" onClick={() => selectProduct(p)}>
                                                <div>
                                                    <div className="order-product-suggest__name">{p.name}</div>
                                                    {(p.sku || p.inventoryNumber) && (
                                                        <div className="order-product-suggest__sub">
                                                            {p.sku ? `SKU: ${p.sku}` : ''}
                                                            {p.sku && p.inventoryNumber ? ' · ' : ''}
                                                            {p.inventoryNumber ? `Інв: ${p.inventoryNumber}` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="order-product-suggest__price">{p.price} ₴</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rental-calendar__form-row">
                        <div className="form-group">
                            <label>Оренда з</label>
                            <input type="date" required value={form.rentFrom} onChange={(e) => setForm((f) => ({ ...f, rentFrom: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>Оренда по</label>
                            <input type="date" required value={form.rentTo} onChange={(e) => setForm((f) => ({ ...f, rentTo: e.target.value }))} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Клієнт (опційно)</label>
                        <input type="text" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="ПІБ" />
                    </div>
                    <div className="form-group">
                        <label>Телефон (опційно)</label>
                        <input type="tel" value={form.clientPhone} onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))} placeholder="+380…" />
                    </div>
                    <div className="form-group">
                        <label>Примітка</label>
                        <textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Коментар менеджера" />
                    </div>
                </form>
            </Drawer>

            <Drawer open={!!detailEvent} onClose={() => setDetailEvent(null)} title={detailEvent?.productName || 'Подія'} width="md">
                {detailEvent && (
                    <ul className="rental-calendar__event-list">
                        <li className={`rental-calendar__event-card rental-calendar__event-card--${detailEvent.kind}`}>
                            <div className="rental-calendar__event-meta">
                                {fmtUa(detailEvent.rentFrom)} — {fmtUa(detailEvent.rentTo)}
                            </div>
                            {(detailEvent.clientName || detailEvent.title) && (
                                <div className="rental-calendar__event-meta">{detailEvent.clientName || detailEvent.title}</div>
                            )}
                            {detailEvent.clientPhone && <div className="rental-calendar__event-meta">{detailEvent.clientPhone}</div>}
                            {detailEvent.applicationNumber && (
                                <div className="rental-calendar__event-meta">
                                    Заявка {detailEvent.applicationNumber}
                                    {detailEvent.status && ` · ${STATUS_LABEL[detailEvent.status] || detailEvent.status}`}
                                </div>
                            )}
                            {detailEvent.note && <div className="rental-calendar__event-note">{detailEvent.note}</div>}

                            <div className="rental-calendar__event-actions">
                                {detailEvent.source === 'booking' && detailEvent.bookingId && (
                                    <>
                                        <button
                                            type="button"
                                            className="ds-btn ds-btn--primary"
                                            disabled={!!convertingId}
                                            onClick={() => handleConvert(detailEvent.bookingId)}
                                        >
                                            <FilePlus2 size={14} />
                                            {convertingId === detailEvent.bookingId ? 'Створюємо…' : 'Створити угоду'}
                                        </button>
                                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => openEditHold(detailEvent)}>
                                            Змінити
                                        </button>
                                        <button
                                            type="button"
                                            className="ds-btn ds-btn--secondary"
                                            onClick={() => setCancelTarget(detailEvent.bookingId)}
                                            title="Скасувати бронь"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                {detailEvent.source === 'application' && detailEvent.applicationId && (
                                    <button
                                        type="button"
                                        className="ds-btn ds-btn--secondary"
                                        onClick={() => navigate(`/admin/rental-applications/${detailEvent.applicationId}`)}
                                    >
                                        Відкрити заявку
                                    </button>
                                )}
                            </div>
                        </li>
                    </ul>
                )}
            </Drawer>

            <ConfirmDialog
                open={!!cancelTarget}
                title="Скасувати бронь?"
                message="Ця бронь буде скасована. Позиція звільниться в календарі."
                confirmText="Скасувати бронь"
                loading={cancelBusy}
                onConfirm={confirmCancelBooking}
                onCancel={() => setCancelTarget(null)}
            />

            <ConfirmDialog
                open={!!openOrderId}
                title="Угоду створено"
                message="Угоду оренди створено з цієї брони. Відкрити її зараз?"
                confirmText="Відкрити"
                danger={false}
                onConfirm={() => {
                    navigate(`/admin/deals/${openOrderId}`);
                    setOpenOrderId(null);
                }}
                onCancel={() => setOpenOrderId(null)}
            />
        </div>
    );
}
