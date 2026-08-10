export default function RentalFormTabs({
    tab,
    onTabChange,
    itemsCount,
    hideDocumentTab = false,
    hidePartiesTab = false,
}) {
    const tabs = [
        ...(!hidePartiesTab ? [{ key: 'parties', label: 'Сторони' }] : []),
        { key: 'items', label: hidePartiesTab ? `Деталі оренди (${itemsCount})` : `Позиції (${itemsCount})` },
        ...(hideDocumentTab ? [] : [{ key: 'document', label: 'Документ' }]),
    ];

    if (tabs.length <= 1) return null;

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
