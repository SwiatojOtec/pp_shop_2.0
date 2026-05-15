import './AdminComponents.css';

/**
 * Reusable admin table.
 *
 * Props:
 *   columns  – array of { key, label, render?, width?, className? }
 *   rows     – array of row data objects (must have a unique `id` field, or pass `rowKey`)
 *   rowKey   – (optional) function(row) => unique key, default: row => row.id
 *   onRowClick – (optional) function(row) — entire row click handler
 *   loading  – show skeleton rows instead of data
 *   empty    – text shown when rows is empty and not loading (default "Нічого не знайдено")
 */
export default function AdminTable({
    columns = [],
    rows = [],
    rowKey = (row) => row.id,
    onRowClick,
    loading = false,
    empty = 'Нічого не знайдено',
}) {
    return (
        <div className="admin-table-container">
            <table className="admin-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                style={col.width ? { width: col.width } : undefined}
                                className={col.className}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="admin-table-skeleton-row">
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        <span className="admin-table-skeleton" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="admin-table-empty">
                                {empty}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={onRowClick ? 'admin-table-row-clickable' : undefined}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={col.className}>
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
