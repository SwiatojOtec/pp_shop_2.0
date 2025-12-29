import React from 'react';
import { ArrowRight } from 'lucide-react';
import './ProjectsGallery.css';

const PROJECTS = [
    {
        id: 1,
        title: 'Апартаменти на Печерську',
        floor: 'Дуб Натуральний',
        image: 'https://images.unsplash.com/photo-1600607687940-4e2a09695d51?auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 2,
        title: 'Котедж у передмісті',
        floor: 'Ясен Білий',
        image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 3,
        title: 'Офіс IT-компанії',
        floor: 'Вініл Графіт',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
    },
];

export default function ProjectsGallery() {
    return (
        <section className="projects-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title-left">Наші реалізовані проекти</h2>
                    <button className="btn">Дивитись всі</button>
                </div>
                <div className="projects-grid">
                    {PROJECTS.map(project => (
                        <div key={project.id} className="project-card">
                            <img src={project.image} alt={project.title} className="project-img" />
                            <div className="project-info-overlay">
                                <span className="project-category">Об'єкт</span>
                                <h3 className="project-title">{project.title}</h3>
                                <p className="project-floor">Підлога: {project.floor}</p>
                                <div className="project-more">
                                    Детальніше <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
