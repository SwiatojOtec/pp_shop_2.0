import AdminModal from './AdminModal';
import './AdminComponents.css';

/**
 * Replacement for window.confirm — a styled confirmation dialog.
 *
 * Props:
 *   open        – boolean
 *   onConfirm   – function called when user confirms
 *   onCancel    – function called when user cancels / closes
 *   title       – dialog heading (default "Підтвердження")
 *   message     – body text
 *   confirmText – label for confirm button (default "Підтвердити")
 *   cancelText  – label for cancel button (default "Скасувати")
 *   danger      – bool — makes confirm button red (default true)
 *   loading     – bool — disables buttons while async action runs
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
        <AdminModal
            open={open}
            onClose={onCancel}
            title={title}
            size="sm"
            footer={
                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={danger ? 'btn-danger' : 'btn-primary'}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Зачекайте...' : confirmText}
                    </button>
                </div>
            }
        >
            {message && <p className="confirm-dialog-message">{message}</p>}
        </AdminModal>
    );
}
