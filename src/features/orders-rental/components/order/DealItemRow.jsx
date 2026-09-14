import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import {
    TECHNICAL_CONDITION_OPTIONS,
    isCanonicalTechnicalCondition,
} from '../../../../constants/technicalConditions';
import RentalKitItemsList from '../rental/RentalKitItemsList';
import { calcLineDisplayAmounts, resolveOrderItemRentPricePerDay } from '../../amounts/orderAmounts';
import { calcDays } from '../../model/rentalItems';

const THUMB_COLORS = ['#6B4E3D', '#4A5A6B', '#8A6A4B', '#5B6B4A', '#6B4A5E', '#4A6B63'];

function thumbFor(name) {
    const str = String(name || '?');
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
    const color = THUMB_COLORS[Math.abs(hash) % THUMB_COLORS.length];
    const initials = str.trim().slice(0, 2).toUpperCase() || '—';
    return { color, initials };
}

const money = (value) => Number(value || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 2026-09-07 → 07.09 */
function shortDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return y ? `${d}.${m}` : iso;
}

export default function DealItemRow({
    item,
    isRentLine,
    sellerId,
    billingOptions,
    onRemove,
    onUpdateQty,
    onUpdateRentDates,
    onUpdateEnrichment,
    onRemoveKitItem,
    onAddKitItem,
    onChangeKitItem,
}) {
    const [expanded, setExpanded] = useState(false);
    const line = calcLineDisplayAmounts(item, sellerId, billingOptions);
    const days = calcDays(item.rentFrom, item.rentTo);
    const { color, initials } = thumbFor(item.name);
    const hasKit = Array.isArray(item.kitItems) && item.kitItems.length > 0;

    return (
        <div className={`deal-item-row${isRentLine ? ' deal-item-row--rent' : ''}`}>
            <div className="deal-item-row__main">
                <div className="deal-item-row__thumb" style={{ background: color }}>{initials}</div>
                <div className="deal-item-row__body">
                    <div className="deal-item-row__title">
                        <span className="deal-item-row__name">{item.name}</span>
                        <span className={`ds-badge ds-badge--${isRentLine ? 'info' : 'neutral'}`}>
                            {isRentLine ? 'оренда' : 'магазин'}
                        </span>
                    </div>
                    {isRentLine ? (
                        <>
                            <div className="deal-item-row__meta">
                                {item.inventoryNumber && `${item.inventoryNumber} · `}
                                {item.serialNumber && `с/н ${item.serialNumber} · `}
                                {item.quantity ?? 1} шт
                                {item.rentFrom && item.rentTo && ` · ${shortDate(item.rentFrom)} → ${shortDate(item.rentTo)}`}
                                {days > 0 && ` · ${days} діб`}
                            </div>
                            {(hasKit || item.technicalCondition) && (
                                <div className="deal-item-row__kit">
                                    {hasKit && <>Комплект: <b>{item.kitItems.join(', ')}</b></>}
                                    {hasKit && item.technicalCondition && ' · '}
                                    {item.technicalCondition && <>Стан: <span>{item.technicalCondition}</span></>}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="deal-item-row__meta">
                            {item.sku && `SKU: ${item.sku} · `}{item.quantity ?? 0} {line.unit}
                        </div>
                    )}
                </div>
                <div className="deal-item-row__price">
                    <div className="deal-item-row__total">{money(line.lineTotal)} ₴</div>
                    {isRentLine && <div className="deal-item-row__rate">{money(resolveOrderItemRentPricePerDay(item))} ₴/доба</div>}
                </div>
                {isRentLine && (
                    <button type="button" className="ds-icon-btn" onClick={() => setExpanded((v) => !v)} title="Деталі">
                        <ChevronDown size={16} className={expanded ? 'is-open' : ''} />
                    </button>
                )}
                <button type="button" className="ds-icon-btn" onClick={onRemove} title="Прибрати">
                    <X size={16} />
                </button>
            </div>

            {!isRentLine && (
                <div className="deal-item-row__qty-inline">
                    <input type="number" min="0" value={item.quantity ?? 0} onChange={(e) => onUpdateQty(e.target.value)} />
                    <span>{line.unit}</span>
                </div>
            )}

            {isRentLine && expanded && (
                <div className="deal-item-row__expand">
                    <div className="deal-item-row__grid">
                        <label>Кількість
                            <input type="number" min="1" value={item.quantity ?? 1} onChange={(e) => onUpdateQty(e.target.value)} />
                        </label>
                        <label>Оренда з
                            <input type="date" value={item.rentFrom || ''} onChange={(e) => onUpdateRentDates({ rentFrom: e.target.value, rentTo: item.rentTo || '' })} />
                        </label>
                        <label>Оренда по
                            <input type="date" value={item.rentTo || ''} onChange={(e) => onUpdateRentDates({ rentFrom: item.rentFrom || '', rentTo: e.target.value })} />
                        </label>
                        <label>Серійний №
                            <input value={item.serialNumber || ''} onChange={(e) => onUpdateEnrichment('serialNumber', e.target.value)} placeholder="б/н" />
                        </label>
                        <label>Інвентарний №
                            <input value={item.inventoryNumber || ''} onChange={(e) => onUpdateEnrichment('inventoryNumber', e.target.value)} placeholder="INV-001" />
                        </label>
                        <label>Технічний стан
                            <select value={item.technicalCondition || ''} onChange={(e) => onUpdateEnrichment('technicalCondition', e.target.value)}>
                                <option value="">— оберіть —</option>
                                {TECHNICAL_CONDITION_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                                {item.technicalCondition && !isCanonicalTechnicalCondition(item.technicalCondition) && (
                                    <option value={item.technicalCondition}>{item.technicalCondition} (нестандарт)</option>
                                )}
                            </select>
                        </label>
                        <label>Вага заг., кг
                            <input type="number" step="0.01" value={item.weightTotal || ''} onChange={(e) => onUpdateEnrichment('weightTotal', e.target.value)} />
                        </label>
                        <label>Відновл. вартість, ₴
                            <input type="number" step="0.01" value={item.replacementCostPerUnit || ''} onChange={(e) => onUpdateEnrichment('replacementCostPerUnit', e.target.value)} />
                        </label>
                        <label>Заст. платіж, %
                            <input type="number" min="0" max="100" value={item.depositPercent ?? ''} onChange={(e) => onUpdateEnrichment('depositPercent', e.target.value)} />
                        </label>
                        <label>Застава, ₴
                            <input value={item.depositAmount || '0.00'} readOnly className="readonly-field" />
                        </label>
                    </div>
                    <RentalKitItemsList
                        itemIndex={0}
                        kitItems={item.kitItems}
                        onAddKitItem={onAddKitItem}
                        onChangeKitItem={onChangeKitItem}
                        onRemoveKitItem={onRemoveKitItem}
                    />
                </div>
            )}
        </div>
    );
}
