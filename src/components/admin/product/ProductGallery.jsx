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
            <div style={{ marginBottom: '30px' }}>
                <label className="form-label">Головне зображення (Thumbnail)</label>
                <div className="image-upload-area">
                    {mainImage ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img
                                src={mainImage}
                                alt="Preview"
                                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                            />
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
                            <ImageIcon size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                            <p style={{ fontSize: '0.8rem', margin: 0 }}>Вставте посилання нижче</p>
                        </div>
                    )}
                    <input
                        type="text"
                        value={mainImage}
                        onChange={(e) => onMainChange(e.target.value)}
                        placeholder="URL головного зображення"
                        style={{ width: '100%', marginTop: '15px' }}
                    />
                </div>
            </div>

            {/* Gallery */}
            <div>
                <label className="form-label">Додаткові зображення</label>
                <div className="image-gallery-grid">
                    {images.map((img, i) => (
                        <div key={i} className="gallery-item">
                            <img src={img} alt={`Gallery ${i}`} />
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeImage(i)}
                                title="Видалити"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <div className="add-image-form">
                        <input
                            type="text"
                            placeholder="Вставте URL..."
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                        />
                        <button type="button" onClick={addImage} className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}>
                            <Plus size={16} /> Додати в галерею
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
