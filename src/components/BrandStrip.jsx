import React, { memo } from 'react';
import './BrandStrip.css';

const BRANDS = [
    'Tarkett', 'Barlinek', 'Quick-Step', 'Arteo', 'Classen', 'Rezult'
];

const BrandStrip = memo(function BrandStrip() {
    return (
        <div className="brand-strip">
            <div className="container">
                <div className="brand-track">
                    {BRANDS.concat(BRANDS).map((brand, index) => (
                        <div key={index} className="brand-item">
                            {brand}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default BrandStrip;
