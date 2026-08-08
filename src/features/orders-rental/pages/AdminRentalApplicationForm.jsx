import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { generateRentalPdf } from '../documents/generateRentalPdf';
import { buildRentalPdfPayload, RENTAL_LESSOR } from '../documents/rentalPdfPayload';
import { buildRentalActContractRef } from '../documents/rentalContractRef';
import RentalApplicationPrint from '../components/rental/RentalApplicationPrint';
import RentalFormHeader from '../components/rental/RentalFormHeader';
import RentalFormTabs from '../components/rental/RentalFormTabs';
import RentalPartiesSection from '../components/rental/RentalPartiesSection';
import RentalItemsSection from '../components/rental/RentalItemsSection';
import RentalDocumentTab from '../components/rental/RentalDocumentTab';
import UpsellPanel from '../components/rental/UpsellPanel';
import { useRentalApplication } from '../hooks/useRentalApplication';
import { useRentalTotals } from '../hooks/useRentalTotals';
import { useProductSearch } from '../hooks/useProductSearch';
import '../../../pages/admin/Admin.css';
import '../styles/RentalApplicationForm.css';

const LESSOR = RENTAL_LESSOR;

export default function AdminRentalApplicationForm() {
    const { id } = useParams();
    const isNew = !id || id === 'new';
    const printRef = useRef();
    const [tab, setTab] = useState('parties');

    const app = useRentalApplication(id, isNew);
    const totals = useRentalTotals(app.items, app.discountType, app.discountValue);
    const search = useProductSearch(app.items, app.setItems);

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
    }), [app, totals.parsedDiscount]);

    const currentContractRef = buildRentalActContractRef(null, {
        applicationNumber: app.applicationNumber,
        rentFrom: app.items[0]?.rentFrom,
    });

    const handlePrint = useReactToPrint({ contentRef: printRef });

    const handleClientChange = useCallback((field, value) => {
        app.setClient(prev => ({ ...prev, [field]: value }));
    }, [app.setClient]);

    const handleResponsibleChange = useCallback((index, field, value) => {
        app.setResponsible(prev => prev.map((p, pi) => pi === index ? { ...p, [field]: value } : p));
    }, [app.setResponsible]);

    const handleAddResponsible = useCallback(() => {
        app.setResponsible(prev => [...prev, { name: '', phone: '' }]);
    }, [app.setResponsible]);

    const handleRemoveResponsible = useCallback((index) => {
        app.setResponsible(prev => prev.filter((_, pi) => pi !== index));
    }, [app.setResponsible]);

    if (app.loading) return <div style={{ padding: 40, color: '#999' }}>Завантаження...</div>;

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

            <RentalFormTabs tab={tab} onTabChange={setTab} itemsCount={app.items.length} />

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
                        onDownloadApplication={() => generateRentalPdf(buildCurrentApplicationPayload())}
                        onDownloadReturnAct={() => generateRentalPdf(buildCurrentApplicationPayload(), { variant: 'return_inspection' })}
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
                    lessor={LESSOR}
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
                />
            </div>
        </div>
    );
}
