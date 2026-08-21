import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, Wrench } from 'lucide-react';
import { ordersApi } from '../../../services/api';
import { ConfirmDialog } from '../../../components/admin';
import { orderHasRentItems } from '../amounts/orderHelpers';
import { parseDiscountPercent, withOrderTotal } from '../amounts/orderAmounts';
import { calcDays } from '../model/rentalItems';
import { estimateOrderDeposit } from '../model/dealRentalSync';
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

const emptyExtras = () => ({ passport: '', siteAddress: '', responsible: [] });

export default function DealWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [openingRental, setOpeningRental] = useState(false);
    const [rentalOpen, setRentalOpen] = useState(false);
    const [savingAll, setSavingAll] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [rentalExtras, setRentalExtras] = useState(emptyExtras);
    const [liveDeposit, setLiveDeposit] = useState(null);
    const rentalSaveRef = useRef(null);
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

    useEffect(() => {
        if (linkedRentalApp?.id) setRentalOpen(true);
    }, [linkedRentalApp?.id]);

    // Seed passport / site / responsible once per linked application,
    // and backfill per-line rent dates from the application when order lines lack them.
    useEffect(() => {
        if (!linkedRentalApp?.id) return;
        if (hydratedAppId.current === linkedRentalApp.id) return;
        hydratedAppId.current = linkedRentalApp.id;
        setRentalExtras({
            passport: linkedRentalApp.clientPassport || linkedClient?.passport || '',
            siteAddress: linkedRentalApp.clientSiteAddress || linkedClient?.siteAddress || '',
            responsible: Array.isArray(linkedRentalApp.responsible) ? linkedRentalApp.responsible : [],
        });

        const appByProduct = new Map();
        for (const line of linkedRentalApp.items || []) {
            const pid = Number(line.productId);
            if (Number.isFinite(pid) && pid > 0 && !appByProduct.has(pid)) {
                appByProduct.set(pid, line);
            }
        }

        setDraft((prev) => {
            if (!prev) return prev;
            let changed = false;
            const items = prev.items.map((item) => {
                const isRent = item.isRent || rentProductIds.has(item.id);
                if (!isRent) return item;
                if (item.rentFrom && item.rentTo) return item;
                const appLine = appByProduct.get(Number(item.id));
                const rentFrom = appLine?.rentFrom || linkedRentalApp.rentFrom || '';
                const rentTo = appLine?.rentTo || linkedRentalApp.rentTo || '';
                if (!rentFrom && !rentTo) return item;
                changed = true;
                const days = calcDays(rentFrom, rentTo);
                return {
                    ...item,
                    rentFrom,
                    rentTo,
                    rentDays: days > 0 ? days : Math.max(1, Number(item.rentDays) || 1),
                };
            });
            if (!changed) return prev;
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }, [linkedRentalApp, linkedClient, rentProductIds, setDraft, billingOptions]);

    useEffect(() => {
        if (!linkedClient) return;
        setRentalExtras((prev) => ({
            passport: prev.passport || linkedClient.passport || '',
            siteAddress: prev.siteAddress || linkedClient.siteAddress || '',
            responsible: prev.responsible?.length ? prev.responsible : (prev.responsible || []),
        }));
    }, [linkedClient]);

    const handleRentalSaved = useCallback((application) => {
        setLinkedRentalApp(application);
        setOrder((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        setDraft((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        if (application?.depositAmount != null) {
            setLiveDeposit(Number(application.depositAmount));
        }
    }, [setLinkedRentalApp, setOrder, setDraft]);

    const registerRentalSave = useCallback((fn) => {
        rentalSaveRef.current = fn;
    }, []);

    const handleTotalsChange = useCallback((totals) => {
        if (totals?.totalDeposit != null) setLiveDeposit(totals.totalDeposit);
    }, []);

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

    async function handleSaveDeal() {
        if (savingAll) return;
        setSavingAll(true);
        setJustSaved(false);
        try {
            await persistDraft();
            if (rentalSaveRef.current) await rentalSaveRef.current();
            setJustSaved(true);
        } catch (err) {
            alert(err.message || 'Помилка збереження');
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
    const estimatedDeposit = useMemo(
        () => estimateOrderDeposit(draft?.items, products, rentProductIds),
        [draft?.items, products, rentProductIds]
    );
    const headerDeposit = liveDeposit != null ? liveDeposit : estimatedDeposit;
    const orderClient = useMemo(() => ({
        name: draft?.customerName || '',
        phone: draft?.customerPhone || '',
        email: draft?.customerEmail || '',
        address: draft?.address || '',
        clientId: draft?.clientId || null,
        passport: rentalExtras.passport,
        siteAddress: rentalExtras.siteAddress,
        responsible: rentalExtras.responsible,
    }), [draft, rentalExtras]);

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
            setRentalOpen(true);
        } catch (err) {
            alert(err.message || 'Не вдалося відкрити заявку оренди');
        } finally {
            setOpeningRental(false);
        }
    }

    if (loading) return <div className="od-loading">Завантаження...</div>;
    if (!order || !draft) return <div className="od-loading od-loading--err">Замовлення не знайдено</div>;

    function renderRentalSection() {
        if (!hasRent) return null;

        const hasApp = !!linkedRentalApp?.id;

        return (
            <section className={`deal-section${rentalOpen ? ' is-open' : ''}`}>
                <button
                    type="button"
                    className="deal-section__head"
                    onClick={() => (hasApp ? setRentalOpen((v) => !v) : handleOpenRentalApplication())}
                    disabled={openingRental}
                >
                    <Wrench size={15} className="deal-section__icon" />
                    <span className="deal-section__title">Оренда</span>
                    <span className="deal-section__hint">
                        {hasApp
                            ? `Заявка ${linkedRentalApp.applicationNumber || `#${linkedRentalApp.id}`} · серійні номери, стан, комплект`
                            : openingRental
                                ? 'Створюємо заявку…'
                                : 'Заявку ще не створено — натисніть, щоб створити'}
                    </span>
                    {hasApp && (
                        <ChevronDown
                            size={16}
                            className={`deal-section__chevron${rentalOpen ? ' is-open' : ''}`}
                        />
                    )}
                </button>

                {hasApp && (
                    <div className={`deal-section__body${rentalOpen ? '' : ' is-collapsed'}`}>
                        <RentalApplicationEditor
                            id={String(linkedRentalApp.id)}
                            embedded
                            hideHeader
                            hideToolbarSave
                            hideDocumentTab
                            hidePartiesTab
                            enrichmentOnly
                            sellerId={draft.sellerId}
                            orderDiscountPercent={parseDiscountPercent(draft.discount)}
                            orderRentStartTime={draft.rentStartTime || ''}
                            orderClient={orderClient}
                            orderItems={draft.items}
                            rentProductIds={rentProductIds}
                            products={products}
                            onTotalsChange={handleTotalsChange}
                            onRegisterSave={registerRentalSave}
                            onSaved={handleRentalSaved}
                        />
                    </div>
                )}
            </section>
        );
    }

    return (
        <div className="od-page admin-form deal-workspace">
            <OrderHeader
                order={order}
                draft={draft}
                linkedClient={linkedClient}
                linkedRentalApp={linkedRentalApp}
                orderAmounts={orderAmounts}
                liveDeposit={headerDeposit}
                hasRent={hasRent}
                saving={saving || savingAll}
                dirty={dirty}
                justSaved={justSaved}
                onSave={handleSaveDeal}
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
                    />

                    {renderRentalSection()}
                </div>

                <div className="od-rail">
                    <DocumentsPanel
                        draft={draft}
                        hasRent={hasRent}
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
