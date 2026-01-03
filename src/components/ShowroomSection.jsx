import React from 'react';
import { MapPin, Clock, Navigation } from 'lucide-react';
import './ShowroomSection.css';

export default function ShowroomSection() {
    const address = "вулиця Жовтнева, 79, Петропавлівська Борщагівка, Київська обл. 08130";
    const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyD...&q=${encodeURIComponent(address)}`;
    // Since I don't have a key, I'll use the search embed format which is free and doesn't require a key for simple embeds
    const freeMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed&hl=uk`;

    return (
        <section className="showroom-section">
            <div className="container showroom-grid">
                <div className="showroom-visual">
                    <iframe
                        src={freeMapUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        title="Google Maps"
                        className="showroom-map"
                    ></iframe>
                    <div className="showroom-badge">Чекаємо на вас</div>
                </div>
                <div className="showroom-content">
                    <h2 className="section-title-left">Наш Шоурум</h2>
                    <p className="showroom-desc">
                        Більше 500 зразків паркету, ламінату та вінілу в одному місці.
                        Приходьте, щоб відчути текстуру дерева та підібрати ідеальний відтінок для оселі вашої мрії.
                    </p>
                    <div className="showroom-info">
                        <div className="info-item">
                            <MapPin className="info-icon" />
                            <div>
                                <h4>Адреса</h4>
                                <p>вул. Козацька, 79, Петропавлівська Борщагівка</p>
                            </div>
                        </div>
                        <div className="info-item">
                            <Clock className="info-icon" />
                            <div>
                                <h4>Графік роботи</h4>
                                <p>Пн-Пт: 10:00 - 19:00, Сб: 11:00 - 18:00</p>
                            </div>
                        </div>
                    </div>
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                    >
                        <Navigation size={18} style={{ marginRight: '10px' }} />
                        Прокласти маршрут
                    </a>
                </div>
            </div>
        </section>
    );
}
