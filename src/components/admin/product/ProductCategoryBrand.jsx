/** Category + brand + supplier selects — Основне tab of ProductEdit. */
export default function ProductCategoryBrand({ formData, onChange, categories, brands, suppliers = [] }) {
    return (
        <div className="admin-section">
            <h2 className="section-title">Категорія та бренд</h2>
            <div className="admin-form">
                <div className="form-group">
                    <label>Категорія</label>
                    <select
                        value={formData.category}
                        onChange={(e) => {
                            const cat = e.target.value;
                            onChange('category', cat);
                            if (cat === 'Підвіконня') onChange('unit', 'п.м.');
                        }}
                    >
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {categories.length === 0 && <option>Спочатку додайте категорії</option>}
                    </select>
                </div>
                <div className="form-group">
                    <label>Бренд</label>
                    <select
                        value={formData.brand}
                        onChange={(e) => onChange('brand', e.target.value)}
                    >
                        <option value="">Оберіть бренд</option>
                        {brands.map((b) => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Постачальник</label>
                    <select
                        value={formData.supplierId || ''}
                        onChange={(e) => onChange('supplierId', e.target.value)}
                    >
                        <option value="">Без постачальника</option>
                        {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
