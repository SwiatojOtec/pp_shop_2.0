import { X } from 'lucide-react';

export default function RentalKitItemsList({ itemIndex, kitItems, onRemoveKitItem }) {
    if (!Array.isArray(kitItems) || kitItems.length === 0) return null;

    return (
        <div className="kit-items-section">
            <div className="kit-items-title">До комплекту входять:</div>
            {kitItems.map((kit, ki) => (
                <div key={ki} className="kit-item-row">
                    <span className="kit-item-num">{itemIndex + 1}.{ki + 1}</span>
                    <span className="kit-item-name">{kit}</span>
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
        </div>
    );
}
