import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './admin-ui.css';

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Side panel with focus trap, Escape-to-close, and scroll lock.
 *
 * Props:
 *   open     – boolean
 *   onClose  – function called when backdrop, X, or Escape is used
 *   title    – string | ReactNode
 *   children – panel body
 *   footer   – (optional) ReactNode for the action buttons area
 *   width    – 'sm' | 'md' | 'lg' (default 'md')
 */
export default function Drawer({ open, onClose, title, children, footer, width = 'md' }) {
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
                return;
            }
            if (e.key !== 'Tab') return;
            const focusables = panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
            if (!focusables || focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        document.body.classList.add('ds-scroll-lock');
        const raf = requestAnimationFrame(() => panelRef.current?.focus());
        return () => {
            document.body.classList.remove('ds-scroll-lock');
            cancelAnimationFrame(raf);
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="ds-drawer-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div
                ref={panelRef}
                className={`ds-drawer-panel ds-drawer-panel--${width}`}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                tabIndex={-1}
            >
                <div className="ds-drawer-header">
                    <h3 className="ds-drawer-title">{title}</h3>
                    <button type="button" className="ds-icon-btn" onClick={onClose} aria-label="Закрити">
                        <X size={18} />
                    </button>
                </div>

                <div className="ds-drawer-body">{children}</div>

                {footer && <div className="ds-drawer-footer">{footer}</div>}
            </div>
        </div>
    );
}
