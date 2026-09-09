export default function RentalFormTabs({ tab, onTabChange, itemsCount }) {
    const tabs = [
        { key: 'parties', label: 'Сторони' },
        { key: 'items', label: `Позиції (${itemsCount})` },
        { key: 'document', label: 'Документ' },
    ];

    return (
        <div className="rental-tabs-nav">
            {tabs.map(t => (
                <button
                    key={t.key}
                    className={`rental-tab-btn${tab === t.key ? ' is-active' : ''}`}
                    onClick={() => onTabChange(t.key)}
                    type="button"
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}
