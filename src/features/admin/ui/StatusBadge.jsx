import { getStatusMeta } from '../model/status';
import './admin-ui.css';

/**
 * Reads its label and color from the single status source
 * (src/features/admin/model/status.js) instead of a local map.
 *
 * Props:
 *   domain – 'order' | 'rental' | 'stock'
 *   status – status key within that domain
 *   label  – (optional) override label, used together with `tone` for
 *            ad-hoc badges that don't belong to a status domain
 *   tone   – (optional) override tone: 'success' | 'warning' | 'danger' |
 *            'info' | 'neutral' | 'accent'
 */
export default function StatusBadge({ domain, status, label, tone }) {
    const meta = domain ? getStatusMeta(domain, status) : { label: label ?? status, tone: tone ?? 'neutral' };
    return <span className={`ds-badge ds-badge--${meta.tone}`}>{meta.label}</span>;
}
