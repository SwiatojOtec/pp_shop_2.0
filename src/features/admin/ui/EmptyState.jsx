import './admin-ui.css';

/**
 * Props:
 *   icon        – (optional) lucide-react icon component
 *   title       – heading text
 *   description – (optional) supporting text
 *   action      – (optional) ReactNode, e.g. a button
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="ds-empty">
            {Icon && <Icon size={32} className="ds-empty-icon" />}
            {title && <p className="ds-empty-title">{title}</p>}
            {description && <p className="ds-empty-desc">{description}</p>}
            {action && <div className="ds-empty-action">{action}</div>}
        </div>
    );
}
