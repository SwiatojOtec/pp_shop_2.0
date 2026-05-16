import { Link } from 'react-router-dom';
import { getCategorySlug } from '../utils/categoryMapping';
import { formatRentCatalogPriceCaption } from '../utils/rentPricing';

function productHref(p, isRent) {
    if (isRent) return `/orenda/${p.slug}`;
    const cat = p.category || '';
    return `/magazyn/${getCategorySlug(cat)}/${p.slug}`;
}

function priceLine(p, isRent) {
    if (isRent) {
        return formatRentCatalogPriceCaption({
            price: p.price,
            rentPriceTiers: p.rentPriceTiers,
        });
    }
    if (p.price != null && p.price !== '') return `${p.price} ₴ / ${p.unit || 'м²'}`;
    return '—';
}

/**
 * Два горизонтальні ряди: з тієї ж категорії (API) та нещодавно переглядали (localStorage).
 */
export default function ProductDetailRecoRails({ isRent, sameCategory, recent }) {
    const hasSame = Array.isArray(sameCategory) && sameCategory.length > 0;
    const hasRecent = Array.isArray(recent) && recent.length > 0;
    if (!hasSame && !hasRecent) return null;

    return (
        <section className="product-reco-rails" aria-label="Рекомендовані товари">
            {hasSame && (
                <div className="product-reco-block">
                    <h2 className="product-reco-title">З цієї категорії</h2>
                    <div className="product-reco-scroll">
                        {sameCategory.map((p) => (
                            <Link
                                key={p.id}
                                to={productHref(p, isRent)}
                                className="product-reco-card"
                            >
                                <div className="product-reco-card-img-wrap">
                                    {p.image ? (
                                        <img src={p.image} alt="" loading="lazy" />
                                    ) : (
                                        <div className="product-reco-card-img-placeholder" />
                                    )}
                                </div>
                                <div className="product-reco-card-body">
                                    <div className="product-reco-card-name">{p.name}</div>
                                    <div className="product-reco-card-price">{priceLine(p, isRent)}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {hasRecent && (
                <div className="product-reco-block">
                    <h2 className="product-reco-title">Нещодавно переглядали</h2>
                    <div className="product-reco-scroll">
                        {recent.map((p) => (
                            <Link
                                key={p.id}
                                to={productHref(p, isRent)}
                                className="product-reco-card"
                            >
                                <div className="product-reco-card-img-wrap">
                                    {p.image ? (
                                        <img src={p.image} alt="" loading="lazy" />
                                    ) : (
                                        <div className="product-reco-card-img-placeholder" />
                                    )}
                                </div>
                                <div className="product-reco-card-body">
                                    <div className="product-reco-card-name">{p.name}</div>
                                    <div className="product-reco-card-price">{priceLine(p, isRent)}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
