import { Trash2 } from 'lucide-react';
import {
    TECHNICAL_CONDITION_OPTIONS,
    isCanonicalTechnicalCondition,
} from '../../../../constants/technicalConditions';
import RentalKitItemsList from './RentalKitItemsList';

export default function RentalItemCard({
    item,
    index,
    onUpdate,
    onRemove,
    onRemoveKitItem,
}) {
    function handleAddKitItem() {
        onUpdate('kitItems', [...(item.kitItems || []), '']);
    }

    function handleChangeKitItem(kitIndex, value) {
        const next = [...(item.kitItems || [])];
        next[kitIndex] = value;
        onUpdate('kitItems', next);
    }

    return (
        <div className="rental-item-card">
            <div className="item-card-header">
                <span className="item-num">{index + 1}</span>
                <input
                    className="item-name-input"
                    value={item.name}
                    onChange={e => onUpdate('name', e.target.value)}
                    placeholder="Назва інструменту"
                />
                <button onClick={onRemove} className="remove-item-btn" title="Видалити">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="item-fields-grid">
                <div className="item-field">
                    <label>Серійний №</label>
                    <input value={item.serialNumber} onChange={e => onUpdate('serialNumber', e.target.value)} placeholder="б/н" />
                </div>
                <div className="item-field">
                    <label>Інвентарний №</label>
                    <input value={item.inventoryNumber} onChange={e => onUpdate('inventoryNumber', e.target.value)} placeholder="INV-001" />
                </div>
                <div className="item-field">
                    <label>Технічний стан</label>
                    <select value={item.technicalCondition} onChange={e => onUpdate('technicalCondition', e.target.value)}>
                        <option value="">— оберіть —</option>
                        {TECHNICAL_CONDITION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                        {item.technicalCondition && !isCanonicalTechnicalCondition(item.technicalCondition) && (
                            <option value={item.technicalCondition}>{item.technicalCondition} (нестандарт)</option>
                        )}
                    </select>
                </div>
                <div className="item-field">
                    <label>Од. виміру</label>
                    <input value={item.unit} onChange={e => onUpdate('unit', e.target.value)} />
                </div>
                <div className="item-field">
                    <label>Кількість</label>
                    <input type="number" min="1" value={item.quantity} onChange={e => onUpdate('quantity', e.target.value)} />
                </div>
                <div className="item-field">
                    <label>Вага заг., кг</label>
                    <input type="number" step="0.01" value={item.weightTotal} onChange={e => onUpdate('weightTotal', e.target.value)} placeholder="0.00" />
                </div>
                <div className="item-field">
                    <label>Відновл. вартість, ₴</label>
                    <input type="number" step="0.01" value={item.replacementCostPerUnit} onChange={e => onUpdate('replacementCostPerUnit', e.target.value)} placeholder="0.00" />
                </div>
                <div className="item-field">
                    <label>Заст. платіж, %</label>
                    <input type="number" min="0" max="100" value={item.depositPercent} onChange={e => onUpdate('depositPercent', e.target.value)} />
                </div>
                <div className="item-field item-field--highlight">
                    <label>Застава, ₴</label>
                    <input value={item.depositAmount} readOnly className="readonly-field" />
                </div>
                <div className="item-field">
                    <label>Оренда з</label>
                    <input type="date" value={item.rentFrom} onChange={e => onUpdate('rentFrom', e.target.value)} />
                </div>
                <div className="item-field">
                    <label>Оренда по</label>
                    <input type="date" value={item.rentTo} onChange={e => onUpdate('rentTo', e.target.value)} />
                </div>
                <div className="item-field item-field--highlight">
                    <label>Діб</label>
                    <input value={item.days || 0} readOnly className="readonly-field" />
                </div>
                <div className="item-field">
                    <label>Тариф, ₴/доба</label>
                    <input type="number" step="0.01" value={item.pricePerDay} onChange={e => onUpdate('pricePerDay', e.target.value)} placeholder="0.00" />
                </div>
                <div className="item-field item-field--total">
                    <label>Сума оренди, ₴</label>
                    <input value={item.totalRental || '0.00'} readOnly className="readonly-field total-field" />
                </div>
            </div>

            <RentalKitItemsList
                itemIndex={index}
                kitItems={item.kitItems}
                onAddKitItem={handleAddKitItem}
                onChangeKitItem={handleChangeKitItem}
                onRemoveKitItem={onRemoveKitItem}
            />
        </div>
    );
}
