import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { blogApi } from '../../services/api';
import { transliterate } from '../../utils/transliterate';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import './Admin.css';
import './AdminBlogEdit.css';

export default function AdminBlogEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Auto-generate slug from title
    useEffect(() => {
        if (isNew && formData.title) {
            setFormData(prev => ({
                ...prev,
                slug: transliterate(formData.title)
            }));
        }
    }, [formData.title, isNew]);

    const fetchPost = async () => {
        try {
            const data = await blogApi.get(id);
            setFormData({
                ...data,
                date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } catch (err) {
            console.error('Error fetching post:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContentChange = (value) => {
        setFormData(prev => ({ ...prev, content: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isNew) {
                await blogApi.create(formData);
            } else {
                await blogApi.update(id, formData);
            }
            navigate('/admin/blog');
        } catch (err) {
            console.error('Error saving post:', err);
            showToast(err.message || 'Помилка збереження', 'warning');
        } finally {
            setLoading(false);
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet',
        'link', 'image'
    ];

    return (
        <div className="admin-product-edit">
            <PageHeader
                title={isNew ? 'Нова стаття' : 'Редагування статті'}
                backTo="/admin/blog"
                actions={(
                    <button type="submit" form="blog-edit-form" className="ds-btn ds-btn--primary" disabled={loading}>
                        <Save size={16} /> {loading ? 'Збереження...' : 'Зберегти'}
                    </button>
                )}
            />

            <form id="blog-edit-form" onSubmit={handleSubmit} className="edit-form admin-form">
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
                                <div className="blog-edit-image-preview">
                                    <img src={formData.image} alt="Preview" />
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
                                className="blog-edit-excerpt"
                            />
                        </div>

                        <div className="form-group">
                            <label>Повний текст статті</label>
                            <div className="blog-edit-quill-wrap">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.content}
                                    onChange={handleContentChange}
                                    modules={modules}
                                    formats={formats}
                                    className="blog-edit-quill-editor"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
}
