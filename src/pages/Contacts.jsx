import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL } from '../apiConfig';
import './Contacts.css';

export default function Contacts() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await fetch(`${API_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'Дякуємо! Ваше повідомлення надіслано.' });
                setFormData({ name: '', email: '', message: '' });
            } else {
                setStatus({ type: 'error', message: data.message || 'Щось пішло не так. Спробуйте пізніше.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Помилка з\'єднання з сервером.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contacts-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <a href="/">Головна</a> / <span>Контакти</span>
                </nav>

                <h1 className="page-title">Наші Контакти</h1>

                <div className="contacts-grid">
                    <div className="contacts-info">
                        <div className="info-card">
                            <div className="info-icon"><MapPin size={32} /></div>
                            <div className="info-content">
                                <h3>Адреса Шоуруму</h3>
                                <p>вулиця Козацька, 79</p>
                                <p>Петропавлівська Борщагівка, Київська обл.</p>
                                <p>08130, Україна</p>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon"><Phone size={32} /></div>
                            <div className="info-content">
                                <h3>Телефони</h3>
                                <p><a href="tel:0670064044" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'bold' }}>067 006 40 44</a></p>
                                <div className="messenger-buttons">
                                    <a href="https://t.me/+380670064044" target="_blank" rel="noopener noreferrer" className="messenger-link">Telegram</a>
                                    <a href="viber://chat?number=%2B380670064044" className="messenger-link">Viber</a>
                                </div>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon"><Mail size={32} /></div>
                            <div className="info-content">
                                <h3>Email</h3>
                                <p>panparket.kiev@gmail.com</p>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon"><Clock size={32} /></div>
                            <div className="info-content">
                                <h3>Графік роботи</h3>
                                <p>Пн - Пт: 10:00 - 19:00</p>
                                <p>Сб: 11:00 - 18:00</p>
                                <p>Нд: Вихідний</p>
                            </div>
                        </div>
                    </div>

                    <div className="contact-form-container">
                        <h2 className="form-title">Напишіть нам</h2>
                        <form className="contact-form" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Ваше ім'я"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Ваш Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <textarea
                                    name="message"
                                    placeholder="Ваше повідомлення"
                                    rows="5"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                            </div>

                            {status.message && (
                                <div className={`form-status ${status.type}`}>
                                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    {status.message}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Надсилається...' : <><Send size={20} /> Надіслати</>}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="map-container">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2541.042247476449!2d30.3340833!3d50.4309167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40d4cb6800000001%3A0x7c7f7f7f7f7f7f7f!2z0LLRg9C70LjRhtGPINCW0L7QstGC0L3QtdCy0LAsIDc5LCDQn9C10YLRgNC-0L_QsNCy0LvRltCy0YHRjNC60LAg0JHQvtGA0YnQsNCz0ZbQstC60LAsINCa0LjRl9Cy0YHRjNC60LAg0L7QsdC7LiwgMDgxMzA!5e0!3m2!1suk!2sua!4v1700000000000!5m2!1suk!2sua&hl=uk"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}
