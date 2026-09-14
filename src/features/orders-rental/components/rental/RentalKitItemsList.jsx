import { Plus, X } from 'lucide-react';

export default function RentalKitItemsList({ itemIndex, kitItems, onAddKitItem, onChangeKitItem, onRemoveKitItem }) {
    const items = Array.isArray(kitItems) ? kitItems : [];

    return (
        <div className="kit-items-section">
            <div className="kit-items-title">До комплекту входять:</div>
            {items.map((kit, ki) => (
                <div key={ki} className="kit-item-row">
                    <span className="kit-item-num">{itemIndex + 1}.{ki + 1}</span>
                    <input
                        type="text"
                        className="kit-item-name-input"
                        value={kit}
                        placeholder="Наприклад: подовжувач 5 м"
                        onChange={(e) => onChangeKitItem(ki, e.target.value)}
                    />
                    <span className="kit-item-state">справний</span>
                    <button
                        type="button"
                        className="kit-item-remove-btn"
                        title="Прибрати з комплектації в цій заявці"
                        onClick={() => onRemoveKitItem(ki)}
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
            <button type="button" className="kit-item-add-btn" onClick={onAddKitItem}>
                <Plus size={14} /> Додати рядок
            </button>
        </div>
    );
}
