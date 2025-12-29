import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Ruler, Truck, Hammer, ShieldCheck } from 'lucide-react';
import './FeaturesStrip.css';

const FEATURES = [
    { icon: <Ruler size={32} />, title: 'Виїзд на заміри', desc: 'За домовленістю з майстром' },
    { icon: <Truck size={32} />, title: 'Доставка', desc: 'Київ та Київська область' },
    { icon: <Hammer size={32} />, title: 'Монтажні роботи', desc: 'Професійне укладання' },
    { icon: <ShieldCheck size={32} />, title: 'Якість та сервіс', desc: 'Офіційна гарантія' },
];

const FeaturesStrip = memo(function FeaturesStrip() {
    return (
        <div className="features-strip">
            <div className="container">
                <div className="features-grid">
                    {FEATURES.map((feature, index) => (
                        <div key={index} className="feature-item">
                            <div className="feature-icon">{feature.icon}</div>
                            <div className="feature-text">
                                <div className="feature-title">{feature.title}</div>
                                <div className="feature-desc">{feature.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="features-note">
                    * Умови доставки та оплати, будь ласка, читайте на сторінці <Link to="/delivery">"Оплата та доставка"</Link>
                </div>
            </div>
        </div>
    );
});

export default FeaturesStrip;
