import { useState } from 'react';
import { Settings, Trash2, Plus } from 'lucide-react';

/**
 * Product specifications (key-value pairs) editor.
 */
export default function ProductSpecs({ specs = {}, onChange }) {
    const [newKey, setNewKey]     = useState('');
    const [newValue, setNewValue] = useState('');

    function addSpec() {
        if (!newKey.trim() || !newValue.trim()) return;
        onChange({ ...specs, [newKey.trim()]: newValue.trim() });
        setNewKey('');
        setNewValue('');
    }

    function removeSpec(key) {
        const next = { ...specs };
        delete next[key];
        onChange(next);
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <Settings size={20} />
                <h2 className="section-title" style={{ margin: 0 }}>Характеристики</h2>
            </div>

            <div className="specs-list">
                {Object.entries(specs).map(([key, value]) => (
                    <div key={key} className="spec-item">
                        <span className="spec-item-text"><strong>{key}:</strong> {value}</span>
                        <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => removeSpec(key)}
                            title="Видалити"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {Object.keys(specs).length === 0 && (
                    <p className="empty-hint">Характеристик ще немає</p>
                )}
            </div>

            <div className="add-spec-form">
                <input
                    type="text"
                    placeholder="Назва (напр. Товщина)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())}
                />
                <input
                    type="text"
                    placeholder="Значення (напр. 14 мм)"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())}
                />
                <button type="button" onClick={addSpec} className="btn-primary">
                    <Plus size={18} />
                </button>
            </div>
        </div>
    );
}
