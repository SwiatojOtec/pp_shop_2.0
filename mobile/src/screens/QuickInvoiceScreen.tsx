import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { searchProducts, Product } from '../api/products';
import { createAdminOrder, createInvoiceDocument, downloadInvoiceFile, OrderItem } from '../api/orders';
import { ApiError } from '../api/client';

function money(n: number): string {
    return n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuickInvoiceScreen() {
    const navigation = useNavigation<any>();

    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    // Захист від застарілої відповіді пошуку, що прилетіла після новішої
    // (той самий баг і фікс, що вже був у ProductRelatedSearch.jsx у вебі).
    const latestSearchRef = useRef('');

    const [cart, setCart] = useState<OrderItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const val = search.trim();
        latestSearchRef.current = val;
        if (val.length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const rows = await searchProducts(val);
                if (latestSearchRef.current !== val) return;
                setResults(rows);
            } catch {
                if (latestSearchRef.current === val) setResults([]);
            } finally {
                if (latestSearchRef.current === val) setSearching(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const addToCart = useCallback((product: Product) => {
        setCart((prev) => {
            const existing = prev.find((it) => it.id === product.id);
            if (existing) {
                return prev.map((it) => (it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
            }
            return [
                ...prev,
                {
                    id: product.id,
                    name: product.name,
                    sku: product.sku || '',
                    price: Number(product.price) || 0,
                    quantity: 1,
                    unit: product.unit || 'шт',
                    packSize: product.packSize || 1,
                    isRent: !!product.isRent,
                },
            ];
        });
        setSearch('');
        setResults([]);
    }, []);

    function updateQty(id: number, delta: number) {
        setCart((prev) => prev
            .map((it) => (it.id === id ? { ...it, quantity: it.quantity + delta } : it))
            .filter((it) => it.quantity > 0));
    }

    function removeItem(id: number) {
        setCart((prev) => prev.filter((it) => it.id !== id));
    }

    const total = cart.reduce((sum, it) => sum + it.price * it.quantity * (it.packSize || 1), 0);

    async function handleCreateInvoice() {
        if (!customerName.trim() || !customerPhone.trim()) {
            Alert.alert("Заповніть дані", "Вкажіть ім'я та телефон клієнта.");
            return;
        }
        if (!cart.length) {
            Alert.alert('Порожньо', 'Додайте хоча б одну позицію.');
            return;
        }
        setSubmitting(true);
        try {
            const order = await createAdminOrder({
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                items: cart,
                totalAmount: total,
            });
            const doc = await createInvoiceDocument(order.id);
            const bytes = await downloadInvoiceFile(order.id, doc.id);

            const file = new File(Paths.cache, doc.fileName || `invoice_${order.orderNumber}.pdf`);
            file.write(new Uint8Array(bytes));

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf' });
            } else {
                Alert.alert('Готово', `Рахунок №${order.orderNumber} створено, але поділитися файлом на цьому пристрої не вийшло.`);
            }

            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
        } catch (err) {
            Alert.alert('Помилка', err instanceof ApiError ? err.message : 'Не вдалося створити рахунок');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                    <Text style={styles.logout}>‹ Назад</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Швидкий рахунок</Text>
                <View style={{ width: 56 }} />
            </View>

            <View style={styles.searchWrap}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Пошук товару за назвою або SKU..."
                    value={search}
                    onChangeText={setSearch}
                />
                {searching && <ActivityIndicator style={styles.searchSpinner} />}
                {results.length > 0 && (
                    <View style={styles.dropdown}>
                        {results.map((p) => (
                            <Pressable key={p.id} style={styles.dropdownItem} onPress={() => addToCart(p)}>
                                <Text style={styles.dropdownName} numberOfLines={1}>{p.name}</Text>
                                <Text style={styles.dropdownPrice}>{money(Number(p.price))} ₴</Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>

            <FlatList
                style={styles.cartList}
                data={cart}
                keyExtractor={(it) => String(it.id)}
                ListEmptyComponent={<Text style={styles.emptyHint}>Позицій поки немає — знайдіть товар вище.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.cartRow}>
                        <View style={styles.cartRowMain}>
                            <Text style={styles.cartName} numberOfLines={2}>{item.name}</Text>
                            <Text style={styles.cartMeta}>{money(item.price)} ₴ / {item.unit}</Text>
                        </View>
                        <View style={styles.qtyControls}>
                            <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                                <Text style={styles.qtyBtnText}>–</Text>
                            </Pressable>
                            <Text style={styles.qtyValue}>{item.quantity}</Text>
                            <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                                <Text style={styles.qtyBtnText}>+</Text>
                            </Pressable>
                        </View>
                        <Pressable onPress={() => removeItem(item.id)}>
                            <Text style={styles.removeBtn}>✕</Text>
                        </Pressable>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Разом</Text>
                    <Text style={styles.totalValue}>{money(total)} ₴</Text>
                </View>

                <TextInput
                    style={styles.input}
                    placeholder="Ім'я клієнта"
                    value={customerName}
                    onChangeText={setCustomerName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Телефон (380...)"
                    keyboardType="phone-pad"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                />

                <Pressable style={styles.submitBtn} onPress={handleCreateInvoice} disabled={submitting}>
                    {submitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitBtnText}>Створити рахунок</Text>}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    logout: { color: '#c0392b', fontWeight: '600' },
    searchWrap: { paddingHorizontal: 16, marginTop: 12 },
    searchInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
    },
    searchSpinner: { position: 'absolute', right: 28, top: 12 },
    dropdown: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        marginTop: 6,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dropdownName: { flex: 1, fontSize: 14, marginRight: 8 },
    dropdownPrice: { fontSize: 14, fontWeight: '700', color: '#c0392b' },
    cartList: { flex: 1, marginTop: 12, paddingHorizontal: 16 },
    emptyHint: { color: '#9ca3af', textAlign: 'center', marginTop: 24 },
    cartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        gap: 10,
    },
    cartRowMain: { flex: 1 },
    cartName: { fontSize: 14, fontWeight: '600' },
    cartMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyBtnText: { fontSize: 16, fontWeight: '700' },
    qtyValue: { minWidth: 20, textAlign: 'center', fontWeight: '700' },
    removeBtn: { color: '#9ca3af', fontSize: 16, paddingHorizontal: 4 },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    totalLabel: { fontSize: 16, fontWeight: '700' },
    totalValue: { fontSize: 18, fontWeight: '800', color: '#c0392b' },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 8,
    },
    submitBtn: {
        backgroundColor: '#c0392b',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
