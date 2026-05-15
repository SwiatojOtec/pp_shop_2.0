import { Search } from 'lucide-react';
import './AdminComponents.css';

/**
 * Reusable filter bar for admin list pages.
 *
 * Props:
 *   search       – current search string
 *   onSearch     – function(value)
 *   placeholder  – input placeholder (default "Пошук...")
 *   filters      – array of { key, label, value, options: [{value, label}] }
 *   onFilter     – function(key, value)
 *   actions      – ReactNode — right-side action buttons (e.g. "Add" button)
 */
export default function AdminFilters({
    search = '',
    onSearch,
    placeholder = 'Пошук...',
    filters = [],
    onFilter,
    actions,
}) {
    return (
        <div className="admin-filters">
            {onSearch !== undefined && (
                <div className="admin-filter-search">
                    <Search size={16} className="admin-filter-search-icon" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder={placeholder}
                        className="admin-filter-input"
                    />
                </div>
            )}

            {filters.map((f) => (
                <select
                    key={f.key}
                    value={f.value}
                    onChange={(e) => onFilter?.(f.key, e.target.value)}
                    className="admin-filter-select"
                    aria-label={f.label}
                >
                    <option value="">{f.label}</option>
                    {f.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            ))}

            {actions && <div className="admin-filters-actions">{actions}</div>}
        </div>
    );
}
