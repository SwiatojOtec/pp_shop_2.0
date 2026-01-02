import { API_URL } from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import './Admin.css';

export default function AdminBlog() {
    const [posts, setPosts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/blog`);
            if (res.ok) {
                const data = await res.json();
                setPosts(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch posts');
                setPosts([]);
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
            setPosts([]);
        }
    };

    const filteredPosts = posts.filter(p => {
        return p.title.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleDelete = async (id) => {
        if (window.confirm('Ви впевнені, що хочете видалити цю статтю?')) {
            await fetch(`${API_URL}/api/blog/${id}`, { method: 'DELETE' });
            fetchPosts();
        }
    };

    return (
        <div className="admin-products">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Блог</h1>
                <button className="btn btn-primary" onClick={() => navigate('/admin/blog/new')}>
                    <Plus size={20} /> Додати статтю
                </button>
            </div>

            <div className="admin-filters" style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Пошук за заголовком..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    />
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Зображення</th>
                            <th>Заголовок</th>
                            <th>Категорія</th>
                            <th>Дата</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPosts.map(post => (
                            <tr key={post.id}>
                                <td><img src={post.image} alt={post.title} className="admin-table-img" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} /></td>
                                <td>{post.title}</td>
                                <td><span style={{ background: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{post.category}</span></td>
                                <td>{new Date(post.date).toLocaleDateString()}</td>
                                <td>
                                    <div className="table-actions">
                                        <button onClick={() => navigate(`/admin/blog/${post.id}`)} className="action-btn edit"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(post.id)} className="action-btn delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredPosts.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Статей не знайдено</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
