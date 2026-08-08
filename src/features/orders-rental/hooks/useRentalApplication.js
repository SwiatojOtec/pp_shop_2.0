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

export function useRentalApplication(id, isNew, options = {}) {
    const { embedded = false, onSaved } = options;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [applicationNumber, setApplicationNumber] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');
    const [discountType, setDiscountType] = useState('fixed');
    const [discountValue, setDiscountValue] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [client, setClient] = useState({ name: '', phone: '', email: '', passport: '', address: '', siteAddress: '' });
    const [responsible, setResponsible] = useState([]);
    const [items, setItems] = useState([emptyItem()]);
    const [linkedOrder, setLinkedOrder] = useState(null);

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
        const discountPercent = parseDiscountPercent(picked.discountPercent);
        setDiscountType('percent');
        setDiscountValue(discountPercent > 0 ? String(discountPercent) : '');
    }, []);

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
                }
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [id, isNew]);

    const updateItem = useCallback((key, field, value) => {
        setItems(prev => prev.map(item => {
            if ((field === 'rentFrom' || field === 'rentTo') && item._key !== key) {
                const merged = { ...item, [field]: value };
                return recalcLineTotals(merged);
            }

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
        } = computeRentalTotals(items, discountType, discountValue);

        const payload = {
            status,
            notes,
            clientName: client.name,
            clientPhone: normalizeUaPhone(client.phone),
            clientEmail: client.email,
            clientPassport: client.passport,
            clientAddress: client.address,
            clientSiteAddress: client.siteAddress,
            clientId: selectedClientId ? Number(selectedClientId) : null,
            responsible: responsible.map((person) => ({
                ...person,
                phone: normalizeUaPhone(person.phone),
            })),
            rentFrom: items[0]?.rentFrom || null,
            rentTo: items[0]?.rentTo || null,
            items: items.map(({ _key, ...i }) => i),
            totalAmount: totalRentalAfterDiscount.toFixed(2),
            depositAmount: totalDeposit.toFixed(2),
            discountType,
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
    }, [status, notes, client, selectedClientId, responsible, items, isNew, id, navigate, discountType, discountValue, embedded, onSaved]);

    return {
        loading,
        saving,
        applicationNumber,
        status,
        setStatus,
        notes,
        setNotes,
        discountType,
        setDiscountType,
        discountValue,
        setDiscountValue,
        clients,
        selectedClientId,
        client,
        setClient,
        responsible,
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
