/**
 * Product basic info section: name, description, admin notes.
 */
export default function ProductBasicInfo({ formData, onChange }) {
    return (
        <div className="admin-section">
            <h2 className="section-title">Основна інформація</h2>
            <div className="admin-form">
                <div className="form-group">
                    <label>Назва товару</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="Наприклад: Chevron Oak Natural"
                    />
                </div>
                <div className="form-group">
                    <label>Опис товару</label>
                    <textarea
                        value={formData.desc}
                        onChange={(e) => onChange('desc', e.target.value)}
                        rows={10}
                        style={{ resize: 'vertical' }}
                    />
                </div>
                <div className="form-group">
                    <label>Нотатки (внутрішні, тільки для адмінів)</label>
                    <textarea
                        value={formData.adminNotes || ''}
                        onChange={(e) => onChange('adminNotes', e.target.value)}
                        rows={4}
                        placeholder="Наприклад: мінімальна ціна, стан, нюанси по оренді, контакт постачальника..."
                        style={{ resize: 'vertical' }}
                    />
                </div>
            </div>
        </div>
    );
}
