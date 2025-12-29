import React from 'react';
import Hero from '../components/Hero';
import BrandStrip from '../components/BrandStrip';
import FeaturesStrip from '../components/FeaturesStrip';
import CategoryGrid from '../components/CategoryGrid';
import ProductGrid from '../components/ProductGrid';
import ProjectsGallery from '../components/ProjectsGallery';
import ShowroomSection from '../components/ShowroomSection';
import ConsultationBlock from '../components/ConsultationBlock';

export default function Home() {
    return (
        <>
            <Hero />
            <BrandStrip />
            <FeaturesStrip />
            <CategoryGrid />
            <ProductGrid />
            <ProjectsGallery />
            <ShowroomSection />
            <ConsultationBlock />
        </>
    );
}
