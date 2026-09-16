import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { productUnitsApi, warehousesApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { TECHNICAL_CONDITION_OPTIONS } from '../../../constants/technicalConditions';
import Tabs from '../../../features/admin/ui/Tabs';
import Switch from '../../../features/admin/ui/Switch';
import ConfirmDialog from '../../../features/admin/ui/ConfirmDialog';

const ADD_TAB_VALUE = '__add__';

/**
 * Фізичні одиниці одного товару (docs plan «Фізичні одиниці
 * інструменту») — кілька однакових дрилів/інструментів на одній картці,
 * кожен зі своїм серійником/інв. номером/станом, замість дублювання
 * цілої картки на кожен екземпляр. Кожна зміна зберігається одразу
 * (як точкові PATCH-и в Постачальниках/статусах клієнта) — вона одразу
 * впливає на quantityAvailable, який видно на сусідніх екранах.
 */
export default function ProductUnits({ productId, isNew }) {
    const { showToast } = useToast();
    const [units, setUnits] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const load = useCallback(async () => {
        if (!productId || isNew) { setLoading(false); return; }
        setLoading(true);
        try {
            const [unitRows, whRows] = await Promise.all([
                productUnitsApi.list(productId),
                warehousesApi.list(),
            ]);
            const list = Array.isArray(unitRows) ? unitRows : [];
            setUnits(list);
            setWarehouses(Array.isArray(whRows) ? whRows : []);
            setActiveId((prev) => (list.some((u) => u.id === prev) ? prev : list[0]?.id ?? null));
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити одиниці', 'warning');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, isNew]);

    useEffect(() => { load(); }, [load]);

    if (isNew) {
        return (
            <div className="admin-section">
                <h2 className="section-title">Одиниці інструменту</h2>
                <p className="section-hint">
                    Спершу збережіть картку — потім зможете додати фізичні одиниці
                    (серійники, інвентарні номери, стан).
                </p>
            </div>
        );
    }

    async function handleAdd() {
        setAdding(true);
        try {
            const created = await productUnitsApi.create(productId, {});
            setUnits((prev) => [...prev, created]);
            setActiveId(created.id);
        } catch (err) {
            showToast(err.message || 'Не вдалося додати одиницю', 'warning');
        } finally {
            setAdding(false);
        }
    }

    function updateLocal(unit, field, value) {
        setUnits((prev) => prev.map((u) => (u.id === unit.id ? { ...u, [field]: value } : u)));
    }

    async function persist(unit, field, value) {
        try {
            const updated = await productUnitsApi.update(unit.id, { [field]: value });
            setUnits((prev) => prev.map((u) => (u.id === unit.id ? updated : u)));
        } catch (err) {
            showToast(err.message || 'Не вдалося зберегти зміну', 'warning');
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await productUnitsApi.remove(deleteTarget.id);
            setUnits((prev) => {
                const next = prev.filter((u) => u.id !== deleteTarget.id);
                setActiveId((prevId) => (prevId === deleteTarget.id ? (next[0]?.id ?? null) : prevId));
                return next;
            });
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Не вдалося видалити одиницю', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const activeUnit = units.find((u) => u.id === activeId) || null;
    const tabs = [
        ...units.map((u, i) => ({ value: u.id, label: String(i + 1) })),
        { value: ADD_TAB_VALUE, label: adding ? '…' : '+' },
    ];

    return (
        <div className="admin-section">
            <h2 className="section-title">Одиниці інструменту</h2>
            <p className="section-hint">
                Кожна фізична одиниця (напр. окремий дриль) — свій серійник,
                інв. номер і стан. Вимкнена або позначена «Потребує ремонту»
                одиниця не рахується в доступній кількості.
            </p>

            {loading ? (
                <p className="empty-hint">Завантаження…</p>
            ) : (
                <>
                    <Tabs
                        tabs={tabs}
                        value={activeId}
                        onChange={(v) => (v === ADD_TAB_VALUE ? handleAdd() : setActiveId(v))}
                    />

                    {activeUnit ? (
                        <div className="admin-form">
                            <div className="form-group">
                                <label>Серійний номер</label>
                                <input
                                    type="text"
                                    value={activeUnit.serialNumber || ''}
                                    onChange={(e) => updateLocal(activeUnit, 'serialNumber', e.target.value)}
                                    onBlur={(e) => persist(activeUnit, 'serialNumber', e.target.value)}
                                    placeholder="Напр: SN-2024-001"
                                />
                            </div>
                            <div className="form-group">
                                <label>Інвентарний номер</label>
                                <input
                                    type="text"
                                    value={activeUnit.inventoryNumber || ''}
                                    onChange={(e) => updateLocal(activeUnit, 'inventoryNumber', e.target.value)}
                                    onBlur={(e) => persist(activeUnit, 'inventoryNumber', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Технічний стан</label>
                                <select
                                    value={activeUnit.technicalCondition || ''}
                                    onChange={(e) => {
                                        updateLocal(activeUnit, 'technicalCondition', e.target.value);
                                        persist(activeUnit, 'technicalCondition', e.target.value);
                                    }}
                                >
                                    <option value="">Оберіть стан</option>
                                    {TECHNICAL_CONDITION_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Склад</label>
                                <select
                                    value={activeUnit.warehouseId || ''}
                                    onChange={(e) => {
                                        const v = e.target.value ? Number(e.target.value) : '';
                                        updateLocal(activeUnit, 'warehouseId', v);
                                        persist(activeUnit, 'warehouseId', v);
                                    }}
                                >
                                    <option value="">— Не вказано —</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Фото стану (URL)</label>
                                <input
                                    type="text"
                                    value={activeUnit.adminPhoto || ''}
                                    onChange={(e) => updateLocal(activeUnit, 'adminPhoto', e.target.value)}
                                    onBlur={(e) => persist(activeUnit, 'adminPhoto', e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="form-group">
                                <Switch
                                    checked={activeUnit.isActive !== false}
                                    onChange={(checked) => {
                                        updateLocal(activeUnit, 'isActive', checked);
                                        persist(activeUnit, 'isActive', checked);
                                    }}
                                    label="Активна (враховується в доступній кількості)"
                                />
                            </div>
                            <div className="form-group">
                                <button type="button" className="ds-btn ds-btn--danger" onClick={() => setDeleteTarget(activeUnit)}>
                                    <Trash2 size={14} /> Видалити одиницю
                                </button>
                            </div>
                        </div>
                    ) : (
                        <span className="empty-hint">Одиниць ще немає — натисніть «+», щоб додати першу.</span>
                    )}
                </>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити одиницю?"
                message="Це зменшить доступну кількість товару. Якщо одиниця просто зламана — краще позначити «Потребує ремонту» або вимкнути перемикачем «Активна», а не видаляти."
                confirmText="Видалити"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
