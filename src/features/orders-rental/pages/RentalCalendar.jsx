import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, FilePlus2, Trash2, Search } from 'lucide-react';
import { productsApi, rentalCalendarApi } from '../../../services/api';
import '../styles/RentalCalendar.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS_UA = [
    'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
    'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
];

function toIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Monday-based weekday index 0..6 */
function mondayIndex(date) {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
}

function buildMonthCells(monthDate) {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const cells = [];
    const lead = mondayIndex(start);
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= end.getDate(); d += 1) {
        cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function eventOnDay(event, isoDay) {
    return event.rentFrom <= isoDay && event.rentTo >= isoDay;
}

function emptyForm(dayIso = '') {
    return {
        productId: '',
        productName: '',
        rentFrom: dayIso,
        rentTo: dayIso,
        clientName: '',
        clientPhone: '',
        note: '',
    };
}

export default function RentalCalendar() {
    const navigate = useNavigate();
    const [month, setMonth] = useState(() => startOfMonth(new Date()));
    const [events, setEvents] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(() => emptyForm());
    const [productSearch, setProductSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [convertingId, setConvertingId] = useState(null);
    const [error, setError] = useState('');

    const range = useMemo(() => {
        const from = toIsoDate(startOfMonth(month));
        const to = toIsoDate(endOfMonth(month));
        return { from, to };
    }, [month]);

    const cells = useMemo(() => buildMonthCells(month), [month]);
    const todayIso = toIsoDate(new Date());

    const suggestedProducts = useMemo(() => {
        const q = productSearch.trim().toLowerCase();
        if (q.length < 2) return [];
        return products
            .filter((p) =>
                String(p.name || '').toLowerCase().includes(q)
                || String(p.sku || '').toLowerCase().includes(q)
                || String(p.inventoryNumber || '').toLowerCase().includes(q)
            )
            .slice(0, 8);
    }, [products, productSearch]);

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await rentalCalendarApi.events(range);
            setEvents(Array.isArray(data?.events) ? data.events : []);
        } catch (err) {
            setError(err.message || 'Не вдалося завантажити календар');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await productsApi.list({ isRent: true });
                if (!cancelled) setProducts(Array.isArray(list) ? list : []);
            } catch {
                if (!cancelled) setProducts([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const dayEvents = useMemo(() => {
        if (!selectedDay) return [];
        return events.filter((e) => eventOnDay(e, selectedDay));
    }, [events, selectedDay]);

    function openDay(date) {
        if (!date) return;
        const iso = toIsoDate(date);
        setSelectedDay(iso);
        setFormOpen(false);
        setEditingId(null);
        setProductSearch('');
        setError('');
    }

    function openCreateForm() {
        setEditingId(null);
        setForm(emptyForm(selectedDay || todayIso));
        setProductSearch('');
        setFormOpen(true);
        setError('');
    }

    function openEditHold(event) {
        if (!event?.bookingId) return;
        setEditingId(event.bookingId);
        setForm({
            productId: String(event.productId || ''),
            productName: event.productName || '',
            rentFrom: event.rentFrom || selectedDay || '',
            rentTo: event.rentTo || selectedDay || '',
            clientName: event.clientName || '',
            clientPhone: event.clientPhone || '',
            note: event.note || '',
        });
        setProductSearch(event.productName || '');
        setFormOpen(true);
        setError('');
    }

    function selectProduct(product) {
        setForm((f) => ({
            ...f,
            productId: String(product.id),
            productName: product.name || '',
        }));
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

    async function handleCancelBooking(bookingId) {
        if (!bookingId) return;
        if (!window.confirm('Скасувати цю бронь?')) return;
        try {
            await rentalCalendarApi.cancelBooking(bookingId);
            await loadEvents();
        } catch (err) {
            setError(err.message || 'Не вдалося скасувати бронь');
        }
    }

    async function handleConvert(bookingId) {
        if (!bookingId || convertingId) return;
        setConvertingId(bookingId);
        setError('');
        try {
            const { application } = await rentalCalendarApi.convertBooking(bookingId);
            await loadEvents();
            if (application?.id) {
                const openNow = window.confirm('Заявку створено. Відкрити її зараз?');
                if (openNow) navigate(`/admin/rental-applications/${application.id}`);
            }
        } catch (err) {
            setError(err.message || 'Не вдалося створити заявку');
        } finally {
            setConvertingId(null);
        }
    }

    function renderBookingForm() {
        return (
            <form className="rental-calendar__form" onSubmit={handleSaveBooking}>
                <div className="rental-calendar__form-head">
                    <strong>{editingId ? 'Редагувати бронь' : 'Нова бронь'}</strong>
                    <button
                        type="button"
                        className="rental-calendar__icon-btn"
                        onClick={() => {
                            setFormOpen(false);
                            setEditingId(null);
                            setProductSearch('');
                        }}
                        aria-label="Закрити"
                    >
                        <X size={16} />
                    </button>
                </div>

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
                        <div className="order-product-search-wrap rental-calendar__product-search">
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
                                        <div
                                            key={p.id}
                                            className="order-product-suggest__item"
                                            onClick={() => selectProduct(p)}
                                        >
                                            <div>
                                                <div className="font-semibold text-sm">{p.name}</div>
                                                {(p.sku || p.inventoryNumber) && (
                                                    <div className="text-xs text-gray-400">
                                                        {p.sku ? `SKU: ${p.sku}` : ''}
                                                        {p.sku && p.inventoryNumber ? ' · ' : ''}
                                                        {p.inventoryNumber ? `Інв: ${p.inventoryNumber}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-[#e63946]">{p.price} ₴</span>
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
                        <input
                            type="date"
                            required
                            value={form.rentFrom}
                            onChange={(e) => setForm((f) => ({ ...f, rentFrom: e.target.value }))}
                        />
                    </div>
                    <div className="form-group">
                        <label>Оренда по</label>
                        <input
                            type="date"
                            required
                            value={form.rentTo}
                            onChange={(e) => setForm((f) => ({ ...f, rentTo: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Клієнт (опційно)</label>
                    <input
                        type="text"
                        value={form.clientName}
                        onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                        placeholder="ПІБ"
                    />
                </div>
                <div className="form-group">
                    <label>Телефон (опційно)</label>
                    <input
                        type="tel"
                        value={form.clientPhone}
                        onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                        placeholder="+380…"
                    />
                </div>
                <div className="form-group">
                    <label>Примітка</label>
                    <textarea
                        rows={2}
                        value={form.note}
                        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Коментар менеджера"
                    />
                </div>

                <div className="rental-calendar__form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Збереження…' : 'Зберегти бронь'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setFormOpen(false);
                            setEditingId(null);
                            setProductSearch('');
                        }}
                    >
                        Скасувати
                    </button>
                </div>
            </form>
        );
    }

    const monthLabel = `${MONTHS_UA[month.getMonth()]} ${month.getFullYear()}`;

    return (
        <div className="rental-calendar">
            <div className="rental-calendar__toolbar">
                <div className="rental-calendar__nav">
                    <button type="button" className="rental-calendar__nav-btn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Попередній місяць">
                        <ChevronLeft size={18} />
                    </button>
                    <h3 className="rental-calendar__month">{monthLabel}</h3>
                    <button type="button" className="rental-calendar__nav-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Наступний місяць">
                        <ChevronRight size={18} />
                    </button>
                    <button
                        type="button"
                        className="rental-calendar__today-btn"
                        onClick={() => {
                            const now = startOfMonth(new Date());
                            setMonth(now);
                            setSelectedDay(todayIso);
                        }}
                    >
                        Сьогодні
                    </button>
                </div>

                <div className="rental-calendar__legend">
                    <span className="rental-calendar__legend-item rental-calendar__legend-item--hold">Бронь</span>
                    <span className="rental-calendar__legend-item rental-calendar__legend-item--application">Заявка</span>
                    <span className="rental-calendar__legend-item rental-calendar__legend-item--overdue">Прострочено</span>
                </div>
            </div>

            {error && !formOpen && (
                <div className="rental-calendar__error">{error}</div>
            )}

            <div className="rental-calendar__layout">
                <div className="rental-calendar__grid-wrap">
                    {loading && <div className="rental-calendar__loading">Завантаження…</div>}
                    <div className="rental-calendar__weekdays">
                        {WEEKDAYS.map((d) => (
                            <div key={d} className="rental-calendar__weekday">{d}</div>
                        ))}
                    </div>
                    <div className="rental-calendar__grid">
                        {cells.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} className="rental-calendar__cell is-empty" />;
                            }
                            const iso = toIsoDate(date);
                            const dayEvts = events.filter((e) => eventOnDay(e, iso)).slice(0, 3);
                            const more = events.filter((e) => eventOnDay(e, iso)).length - dayEvts.length;
                            const isSelected = selectedDay === iso;
                            const isToday = todayIso === iso;
                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    className={`rental-calendar__cell${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                                    onClick={() => openDay(date)}
                                >
                                    <span className="rental-calendar__day-num">{date.getDate()}</span>
                                    <div className="rental-calendar__chips">
                                        {dayEvts.map((evt) => (
                                            <span
                                                key={evt.id}
                                                className={`rental-calendar__chip rental-calendar__chip--${evt.kind}`}
                                                title={`${evt.productName} · ${evt.title}`}
                                            >
                                                {evt.productName || evt.title}
                                            </span>
                                        ))}
                                        {more > 0 && (
                                            <span className="rental-calendar__chip rental-calendar__chip--more">+{more}</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <aside className="rental-calendar__panel">
                    {!selectedDay ? (
                        <p className="rental-calendar__panel-hint">Оберіть день, щоб побачити зайнятість або створити бронь.</p>
                    ) : (
                        <>
                            <div className="rental-calendar__panel-head">
                                <h4>{selectedDay.split('-').reverse().join('.')}</h4>
                                {!formOpen && (
                                    <button type="button" className="btn btn-primary rental-calendar__new-btn" onClick={openCreateForm}>
                                        <Plus size={15} /> Нова бронь
                                    </button>
                                )}
                            </div>

                            {formOpen && renderBookingForm()}

                            {dayEvents.length === 0 && !formOpen && (
                                <p className="rental-calendar__panel-hint">На цей день подій немає.</p>
                            )}

                            <ul className="rental-calendar__event-list">
                                {dayEvents.map((evt) => (
                                    <li key={evt.id} className={`rental-calendar__event-card rental-calendar__event-card--${evt.kind}`}>
                                        <div className="rental-calendar__event-title">{evt.productName}</div>
                                        <div className="rental-calendar__event-meta">
                                            {evt.rentFrom.split('-').reverse().join('.')} — {evt.rentTo.split('-').reverse().join('.')}
                                        </div>
                                        {(evt.clientName || evt.title) && (
                                            <div className="rental-calendar__event-meta">{evt.clientName || evt.title}</div>
                                        )}
                                        {evt.applicationNumber && (
                                            <div className="rental-calendar__event-meta">Заявка {evt.applicationNumber}</div>
                                        )}
                                        {evt.note && <div className="rental-calendar__event-note">{evt.note}</div>}

                                        <div className="rental-calendar__event-actions">
                                            {evt.source === 'booking' && evt.bookingId && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        disabled={!!convertingId}
                                                        onClick={() => handleConvert(evt.bookingId)}
                                                    >
                                                        <FilePlus2 size={14} />
                                                        {convertingId === evt.bookingId ? 'Створюємо…' : 'Створити заявку'}
                                                    </button>
                                                    <button type="button" className="btn btn-secondary" onClick={() => openEditHold(evt)}>
                                                        Змінити
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => handleCancelBooking(evt.bookingId)}
                                                        title="Скасувати бронь"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {evt.source === 'application' && evt.applicationId && (
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => navigate(`/admin/rental-applications/${evt.applicationId}`)}
                                                >
                                                    Відкрити заявку
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}
