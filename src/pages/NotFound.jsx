import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="not-found">
            <div className="not-found__inner">
                <div className="not-found__code">
                    <span>4</span>
                    <span className="not-found__zero">0</span>
                    <span>4</span>
                </div>

                <h1 className="not-found__title">Сторінку не знайдено</h1>
                <p className="not-found__desc">
                    Схоже, ця сторінка переїхала або ніколи не існувала.<br />
                    Але у нас є багато іншого!
                </p>

                <div className="not-found__actions">
                    <Link to="/" className="not-found__btn not-found__btn--primary">
                        На головну
                    </Link>
                    <Link to="/magazyn" className="not-found__btn not-found__btn--outline">
                        Магазин
                    </Link>
                    <button onClick={() => navigate(-1)} className="not-found__btn not-found__btn--ghost">
                        ← Назад
                    </button>
                </div>

                <div className="not-found__links">
                    <span>Популярні розділи:</span>
                    <Link to="/magazyn">Паркет</Link>
                    <Link to="/orenda">Оренда</Link>
                    <Link to="/blog">Блог</Link>
                    <Link to="/contacts">Контакти</Link>
                </div>
            </div>
        </div>
    );
}
