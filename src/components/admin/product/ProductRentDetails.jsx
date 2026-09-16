import { useState, useMemo, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { optimizeImageUrl } from '../../../utils/imageOptimize';

/**
 * Rent-specific product details: costs, competitor links, and admin-only
 * photos. Серійник/інв. номер/технічний стан переїхали в ProductUnits.jsx
 * (docs plan «Фізичні одиниці інструменту») — це тепер властивості кожної
 * фізичної одиниці, а не картки товару цілком.
 */
export default function ProductRentDetails({ formData, onChange }) {
    const [newCompetitorUrl, setNewCompetitorUrl] = useState('');
    const [newAdminImageUrl, setNewAdminImageUrl] = useState('');
    const [previewImage, setPreviewImage]         = useState('');

    const adminImages = useMemo(
        () => (Array.isArray(formData.adminImages) ? formData.adminImages : []),
        [formData.adminImages]
    );
    const previewIndex = useMemo(
        () => (previewImage ? adminImages.indexOf(previewImage) : -1),
        [adminImages, previewImage]
    );

    // Keyboard navigation for image preview
    useEffect(() => {
        if (!previewImage) return;
        const handler = (e) => {
            if (e.key === 'Escape') { setPreviewImage(''); return; }
            if (adminImages.length <= 1) return;
            if (e.key === 'ArrowLeft') {
                const i = previewIndex >= 0 ? previewIndex : 0;
                setPreviewImage(adminImages[(i - 1 + adminImages.length) % adminImages.length]);
            }
            if (e.key === 'ArrowRight') {
                const i = previewIndex >= 0 ? previewIndex : 0;
                setPreviewImage(adminImages[(i + 1) % adminImages.length]);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [previewImage, adminImages, previewIndex]);

    function addCompetitor() {
        let val = String(newCompetitorUrl || '').trim();
        if (!val) return;
        if (!/^https?:\/\//i.test(val)) val = `https://${val}`;
        onChange('competitorLinks', [...(formData.competitorLinks || []), val]);
        setNewCompetitorUrl('');
    }

    function removeCompetitor(idx) {
        onChange('competitorLinks', (formData.competitorLinks || []).filter((_, i) => i !== idx));
    }

    function addAdminImage() {
        let val = String(newAdminImageUrl || '').trim();
        if (!val) return;
        if (!/^https?:\/\//i.test(val)) val = `https://${val}`;
        onChange('adminImages', [...adminImages, val]);
        setNewAdminImageUrl('');
    }

    function removeAdminImage(idx) {
        onChange('adminImages', adminImages.filter((_, i) => i !== idx));
    }

    return (
        <>
            <div className="admin-section">
                <h2 className="section-title">Вага та вартість</h2>
                <div className="admin-form">
                    <div className="form-group">
                        <label>Вага загальна, кг</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.weightTotal || ''}
                            onChange={(e) => onChange('weightTotal', e.target.value)}
                            placeholder="0.0"
                        />
                    </div>
                    <div className="form-group">
                        <label>Відновлювальна вартість, ₴</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.replacementCost || ''}
                            onChange={(e) => onChange('replacementCost', e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="form-group">
                        <label>Гарантійний платіж, ₴</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.securityDeposit || ''}
                            onChange={(e) => onChange('securityDeposit', e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                </div>
            </div>

            <div className="admin-section">
                <h2 className="section-title">Додаткова інформація</h2>
                <div className="admin-form">
                    {/* Competitor links */}
                    <div className="form-group">
                        <label>Конкуренти (посилання на товари)</label>
                        <p className="section-hint product-rent-hint">
                            Додайте URL товарів конкурентів для швидкого моніторингу ціни.
                        </p>
                        <div className="admin-add-row">
                            <input
                                type="url"
                                value={newCompetitorUrl}
                                onChange={(e) => setNewCompetitorUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                                placeholder="https://site.com/product/..."
                            />
                            <button type="button" className="ds-btn ds-btn--secondary" onClick={addCompetitor}>
                                <Plus size={16} /> Додати
                            </button>
                        </div>
                        <div className="product-rent-links-list">
                            {(formData.competitorLinks || []).length > 0 ? (
                                (formData.competitorLinks || []).map((link, idx) => (
                                    <div key={`${link}-${idx}`} className="competitor-link-row">
                                        <a href={link} target="_blank" rel="noopener noreferrer" className="competitor-link-url" title={link}>
                                            {link}
                                        </a>
                                        <button type="button" className="ds-icon-btn ds-icon-btn--danger" onClick={() => removeCompetitor(idx)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <span className="empty-hint">Посилань ще немає</span>
                            )}
                        </div>
                    </div>

                    {/* Admin photos */}
                    <div className="form-group">
                        <label>Адмінські фото (тільки для адмінки)</label>
                        <p className="section-hint product-rent-hint">
                            Ці фото не показуються на клієнтській частині сайту.
                        </p>
                        <div className="admin-add-row product-rent-photo-row">
                            <input
                                type="url"
                                value={newAdminImageUrl}
                                onChange={(e) => setNewAdminImageUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAdminImage())}
                                placeholder="https://site.com/admin-photo.jpg"
                            />
                            <button type="button" className="ds-btn ds-btn--secondary" onClick={addAdminImage}>
                                <Plus size={16} /> Додати
                            </button>
                        </div>
                        <div className="admin-images-grid">
                            {adminImages.length > 0 ? (
                                adminImages.map((link, idx) => (
                                    <div key={`${link}-${idx}`} className="admin-image-card">
                                        <button
                                            type="button"
                                            className="admin-image-preview-btn"
                                            onClick={() => setPreviewImage(link)}
                                            title="Відкрити фото"
                                        >
                                            <img src={optimizeImageUrl(link, { width: 150 })} alt="" />
                                        </button>
                                        <button
                                            type="button"
                                            className="ds-icon-btn ds-icon-btn--danger admin-image-delete-btn"
                                            onClick={() => removeAdminImage(idx)}
                                            title="Видалити фото"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <span className="empty-hint">Адмінських фото ще немає</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image preview lightbox */}
            {previewImage && (
                <div className="product-rent-lightbox-overlay" onClick={() => setPreviewImage('')}>
                    <div className="product-rent-lightbox-card" onClick={(e) => e.stopPropagation()}>
                        <div className="product-rent-lightbox-head">
                            <button className="ds-icon-btn" onClick={() => setPreviewImage('')} aria-label="Закрити">
                                <X size={18} />
                            </button>
                        </div>
                        <img src={optimizeImageUrl(previewImage, { width: 1000 })} alt="Адмінське фото" className="product-rent-lightbox-img" />
                        {adminImages.length > 1 && (
                            <div className="product-rent-lightbox-nav">
                                <button
                                    type="button"
                                    className="ds-btn ds-btn--secondary"
                                    onClick={() => {
                                        const i = previewIndex >= 0 ? previewIndex : 0;
                                        setPreviewImage(adminImages[(i - 1 + adminImages.length) % adminImages.length]);
                                    }}
                                >
                                    ← Попереднє
                                </button>
                                <span className="product-rent-lightbox-counter">
                                    {Math.max(1, previewIndex + 1)} / {adminImages.length}
                                </span>
                                <button
                                    type="button"
                                    className="ds-btn ds-btn--secondary"
                                    onClick={() => {
                                        const i = previewIndex >= 0 ? previewIndex : 0;
                                        setPreviewImage(adminImages[(i + 1) % adminImages.length]);
                                    }}
                                >
                                    Наступне →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
