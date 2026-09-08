import { useState } from 'react';
import { ordersApi, rentalApplicationsApi } from '../../../services/api';
import { resolveSellerId } from '../../../constants/sellers';
import { formatOrderDate } from '../amounts/orderHelpers';
import { generateRentalPdf } from '../documents/generateRentalPdf';
import { buildRentalPdfPayload, blobToBase64 } from '../documents/rentalPdfPayload';
import { useToast } from '../../../context/ToastContext';

export function useOrderDocuments({
    order,
    draft,
    setOrder,
    setDraft,
    setDocuments,
    setLinkedRentalApp,
    setLinkedClient,
    persistDraft,
}) {
    const [converting, setConverting] = useState(false);
    const [returnActLoading, setReturnActLoading] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [depositInvoiceLoading, setDepositInvoiceLoading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    const [contractLoading, setContractLoading] = useState(false);
    const [protocolLoading, setProtocolLoading] = useState(false);
    const [contractModalOpen, setContractModalOpen] = useState(false);
    const [contractModalTarget, setContractModalTarget] = useState('contract');
    const [contractMissingFields, setContractMissingFields] = useState([]);
    const [contractForm, setContractForm] = useState({});
    const [contractSaving, setContractSaving] = useState(false);
    const { showToast } = useToast();

    function formatDocDateTime(value) {
        if (!value) return '';
        const dt = new Date(value);
        const date = formatOrderDate(value);
        const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        return `${date} · ${time}`;
    }

    async function handleDownloadInvoice() {
        if (!order || !draft) return;
        setInvoiceLoading(true);
        try {
            const saved = await persistDraft();
            const doc = await ordersApi.generateInvoiceDocument(saved.id, {
                sellerId: resolveSellerId(saved.sellerId),
            });
            setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
            await ordersApi.downloadDocument(saved.id, doc.id, doc.fileName);
        } catch (err) {
            showToast(err.message || 'Не вдалося сформувати рахунок', 'warning');
        } finally {
            setInvoiceLoading(false);
        }
    }

    async function handleDownloadDepositInvoice() {
        if (!order || !draft) return;
        setDepositInvoiceLoading(true);
        try {
            const saved = await persistDraft();
            const { application, document } = await ordersApi.generateDepositInvoiceDocument(saved.id, {
                sellerId: resolveSellerId(saved.sellerId),
            });

            setOrder((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
            setDraft((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
            setLinkedRentalApp(application);
            setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
            await ordersApi.downloadDocument(saved.id, document.id, document.fileName);
        } catch (err) {
            showToast(err.message || 'Не вдалося сформувати рахунок на заставу', 'warning');
        } finally {
            setDepositInvoiceLoading(false);
        }
    }

    async function handleDownloadStoredDocument(doc) {
        if (!order || !doc?.id) return;
        try {
            await ordersApi.downloadDocument(order.id, doc.id, doc.fileName);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити файл', 'warning');
        }
    }

    async function handleDeleteDocument(doc) {
        if (!order || !doc?.id) return;

        setDeletingDocId(doc.id);
        try {
            await ordersApi.removeDocument(order.id, doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (err) {
            showToast(err.message || 'Не вдалося видалити файл', 'warning');
        } finally {
            setDeletingDocId(null);
        }
    }

    /**
     * The order is saved first because the server mirrors its «Знижка, %» onto the
     * linked application, and every rental document is built from that application.
     */
    async function syncLinkedRentalApplication() {
        const savedOrder = (await persistDraft()) || order;
        const { application: linked } = await ordersApi.createOrOpenRentalApplication(savedOrder.id);
        const application = await rentalApplicationsApi.get(linked.id);

        setOrder((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        setDraft((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        setLinkedRentalApp(application);

        return { savedOrder, application };
    }

    async function loadLinkedRentalApplication() {
        const { application } = await syncLinkedRentalApplication();
        return application;
    }

    async function generateRentalPdfDocument({ variant, saveApi, titlePrefix }) {
        const { savedOrder, application } = await syncLinkedRentalApplication();
        const pdfPayload = buildRentalPdfPayload(application, savedOrder);
        const { blob, filename, actNumber } = await generateRentalPdf(pdfPayload, {
            download: false,
            returnBlob: true,
            orderId: savedOrder.id,
            ...(variant ? { variant } : {}),
        });

        const contentBase64 = await blobToBase64(blob);
        const actLabel = actNumber ? ` · ${actNumber}` : '';
        const { document } = await saveApi(savedOrder.id, {
            contentBase64,
            fileName: filename,
            title: `${titlePrefix} · ${application.applicationNumber || application.id}${actLabel}`,
        });

        setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
        await ordersApi.downloadDocument(savedOrder.id, document.id, document.fileName);
    }

    async function handleGenerateRentalDocument() {
        if (!order || converting || returnActLoading) return;
        setConverting(true);
        try {
            await generateRentalPdfDocument({
                saveApi: ordersApi.saveRentalApplicationDocument,
                titlePrefix: 'Заявка',
            });
        } catch (err) {
            showToast(`Помилка: ${err.message}`, 'warning');
        } finally {
            setConverting(false);
        }
    }

    async function handleGenerateReturnActDocument() {
        if (!order || converting || returnActLoading) return;
        setReturnActLoading(true);
        try {
            await generateRentalPdfDocument({
                variant: 'return_inspection',
                saveApi: ordersApi.saveRentalReturnActDocument,
                titlePrefix: 'Акт повернення',
            });
        } catch (err) {
            showToast(`Помилка: ${err.message}`, 'warning');
        } finally {
            setReturnActLoading(false);
        }
    }

    function openContractModal(missing, target = 'contract') {
        const fields = Array.isArray(missing) ? missing : [];
        setContractModalTarget(target);
        setContractMissingFields(fields);
        const initial = {};
        fields.forEach((field) => {
            initial[field.key] = field.value || '';
        });
        setContractForm(initial);
        setContractModalOpen(true);
    }

    async function finishRentalDocumentGeneration(target, clientData = {}) {
        const sellerId = resolveSellerId(clientData.sellerId || draft?.sellerId);
        const generateApi = target === 'protocol'
            ? ordersApi.generateRentalProtocolDocument
            : ordersApi.generateRentalContractDocument;

        const { application, client, document } = await generateApi(order.id, {
            sellerId,
            clientData,
        });

        setLinkedClient(client);
        setOrder((prev) => (prev ? {
            ...prev,
            clientId: client.id,
            rentalApplicationId: application.id,
        } : prev));
        setDraft((prev) => (prev ? {
            ...prev,
            clientId: client.id,
            rentalApplicationId: application.id,
        } : prev));
        setLinkedRentalApp(application);
        setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
        await ordersApi.downloadDocument(order.id, document.id, document.fileName);
        setContractModalOpen(false);
    }

    async function handleCreateRentalProtocol() {
        if (!order || protocolLoading || contractSaving) return;
        setProtocolLoading(true);
        try {
            const sellerId = resolveSellerId(draft?.sellerId);
            const check = await ordersApi.checkRentalProtocol(order.id, { sellerId });
            if (check.ready) {
                await finishRentalDocumentGeneration('protocol');
            } else {
                openContractModal(check.missing, 'protocol');
            }
        } catch (err) {
            if (err.missing?.length) {
                openContractModal(err.missing, 'protocol');
            } else {
                showToast(err.message || 'Не вдалося перевірити дані для протоколу', 'warning');
            }
        } finally {
            setProtocolLoading(false);
        }
    }

    async function handleCreateRentalContract() {
        if (!order || contractLoading || contractSaving) return;
        setContractLoading(true);
        try {
            const sellerId = resolveSellerId(draft?.sellerId);
            const check = await ordersApi.checkRentalContract(order.id, { sellerId });
            if (check.ready) {
                await finishRentalDocumentGeneration('contract');
            } else {
                openContractModal(check.missing, 'contract');
            }
        } catch (err) {
            if (err.missing?.length) {
                openContractModal(err.missing, 'contract');
            } else {
                showToast(err.message || 'Не вдалося перевірити дані для договору', 'warning');
            }
        } finally {
            setContractLoading(false);
        }
    }

    async function handleSubmitContractForm(e) {
        e.preventDefault();
        if (!order || contractSaving) return;
        setContractSaving(true);
        try {
            await finishRentalDocumentGeneration(contractModalTarget, contractForm);
        } catch (err) {
            if (err.missing?.length) {
                openContractModal(err.missing, contractModalTarget);
            } else {
                showToast(err.message || 'Не вдалося сформувати договір', 'warning');
            }
        } finally {
            setContractSaving(false);
        }
    }

    return {
        converting,
        returnActLoading,
        invoiceLoading,
        depositInvoiceLoading,
        deletingDocId,
        contractLoading,
        protocolLoading,
        contractModalOpen,
        setContractModalOpen,
        contractModalTarget,
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
    };
}
