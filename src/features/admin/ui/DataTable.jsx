import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import EmptyState from './EmptyState';
import './admin-ui.css';

/**
 * Props:
 *   columns        – array of { key, label, render?(value, row), align?: 'left'|'center'|'right',
 *                     sortable?: boolean, className? }
 *   rows           – array of row data objects
 *   rowKey         – function(row) => unique key, default: row => row.id
 *   onRowClick     – (optional) function(row)
 *   loading        – show skeleton rows instead of data
 *   sortKey        – (optional) currently active sort column key (controlled)
 *   sortDirection  – 'asc' | 'desc' (default 'asc')
 *   onSort         – (optional) function(key) — enables sorting UI; the caller owns the sort
 *   selection      – (optional) { selectedIds: Set, onToggle(key), onToggleAll(checked) } — adds a
 *                     checkbox column; selection state and bulk actions stay the caller's job
 *   emptyTitle     – text shown when rows is empty and not loading
 *   emptyDescription
 *   emptyIcon
 */
export default function DataTable({
    columns = [],
    rows = [],
    rowKey = (row) => row.id,
    onRowClick,
    loading = false,
    sortKey,
    sortDirection = 'asc',
    onSort,
    selection,
    emptyTitle = 'Нічого не знайдено',
    emptyDescription,
    emptyIcon,
    skeletonRows = 5,
}) {
    const colCount = columns.length + (selection ? 1 : 0);
    return (
        <div className="ds-table-wrap">
            <table className="ds-table">
                <thead>
                    <tr>
                        {selection && (
                            <th className="ds-table-th ds-table-th--checkbox">
                                <input
                                    type="checkbox"
                                    aria-label="Вибрати всі"
                                    checked={rows.length > 0 && rows.every((row) => selection.selectedIds.has(rowKey(row)))}
                                    onChange={(e) => selection.onToggleAll(e.target.checked)}
                                />
                            </th>
                        )}
                        {columns.map((col) => {
                            const sortable = Boolean(col.sortable && onSort);
                            const active = sortable && sortKey === col.key;
                            const alignClass = col.align && col.align !== 'left' ? ` ds-table-th--${col.align}` : '';
                            return (
                                <th
                                    key={col.key}
                                    className={`ds-table-th${alignClass}${sortable ? ' ds-table-th--sortable' : ''}`}
                                    onClick={sortable ? () => onSort(col.key) : undefined}
                                    aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                                >
                                    <span className="ds-table-th-inner">
                                        {col.label}
                                        {sortable &&
                                            (active ? (
                                                sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                            ) : (
                                                <ArrowUpDown size={14} className="ds-table-sort-idle" />
                                            ))}
                                    </span>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        Array.from({ length: skeletonRows }).map((_, i) => (
                            <tr key={i} className="ds-table-row">
                                {selection && <td className="ds-table-td" />}
                                {columns.map((col) => (
                                    <td key={col.key} className="ds-table-td">
                                        <span className="ds-table-skeleton" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={colCount} className="ds-table-empty-cell">
                                <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={onRowClick ? 'ds-table-row ds-table-row--clickable' : 'ds-table-row'}
                            >
                                {selection && (
                                    <td className="ds-table-td ds-table-td--checkbox" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            aria-label="Вибрати рядок"
                                            checked={selection.selectedIds.has(rowKey(row))}
                                            onChange={() => selection.onToggle(rowKey(row))}
                                        />
                                    </td>
                                )}
                                {columns.map((col) => {
                                    const alignClass = col.align && col.align !== 'left' ? ` ds-table-td--${col.align}` : '';
                                    return (
                                        <td
                                            key={col.key}
                                            className={`ds-table-td${alignClass}${col.className ? ` ${col.className}` : ''}`}
                                        >
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
