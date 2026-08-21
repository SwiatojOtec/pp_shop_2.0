import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clientsApi, rentalApplicationsApi } from '../../../services/api';
import { normalizeUaPhone } from '../../../utils/phoneUtils';
import { parseDiscountPercent } from '../amounts/orderAmounts';
import {
    emptyItem,
    enrichApplicationItem,
    recalcLineTotals,
    resolveApplicationDiscount,
} from '../model/rentalItems';
import { computeRentalTotals } from '../model/rentalTotals';
import { mergeOrderLinesIntoRentalItems } from '../model/dealRentalSync';

export function useRentalApplication(id, isNew, options = {}) {
    const {
        embedded = false,
        onSaved,
        orderDiscountPercent = null,
        orderRentStartTime = null,
        orderClient = null,
        orderItems = null,
        rentProductIds = null,
        products = null,
        onTotalsChange = null,
    } = options;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [applicationNumber, setApplicationNumber] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');
    const [rentStartTime, setRentStartTime] = useState('');
    const [discountType, setDiscountType] = useState('fixed');
    const [discountValue, setDiscountValue] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [client, setClient] = useState({ name: '', phone: '', email: '', passport: '', address: '', siteAddress: '' });
    const [responsible, setResponsible] = useState([]);
    const [items, setItems] = useState([emptyItem()]);
    const [linkedOrder, setLinkedOrder] = useState(null);
    const [itemsReady, setItemsReady] = useState(isNew);

    // When rendered next to its order, the order's live «Знижка, %» wins over the
    // value stored on the application, so both always describe the same deal.
    const discountFromOrder = orderDiscountPercent != null;
    const effectiveDiscountType = discountFromOrder ? 'percent' : discountType;
    const effectiveDiscountValue = discountFromOrder
        ? (parseDiscountPercent(orderDiscountPercent) > 0 ? String(parseDiscountPercent(orderDiscountPercent)) : '')
        : discountValue;

    // Embedded deal page owns client fields; mirror them into application state for save/PDF.
    const effectiveClient = orderClient ? {
        name: orderClient.name || '',
        phone: orderClient.phone || '',
        email: orderClient.email || '',
        passport: orderClient.passport || '',
        address: orderClient.address || '',
        siteAddress: orderClient.siteAddress || '',
    } : client;
    const effectiveResponsible = orderClient?.responsible != null
        ? orderClient.responsible
        : responsible;
    const effectiveClientId = orderClient?.clientId != null
        ? (orderClient.clientId ? String(orderClient.clientId) : '')
        : selectedClientId;

    const applyClient = useCallback((picked) => {
        if (!picked) return;
        setSelectedClientId(String(picked.id));
        setClient({
            name: picked.fullName || '',
            phone: picked.phone || '',
            email: picked.email || '',
            passport: picked.passport || '',
            address: picked.address || '',
            siteAddress: picked.siteAddress || '',
        });
        // With a linked order the discount comes from the order, not from the client card.
        if (linkedOrder || discountFromOrder) return;
        const discountPercent = parseDiscountPercent(picked.discountPercent);
        setDiscountType('percent');
        setDiscountValue(discountPercent > 0 ? String(discountPercent) : '');
    }, [linkedOrder, discountFromOrder]);

    const handleClientSelect = useCallback((value) => {
        setSelectedClientId(value);
        if (!value) return;
        const picked = clients.find(c => String(c.id) === String(value));
        if (picked) applyClient(picked);
    }, [clients, applyClient]);

    useEffect(() => {
        clientsApi.list()
            .then(data => setClients(Array.isArray(data) ? data : []))
            .catch(() => setClients([]));
    }, []);

    useEffect(() => {
        if (!isNew || clients.length === 0) return;
        const queryClientId = searchParams.get('clientId');
        if (!queryClientId) return;
        const picked = clients.find(c => String(c.id) === String(queryClientId));
        if (picked) applyClient(picked);
    }, [isNew, clients, searchParams, applyClient]);

    useEffect(() => {
        if (isNew) return undefined;

        let cancelled = false;
        (async () => {
            try {
                const data = await rentalApplicationsApi.get(id);
                if (!data || cancelled) return;

                setApplicationNumber(data.applicationNumber || '');
                setStatus(data.status || 'draft');
                setNotes(data.notes || '');
                setRentStartTime(data.rentStartTime || data.linkedOrder?.rentStartTime || '');

                const resolvedDiscount = resolveApplicationDiscount(data);
                setDiscountType(resolvedDiscount.discountType);
                setDiscountValue(resolvedDiscount.discountValue);

                setClient({
                    name: data.clientName || '',
                    phone: data.clientPhone || '',
                    email: data.clientEmail || '',
                    passport: data.clientPassport || '',
                    address: data.clientAddress || '',
                    siteAddress: data.clientSiteAddress || '',
                });
                setSelectedClientId(data.clientId ? String(data.clientId) : '');
                setLinkedOrder(data.linkedOrder || null);
                if (data.responsible && Array.isArray(data.responsible)) {
                    setResponsible(data.responsible);
                }

                const rawItems = data.items && data.items.length > 0 ? data.items : [emptyItem()];
                const enrichedItems = await Promise.all(rawItems.map((item) => enrichApplicationItem(item)));
                if (!cancelled) {
                    setItems(enrichedItems);
                    setItemsReady(true);
                }
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [id, isNew]);

    // Order lines own qty/product identity; application lines keep enrichment only.
    useEffect(() => {
        if (!embedded || !itemsReady || !orderItems || !rentProductIds) return;
        setItems((prev) => mergeOrderLinesIntoRentalItems(
            orderItems,
            rentProductIds,
            prev,
            products
        ));
    }, [embedded, itemsReady, orderItems, rentProductIds, products]);

    useEffect(() => {
        if (!onTotalsChange) return;
        const totals = computeRentalTotals(items, effectiveDiscountType, effectiveDiscountValue);
        onTotalsChange(totals);
    }, [items, effectiveDiscountType, effectiveDiscountValue, onTotalsChange]);

    const updateItem = useCallback((key, field, value) => {
        setItems(prev => prev.map(item => {
            if (item._key !== key) return item;

            const updated = { ...item, [field]: value };

            if (field === 'rentFrom' || field === 'rentTo') {
                return recalcLineTotals(updated);
            }
            if (field === 'quantity') {
                updated.weightTotal = (parseFloat(updated.weightPerUnit || 0) * parseFloat(value || 1)).toFixed(2);
                updated.replacementCostTotal = (parseFloat(updated.replacementCostPerUnit || 0) * parseFloat(value || 1)).toFixed(2);
                updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
                return recalcLineTotals(updated);
            }
            if (field === 'replacementCostPerUnit') {
                updated.replacementCostTotal = (parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                updated.depositAmount = (parseFloat(updated.replacementCostTotal) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
                return updated;
            }
            if (field === 'depositPercent') {
                updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(value || 0) / 100).toFixed(2);
                return updated;
            }
            if (field === 'pricePerDay') {
                updated.totalRental = (updated.days * parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                return updated;
            }
            return updated;
        }));
    }, []);

    const removeItem = useCallback((key) => {
        setItems(prev => prev.filter(i => i._key !== key));
    }, []);

    const addEmptyItem = useCallback(() => {
        setItems(prev => [...prev, emptyItem()]);
    }, []);

    const removeKitItem = useCallback((itemKey, kitIndex) => {
        setItems(prev =>
            prev.map(it => {
                if (it._key !== itemKey) return it;
                const nextKitItems = Array.isArray(it.kitItems)
                    ? it.kitItems.filter((_, index) => index !== kitIndex)
                    : [];
                return { ...it, kitItems: nextKitItems };
            })
        );
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        const {
            totalRentalAfterDiscount,
            totalDeposit,
            parsedDiscount,
            discountAmount,
        } = computeRentalTotals(items, effectiveDiscountType, effectiveDiscountValue);

        const payload = {
            status,
            notes,
            rentStartTime: (orderRentStartTime != null && orderRentStartTime !== ''
                ? orderRentStartTime
                : rentStartTime) || null,
            clientName: effectiveClient.name,
            clientPhone: normalizeUaPhone(effectiveClient.phone),
            clientEmail: effectiveClient.email,
            clientPassport: effectiveClient.passport,
            clientAddress: effectiveClient.address,
            clientSiteAddress: effectiveClient.siteAddress,
            clientId: effectiveClientId ? Number(effectiveClientId) : null,
            responsible: (effectiveResponsible || []).map((person) => ({
                ...person,
                phone: normalizeUaPhone(person.phone),
            })),
            rentFrom: items[0]?.rentFrom || null,
            rentTo: items[0]?.rentTo || null,
            items: items.map((row) => {
                const { _key, ...rest } = row;
                void _key;
                return rest;
            }),
            totalAmount: totalRentalAfterDiscount.toFixed(2),
            depositAmount: totalDeposit.toFixed(2),
            discountType: effectiveDiscountType,
            discountValue: parsedDiscount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
        };

        const doSave = async (attempt = 1) => {
            try {
                const saved = isNew
                    ? await rentalApplicationsApi.create(payload)
                    : await rentalApplicationsApi.update(id, payload);
                if (embedded && onSaved) {
                    onSaved(saved);
                } else if (isNew) {
                    navigate(`/admin/rental-applications/${saved.id}`, { replace: true });
                }
                return saved;
            } catch (err) {
                if (attempt === 1 && (err.status === 503 || err.status === 401)) {
                    await new Promise(r => setTimeout(r, 600));
                    return doSave(2);
                }
                throw err;
            }
        };

        try {
            await doSave();
        } catch (err) {
            alert(`Помилка збереження: ${err.message}`);
        } finally {
            setSaving(false);
        }
    }, [status, notes, rentStartTime, orderRentStartTime, effectiveClient, effectiveClientId, effectiveResponsible, items, isNew, id, navigate, effectiveDiscountType, effectiveDiscountValue, embedded, onSaved]);

    return {
        loading,
        saving,
        applicationNumber,
        status,
        setStatus,
        notes,
        setNotes,
        rentStartTime,
        setRentStartTime,
        discountType: effectiveDiscountType,
        setDiscountType,
        discountValue: effectiveDiscountValue,
        setDiscountValue,
        discountFromOrder,
        clients,
        selectedClientId: effectiveClientId,
        client: effectiveClient,
        setClient,
        responsible: effectiveResponsible,
        setResponsible,
        items,
        setItems,
        linkedOrder,
        applyClient,
        handleClientSelect,
        updateItem,
        removeItem,
        addEmptyItem,
        removeKitItem,
        handleSave,
    };
}
