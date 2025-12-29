import React from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import './ConsultationBlock.css';

export default function ConsultationBlock() {
    return (
        <section className="consultation-section">
            <div className="container consultation-grid">
                <div className="consultation-content">
                    <h2 className="section-title-left">Потрібна допомога?</h2>
                    <p className="consultation-text">
                        Наші експерти допоможуть підібрати ідеальне покриття для вашого дому.
                        Замовте безкоштовну консультацію або завітайте до нашого шоуруму.
                    </p>
                    <div className="consultation-actions">
                        <a href="https://t.me/+380670064044" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Написати у Telegram</a>
                        <a href="viber://chat?number=%2B380670064044" className="btn">Написати у Viber</a>
                    </div>
                </div>
                <div className="consultation-cards">
                    <div className="info-card">
                        <Phone size={32} className="card-icon" />
                        <h3>Гаряча лінія</h3>
                        <p><a href="tel:0670064044" style={{ color: 'inherit', textDecoration: 'none' }}>067 006 40 44</a></p>
                    </div>
                    <div className="info-card dark">
                        <MessageSquare size={32} className="card-icon" />
                        <h3>Онлайн чат</h3>
                        <p>Ми на зв'язку 24/7</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
