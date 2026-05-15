import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './AdminComponents.css';

/**
 * Consistent page header for admin pages.
 *
 * Props:
 *   title    – page title string
 *   subtitle – (optional) subtitle / description
 *   backTo   – (optional) route string — shows back button
 *   actions  – (optional) ReactNode — right-side buttons
 */
export default function AdminPageHeader({ title, subtitle, backTo, actions }) {
    const navigate = useNavigate();
    return (
        <div className="admin-page-header">
            <div className="admin-page-header-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {backTo && (
                    <button
                        type="button"
                        className="back-btn"
                        onClick={() => navigate(backTo)}
                        aria-label="Назад"
                    >
                        <ChevronLeft size={22} />
                    </button>
                )}
                <div>
                    <h1 className="admin-page-title">{title}</h1>
                    {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="admin-page-header-actions">{actions}</div>}
        </div>
    );
}
