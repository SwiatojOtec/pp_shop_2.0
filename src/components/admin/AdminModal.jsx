import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './AdminComponents.css';

/**
 * Reusable admin modal.
 *
 * Props:
 *   open     – boolean
 *   onClose  – function called when backdrop or X is clicked
 *   title    – string | ReactNode
 *   children – modal body
 *   footer   – (optional) ReactNode for action buttons area
 *   size     – 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 */
export default function AdminModal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}) {
    const dialogRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // Trap body scroll
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="admin-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                ref={dialogRef}
                className={`admin-modal-card admin-modal-${size}`}
                role="dialog"
                aria-modal="true"
            >
                <div className="admin-modal-header">
                    <h3 className="admin-modal-title">{title}</h3>
                    <button
                        type="button"
                        className="admin-modal-close"
                        onClick={onClose}
                        aria-label="Закрити"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="admin-modal-body">{children}</div>

                {footer && <div className="admin-modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
