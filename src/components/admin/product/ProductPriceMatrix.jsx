import { Trash2, Plus } from 'lucide-react';

/**
 * Price matrix editor for "Підвіконня" (window sill) category.
 */
export default function ProductPriceMatrix({ matrix = [], onChange }) {
    function addRow() {
        onChange([...matrix, { width: '', price: '' }]);
    }

    function removeRow(index) {
        onChange(matrix.filter((_, i) => i !== index));
    }

    function updateRow(index, field, value) {
        const next = [...matrix];
        next[index] = { ...next[index], [field]: Number(value) };
        onChange(next);
    }

    function generateStandard() {
        const sizes = [];
        for (let w = 100; w <= 600; w += 50) {
            sizes.push({ width: w, price: 0 });
        }
        onChange(sizes);
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2 className="section-title" style={{ margin: 0 }}>Матриця цін (Підвіконня)</h2>
                <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                    onClick={generateStandard}
                >
                    Генерувати стандартні (100–600)
                </button>
            </div>
            <p className="section-hint">
                Додайте ширину (глибину) та ціну за погонний метр для цієї ширини.
                Клієнт вводить свою ширину, а система округлює до найближчого більшого значення.
            </p>

            <div className="price-matrix-list">
                {matrix.map((row, i) => (
                    <div key={i} className="price-matrix-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem' }}>Ширина (мм)</label>
                            <input
                                type="number"
                                value={row.width}
                                onChange={(e) => updateRow(i, 'width', e.target.value)}
                                placeholder="150"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.7rem' }}>Ціна (₴)</label>
                            <input
                                type="number"
                                value={row.price}
                                onChange={(e) => updateRow(i, 'price', e.target.value)}
                                placeholder="250"
                            />
                        </div>
                        <button
                            type="button"
                            className="action-btn delete"
                            onClick={() => removeRow(i)}
                            style={{ alignSelf: 'flex-end', marginBottom: '1px' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <button type="button" onClick={addRow} className="btn-secondary" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
                <Plus size={16} /> Додати розмір
            </button>
        </div>
    );
}
