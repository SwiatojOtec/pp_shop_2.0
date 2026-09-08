import { useEffect } from 'react';
import { X } from 'lucide-react';
import './admin-ui.css';

/**
 * Props:
 *   open     – boolean
 *   onClose  – function called when backdrop, X, or Escape is used
 *   title    – string | ReactNode
 *   children – modal body
 *   footer   – (optional) ReactNode for the action buttons area
 *   size     – 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        document.body.classList.add('ds-scroll-lock');
        return () => document.body.classList.remove('ds-scroll-lock');
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="ds-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                className={`ds-modal-card ds-modal-card--${size}`}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
            >
                <div className="ds-modal-header">
                    <h3 className="ds-modal-title">{title}</h3>
                    <button type="button" className="ds-icon-btn" onClick={onClose} aria-label="Закрити">
                        <X size={18} />
                    </button>
                </div>

                <div className="ds-modal-body">{children}</div>

                {footer && <div className="ds-modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
