import { Search } from 'lucide-react';
import './admin-ui.css';

/**
 * Search + filters + right-side actions bar for list pages. Purely
 * presentational — pair it with useUrlState so the values it reflects
 * live in the URL.
 *
 * Props:
 *   search      – current search string
 *   onSearch    – function(value)
 *   placeholder – search input placeholder (default 'Пошук...')
 *   filters     – array of { key, label, value, options: [{value, label}] }
 *   onFilter    – function(key, value)
 *   actions     – ReactNode — right-side action buttons
 */
export default function Toolbar({
    search,
    onSearch,
    placeholder = 'Пошук...',
    filters = [],
    onFilter,
    actions,
}) {
    return (
        <div className="ds-toolbar">
            {onSearch !== undefined && (
                <div className="ds-toolbar-search">
                    <Search size={16} className="ds-toolbar-search-icon" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder={placeholder}
                        className="ds-toolbar-input"
                    />
                </div>
            )}

            {filters.map((f) => (
                <select
                    key={f.key}
                    value={f.value}
                    onChange={(e) => onFilter?.(f.key, e.target.value)}
                    className="ds-toolbar-select"
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

            {actions && <div className="ds-toolbar-actions">{actions}</div>}
        </div>
    );
}
