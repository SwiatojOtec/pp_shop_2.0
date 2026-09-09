import { useState, useRef, useCallback, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { generateRentalPdf } from '../../documents/generateRentalPdf';
import { buildRentalPdfPayload } from '../../documents/rentalPdfPayload';
import { buildRentalActContractRef } from '../../documents/rentalContractRef';
import { getRentalLessor } from '../../../../constants/sellers';
import RentalApplicationPrint from './RentalApplicationPrint';
import RentalFormHeader from './RentalFormHeader';
import RentalFormTabs from './RentalFormTabs';
import RentalPartiesSection from './RentalPartiesSection';
import RentalItemsSection from './RentalItemsSection';
import RentalDocumentTab from './RentalDocumentTab';
import UpsellPanel from './UpsellPanel';
import { useRentalApplication } from '../../hooks/useRentalApplication';
import { useRentalTotals } from '../../hooks/useRentalTotals';
import { useProductSearch } from '../../hooks/useProductSearch';

/**
 * Standalone rental application editor: `/admin/rental-applications/:id|new`,
 * reached only from RentalCalendar's booking→application conversion (a
 * booking has no order yet, so it can't go through the Deal screen). Inside
 * a deal, item enrichment (serial/condition/kit) is edited directly on the
 * order line — this component is not embedded there anymore
 * (docs/admin-redesign/03-screens.md, «Угода»).
 */
export default function RentalApplicationEditor({ id }) {
    const isNew = !id || id === 'new';
    const printRef = useRef();
    const [tab, setTab] = useState('parties');

    const app = useRentalApplication(id, isNew);
    const totals = useRentalTotals(app.items, app.discountType, app.discountValue);
    const search = useProductSearch(app.items, app.setItems);

    const sellerId = app.linkedOrder?.sellerId || null;
    const lessor = useMemo(() => getRentalLessor(sellerId), [sellerId]);

    const buildCurrentApplicationPayload = useCallback(() => buildRentalPdfPayload({
        applicationNumber: app.applicationNumber,
        clientName: app.client.name,
        clientPhone: app.client.phone,
        clientEmail: app.client.email,
        clientPassport: app.client.passport,
        clientAddress: app.client.address,
        clientSiteAddress: app.client.siteAddress,
        responsible: app.responsible,
        items: app.items,
        discountType: app.discountType,
        discountValue: totals.parsedDiscount,
        linkedOrder: app.linkedOrder,
        rentStartTime: app.rentStartTime || app.linkedOrder?.rentStartTime || '',
        sellerId,
    }, app.linkedOrder
        ? { ...app.linkedOrder, rentStartTime: app.linkedOrder.rentStartTime || app.rentStartTime || '' }
        : null), [app, totals.parsedDiscount, sellerId]);

    const currentContractRef = buildRentalActContractRef(null, {
        applicationNumber: app.applicationNumber,
        rentFrom: app.items[0]?.rentFrom,
    });

    const handlePrint = useReactToPrint({ contentRef: printRef });

    const handleClientChange = useCallback((field, value) => {
        app.setClient(prev => ({ ...prev, [field]: value }));
    }, [app]);

    const handleResponsibleChange = useCallback((index, field, value) => {
        app.setResponsible(prev => prev.map((p, pi) => pi === index ? { ...p, [field]: value } : p));
    }, [app]);

    const handleAddResponsible = useCallback(() => {
        app.setResponsible(prev => [...prev, { name: '', phone: '' }]);
    }, [app]);

    const handleRemoveResponsible = useCallback((index) => {
        app.setResponsible(prev => prev.filter((_, pi) => pi !== index));
    }, [app]);

    if (app.loading) {
        return <div className="deal-workspace-loading">Завантаження заявки...</div>;
    }

    return (
        <div className="rental-form-page">
            <RentalFormHeader
                isNew={isNew}
                applicationNumber={app.applicationNumber}
                status={app.status}
                onStatusChange={app.setStatus}
                saving={app.saving}
                onSave={app.handleSave}
            />

            <RentalFormTabs
                tab={tab}
                onTabChange={setTab}
                itemsCount={app.items.length}
            />

            <div className="rental-form-body">
                {tab === 'parties' && (
                    <RentalPartiesSection
                        clients={app.clients}
                        selectedClientId={app.selectedClientId}
                        onClientSelect={app.handleClientSelect}
                        client={app.client}
                        onClientChange={handleClientChange}
                        responsible={app.responsible}
                        onResponsibleChange={handleResponsibleChange}
                        onAddResponsible={handleAddResponsible}
                        onRemoveResponsible={handleRemoveResponsible}
                        sellerId={sellerId}
                    />
                )}

                {tab === 'items' && (
                    <RentalItemsSection
                        items={app.items}
                        searchQuery={search.searchQuery}
                        onSearchChange={search.setSearchQuery}
                        searchResults={search.searchResults}
                        onSelectProduct={search.addProductFromSearch}
                        onUpdateItem={app.updateItem}
                        onRemoveItem={app.removeItem}
                        onRemoveKitItem={app.removeKitItem}
                        onAddEmptyItem={app.addEmptyItem}
                        totals={totals}
                        discountType={app.discountType}
                        discountValue={app.discountValue}
                        onDiscountTypeChange={app.setDiscountType}
                        onDiscountValueChange={app.setDiscountValue}
                        discountLocked={!!app.linkedOrder}
                    />
                )}

                {tab === 'document' && (
                    <RentalDocumentTab
                        applicationNumber={app.applicationNumber}
                        client={app.client}
                        itemsCount={app.items.length}
                        totalRentalAfterDiscount={totals.totalRentalAfterDiscount}
                        totalDeposit={totals.totalDeposit}
                        grandTotal={totals.grandTotal}
                        notes={app.notes}
                        onNotesChange={app.setNotes}
                        onDownloadApplication={() => generateRentalPdf(buildCurrentApplicationPayload(), {
                            orderId: app.linkedOrder?.id,
                        })}
                        onDownloadReturnAct={() => generateRentalPdf(buildCurrentApplicationPayload(), {
                            variant: 'return_inspection',
                            orderId: app.linkedOrder?.id,
                        })}
                        onPrint={handlePrint}
                    />
                )}
            </div>

            <UpsellPanel
                visible={search.upsellVisible}
                productName={search.upsellProductName}
                items={app.items}
                upsellItems={search.upsellItems}
                onClose={() => search.setUpsellVisible(false)}
                onAddProduct={search.addUpsellProduct}
            />

            <div style={{ display: 'none' }}>
                <RentalApplicationPrint
                    ref={printRef}
                    applicationNumber={app.applicationNumber}
                    lessor={lessor}
                    client={app.client}
                    responsible={app.responsible}
                    items={app.items}
                    totalRental={totals.totalRental}
                    totalDeposit={totals.totalDeposit}
                    discountType={app.discountType}
                    discountValue={totals.parsedDiscount}
                    discountAmount={totals.discountAmount}
                    totalRentalAfterDiscount={totals.totalRentalAfterDiscount}
                    contractRef={currentContractRef}
                    rentStartTime={app.rentStartTime || app.linkedOrder?.rentStartTime || ''}
                />
            </div>
        </div>
    );
}
