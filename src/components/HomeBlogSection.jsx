import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { API_URL } from '../apiConfig';
import './HomeBlogSection.css';

const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function HomeBlogSection() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/blog`)
            .then(r => r.ok ? r.json() : [])
            .then(data => { setPosts(Array.isArray(data) ? data.slice(0, 3) : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading || posts.length === 0) return null;

    const [featured, ...rest] = posts;

    return (
        <section className="home-blog">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title-left">Блог та поради</h2>
                    <Link to="/blog" className="btn">Всі статті</Link>
                </div>

                <div className="home-blog__grid">
                    {/* Featured large card */}
                    <Link to={`/blog/${featured.slug}`} className="home-blog__featured">
                        <div className="home-blog__img-wrap">
                            {featured.image
                                ? <img src={featured.image} alt={featured.title} className="home-blog__img" />
                                : <div className="home-blog__img-placeholder" />
                            }
                        </div>
                        <div className="home-blog__overlay">
                            <span className="home-blog__tag">Стаття</span>
                            <h3 className="home-blog__title">{featured.title}</h3>
                            {featured.excerpt && <p className="home-blog__excerpt">{featured.excerpt}</p>}
                            <span className="home-blog__date">{fmtDate(featured.createdAt)}</span>
                            <span className="home-blog__more">Читати далі <ArrowRight size={14} /></span>
                        </div>
                    </Link>

                    {/* Smaller cards */}
                    {rest.length > 0 && (
                        <div className="home-blog__aside">
                            {rest.map(post => (
                                <Link to={`/blog/${post.slug}`} key={post.id} className="home-blog__card">
                                    <div className="home-blog__card-img">
                                        {post.image
                                            ? <img src={post.image} alt={post.title} />
                                            : <div className="home-blog__img-placeholder" />
                                        }
                                    </div>
                                    <div className="home-blog__card-body">
                                        <span className="home-blog__tag">Стаття</span>
                                        <h4 className="home-blog__card-title">{post.title}</h4>
                                        <span className="home-blog__date">{fmtDate(post.createdAt)}</span>
                                        <span className="home-blog__more">Читати <ArrowRight size={12} /></span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
