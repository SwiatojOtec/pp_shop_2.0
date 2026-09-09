import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import ConfirmDialog from '../../admin/ui/ConfirmDialog';
import { orderHasRentItems } from '../amounts/orderHelpers';
import { useOrderData } from '../hooks/useOrderData';
import { useOrderDraftEditor } from '../hooks/useOrderDraftEditor';
import { useOrderClientLink } from '../hooks/useOrderClientLink';
import { useOrderDocuments } from '../hooks/useOrderDocuments';
import OrderHeader from '../components/order/OrderHeader';
import OrderClientCard from '../components/order/OrderClientCard';
import OrderDeliveryPaymentCard from '../components/order/OrderDeliveryPaymentCard';
import OrderItemsCard from '../components/order/OrderItemsCard';
import DocumentsPanel from '../components/documents/DocumentsPanel';
import RentalContractMissingFieldsModal from '../components/documents/RentalContractMissingFieldsModal';
import '../styles/RentalApplicationForm.css';
import '../styles/deal-workspace.css';

const emptyExtras = () => ({ passport: '', siteAddress: '', responsible: [] });

export default function DealWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [savingAll, setSavingAll] = useState(false);
    const [rentalExtras, setRentalExtras] = useState(emptyExtras);
    const hydratedAppId = useRef(null);

    const {
        order,
        setOrder,
        draft,
        setDraft,
        products,
        loading,
        documents,
        setDocuments,
        linkedRentalApp,
        setLinkedRentalApp,
        rentProductIds,
        billingOptions,
        orderAmounts,
    } = useOrderData(id);

    const {
        saving,
        dirty,
        markSaved,
        markDirty,
        productSearch,
        setProductSearch,
        setField,
        persistDraft,
        addItem,
        removeItem,
        updateQty,
        updateRentDates,
        updateItemEnrichment,
        removeItemKit,
        suggestedProducts,
    } = useOrderDraftEditor({
        draft,
        setDraft,
        setOrder,
        setLinkedRentalApp,
        products,
        rentProductIds,
        billingOptions,
        rentalExtras,
    });

    const {
        linkedClient,
        setLinkedClient,
        phoneMatch,
        clientLookupLoading,
        addingClient,
        linkingClient,
        linkClientToOrder,
        addClientToDatabase,
    } = useOrderClientLink({
        draft,
        setDraft,
        setOrder,
        setLinkedRentalApp,
        products,
        rentProductIds,
        billingOptions,
        onPersisted: markSaved,
    });

    const {
        converting,
        returnActLoading,
        invoiceLoading,
        depositInvoiceLoading,
        deletingDocId,
        contractLoading,
        protocolLoading,
        contractModalOpen,
        setContractModalOpen,
        contractMissingFields,
        contractForm,
        setContractForm,
        contractSaving,
        formatDocDateTime,
        handleDownloadInvoice,
        handleDownloadDepositInvoice,
        handleDownloadStoredDocument,
        handleDeleteDocument,
        handleGenerateRentalDocument,
        handleGenerateReturnActDocument,
        handleCreateRentalProtocol,
        handleCreateRentalContract,
        handleSubmitContractForm,
    } = useOrderDocuments({
        order,
        draft,
        setOrder,
        setDraft,
        setDocuments,
        setLinkedRentalApp,
        setLinkedClient,
        persistDraft,
    });

    // Passport / site address / responsible live only on the rental application
    // row — seed the editable mirror once per linked application (its own id,
    // not just "changed") so a later re-save of the same app doesn't clobber
    // in-progress edits.
    useEffect(() => {
        if (!linkedRentalApp?.id) return;
        if (hydratedAppId.current === linkedRentalApp.id) return;
        hydratedAppId.current = linkedRentalApp.id;
        setRentalExtras({
            passport: linkedRentalApp.clientPassport || linkedClient?.passport || '',
            siteAddress: linkedRentalApp.clientSiteAddress || linkedClient?.siteAddress || '',
            responsible: Array.isArray(linkedRentalApp.responsible) ? linkedRentalApp.responsible : [],
        });
    }, [linkedRentalApp, linkedClient]);

    function handleRentalExtraChange(field, value) {
        markDirty();
        setRentalExtras((prev) => ({ ...prev, [field]: value }));
    }

    function handleResponsibleChange(index, field, value) {
        markDirty();
        setRentalExtras((prev) => ({
            ...prev,
            responsible: prev.responsible.map((person, i) => (
                i === index ? { ...person, [field]: value } : person
            )),
        }));
    }

    function handleAddResponsible() {
        markDirty();
        setRentalExtras((prev) => ({
            ...prev,
            responsible: [...prev.responsible, { name: '', phone: '' }],
        }));
    }

    function handleRemoveResponsible(index) {
        markDirty();
        setRentalExtras((prev) => ({
            ...prev,
            responsible: prev.responsible.filter((_, i) => i !== index),
        }));
    }

    function handleStatusChange(status) {
        setField('status', status);
    }

    async function handleSaveDeal() {
        if (savingAll) return;
        setSavingAll(true);
        setJustSaved(false);
        try {
            await persistDraft(rentalExtras);
            setJustSaved(true);
        } catch (err) {
            showToast(err.message || 'Помилка збереження', 'warning');
        } finally {
            setSavingAll(false);
        }
    }

    useEffect(() => {
        if (!justSaved) return undefined;
        const timer = setTimeout(() => setJustSaved(false), 2500);
        return () => clearTimeout(timer);
    }, [justSaved]);

    const hasRent = !!(draft && orderHasRentItems(draft, rentProductIds));

    async function handleDelete() {
        if (!order) return;
        try {
            await ordersApi.remove(order.id);
            navigate('/admin/deals', { replace: true });
        } catch (err) {
            showToast(err.message || 'Помилка видалення', 'warning');
        } finally {
            setDeleteOpen(false);
        }
    }

    if (loading) return <div className="od-loading">Завантаження...</div>;
    if (!order || !draft) return <div className="od-loading od-loading--err">Замовлення не знайдено</div>;

    return (
        <div className="deal-workspace">
            <OrderHeader
                order={order}
                draft={draft}
                linkedClient={linkedClient}
                hasRent={hasRent}
                rentProductIds={rentProductIds}
                saving={saving || savingAll}
                dirty={dirty}
                justSaved={justSaved}
                onSave={handleSaveDeal}
                onDeleteOpen={() => setDeleteOpen(true)}
                onStatusChange={handleStatusChange}
            />

            <div className="deal-grid">
                <div className="deal-grid__col">
                    <OrderClientCard
                        draft={draft}
                        setField={setField}
                        linkedClient={linkedClient}
                        phoneMatch={phoneMatch}
                        clientLookupLoading={clientLookupLoading}
                        linkingClient={linkingClient}
                        addingClient={addingClient}
                        onLinkClient={linkClientToOrder}
                        onAddClient={addClientToDatabase}
                        hasRent={hasRent}
                        rentalExtras={rentalExtras}
                        onRentalExtraChange={handleRentalExtraChange}
                        onResponsibleChange={handleResponsibleChange}
                        onAddResponsible={handleAddResponsible}
                        onRemoveResponsible={handleRemoveResponsible}
                    />
                    <OrderDeliveryPaymentCard
                        draft={draft}
                        setField={setField}
                        hasRent={hasRent}
                        rentProductIds={rentProductIds}
                    />
                </div>

                <OrderItemsCard
                    draft={draft}
                    rentProductIds={rentProductIds}
                    billingOptions={billingOptions}
                    orderAmounts={orderAmounts}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    suggestedProducts={suggestedProducts}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                    onUpdateQty={updateQty}
                    onUpdateRentDates={updateRentDates}
                    onUpdateItemEnrichment={updateItemEnrichment}
                    onRemoveItemKit={removeItemKit}
                />

                <DocumentsPanel
                    draft={draft}
                    hasRent={hasRent}
                    dealStatus={draft.status}
                    documents={documents}
                    invoiceLoading={invoiceLoading}
                    depositInvoiceLoading={depositInvoiceLoading}
                    converting={converting}
                    returnActLoading={returnActLoading}
                    contractLoading={contractLoading}
                    contractSaving={contractSaving}
                    protocolLoading={protocolLoading}
                    deletingDocId={deletingDocId}
                    formatDocDateTime={formatDocDateTime}
                    onDownloadInvoice={handleDownloadInvoice}
                    onDownloadDepositInvoice={handleDownloadDepositInvoice}
                    onGenerateRentalDocument={handleGenerateRentalDocument}
                    onGenerateReturnActDocument={handleGenerateReturnActDocument}
                    onCreateRentalContract={handleCreateRentalContract}
                    onCreateRentalProtocol={handleCreateRentalProtocol}
                    onDownloadStoredDocument={handleDownloadStoredDocument}
                    onDeleteDocument={handleDeleteDocument}
                />
            </div>

            <RentalContractMissingFieldsModal
                open={contractModalOpen}
                draft={draft}
                contractMissingFields={contractMissingFields}
                contractForm={contractForm}
                setContractForm={setContractForm}
                contractSaving={contractSaving}
                onClose={() => setContractModalOpen(false)}
                onSubmit={handleSubmitContractForm}
                setField={setField}
            />

            <ConfirmDialog
                open={deleteOpen}
                title="Видалити замовлення?"
                message={`Видалити замовлення ${order.orderNumber || '#' + order.id}? Цю дію неможливо скасувати.`}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />
        </div>
    );
}
