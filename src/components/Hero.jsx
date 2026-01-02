import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';
import heroFlooring from '../assets/hero_flooring.png';
import heroWindowsills from '../assets/hero_windowsills.png';
import heroVinyl from '../assets/hero_vinyl.png';
import heroLaminate from '../assets/hero_laminate.png';

const slides = [
    {
        titleOutline: 'СУЧАСНИЙ',
        titleMain: 'ПАРКЕТ',
        subtitle: "Ідеальні лінії для вашого інтер'єру. Якість, що відчувається в кожному кроці.",
        image: heroFlooring,
        link: '/magazyn/parketna_doshka'
    },
    {
        titleOutline: 'ЕЛЕГАНТНІ',
        titleMain: 'ПОДОКОННИКИ',
        subtitle: 'Стильне завершення вашого вікна. Натуральні матеріали та бездоганна обробка.',
        image: heroWindowsills,
        link: '/magazyn/pidvikonnya'
    },
    {
        titleOutline: 'НАДІЙНИЙ',
        titleMain: 'ВІНІЛ',
        subtitle: 'Сучасне решение для будь-яких приміщень. 100% водостійкість та довговічність.',
        image: heroVinyl,
        link: '/magazyn/vinilova_pidloha'
    },
    {
        titleOutline: 'ЯКІСНИЙ',
        titleMain: 'ЛАМІНАТ',
        subtitle: 'Широкий вибір декорів та текстур. Створіть затишок у вашому домі за лічені години.',
        image: heroLaminate,
        link: '/magazyn/laminat'
    }
];

export default function Hero() {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentSlide((prev) => (prev + 1) % slides.length);
                setIsAnimating(false);
            }, 500);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const slide = slides[currentSlide];

    return (
        <section className="hero">
            <div className="container hero-grid">
                <div className={`hero-content ${isAnimating ? 'fade-out' : 'fade-in'}`}>
                    <h1 className="hero-title">
                        <span className="outline-text">{slide.titleOutline}</span><br />
                        {slide.titleMain}
                    </h1>
                    <p className="hero-subtitle">
                        {slide.subtitle}
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={() => navigate(slide.link)}>КАТАЛОГ</button>
                        <button className="btn" onClick={() => navigate('/contacts')}>КОНТАКТИ</button>
                    </div>
                </div>
                <div className={`hero-visual ${isAnimating ? 'fade-out' : 'fade-in'}`}>
                    <div className="square-decoration"></div>
                    <img src={slide.image} alt={slide.titleMain} className="hero-image" />
                    <div className="slide-indicators">
                        {slides.map((_, index) => (
                            <div
                                key={index}
                                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(index)}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
