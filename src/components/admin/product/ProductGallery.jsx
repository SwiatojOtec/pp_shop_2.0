import { useState } from 'react';
import { Image as ImageIcon, Trash2, Plus, X } from 'lucide-react';

/**
 * Product gallery: main image + additional images.
 */
export default function ProductGallery({ mainImage, images = [], onMainChange, onImagesChange }) {
    const [newUrl, setNewUrl] = useState('');

    function addImage() {
        if (!newUrl.trim()) return;
        onImagesChange([...images, newUrl.trim()]);
        setNewUrl('');
    }

    function removeImage(index) {
        onImagesChange(images.filter((_, i) => i !== index));
    }

    return (
        <div className="admin-section">
            <h2 className="section-title">Галерея зображень</h2>

            {/* Main image */}
            <div className="product-gallery-main">
                <label className="form-label">Головне зображення (Thumbnail)</label>
                <div className="image-upload-area">
                    {mainImage ? (
                        <div className="product-gallery-main-preview">
                            <img src={mainImage} alt="Preview" />
                            <button
                                type="button"
                                onClick={() => onMainChange('')}
                                className="image-remove-btn"
                                title="Видалити зображення"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="image-placeholder">
                            <ImageIcon size={32} className="product-gallery-placeholder-icon" />
                            <p className="product-gallery-placeholder-text">Вставте посилання нижче</p>
                        </div>
                    )}
                    <input
                        type="text"
                        value={mainImage}
                        onChange={(e) => onMainChange(e.target.value)}
                        placeholder="URL головного зображення"
                        className="product-gallery-main-input"
                    />
                </div>
            </div>

            {/* Gallery */}
            <div>
                <label className="form-label">Додаткові зображення</label>
                <div className="admin-images-grid">
                    {images.map((img, i) => (
                        <div key={i} className="admin-image-card">
                            <div className="admin-image-preview-btn">
                                <img src={img} alt={`Gallery ${i}`} />
                            </div>
                            <button
                                type="button"
                                className="ds-icon-btn ds-icon-btn--danger admin-image-delete-btn"
                                onClick={() => removeImage(i)}
                                title="Видалити"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="product-gallery-add-row">
                    <input
                        type="text"
                        placeholder="Вставте URL..."
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                    />
                    <button type="button" onClick={addImage} className="ds-btn ds-btn--secondary">
                        <Plus size={16} /> Додати в галерею
                    </button>
                </div>
            </div>
        </div>
    );
}
