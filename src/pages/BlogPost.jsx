import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, User, Tag } from 'lucide-react';
import { API_URL } from '../apiConfig';
import './Blog.css';

export default function BlogPost() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/blog/${slug}`)
            .then(res => res.json())
            .then(data => {
                setPost(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching blog post:', err);
                setLoading(false);
            });
    }, [slug]);

    if (loading) {
        return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Завантаження...</div>;
    }

    if (!post) {
        return (
            <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
                <h2>Статтю не знайдено</h2>
                <Link to="/blog" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
                    Повернутися до блогу
                </Link>
            </div>
        );
    }

    return (
        <div className="blog-post-page">
            <div className="blog-post-hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${post.image})` }}>
                <div className="container">
                    <span className="blog-post-category">{post.category}</span>
                    <h1 className="blog-post-title">{post.title}</h1>
                    <div className="blog-post-meta">
                        <span><Calendar size={16} /> {new Date(post.date).toLocaleDateString()}</span>
                        <span><User size={16} /> {post.author || 'PAN PARKET'}</span>
                    </div>
                </div>
            </div>

            <div className="container blog-post-content-container">
                <Link to="/blog" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '30px', color: '#666', textDecoration: 'none' }}>
                    <ChevronLeft size={20} /> Всі статті
                </Link>

                <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
        </div>
    );
}
