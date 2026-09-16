import { useMemo, useState } from 'react';
import {
    FileText, ClipboardList, Undo2, ScrollText,
    Download, X, RefreshCw, ChevronDown, Loader2,
} from 'lucide-react';
import ConfirmDialog from '../../../admin/ui/ConfirmDialog';
import { isDealAtOrPastStep } from '../../../admin/model/dealStatus';

/* Order they actually occur in a deal (docs/admin-redesign/03-screens.md, «Угода»). */
const DOC_KINDS = [
    { type: 'invoice', label: 'Рахунок', icon: FileText, rentOnly: false },
    { type: 'deposit_invoice', label: 'Рахунок на заставу', icon: FileText, rentOnly: true },
    { type: 'rental_contract', label: 'Договір оренди', icon: ScrollText, rentOnly: true },
    { type: 'rental_protocol', label: 'Протокол (Додаток №1)', icon: FileText, rentOnly: true },
    { type: 'rental_application', label: 'Заявка оренди', icon: ClipboardList, rentOnly: true },
    { type: 'rental_return_act', label: 'Акт повернення-огляду', icon: Undo2, rentOnly: true, afterStep: 'issued' },
];

/** Older документи of the same kind are archived under a toggle instead of piling up. */
function groupDocumentsByType(documents) {
    const groups = new Map();
    for (const doc of documents) {
        const key = doc.type || 'other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(doc);
    }
    for (const list of groups.values()) {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return groups;
}

export default function DocumentsPanel({
    draft,
    hasRent,
    dealStatus,
    documents,
    invoiceLoading,
    depositInvoiceLoading,
    converting,
    returnActLoading,
    contractLoading,
    contractSaving,
    protocolLoading,
    deletingDocId,
    formatDocDateTime,
    onDownloadInvoice,
    onDownloadDepositInvoice,
    onGenerateRentalDocument,
    onGenerateReturnActDocument,
    onCreateRentalContract,
    onCreateRentalProtocol,
    onDownloadStoredDocument,
    onDeleteDocument,
}) {
    const [expanded, setExpanded] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const groups = useMemo(() => groupDocumentsByType(documents), [documents]);

    const anyBusy = invoiceLoading || depositInvoiceLoading || converting
        || returnActLoading || contractLoading || contractSaving || protocolLoading;

    const config = {
        invoice: {
            onGenerate: onDownloadInvoice,
            busy: invoiceLoading,
            disabled: anyBusy || !(draft.items || []).length,
        },
        deposit_invoice: { onGenerate: onDownloadDepositInvoice, busy: depositInvoiceLoading, disabled: anyBusy },
        rental_application: { onGenerate: onGenerateRentalDocument, busy: converting, disabled: anyBusy },
        rental_return_act: { onGenerate: onGenerateReturnActDocument, busy: returnActLoading, disabled: anyBusy },
        rental_contract: {
            onGenerate: onCreateRentalContract,
            busy: contractLoading || contractSaving,
            disabled: anyBusy,
        },
        rental_protocol: { onGenerate: onCreateRentalProtocol, busy: protocolLoading, disabled: anyBusy },
    };

    const kinds = DOC_KINDS.filter((kind) => hasRent || !kind.rentOnly);
    const isDelivery = draft?.deliveryMethod === 'delivery';
    const otherDocs = groups.get('other') || [];

    return (
        <div className="ds-card deal-card deal-card--docs">
            <div className="ds-card-h"><h2>Документи</h2></div>

            <ul className="doc-kinds">
                {kinds.map((kind) => {
                    const { type, label } = kind;
                    const versions = groups.get(type) || [];
                    const [latest] = versions;
                    const { onGenerate, busy, disabled } = config[type];
                    const isOpen = !!expanded[type];
                    const hasBasis = !kind.afterStep || isDealAtOrPastStep(dealStatus, hasRent, kind.afterStep, isDelivery);

                    return (
                        <li key={type} className={`doc-kind${latest ? ' doc-kind--ready' : ''}`}>
                            <div className="doc-kind__row">
                                <kind.icon size={16} className="doc-kind__icon" />
                                <div className="doc-kind__body">
                                    <span className="doc-kind__label">{label}</span>
                                    <span className="doc-kind__sub">
                                        {!hasBasis
                                            ? 'доступний після видачі'
                                            : latest ? formatDocDateTime(latest.createdAt) : 'ще не сформовано'}
                                    </span>
                                </div>

                                <div className="doc-kind__actions">
                                    {latest && (
                                        <button
                                            type="button"
                                            className="doc-icon-btn"
                                            onClick={() => onDownloadStoredDocument(latest)}
                                            title="Завантажити останню версію"
                                        >
                                            <Download size={15} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={latest ? 'doc-icon-btn' : 'doc-kind__create'}
                                        onClick={onGenerate}
                                        disabled={disabled || !hasBasis}
                                        title={latest ? 'Сформувати заново' : undefined}
                                    >
                                        {busy
                                            ? <Loader2 size={15} className="animate-spin" />
                                            : latest
                                                ? <RefreshCw size={15} />
                                                : 'Сформувати'}
                                    </button>
                                </div>
                            </div>

                            {versions.length > 0 && (
                                <>
                                    <button
                                        type="button"
                                        className="doc-kind__toggle"
                                        onClick={() => setExpanded((prev) => ({ ...prev, [type]: !prev[type] }))}
                                    >
                                        <ChevronDown
                                            size={13}
                                            className={`doc-kind__chevron${isOpen ? ' is-open' : ''}`}
                                        />
                                        Версії ({versions.length})
                                    </button>
                                    {isOpen && (
                                        <ul className="doc-versions">
                                            {versions.map((doc) => (
                                                <li key={doc.id} className="doc-version">
                                                    <button
                                                        type="button"
                                                        className="doc-version__link"
                                                        onClick={() => onDownloadStoredDocument(doc)}
                                                    >
                                                        {formatDocDateTime(doc.createdAt)}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="doc-version__remove"
                                                        onClick={() => setDeleteTarget(doc)}
                                                        disabled={deletingDocId === doc.id}
                                                        title="Видалити"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            )}
                        </li>
                    );
                })}
            </ul>

            {!hasRent && (
                <p className="deal-docs-hint">
                    Документи оренди з&apos;являться, якщо в замовленні є інструменти з каталогу оренди.
                </p>
            )}

            {otherDocs.length > 0 && (
                <div className="deal-docs-files">
                    <div className="deal-docs-files__label">Інші файли</div>
                    <ul className="doc-versions">
                        {otherDocs.map((doc) => (
                            <li key={doc.id} className="doc-version">
                                <button
                                    type="button"
                                    className="doc-version__link"
                                    onClick={() => onDownloadStoredDocument(doc)}
                                >
                                    {doc.title || doc.fileName}
                                </button>
                                <button
                                    type="button"
                                    className="doc-version__remove"
                                    onClick={() => setDeleteTarget(doc)}
                                    disabled={deletingDocId === doc.id}
                                    title="Видалити"
                                >
                                    <X size={13} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити файл?"
                message={deleteTarget ? `«${deleteTarget.title || deleteTarget.fileName}» буде видалено без можливості відновлення.` : ''}
                confirmText="Видалити"
                loading={deletingDocId === deleteTarget?.id}
                onConfirm={async () => {
                    await onDeleteDocument(deleteTarget);
                    setDeleteTarget(null);
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
