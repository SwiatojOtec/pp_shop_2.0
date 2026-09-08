import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './admin-ui.css';

/**
 * Props:
 *   title    – page title string
 *   subtitle – (optional) subtitle / description
 *   backTo   – (optional) route string — shows a back button
 *   actions  – (optional) ReactNode — right-side buttons
 */
export default function PageHeader({ title, subtitle, backTo, actions }) {
    const navigate = useNavigate();
    return (
        <div className="ds-page-header">
            <div className="ds-page-header-text">
                {backTo && (
                    <button
                        type="button"
                        className="ds-icon-btn"
                        onClick={() => navigate(backTo)}
                        aria-label="Назад"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}
                <div className="ds-page-header-titles">
                    <h1 className="ds-page-title">{title}</h1>
                    {subtitle && <p className="ds-page-subtitle">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="ds-page-header-actions">{actions}</div>}
        </div>
    );
}
