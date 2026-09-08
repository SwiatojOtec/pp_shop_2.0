import './admin-ui.css';

/**
 * Section tabs, meant to be paired with useUrlState so the active tab is
 * synced to `?tab=`.
 *
 * Props:
 *   tabs     – array of { value, label, count? }
 *   value    – active tab value
 *   onChange – function(value)
 */
export default function Tabs({ tabs = [], value, onChange }) {
    return (
        <div className="ds-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={tab.value === value}
                    className={`ds-tab${tab.value === value ? ' ds-tab--active' : ''}`}
                    onClick={() => onChange?.(tab.value)}
                >
                    {tab.label}
                    {tab.count != null && <span className="ds-tab-count">{tab.count}</span>}
                </button>
            ))}
        </div>
    );
}
