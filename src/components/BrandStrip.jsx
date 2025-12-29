import React, { memo, useState, useEffect } from 'react';
import { API_URL } from '../apiConfig';
import './BrandStrip.css';

const BrandStrip = memo(function BrandStrip() {
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/api/brands`)
            .then(res => res.json())
            .then(data => setBrands(data))
            .catch(err => console.error('Error fetching brands:', err));
    }, []);

    // If no brands in DB, use some defaults or show nothing
    const displayBrands = brands.length > 0 ? brands : [
        { name: 'Tarkett' }, { name: 'Barlinek' }, { name: 'Quick-Step' },
        { name: 'Arteo' }, { name: 'Classen' }, { name: 'Rezult' }
    ];

    return (
        <div className="brand-strip">
            <div className="container">
                <div className="brand-track">
                    {displayBrands.concat(displayBrands).map((brand, index) => (
                        <div key={index} className="brand-item">
                            {brand.logo ? (
                                <img src={brand.logo} alt={brand.name} style={{ height: '30px', filter: 'grayscale(1) brightness(0.8)' }} />
                            ) : (
                                brand.name
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default BrandStrip;
