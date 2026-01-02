import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-grid">
                <div className="footer-col">
                    <h4 className="footer-title">ПАН ПАРКЕТ</h4>
                    <p>Якість, перевірена часом.</p>
                </div>
                <div className="footer-col">
                    <h4 className="footer-title">Каталог</h4>
                    <ul>
                        <li><Link to="/magazyn/parketna_doshka">Паркетна дошка</Link></li>
                        <li><Link to="/magazyn/laminat">Ламінат</Link></li>
                        <li><Link to="/magazyn/vinilova_pidloha">Вініл</Link></li>
                        <li><Link to="/magazyn">Всі товари</Link></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4 className="footer-title">Допомога клієнтам</h4>
                    <ul>
                        <li><Link to="/policy">Політика магазину</Link></li>
                        <li><Link to="/contract">Публічний договір</Link></li>
                        <li><Link to="/delivery">Оплата і доставка</Link></li>
                    </ul>
                </div>
                <div className="footer-col">
                    <h4 className="footer-title">Контакти</h4>
                    <p>вул. Жовтнева, 79, Петропавлівська Борщагівка</p>
                    <p><a href="tel:0670064044" style={{ color: 'inherit', textDecoration: 'none' }}>067 006 40 44</a></p>
                    <Link to="/contacts" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Всі контакти</Link>
                </div>
            </div>
            <div className="footer-bottom">
                <div className="container">
                    <p>&copy; 2025 PAN PARKET. All rights reserved. | <Link to="/admin" style={{ color: '#666' }}>Адмін-панель</Link></p>
                </div>
            </div>
        </footer>
    );
}
