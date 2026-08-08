import { Link } from 'react-router-dom';
import {
    Files, FileText, ClipboardList, Undo2, ScrollText, Download, X,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';

export default function DocumentsPanel({
    draft,
    hasRent,
    linkedRentalApp,
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
    return (
        <div className="od-card od-card--docs">
            <h2 className="od-card__title">
                <Files size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Документація
            </h2>
            <div className="od-docs-actions">
                <Button
                    variant="secondary"
                    className="od-docs-actions__btn od-docs-actions__btn--invoice"
                    onClick={onDownloadInvoice}
                    disabled={invoiceLoading || depositInvoiceLoading || !(draft.items || []).length}
                >
                    <FileText size={16} />
                    {invoiceLoading ? 'Формуємо…' : 'Сформувати рахунок'}
                </Button>
                {hasRent && (
                    <Button
                        variant="secondary"
                        className="od-docs-actions__btn od-docs-actions__btn--deposit"
                        onClick={onDownloadDepositInvoice}
                        disabled={invoiceLoading || depositInvoiceLoading || converting || returnActLoading}
                    >
                        <FileText size={16} />
                        {depositInvoiceLoading ? 'Формуємо…' : 'Рахунок на заставу'}
                    </Button>
                )}
                {hasRent && (
                    <>
                        <Button
                            variant="secondary"
                            className="od-docs-actions__btn od-docs-actions__btn--application"
                            onClick={onGenerateRentalDocument}
                            disabled={converting || returnActLoading}
                        >
                            <ClipboardList size={16} />
                            {converting
                                ? 'Формуємо…'
                                : linkedRentalApp
                                    ? 'Сформувати заявку (PDF)'
                                    : 'Сформувати заявку'}
                        </Button>
                        <Button
                            variant="secondary"
                            className="od-docs-actions__btn od-docs-actions__btn--return"
                            onClick={onGenerateReturnActDocument}
                            disabled={converting || returnActLoading || contractLoading}
                        >
                            <Undo2 size={16} />
                            {returnActLoading ? 'Формуємо…' : 'Акт повернення-огляду (PDF)'}
                        </Button>
                        <Button
                            variant="secondary"
                            className="od-docs-actions__btn od-docs-actions__btn--contract"
                            onClick={onCreateRentalContract}
                            disabled={converting || returnActLoading || contractLoading || contractSaving || protocolLoading}
                        >
                            <ScrollText size={16} />
                            {contractLoading || contractSaving ? 'Формуємо…' : 'Створити договір оренди'}
                        </Button>
                        <Button
                            variant="secondary"
                            className="od-docs-actions__btn od-docs-actions__btn--protocol"
                            onClick={onCreateRentalProtocol}
                            disabled={converting || returnActLoading || contractLoading || contractSaving || protocolLoading}
                        >
                            <FileText size={16} />
                            {protocolLoading ? 'Формуємо…' : 'Протокол (Додаток №1)'}
                        </Button>
                    </>
                )}
                {linkedRentalApp && (
                    <Link
                        to={`/admin/rental-applications/${linkedRentalApp.id}`}
                        className="od-docs-linked-app"
                    >
                        Заявка {linkedRentalApp.applicationNumber || `#${linkedRentalApp.id}`}
                    </Link>
                )}
                {!hasRent && (
                    <p className="od-docs-hint">
                        Заявка на оренду з&apos;явиться, якщо в замовленні є інструменти з каталогу оренди.
                    </p>
                )}
            </div>

            <div className="od-docs-files">
                <div className="od-docs-files__label">Збережені файли</div>
                {documents.length === 0 ? (
                    <p className="od-docs-hint">Поки немає. Згенеровані документи з&apos;являться тут.</p>
                ) : (
                    <ul className="od-docs-list">
                        {documents.map((doc) => (
                            <li key={doc.id} className="od-docs-list__item">
                                <button
                                    type="button"
                                    className="od-docs-list__link"
                                    onClick={() => onDownloadStoredDocument(doc)}
                                    title="Завантажити"
                                >
                                    <FileText size={16} />
                                    <span className="od-docs-list__meta">
                                        <span className="od-docs-list__title">{doc.title || doc.fileName}</span>
                                        <span className="od-docs-list__date">{formatDocDateTime(doc.createdAt)}</span>
                                    </span>
                                    <Download size={15} className="od-docs-list__icon" />
                                </button>
                                <button
                                    type="button"
                                    className="od-docs-list__remove"
                                    onClick={() => onDeleteDocument(doc)}
                                    disabled={deletingDocId === doc.id}
                                    title="Видалити"
                                >
                                    <X size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
