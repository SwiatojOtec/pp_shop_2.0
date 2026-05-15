import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';

/**
 * Rent product kit items editor (комплектація).
 */
export default function ProductKitItems({ items = [], onChange }) {
    const [draft, setDraft] = useState('');

    function addItem() {
        const val = draft.trim();
        if (!val) return;
        onChange([...items, val]);
        setDraft('');
    }

    function removeItem(index) {
        onChange(items.filter((_, i) => i !== index));
    }

    return (
        <div className="admin-section">
            <h2 className="section-title">Комплектація</h2>
            <p className="section-hint">
                Список того, що входить до комплекту при оренді цього інструменту. Наприклад: &quot;Піка 400 мм&quot;, &quot;Кейс&quot;, &quot;Додаткова ручка&quot;.
            </p>

            <div className="specs-list">
                {items.length > 0 ? (
                    items.map((item, i) => (
                        <div key={i} className="spec-item">
                            <span className="spec-item-text">{item}</span>
                            <button
                                type="button"
                                className="action-btn delete"
                                onClick={() => removeItem(i)}
                                title="Видалити"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="empty-hint">Поки що немає елементів комплекту.</p>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Наприклад: Піка 400 мм"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addItem(); }
                    }}
                    style={{ flex: 1 }}
                />
                <button type="button" className="btn-primary" onClick={addItem}>
                    <Plus size={18} /> Додати в комплект
                </button>
            </div>
        </div>
    );
}
