import Modal from './Modal';
import './admin-ui.css';

/**
 * The single confirmation-dialog entry point for the redesigned admin
 * (docs/admin-redesign/00-plan.md, rule 2 — no window.confirm anywhere).
 *
 * Props:
 *   open        – boolean
 *   onConfirm   – function called when the user confirms
 *   onCancel    – function called when the user cancels / closes
 *   title       – dialog heading (default 'Підтвердження')
 *   message     – body text
 *   confirmText – confirm button label (default 'Підтвердити')
 *   cancelText  – cancel button label (default 'Скасувати')
 *   danger      – bool — makes the confirm button red (default true)
 *   loading     – bool — disables buttons while an async action runs
 */
export default function ConfirmDialog({
    open,
    onConfirm,
    onCancel,
    title = 'Підтвердження',
    message,
    confirmText = 'Підтвердити',
    cancelText = 'Скасувати',
    danger = true,
    loading = false,
}) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            title={title}
            size="sm"
            footer={
                <div className="ds-confirm-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onCancel} disabled={loading}>
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`ds-btn ${danger ? 'ds-btn--danger' : 'ds-btn--primary'}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Зачекайте…' : confirmText}
                    </button>
                </div>
            }
        >
            {message && <p className="ds-confirm-message">{message}</p>}
        </Modal>
    );
}
