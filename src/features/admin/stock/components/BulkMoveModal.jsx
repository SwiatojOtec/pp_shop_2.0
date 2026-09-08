import { useEffect, useState } from 'react';
import { useToast } from '../../../../context/ToastContext';
import Modal from '../../ui/Modal';
import '../stock.css';

export default function BulkMoveModal({ open, onClose, warehouseName, targetWarehouses, selectedRows, onSubmit }) {
    const { showToast } = useToast();
    const [toId, setToId] = useState('');
    const [qtyById, setQtyById] = useState({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        const init = {};
        for (const row of selectedRows) init[row.id] = Math.max(0, row.quantity || 0);
        setQtyById(init);
        setToId(targetWarehouses[0]?.id ? String(targetWarehouses[0].id) : '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const fillAll = () => {
        const next = {};
        for (const row of selectedRows) next[row.id] = Math.max(0, row.quantity || 0);
        setQtyById(next);
    };

    const submit = async () => {
        const toWarehouseId = Number(toId);
        if (!toWarehouseId) return;
        setBusy(true);
        try {
            await onSubmit(toWarehouseId, qtyById);
            showToast('Товари переміщено.', 'success');
            onClose();
        } catch (e) {
            showToast(e.message || 'Помилка переміщення', 'warning');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={() => !busy && onClose()}
            title="Перемістити обрані товари"
            footer={(
                <div className="ds-confirm-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" disabled={busy} onClick={onClose}>Скасувати</button>
                    <button type="button" className="ds-btn ds-btn--primary" disabled={busy || !toId} onClick={submit}>
                        {busy ? 'Переміщення…' : 'Перемістити'}
                    </button>
                </div>
            )}
        >
            <p className="stock-page-hint">Зі складу: <strong>{warehouseName || '—'}</strong></p>

            <div className="stock-modal-form">
                <label className="stock-modal-field">
                    Склад призначення
                    <select value={toId} onChange={(e) => setToId(e.target.value)}>
                        {targetWarehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </label>

                <button type="button" className="ds-btn ds-btn--secondary" onClick={fillAll}>
                    Перенести все (по всіх товарах)
                </button>

                {selectedRows.map((row) => (
                    <div key={row.id} className="stock-bulk-row">
                        <div>
                            <div className="stock-bulk-row-name">{row.Product?.name}</div>
                            <div className="stock-bulk-row-qty">На складі: {row.quantity} шт.</div>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={row.quantity || 0}
                            value={qtyById[row.id] ?? 0}
                            onChange={(e) => setQtyById((p) => ({ ...p, [row.id]: e.target.value }))}
                        />
                    </div>
                ))}
            </div>
        </Modal>
    );
}
