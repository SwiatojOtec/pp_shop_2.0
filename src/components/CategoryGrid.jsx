import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './CategoryGrid.css';
import imgParquet from '../assets/category_parquet.png';
import imgLaminate from '../assets/category_laminate.png';

const imgDoors = 'https://images.unsplash.com/photo-1506377247377-2a5b3b0ca7df?auto=format&fit=crop&w=800&q=80';
const imgVinyl = 'https://images.unsplash.com/photo-1581850518616-bcb8186c3c30?auto=format&fit=crop&w=800&q=80';

const CATEGORIES = [
    { id: 1, name: 'Паркетна дошка', image: imgParquet, link: '/shop?category=parketna-doshka' },
    { id: 2, name: 'Ламінат', image: imgLaminate, link: '/shop?category=laminat' },
    { id: 3, name: 'Двері', image: imgDoors, link: '/shop?category=dveri' },
    { id: 4, name: 'Вініл', image: imgVinyl, link: '/shop?category=vinil' },
];

export default function CategoryGrid() {
    return (
        <section className="category-section">
            <div className="container">
                <h2 className="section-title-left">Популярні розділи</h2>
                <div className="category-grid">
                    {CATEGORIES.map(cat => (
                        <Link key={cat.id} to={cat.link} className="category-card">
                            <img src={cat.image} alt={cat.name} className="category-img" />
                            <div className="category-overlay">
                                <h3 className="category-name">{cat.name}</h3>
                                <span className="category-arrow"><ArrowRight size={24} /></span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
