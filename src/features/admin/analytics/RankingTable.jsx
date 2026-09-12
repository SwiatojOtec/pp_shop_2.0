import DataTable from '../ui/DataTable';

function formatMoney(v) {
    return `${Number(v || 0).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`;
}

/** Revenue-ranked table shared by byCategory/byBrand/topProducts/topClients/
 *  bySupplier — same shape everywhere: { name/category/brand/productId,
 *  revenue, qty?, orders?, profit?, costKnown? }. */
export default function RankingTable({ rows, nameKey, nameLabel, extraColumn, emptyTitle }) {
    const columns = [
        { key: nameKey, label: nameLabel, render: (v, row) => row[nameKey] || row.name || '—' },
        ...(extraColumn ? [extraColumn] : []),
        { key: 'revenue', label: 'Виручка', align: 'right', render: (v) => <span className="mono">{formatMoney(v)}</span> },
        {
            key: 'profit',
            label: 'Прибуток',
            align: 'right',
            render: (v, row) => (
                row.costKnown
                    ? <span className="mono">{formatMoney(v)}</span>
                    : <span className="analytics-muted">—</span>
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row[nameKey] ?? row.productId ?? row.clientId ?? row.name}
            emptyTitle={emptyTitle || 'Немає даних за цей період'}
        />
    );
}
