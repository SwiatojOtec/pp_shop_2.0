import { useEffect, useState } from 'react';
import { Printer, QrCode } from 'lucide-react';
import { productUnitsApi } from '../../../../services/api';
import { useToast } from '../../../../context/ToastContext';
import PageHeader from '../../ui/PageHeader';
import Tabs from '../../ui/Tabs';
import DataTable from '../../ui/DataTable';
import { useWarehouses } from '../hooks/useWarehouses';
import { exportUnitLabelsPdf } from '../model/exportLabelsPdf';

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('uk-UA') + ' ' + d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

/** Друк QR-наліпок на фізичні одиниці інструменту (docs plan «Переоблік
 *  зі сканером») — окремо від мобільного сканування: друк робиться раз
 *  з робочого комп'ютера з принтером, сканування — багато разів з поля. */
export default function StockLabels() {
    const { showToast } = useToast();
    const { warehouses, selectedWarehouseId, setSelectedWarehouseId } = useWarehouses();
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);

    const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) || null;
    const warehouseTabs = warehouses.map((w) => ({ value: String(w.id), label: w.name }));

    useEffect(() => {
        if (!selectedWarehouseId) { setUnits([]); setLoading(false); return; }
        setLoading(true);
        productUnitsApi.listAll({ warehouseId: selectedWarehouseId, isActive: true })
            .then((rows) => setUnits(Array.isArray(rows) ? rows : []))
            .catch((err) => {
                showToast(err.message || 'Не вдалося завантажити одиниці', 'warning');
                setUnits([]);
            })
            .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWarehouseId]);

    async function handlePrint() {
        if (!units.length) return;
        setPrinting(true);
        try {
            await exportUnitLabelsPdf({ warehouseName: selectedWarehouse?.name, units });
        } catch (err) {
            showToast(err.message || 'Не вдалося сформувати PDF', 'warning');
        } finally {
            setPrinting(false);
        }
    }

    const columns = [
        {
            key: 'Product',
            label: 'Товар',
            render: (product) => product?.name || '—',
        },
        {
            key: 'inventoryNumber',
            label: 'Інв. номер / Серійник',
            render: (v, row) => v || row.serialNumber || '—',
        },
        {
            key: 'lastCheckedAt',
            label: 'Востаннє перевірено',
            render: formatDate,
        },
    ];

    return (
        <div className="catalog-list">
            <PageHeader
                title="Наліпки"
                subtitle={`${units.length} одиниць на складі${selectedWarehouse ? ` «${selectedWarehouse.name}»` : ''}`}
                actions={(
                    <button
                        type="button"
                        className="ds-btn ds-btn--primary"
                        onClick={handlePrint}
                        disabled={printing || !units.length}
                    >
                        <Printer size={16} /> {printing ? 'Формуємо…' : 'Друкувати всі QR'}
                    </button>
                )}
            />

            {warehouseTabs.length > 0 && (
                <Tabs
                    tabs={warehouseTabs}
                    value={String(selectedWarehouseId || '')}
                    onChange={(v) => setSelectedWarehouseId(Number(v))}
                />
            )}

            <DataTable
                columns={columns}
                rows={units}
                loading={loading}
                emptyIcon={QrCode}
                emptyTitle="На цьому складі немає активних одиниць"
            />
        </div>
    );
}
