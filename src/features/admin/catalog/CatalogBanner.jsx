import { Info } from 'lucide-react';
import './catalog.css';

/** Persistent reminder on every /admin/catalog tab (docs/admin-redesign/03-screens.md, «Каталог»). */
export default function CatalogBanner() {
    return (
        <div className="catalog-banner">
            <Info size={15} />
            <span>Каталог відповідає за <b>картку</b> товару, склад — за <b>кількість</b>.</span>
        </div>
    );
}
