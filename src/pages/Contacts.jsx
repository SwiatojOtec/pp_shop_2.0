import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { contactApi } from '../services/api';
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
            await contactApi.send(formData);
            setStatus({ type: 'success', message: 'Дякуємо! Ваше повідомлення надіслано.' });
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message || 'Помилка з\'єднання з сервером.' });
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
                                <p>вулиця Холодноярська, 2а</p>
                                <p>Київ, Україна</p>
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
                        src={`https://maps.google.com/maps?q=${encodeURIComponent('вулиця Холодноярська, 2а, Київ')}&t=&z=15&ie=UTF8&iwloc=&output=embed&hl=uk`}
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
