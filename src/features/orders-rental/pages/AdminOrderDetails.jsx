import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import '../../../pages/admin/Admin.css';
import '../styles/AdminOrderDetails.css';

export default function AdminOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);

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

    if (loading) return <div className="od-loading">Завантаження...</div>;
    if (!order || !draft) return <div className="od-loading od-loading--err">Замовлення не знайдено</div>;

    const hasRent = orderHasRentItems(order, rentProductIds);

    return (
        <div className="od-page admin-form">
            <OrderHeader
                order={order}
                linkedClient={linkedClient}
                saving={saving}
                onSave={handleSave}
                onDeleteOpen={() => setDeleteOpen(true)}
            />

            <div className="od-grid">
                <div className="od-grid-main">
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
