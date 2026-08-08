import { useState, useRef, useCallback, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Save } from 'lucide-react';
import { generateRentalPdf } from '../../documents/generateRentalPdf';
import { buildRentalPdfPayload, RENTAL_LESSOR } from '../../documents/rentalPdfPayload';
import { buildRentalActContractRef } from '../../documents/rentalContractRef';
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
import { STATUS_SELECT_OPTIONS } from '../../model/rentalStatus';

const LESSOR = RENTAL_LESSOR;

export default function RentalApplicationEditor({
    id,
    embedded = false,
    hideHeader = false,
    hideDocumentTab = false,
    onSaved,
}) {
    const isNew = !id || id === 'new';
    const printRef = useRef();
    const [tab, setTab] = useState('parties');

    const app = useRentalApplication(id, isNew, { embedded, onSaved });
    const totals = useRentalTotals(app.items, app.discountType, app.discountValue);
    const search = useProductSearch(app.items, app.setItems);

    useEffect(() => {
        if (hideDocumentTab && tab === 'document') {
            setTab('parties');
        }
    }, [hideDocumentTab, tab]);

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

    if (app.loading) {
        return <div className="deal-workspace-loading">Завантаження заявки...</div>;
    }

    return (
        <div className={`rental-form-page${embedded ? ' rental-form-page--embedded' : ''}`}>
            {!hideHeader && (
                <RentalFormHeader
                    isNew={isNew}
                    applicationNumber={app.applicationNumber}
                    status={app.status}
                    onStatusChange={app.setStatus}
                    saving={app.saving}
                    onSave={app.handleSave}
                />
            )}

            {hideHeader && (
                <div className="rental-embedded-toolbar">
                    <span className="rental-embedded-toolbar__title">
                        {isNew ? 'Нова заявка' : `Заявка ${app.applicationNumber}`}
                    </span>
                    <div className="rental-embedded-toolbar__actions">
                        <select
                            value={app.status}
                            onChange={e => app.setStatus(e.target.value)}
                            className="status-select"
                        >
                            {STATUS_SELECT_OPTIONS.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={app.handleSave}
                            disabled={app.saving}
                            className="btn btn-primary"
                        >
                            <Save size={16} /> {app.saving ? 'Збереження...' : 'Зберегти'}
                        </button>
                    </div>
                </div>
            )}

            <RentalFormTabs
                tab={tab}
                onTabChange={setTab}
                itemsCount={app.items.length}
                hideDocumentTab={hideDocumentTab}
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

                {tab === 'document' && !hideDocumentTab && (
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

            {!hideDocumentTab && (
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
            )}
        </div>
    );
}
