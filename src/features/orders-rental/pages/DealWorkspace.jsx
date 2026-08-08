import { useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ordersApi } from '../../../services/api';
import { ConfirmDialog } from '../../../components/admin';
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
import RentalApplicationEditor from '../components/rental/RentalApplicationEditor';
import '../../../pages/admin/Admin.css';
import '../styles/AdminOrderDetails.css';
import '../styles/RentalApplicationForm.css';
import '../styles/deal-workspace.css';

export default function DealWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [openingRental, setOpeningRental] = useState(false);

    const view = searchParams.get('view') === 'rental' ? 'rental' : 'order';

    const setView = useCallback((next) => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            if (next === 'order') {
                params.delete('view');
            } else {
                params.set('view', 'rental');
            }
            return params;
        }, { replace: true });
    }, [setSearchParams]);

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
        productSearch,
        setProductSearch,
        setField,
        persistDraft,
        addItem,
        removeItem,
        updateQty,
        updateRentDays,
        handleSave,
        suggestedProducts,
    } = useOrderDraftEditor({
        draft,
        setDraft,
        setOrder,
        products,
        rentProductIds,
        billingOptions,
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
        products,
        rentProductIds,
        billingOptions,
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
        loadLinkedRentalApplication,
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

    const handleRentalSaved = useCallback((application) => {
        setLinkedRentalApp(application);
        setOrder((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        setDraft((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
    }, [setLinkedRentalApp, setOrder, setDraft]);

    async function handleDelete() {
        if (!order) return;
        try {
            await ordersApi.remove(order.id);
            navigate('/admin/orders', { replace: true });
        } catch (err) {
            alert(err.message || 'Помилка видалення');
        } finally {
            setDeleteOpen(false);
        }
    }

    async function handleOpenRentalApplication() {
        if (!order || openingRental) return;
        setOpeningRental(true);
        try {
            await loadLinkedRentalApplication();
            setView('rental');
        } catch (err) {
            alert(err.message || 'Не вдалося відкрити заявку оренди');
        } finally {
            setOpeningRental(false);
        }
    }

    if (loading) return <div className="od-loading">Завантаження...</div>;
    if (!order || !draft) return <div className="od-loading od-loading--err">Замовлення не знайдено</div>;

    const hasRent = orderHasRentItems(order, rentProductIds);

    function renderMainContent() {
        if (view === 'order') {
            return (
                <>
                    <div className="od-grid-top">
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
                        />

                        <OrderDeliveryPaymentCard
                            draft={draft}
                            setField={setField}
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
                        onUpdateRentDays={updateRentDays}
                        saving={saving}
                        onSave={handleSave}
                    />
                </>
            );
        }

        if (!hasRent) {
            return (
                <div className="deal-workspace-empty">
                    <p>Ця вкладка доступна для замовлень з позиціями оренди.</p>
                </div>
            );
        }

        if (linkedRentalApp?.id) {
            return (
                <RentalApplicationEditor
                    id={String(linkedRentalApp.id)}
                    embedded
                    hideHeader
                    hideDocumentTab
                    onSaved={handleRentalSaved}
                />
            );
        }

        return (
            <div className="deal-workspace-empty">
                <p>Для цього замовлення ще не створено заявку оренди.</p>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleOpenRentalApplication}
                    disabled={openingRental}
                >
                    {openingRental ? 'Відкриваємо…' : 'Створити / відкрити заявку оренди'}
                </button>
            </div>
        );
    }

    return (
        <div className="od-page admin-form deal-workspace">
            <OrderHeader
                order={order}
                linkedClient={linkedClient}
                saving={saving}
                onSave={handleSave}
                onDeleteOpen={() => setDeleteOpen(true)}
            />

            <div className="deal-workspace-tabs rental-tabs-nav">
                <button
                    type="button"
                    className={`rental-tab-btn${view === 'order' ? ' is-active' : ''}`}
                    onClick={() => setView('order')}
                >
                    Замовлення
                </button>
                {hasRent && (
                    <button
                        type="button"
                        className={`rental-tab-btn${view === 'rental' ? ' is-active' : ''}`}
                        onClick={() => setView('rental')}
                    >
                        Заявка оренди
                    </button>
                )}
            </div>

            <div className="od-grid">
                <div className="od-grid-main">
                    {renderMainContent()}
                </div>

                <DocumentsPanel
                    draft={draft}
                    hasRent={hasRent}
                    linkedRentalApp={linkedRentalApp}
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
