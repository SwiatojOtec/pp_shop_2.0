import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, X, Warehouse, Plus, ListTree, Boxes, ArrowRightLeft } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import WarehouseProductWorkModal from './WarehouseProductWorkModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Admin.css';

const EMPTY_FORM = { name: '', notes: '', isActive: true };

const RETURN_TO_WAREHOUSES = '/admin/warehouses/positions';
const rentNewWithReturn = () =>
    `/admin/rent/new?returnTo=${encodeURIComponent(RETURN_TO_WAREHOUSES)}`;

const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
};

const stockStatusLabel = (p) => {
    if (!p) return '—';
    if (p.stockStatus === 'available' || p.stockStatus === 'in_stock') return 'Доступний';
    if (p.stockStatus === 'available_later') return `З ${formatDate(p.availableFrom)}`;
    if (p.stockStatus === 'in_procurement') return 'У закупівлі (на папері)';
    if (p.stockStatus === 'needs_repair') return 'Потребує ремонту';
    if (p.stockStatus === 'in_repair') return 'На ремонті';
    if (p.stockStatus === 'out_of_stock') return 'Немає в наявності';
    return p.stockStatus || '—';
};

const loadFontAsBase64 = async (url) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

export default function AdminWarehousePositions() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [warehouses, setWarehouses] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [modalWarehousesOpen, setModalWarehousesOpen] = useState(false);
    const [modalCreateOpen, setModalCreateOpen] = useState(false);
    const [workModalRow, setWorkModalRow] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkToId, setBulkToId] = useState('');
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkQtyById, setBulkQtyById] = useState({});

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    }), [token]);

    const fetchWarehouses = useCallback(async () => {
        const res = await fetch(`${API_URL}/api/warehouses`, { headers: authHeaders });
        const data = res.ok ? await res.json() : [];
        setWarehouses(Array.isArray(data) ? data : []);
    }, [authHeaders]);

    const fetchInventory = useCallback(async (warehouseId) => {
        if (!warehouseId) return setInventory([]);
        const res = await fetch(`${API_URL}/api/inventory?warehouseId=${warehouseId}`, { headers: authHeaders });
        const data = res.ok ? await res.json() : [];
        const rows = Array.isArray(data) ? data.filter((i) => i?.Product?.isRent) : [];
        setInventory(rows);
    }, [authHeaders]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    useEffect(() => {
        if (!selectedWarehouseId && warehouses.length) {
            setSelectedWarehouseId(warehouses[0].id);
        }
    }, [warehouses, selectedWarehouseId]);

    useEffect(() => {
        fetchInventory(selectedWarehouseId);
    }, [selectedWarehouseId, fetchInventory]);

    const selectedWarehouse = useMemo(
        () => warehouses.find((w) => w.id === selectedWarehouseId) || null,
        [warehouses, selectedWarehouseId]
    );

    const targetWarehouses = useMemo(
        () => warehouses.filter((w) => w.id !== selectedWarehouseId),
        [warehouses, selectedWarehouseId, selectedWarehouseId]
    );

    const createWarehouse = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/warehouses`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ name: form.name.trim(), notes: form.notes || null, isActive: form.isActive })
            });
            if (res.ok) {
                const created = await res.json();
                setForm(EMPTY_FORM);
                setModalCreateOpen(false);
                await fetchWarehouses();
                if (created?.id) setSelectedWarehouseId(created.id);
            }
        } finally {
            setSaving(false);
        }
    };

    const updateInventory = async (id, patch) => {
        const res = await fetch(`${API_URL}/api/inventory/item/${id}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify(patch)
        });
        if (res.ok) fetchInventory(selectedWarehouseId);
    };

    useEffect(() => {
        if (!bulkOpen) return;
        if (!bulkToId) {
            const first = targetWarehouses[0]?.id ? String(targetWarehouses[0].id) : '';
            setBulkToId(first);
        }
    }, [bulkOpen, bulkToId, targetWarehouses]);

    const q = search.trim().toLowerCase();
    const filteredInventory = useMemo(() => {
        if (!q) return inventory;
        return inventory.filter((row) => {
            const p = row.Product;
            if (!p) return false;
            const hay = `${p.name || ''} ${p.sku || ''} ${p.category || ''} ${p.brand || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [inventory, q]);

    useEffect(() => {
        let cancelled = false;
        const qRaw = String(search || '').trim();
        if (!qRaw || qRaw.length < 2) {
            setSearchSuggestions([]);
            return;
        }
        // Підказки потрібні тільки якщо в поточному складі пусто
        if (filteredInventory.length > 0) {
            setSearchSuggestions([]);
            return;
        }
        const t = setTimeout(async () => {
            setSuggestLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/inventory/suggest?q=${encodeURIComponent(qRaw)}&warehouseId=${selectedWarehouseId || ''}`, { headers: authHeaders });
                const data = res.ok ? await res.json() : { suggestions: [] };
                if (!cancelled) setSearchSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
            } catch {
                if (!cancelled) setSearchSuggestions([]);
            } finally {
                if (!cancelled) setSuggestLoading(false);
            }
        }, 260);
        return () => { cancelled = true; clearTimeout(t); };
    }, [search, selectedWarehouseId, filteredInventory.length, authHeaders]);

    const colSpan = 12;

    const selectWarehouseAndClose = (id) => {
        setSelectedWarehouseId(id);
        setModalWarehousesOpen(false);
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setBulkQtyById({});
    };

    const toggleSelect = (inventoryId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(inventoryId)) next.delete(inventoryId);
            else next.add(inventoryId);
            return next;
        });
    };

    const selectedRows = useMemo(() => {
        if (!selectedIds.size) return [];
        const ids = selectedIds;
        return filteredInventory.filter((r) => ids.has(r.id));
    }, [filteredInventory, selectedIds]);

    const openBulkMove = () => {
        const init = {};
        for (const row of selectedRows) {
            init[row.id] = Math.min(1, row.quantity || 0);
        }
        setBulkQtyById((prev) => ({ ...init, ...prev }));
        setBulkOpen(true);
    };

    const doBulkMove = async () => {
        const toWarehouseId = Number(bulkToId);
        if (!toWarehouseId || !selectedWarehouseId) return;
        setBulkBusy(true);
        try {
            for (const row of selectedRows) {
                const qty = Math.floor(Number(bulkQtyById[row.id] ?? 0));
                if (!Number.isFinite(qty) || qty <= 0) continue;
                if (qty > (row.quantity || 0)) {
                    throw new Error(`Некоректна кількість для «${row.Product?.name || 'товар'}»`);
                }
                const res = await fetch(`${API_URL}/api/inventory/move`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        productId: row.productId,
                        fromWarehouseId: selectedWarehouseId,
                        toWarehouseId,
                        quantity: qty
                    })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Не вдалося перемістити');
                }
            }
            await fetchInventory(selectedWarehouseId);
            setBulkOpen(false);
            clearSelection();
        } catch (e) {
            alert(e.message || 'Помилка');
        } finally {
            setBulkBusy(false);
        }
    };

    const exportCurrentWarehousePdf = async () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const warehouseName = selectedWarehouse?.name || '—';
        let fontName = 'helvetica';

        try {
            const [regularB64, boldB64] = await Promise.all([
                loadFontAsBase64('/fonts/Roboto-Regular.ttf'),
                loadFontAsBase64('/fonts/Roboto-Bold.ttf')
            ]);
            doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
            doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
            fontName = 'Roboto';
            doc.setFont(fontName, 'normal');
        } catch (e) {
            console.warn('Warehouse PDF font load failed, using fallback', e);
            doc.setFont('helvetica', 'normal');
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(16);
        doc.text('Склади · Звіт по залишках', 40, 40);
        doc.setFont(fontName, 'normal');
        doc.setFontSize(10);
        doc.text(`Склад: ${warehouseName}`, 40, 58);
        doc.text(`Сформовано: ${dateStr}`, 40, 72);
        doc.text(`Позицій: ${filteredInventory.length}`, 40, 86);

        const body = filteredInventory.map((row) => {
            const p = row.Product || {};
            return [
                p.name || '—',
                p.sku || '—',
                p.category || '—',
                p.brand || '—',
                stockStatusLabel(p),
                row.quantity ?? 0,
                row.reserved ?? 0,
                row.minStock ?? 0,
                p.quantityAvailable ?? 0
            ];
        });

        autoTable(doc, {
            startY: 102,
            head: [['Товар', 'SKU', 'Категорія', 'Бренд', 'Статус', 'К-сть', 'Резерв', 'Мін.', 'Всього']],
            body,
            styles: { font: fontName, fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [26, 26, 26], font: fontName, fontStyle: 'bold' },
            margin: { left: 24, right: 24 },
            tableWidth: 'auto',
            columnStyles: {
                0: { cellWidth: 265 },
                1: { cellWidth: 72 },
                2: { cellWidth: 72 },
                3: { cellWidth: 60 },
                4: { cellWidth: 92 },
                5: { cellWidth: 44, halign: 'right' },
                6: { cellWidth: 44, halign: 'right' },
                7: { cellWidth: 36, halign: 'right' },
                8: { cellWidth: 46, halign: 'right' }
            }
        });

        const safeName = String(warehouseName).replace(/[^\w\u0400-\u04FF-]+/g, '_');
        doc.save(`sklad_${safeName}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`);
    };

    return (
        <div className="admin-warehouses">
            <div className="admin-warehouses-top">
                <div className="admin-warehouses-top__text">
                    <h1 className="admin-title" style={{ margin: 0 }}>Склади</h1>
                    <p className="admin-warehouses-desc">
                        Залишки по складах і ключові поля з картки оренди. Кількість на обраному складі зберігається при виході з поля.
                        Після збереження картки ви повертаєтесь сюди. Дії з товаром — кнопка «Робота з товаром».
                    </p>
                    {selectedWarehouse && (
                        <p className="admin-warehouses-active">
                            <Warehouse size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />
                            Активний склад: <strong>{selectedWarehouse.name}</strong>
                            {!selectedWarehouse.isActive && <span className="admin-warehouses-inactive"> (неактивний)</span>}
                        </p>
                    )}
                </div>
                <div className="admin-warehouses-toolbar">
                    <button
                        type="button"
                        className="btn btn-secondary admin-warehouses-toolbar__btn"
                        onClick={() => setModalWarehousesOpen(true)}
                    >
                        <ListTree size={18} />
                        Склади
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary admin-warehouses-toolbar__btn"
                        onClick={() => setModalCreateOpen(true)}
                    >
                        <Warehouse size={18} />
                        Створити склад
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary admin-warehouses-toolbar__btn"
                        onClick={() => navigate(rentNewWithReturn())}
                    >
                        <Plus size={18} />
                        Створити товар
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary admin-warehouses-toolbar__btn"
                        onClick={exportCurrentWarehousePdf}
                        disabled={!filteredInventory.length}
                    >
                        Експорт PDF
                    </button>
                </div>
            </div>

            <div className="admin-section admin-warehouses-search">
                <div className="admin-warehouse-search-row">
                    <div className="admin-form" style={{ flex: 1, minWidth: '280px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Пошук по назві, SKU, категорії, бренду</label>
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Почніть вводити..."
                                style={{ maxWidth: '520px' }}
                            />
                        </div>
                    </div>
                    <div className="admin-warehouse-search-hint">
                        {suggestLoading ? (
                            <div style={{ color: '#666', fontSize: '0.85rem' }}>Шукаю по інших складах…</div>
                        ) : searchSuggestions.length > 0 ? (
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
                                    Можливо ви шукаєте:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {searchSuggestions.map((s) => (
                                        <button
                                            key={`${s.productId}-${s.warehouseId}`}
                                            type="button"
                                            className="admin-warehouse-suggest-item"
                                            onClick={() => {
                                                if (s.warehouseId) setSelectedWarehouseId(s.warehouseId);
                                                setSearch(s.productName || search);
                                            }}
                                            title="Перейти на склад і показати товар"
                                        >
                                            <span style={{ fontWeight: 700 }}>{s.productName}</span>
                                            <span style={{ color: '#666', fontSize: '0.8rem' }}>
                                                {' — '}склад «{s.warehouseName}» · {s.quantity} шт.
                                                {s.reserved > 0 ? ` (рез. ${s.reserved})` : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                                {search.trim().length >= 2 ? 'Нічого не знайдено в інших складах' : ' '}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="admin-table-container" style={{ overflowX: 'auto' }}>
                <table className="admin-table admin-table--warehouses">
                    <thead>
                        <tr>
                            <th style={{ width: '46px' }}>
                                <input
                                    type="checkbox"
                                    aria-label="Вибрати всі"
                                    checked={filteredInventory.length > 0 && selectedIds.size === filteredInventory.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(new Set(filteredInventory.map((r) => r.id)));
                                        } else {
                                            clearSelection();
                                        }
                                    }}
                                />
                            </th>
                            <th style={{ width: '56px' }} />
                            <th>Товар</th>
                            <th>Ціна / доба</th>
                            <th>Тип / бренд</th>
                            <th>Статус</th>
                            <th>У каталозі</th>
                            <th>Всього од.</th>
                            <th>К-сть</th>
                            <th>Резерв</th>
                            <th>Мін.</th>
                            <th style={{ minWidth: '160px' }}>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.map((item) => {
                            const p = item.Product;
                            const open = expandedId === item.id;
                            return (
                                <React.Fragment key={item.id}>
                                    <tr>
                                        <td>
                                            <input
                                                type="checkbox"
                                                aria-label="Вибрати товар"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="action-btn"
                                                onClick={() => setExpandedId(open ? null : item.id)}
                                                title={open ? 'Згорнути' : 'Деталі картки'}
                                                style={{ width: '36px', height: '36px' }}
                                            >
                                                {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </button>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {p?.image && (
                                                    <img src={p.image} alt="" className="admin-table-img" style={{ width: '44px', height: '44px', flexShrink: 0 }} />
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{p?.name || '—'}</div>
                                                    <code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{p?.sku || '—'}</code>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{p?.price != null ? `${p.price} ₴` : '—'}</td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{p?.category || '—'}</div>
                                            <div style={{ color: '#666', fontSize: '0.85rem' }}>{p?.brand || '—'}</div>
                                        </td>
                                        <td style={{ fontSize: '0.88rem', maxWidth: '160px' }}>{stockStatusLabel(p)}</td>
                                        <td>
                                            {p?.showInRentCatalog !== false ? (
                                                <span className="status-badge completed" style={{ textTransform: 'none' }}>Так</span>
                                            ) : (
                                                <span className="status-badge cancelled" style={{ textTransform: 'none' }}>Ні</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{p?.quantityAvailable ?? '—'}</td>
                                        <td>
                                            <input
                                                key={`q-${item.id}-${item.quantity}`}
                                                type="number"
                                                min="0"
                                                className="admin-input-inline"
                                                defaultValue={item.quantity}
                                                onBlur={(e) => updateInventory(item.id, { quantity: Number(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                key={`r-${item.id}-${item.reserved}`}
                                                type="number"
                                                min="0"
                                                className="admin-input-inline"
                                                defaultValue={item.reserved}
                                                onBlur={(e) => updateInventory(item.id, { reserved: Number(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                key={`m-${item.id}-${item.minStock}`}
                                                type="number"
                                                min="0"
                                                className="admin-input-inline"
                                                defaultValue={item.minStock}
                                                onBlur={(e) => updateInventory(item.id, { minStock: Number(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ padding: '8px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                                                onClick={() => setWorkModalRow(item)}
                                            >
                                                <Boxes size={14} style={{ marginRight: '6px' }} />
                                                Робота з товаром
                                            </button>
                                        </td>
                                    </tr>
                                    {open && p && (
                                        <tr className="warehouse-detail-row">
                                            <td colSpan={colSpan} style={{ background: '#f5f5f5', padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
                                                <div className="warehouse-detail-grid">
                                                    <div>
                                                        <strong>Опис</strong>
                                                        <p style={{ margin: '6px 0 0', color: '#444', fontSize: '0.9rem', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
                                                            {p.desc || '—'}
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'grid', gap: '8px', fontSize: '0.9rem' }}>
                                                        <div><strong>Інв. №:</strong> {p.inventoryNumber || '—'}</div>
                                                        <div><strong>Серійний:</strong> {p.serialNumber || '—'}</div>
                                                        <div><strong>Технічний стан:</strong> {p.technicalCondition || '—'}</div>
                                                        <div><strong>Доступно з:</strong> {p.availableFrom ? formatDate(p.availableFrom) : '—'}</div>
                                                        <div>
                                                            <strong>На сайті:</strong>{' '}
                                                            {p.slug ? (
                                                                <Link to={`/orenda/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--admin-accent)' }}>
                                                                    /orenda/{p.slug}
                                                                </Link>
                                                            ) : '—'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <strong>Комплект (kit items)</strong>
                                                        <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.88rem' }}>
                                                            {Array.isArray(p.kitItems) && p.kitItems.length ? p.kitItems.map((k, i) => (
                                                                <li key={i}>{k}</li>
                                                            )) : <li style={{ listStyle: 'none', marginLeft: '-18px', color: '#888' }}>—</li>}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Характеристики (specs)</strong>
                                                        <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#444' }}>
                                                            {p.specs && Object.keys(p.specs).length > 0 ? (
                                                                Object.entries(p.specs).map(([key, val]) => (
                                                                    <div key={key}><strong>{key}:</strong> {String(val)}</div>
                                                                ))
                                                            ) : (
                                                                <span style={{ color: '#888' }}>—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {p.adminNotes && (
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <strong>Внутрішні нотатки</strong>
                                                            <p style={{ margin: '6px 0 0', fontSize: '0.88rem', color: '#555', whiteSpace: 'pre-wrap' }}>{p.adminNotes}</p>
                                                        </div>
                                                    )}
                                                    {Array.isArray(p.competitorLinks) && p.competitorLinks.length > 0 && (
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <strong>Конкуренти</strong>
                                                            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.85rem' }}>
                                                                {p.competitorLinks.map((url, i) => (
                                                                    <li key={i}>
                                                                        <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">{url}</a>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {!filteredInventory.length && (
                            <tr>
                                <td colSpan={colSpan} style={{ textAlign: 'center', color: '#999', padding: '32px' }}>
                                    {inventory.length ? 'Нічого не знайдено за заданим фільтром' : 'Немає позицій на цьому складі'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modalWarehousesOpen && (
                <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="warehouses-modal-title" onClick={() => setModalWarehousesOpen(false)}>
                    <div className="admin-modal-card admin-modal-card--warehouses" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <h2 id="warehouses-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>Склади</h2>
                            <button type="button" className="action-btn" onClick={() => setModalWarehousesOpen(false)} aria-label="Закрити">
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ margin: '0 0 14px', color: '#666', fontSize: '0.9rem' }}>
                            Оберіть склад для перегляду залишків у таблиці нижче.
                        </p>
                        <ul className="admin-warehouses-modal-list">
                            {warehouses.map((w) => (
                                <li key={w.id}>
                                    <button
                                        type="button"
                                        className={`admin-warehouses-modal-item ${selectedWarehouseId === w.id ? 'is-active' : ''}`}
                                        onClick={() => selectWarehouseAndClose(w.id)}
                                    >
                                        <span className="admin-warehouses-modal-item__name">{w.name}</span>
                                        {w.notes && <span className="admin-warehouses-modal-item__notes">{w.notes}</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {warehouses.length === 0 && (
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>Складів ще немає. Створіть перший через «Створити склад».</p>
                        )}
                    </div>
                </div>
            )}

            {modalCreateOpen && (
                <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-warehouse-modal-title" onClick={() => !saving && setModalCreateOpen(false)}>
                    <div className="admin-modal-card admin-modal-card--warehouses" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                            <h2 id="create-warehouse-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>Новий склад</h2>
                            <button type="button" className="action-btn" disabled={saving} onClick={() => setModalCreateOpen(false)} aria-label="Закрити">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="admin-form">
                            <div className="form-group">
                                <label>Назва складу</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="Наприклад: Склад №2"
                                />
                            </div>
                            <div className="form-group">
                                <label>Нотатки</label>
                                <input
                                    value={form.notes}
                                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                    placeholder="Опціонально"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setModalCreateOpen(false)}>Скасувати</button>
                            <button type="button" className="btn btn-primary" disabled={saving || !form.name.trim()} onClick={createWarehouse}>
                                {saving ? 'Збереження...' : 'Створити склад'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <WarehouseProductWorkModal
                open={!!workModalRow}
                onClose={() => setWorkModalRow(null)}
                inventoryRow={workModalRow}
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                token={token}
                onUpdated={() => fetchInventory(selectedWarehouseId)}
            />

            {selectedRows.length > 0 && (
                <div className="admin-warehouse-bulkbar">
                    <div style={{ fontWeight: 800 }}>Обрано: {selectedRows.length}</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary" onClick={openBulkMove}>
                            <ArrowRightLeft size={18} /> Перемістити обрані
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={clearSelection}>
                            Очистити вибір
                        </button>
                    </div>
                </div>
            )}

            {bulkOpen && (
                <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-move-title" onClick={() => !bulkBusy && setBulkOpen(false)}>
                    <div className="admin-modal-card admin-modal-card--work-product" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <h2 id="bulk-move-title" style={{ margin: 0, fontSize: '1.15rem' }}>Перемістити обрані товари</h2>
                                <p style={{ margin: '6px 0 0', color: '#666', fontSize: '0.9rem' }}>
                                    Зі складу: <strong>{selectedWarehouse?.name || '—'}</strong>
                                </p>
                            </div>
                            <button type="button" className="action-btn" disabled={bulkBusy} onClick={() => setBulkOpen(false)} aria-label="Закрити">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="admin-form">
                            <div className="form-group">
                                <label>Склад призначення</label>
                                <select value={bulkToId} onChange={(e) => setBulkToId(e.target.value)}>
                                    {targetWarehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '10px', marginTop: '8px' }}>
                            {selectedRows.map((row) => (
                                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', alignItems: 'center', borderTop: '1px solid var(--admin-border)', paddingTop: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{row.Product?.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>На складі: {row.quantity} шт.</div>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={row.quantity || 0}
                                        value={bulkQtyById[row.id] ?? 0}
                                        onChange={(e) => setBulkQtyById((p) => ({ ...p, [row.id]: e.target.value }))} 
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                            <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => setBulkOpen(false)}>Скасувати</button>
                            <button type="button" className="btn btn-primary" disabled={bulkBusy || !bulkToId} onClick={doBulkMove}>
                                {bulkBusy ? 'Переміщення…' : 'Перемістити'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
