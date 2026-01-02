import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../apiConfig';
import './Blog.css';

export default function Blog() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/blog`)
            .then(res => res.json())
            .then(data => {
                setPosts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching blog posts:', err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="blog-page">
            <div className="blog-hero">
                <div className="container">
                    <h1 className="blog-title">Блог PAN PARKET</h1>
                    <p className="blog-subtitle">Корисні поради, тренди та новини зі світу підлогових покриттів</p>
                </div>
            </div>

            <div className="container">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>Завантаження...</div>
                ) : (
                    <div className="blog-grid">
                        {posts.map((post) => (
                            <article key={post.id} className="blog-card">
                                <div className="blog-card-image">
                                    <img src={post.image} alt={post.title} />
                                    <span className="blog-card-category">{post.category}</span>
                                </div>
                                <div className="blog-card-content">
                                    <span className="blog-card-date">{new Date(post.date).toLocaleDateString()}</span>
                                    <h2 className="blog-card-title">{post.title}</h2>
                                    <p className="blog-card-excerpt">{post.excerpt}</p>
                                    <Link to={`/blog/${post.slug}`} className="blog-card-more">Читати далі</Link>
                                </div>
                            </article>
                        ))}
                        {posts.length === 0 && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px' }}>
                                Поки що немає статей
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
