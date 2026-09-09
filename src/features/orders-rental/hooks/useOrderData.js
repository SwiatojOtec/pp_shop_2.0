import { useEffect, useMemo, useState } from 'react';
import { ordersApi, productsApi, rentalApplicationsApi } from '../../../services/api';
import { resolveSellerId } from '../../../constants/sellers';
import { parseDiscountPercent, withOrderTotal, calcOrderAmounts } from '../amounts/orderAmounts';
import { normalizeUaPhone } from '../../../utils/phoneUtils';
import { enrichOrderItemsFromProducts, enrichRentOrderItemsFromApplication } from '../model/orderItems';

export function useOrderData(id) {
    const [order, setOrder] = useState(null);
    const [draft, setDraft] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState([]);
    const [linkedRentalApp, setLinkedRentalApp] = useState(null);

    const rentProductIds = useMemo(
        () => new Set(products.filter((p) => p.isRent).map((p) => p.id)),
        [products]
    );

    const billingOptions = useMemo(
        () => ({ rentProductIds, rentalApplication: linkedRentalApp }),
        [rentProductIds, linkedRentalApp]
    );

    const orderAmounts = useMemo(
        () => calcOrderAmounts(draft?.items, draft?.discount, draft?.sellerId, billingOptions),
        [draft?.items, draft?.discount, draft?.sellerId, billingOptions]
    );

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [orderData, productList, docsData] = await Promise.all([
                    ordersApi.get(id),
                    productsApi.list(),
                    ordersApi.listDocuments(id),
                ]);
                const productArr = Array.isArray(productList) ? productList : [];
                const rentIds = new Set(productArr.filter((p) => p.isRent).map((p) => p.id));

                let rentalApp = null;
                if (orderData?.rentalApplicationId) {
                    try {
                        rentalApp = await rentalApplicationsApi.get(orderData.rentalApplicationId);
                    } catch {
                        rentalApp = null;
                    }
                }

                setOrder(orderData);
                setLinkedRentalApp(rentalApp);
                setProducts(productArr);
                setDocuments(Array.isArray(docsData) ? docsData : []);
                setDraft(withOrderTotal({
                    ...orderData,
                    sellerId: resolveSellerId(orderData?.sellerId),
                    customerPhone: normalizeUaPhone(orderData?.customerPhone || ''),
                    discount: parseDiscountPercent(orderData?.discount),
                    items: enrichRentOrderItemsFromApplication(
                        enrichOrderItemsFromProducts(
                            orderData?.items ? [...orderData.items.map((i) => ({ ...i }))] : [],
                            productArr,
                            rentIds
                        ),
                        rentIds,
                        rentalApp,
                        productArr
                    ),
                }, { rentProductIds: rentIds, rentalApplication: rentalApp }));
            } catch {
                setOrder(null);
                setDraft(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    useEffect(() => {
        if (!draft || !linkedRentalApp) return;
        setDraft((prev) => {
            if (!prev) return prev;
            const next = withOrderTotal(prev, billingOptions);
            return next.totalAmount === prev.totalAmount ? prev : next;
        });
    }, [billingOptions, linkedRentalApp]);

    return {
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
    };
}
