import { Building2 } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

/**
 * Юрособи-орендодавці are still a hardcoded list in src/constants/sellers.js
 * (docs/admin-redesign/00-plan.md, "Що прототип не покриває" — turning that
 * into a real DB-backed reference is separate follow-up work). This tab is a
 * placeholder so the target navigation is visible without pretending the
 * screen exists yet.
 */
export default function CompanyLegalEntitiesPlaceholder() {
    return (
        <EmptyState
            icon={Building2}
            title="Юрособи ще не винесені в окремий довідник"
            description="Наразі орендодавці зберігаються в src/constants/sellers.js. Перенесення у БД — окрема задача."
        />
    );
}
