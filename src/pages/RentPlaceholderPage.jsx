import React from 'react';
import { Link, useParams } from 'react-router-dom';
import './Shop.css';
import './RentPlaceholderPage.css';

const PAGE_CONTENT = {
    'lisa-ryshtuvalni': {
        title: 'Ліса риштувальні',
        subtitle: 'Рамні риштування для фасадних та зовнішніх робіт',
        image: 'https://i.ibb.co/5xndyJ0t/kreslenya-lisa.png',
        price: 'Від 2,5грн за м2 за сутки!',
        description:
            'Надаємо риштування в оренду для фасадних, монтажних, оздоблювальних та ремонтних робіт. Допоможемо підібрати комплект під ваш обʼєкт за висотою, довжиною фасаду та умовами майданчика.',
        sku: 'RSH-FRAME-01',
        availability: 'В наявності',
        phone: '067 006 40 44',
        features: [
            ['Матеріал', 'Гарячеоцинкована сталь'],
            ['Висота рами', '2 / 3 / 4 м'],
            ['Ширина секції', '1,0 м / 1,5 м'],
            ['Допустиме навантаження', 'до 200 кг/м²'],
            ['Товщина труби стійки', '42 x 2 мм'],
            ['Товщина труби поперечини', '32 x 2 мм'],
            ['Тип настилу', 'Деревʼяний / металевий (в комплекті)'],
            ['Стандарт', 'ДСТУ EN 12811-1']
        ],
        faq: [
            'Чи потрібна застава?',
            'Як швидко привезете?',
            'Які документи потрібні для оренди?'
        ],
        terms: [
            'Орендарі вносять гарантійний платіж за орендоване обладнання, розмір якого залежить від виду інструменту (обладнання) та реєстрації місця проживання.',
            '1) Оренда для Юридичних осіб при умові підписання Договору в м.Києві або Київській обл. 10 % від відновлювальної вартості інструменту (обладнання) вказанної в протоколі до Договору оренди.',
            '2) Оренда для ФОП 1-3 групи при умові підписання Договору в м.Києві або Київській обл. 15 % від відновлювальної вартості інструменту (обладнання) вказанної в протоколі до Договору оренди.',
            '3) Оренда для Фізичних осіб при умові підписання Договору в м.Києві або Київській обл. 20 % від відновлювальної вартості інструменту (обладнання) вказанної в протоколі до Договору оренди.',
            '4) Для Орендарів з реєстрацією в інших областях України або в разі відсутності документів - 100 % від відновлювальної вартості інструменту (обладнання) згідно відновної вартості вказанної в протоколі до Договору оренди.'
        ]
    },
    opalubka: {
        title: 'Опалубка',
        subtitle: 'Сторінка в підготовці',
        description:
            'Найближчим часом тут зʼявиться повний опис оренди опалубки, комплектацій та умов співпраці.',
        callToAction: 'Для консультації вже зараз телефонуйте: +38 (067) 006-40-44'
    }
};

export default function RentPlaceholderPage({ pageKey = null }) {
    const { page } = useParams();
    const resolvedPageKey = pageKey || page;
    const content = PAGE_CONTENT[resolvedPageKey] || {
        title: 'Оренда',
        description: 'Сторінка в розробці.'
    };

    return (
        <div className="shop-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <Link to="/">Головна</Link> / <Link to="/orenda">Оренда інструменту</Link> / <span>{content.title}</span>
                </nav>

                <div className="shop-header">
                    <h1 className="shop-title">
                        {content.title}
                    </h1>
                    <div className="shop-controls">
                        <span className="product-count">Оренда будівельного обладнання</span>
                    </div>
                </div>

                <div className="rent-placeholder-layout">
                    <section className="rent-lp-top">
                        {content.image && (
                            <div className="rent-lp-gallery">
                                <img src={content.image} alt={content.title} className="rent-lp-main-image" />
                            </div>
                        )}

                        <div className="rent-lp-panel">
                            <div className="rent-lp-meta">
                                <span className="rent-lp-badge">{content.availability || 'В наявності'}</span>
                                <span className="rent-lp-sku">Арт: {content.sku || 'RSH-FRAME-01'}</span>
                            </div>
                            <h2 className="rent-lp-name">{content.title}</h2>
                            <p className="rent-lp-subtitle">{content.subtitle}</p>
                            <p className="rent-lp-price">{content.price}</p>
                            <p className="rent-lp-desc">{content.description}</p>

                            <div className="rent-lp-actions">
                                <a href={`tel:${(content.phone || '0670064044').replace(/\s+/g, '')}`} className="btn btn-primary">
                                    Залишити заявку
                                </a>
                                <a href={`tel:${(content.phone || '0670064044').replace(/\s+/g, '')}`} className="btn btn-secondary">
                                    Зателефонувати
                                </a>
                            </div>

                            <div className="rent-lp-trust">
                                <span>Доставка по Україні</span>
                                <span>Гарантія якості</span>
                                <span>Від 7 днів оренди</span>
                            </div>
                        </div>
                    </section>

                    <section className="rent-lp-bottom">
                        <div className="rent-lp-card">
                            <h3>Характеристики</h3>
                            <div className="rent-lp-table">
                                {(content.features || []).map(([k, v], idx) => (
                                    <div className="rent-lp-row" key={`f-${idx}`}>
                                        <span>{k}</span>
                                        <strong>{v}</strong>
                                    </div>
                                ))}
                            </div>
                            {Array.isArray(content.terms) && content.terms.length > 0 && (
                                <div className="rent-lp-terms">
                                    <h4>Умови гарантійного платежу</h4>
                                    {content.terms.map((term, index) => (
                                        <p key={`term-${index}`}>{term}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rent-lp-card">
                            <h3>Часті запитання</h3>
                            <div className="rent-lp-faq">
                                {(content.faq || []).map((q, idx) => (
                                    <details key={`q-${idx}`}>
                                        <summary>{q}</summary>
                                        <p>
                                            Зателефонуйте за номером {content.phone || '067 006 40 44'} - менеджер
                                            швидко зорієнтує по комплекту, вартості та строках.
                                        </p>
                                    </details>
                                ))}
                            </div>
                            <div className="rent-lp-cta-note">
                                Потрібна консультація по комплектації та логістиці? Телефонуйте: {content.phone || '067 006 40 44'}.
                            </div>
                            <Link to="/orenda" className="btn btn-secondary rent-lp-back-btn">
                                Повернутись до каталогу
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

