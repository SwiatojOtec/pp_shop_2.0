import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { transliterate } from '../../utils/transliterate';
import './Admin.css';

export default function AdminBlogEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: '',
        image: '',
        excerpt: '',
        content: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (!isNew) {
            fetchPost();
        }
    }, [id]);

    const fetchPost = async () => {
        try {
            const res = await fetch(`${API_URL}/api/blog/${id}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...data,
                    date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0]
                });
            }
        } catch (err) {
            console.error('Error fetching post:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-generate slug from title if slug is empty
        if (name === 'title' && isNew && !formData.slug) {
            const slug = transliterate(value);
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    const insertTag = (openTag, closeTag) => {
        const textarea = document.getElementById('content-editor');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newContent = before + openTag + selection + closeTag + after;
        setFormData(prev => ({ ...prev, content: newContent }));

        // Restore focus and cursor position
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + openTag.length, end + openTag.length);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = isNew ? `${API_URL}/api/blog` : `${API_URL}/api/blog/${id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                navigate('/admin/blog');
            } else {
                alert('Помилка збереження');
            }
        } catch (err) {
            console.error('Error saving post:', err);
            alert('Помилка збереження');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-product-edit">
            <div className="admin-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                <button onClick={() => navigate('/admin/blog')} className="back-btn">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="admin-title" style={{ margin: 0 }}>
                    {isNew ? 'Нова стаття' : 'Редагування статті'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="edit-form admin-form">
                <div className="form-grid">
                    <div className="form-section">
                        <h3 className="form-section-title">Основна інформація</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Заголовок</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Slug (URL адреса)</label>
                                <input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Категорія</label>
                                <input
                                    type="text"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    placeholder="Наприклад: Поради, Тренди"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Дата публікації</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>URL зображення</label>
                            <input
                                type="text"
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                required
                            />
                            {formData.image && (
                                <div style={{ marginTop: '10px' }}>
                                    <img src={formData.image} alt="Preview" style={{ maxHeight: '200px', borderRadius: '8px' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="form-section-title">Контент</h3>

                        <div className="form-group">
                            <label>Короткий опис (Excerpt)</label>
                            <textarea
                                name="excerpt"
                                value={formData.excerpt}
                                onChange={handleChange}
                                rows={3}
                                required
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Повний текст статті</label>
                            <div className="editor-toolbar" style={{ display: 'flex', gap: '5px', marginBottom: '5px', padding: '5px', background: '#f5f5f5', borderRadius: '8px 8px 0 0', border: '1px solid #ddd', borderBottom: 'none' }}>
                                <button type="button" onClick={() => insertTag('<b>', '</b>')} title="Жирний" style={{ padding: '5px', cursor: 'pointer', border: 'none', background: 'none' }}><Bold size={18} /></button>
                                <button type="button" onClick={() => insertTag('<i>', '</i>')} title="Курсив" style={{ padding: '5px', cursor: 'pointer', border: 'none', background: 'none' }}><Italic size={18} /></button>
                                <button type="button" onClick={() => insertTag('<ul>\n  <li>', '</li>\n</ul>')} title="Список" style={{ padding: '5px', cursor: 'pointer', border: 'none', background: 'none' }}><List size={18} /></button>
                                <button type="button" onClick={() => insertTag('<a href="">', '</a>')} title="Посилання" style={{ padding: '5px', cursor: 'pointer', border: 'none', background: 'none' }}><LinkIcon size={18} /></button>
                                <button type="button" onClick={() => insertTag('<img src="" alt="">', '')} title="Зображення" style={{ padding: '5px', cursor: 'pointer', border: 'none', background: 'none' }}><ImageIcon size={18} /></button>
                            </div>
                            <textarea
                                id="content-editor"
                                name="content"
                                value={formData.content}
                                onChange={handleChange}
                                rows={15}
                                required
                                style={{ width: '100%', padding: '10px', borderRadius: '0 0 8px 8px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Save size={20} />
                        {loading ? 'Збереження...' : 'Зберегти статтю'}
                    </button>
                </div>
            </form>
        </div>
    );
}
