/**
 * Product identifiers sidebar panel: Group ID, SKU (read-only), slug.
 * Only shown for shop products (not rent).
 */
export default function ProductIdentifiers({ formData, onChange, onGroupIdBlur }) {
    return (
        <div className="admin-section">
            <h2 className="section-title">Ідентифікатори</h2>
            <div className="admin-form">
                <div className="form-group">
                    <label>Group ID (Колекція)</label>
                    <input
                        type="text"
                        value={formData.groupId || ''}
                        onChange={(e) => onChange('groupId', e.target.value)}
                        onBlur={(e) => onGroupIdBlur?.(e.target.value)}
                        placeholder="Напр: chevron_oak_2024"
                    />
                    <p className="field-hint">Однаковий ID об&apos;єднує товари в одну колекцію.</p>
                </div>
                <div className="form-group">
                    <label>SKU</label>
                    <input
                        type="text"
                        value={formData.sku || ''}
                        disabled
                        readOnly
                        placeholder="Генерується автоматично"
                        className="input-disabled"
                    />
                </div>
                <div className="form-group">
                    <label>Slug (URL)</label>
                    <input
                        type="text"
                        value={formData.slug || ''}
                        onChange={(e) => onChange('slug', e.target.value)}
                        placeholder="test_laminatu"
                    />
                    <p className="field-hint">Генерується автоматично з назви, але можна змінити.</p>
                </div>
            </div>
        </div>
    );
}
