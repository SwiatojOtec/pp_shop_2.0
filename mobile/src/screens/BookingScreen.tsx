import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { searchRentProducts, Product } from '../api/products';
import { listActiveBookingsForProduct, createBooking, RentalBooking } from '../api/rentalBookings';
import { ApiError } from '../api/client';

function toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function fmtUa(iso: string): string {
    return iso ? iso.split('-').reverse().join('.') : '—';
}

function addDays(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return toIsoDate(d);
}

export default function BookingScreen() {
    const navigation = useNavigation<any>();

    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const latestSearchRef = useRef('');

    const [product, setProduct] = useState<Product | null>(null);
    const [existing, setExisting] = useState<RentalBooking[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(false);

    const today = toIsoDate(new Date());
    const [rentFrom, setRentFrom] = useState(today);
    const [rentTo, setRentTo] = useState(addDays(today, 1));
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [note, setNote] = useState('');
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
                const rows = await searchRentProducts(val);
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

    const selectProduct = useCallback((p: Product) => {
        setProduct(p);
        setSearch('');
        setResults([]);
        setLoadingExisting(true);
        listActiveBookingsForProduct(p.id)
            .then(setExisting)
            .catch(() => setExisting([]))
            .finally(() => setLoadingExisting(false));
    }, []);

    function openDatePicker(current: string, onPicked: (iso: string) => void) {
        DateTimePickerAndroid.open({
            value: new Date(`${current}T00:00:00`),
            mode: 'date',
            onChange: (_event, selectedDate) => {
                if (selectedDate) onPicked(toIsoDate(selectedDate));
            },
        });
    }

    async function handleSubmit() {
        if (!product) {
            Alert.alert('Оберіть товар', 'Спочатку знайдіть інструмент для брони.');
            return;
        }
        if (rentTo < rentFrom) {
            Alert.alert('Некоректні дати', 'Дата «по» не може бути раніше за «з».');
            return;
        }
        setSubmitting(true);
        try {
            await createBooking({
                productId: product.id,
                rentFrom,
                rentTo,
                clientName: clientName.trim() || undefined,
                clientPhone: clientPhone.trim() || undefined,
                note: note.trim() || undefined,
            });
            Alert.alert('Готово', `Бронь на «${product.name}» створено.`);
            setProduct(null);
            setExisting([]);
            setClientName('');
            setClientPhone('');
            setNote('');
            setRentFrom(today);
            setRentTo(addDays(today, 1));
        } catch (err) {
            Alert.alert('Не вдалося забронювати', err instanceof ApiError ? err.message : 'Спробуйте ще раз');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹ Назад</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Нова бронь</Text>
                <View style={{ width: 56 }} />
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                {!product ? (
                            <View style={styles.searchWrap}>
                                <Text style={styles.label}>Інструмент</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Пошук за назвою або SKU..."
                                    value={search}
                                    onChangeText={setSearch}
                                />
                                {searching && <ActivityIndicator style={styles.searchSpinner} />}
                                {results.length > 0 && (
                                    <View style={styles.dropdown}>
                                        {results.map((p) => (
                                            <Pressable key={p.id} style={styles.dropdownItem} onPress={() => selectProduct(p)}>
                                                <Text style={styles.dropdownName} numberOfLines={1}>{p.name}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.productCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.productName}>{product.name}</Text>
                                    <Text style={styles.productMeta}>{product.sku || '—'}</Text>
                                </View>
                                <Pressable onPress={() => { setProduct(null); setExisting([]); }}>
                                    <Text style={styles.changeBtn}>Змінити</Text>
                                </Pressable>
                            </View>
                        )}

                        {product && (
                            <>
                                {loadingExisting ? (
                                    <ActivityIndicator style={{ marginTop: 12 }} color="#c0392b" />
                                ) : existing.length > 0 ? (
                                    <View style={styles.existingBox}>
                                        <Text style={styles.existingTitle}>Уже заброньовано:</Text>
                                        {existing.map((b) => (
                                            <Text key={b.id} style={styles.existingRow}>
                                                {fmtUa(b.rentFrom)} — {fmtUa(b.rentTo)}{b.clientName ? ` · ${b.clientName}` : ''}
                                            </Text>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.existingEmpty}>Активних броней немає.</Text>
                                )}

                                <View style={styles.dateRow}>
                                    <Pressable style={styles.dateField} onPress={() => openDatePicker(rentFrom, setRentFrom)}>
                                        <Text style={styles.label}>З</Text>
                                        <Text style={styles.dateValue}>{fmtUa(rentFrom)}</Text>
                                    </Pressable>
                                    <Pressable style={styles.dateField} onPress={() => openDatePicker(rentTo, setRentTo)}>
                                        <Text style={styles.label}>По</Text>
                                        <Text style={styles.dateValue}>{fmtUa(rentTo)}</Text>
                                    </Pressable>
                                </View>

                                <Text style={styles.label}>Клієнт (необов'язково)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ім'я клієнта"
                                    value={clientName}
                                    onChangeText={setClientName}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Телефон (380...)"
                                    keyboardType="phone-pad"
                                    value={clientPhone}
                                    onChangeText={setClientPhone}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Примітка"
                                    value={note}
                                    onChangeText={setNote}
                                />

                                <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                                    {submitting
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.submitBtnText}>Забронювати</Text>}
                                </Pressable>
                            </>
                        )}
            </ScrollView>
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
    back: { color: '#c0392b', fontWeight: '600' },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    body: { padding: 16, paddingBottom: 48 },
    label: { fontSize: 12, color: '#6b7280', marginBottom: 4, marginTop: 4 },
    searchWrap: { marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 10,
    },
    searchSpinner: { position: 'absolute', right: 14, top: 34 },
    dropdown: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        marginTop: -4,
        marginBottom: 10,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    dropdownName: { fontSize: 14 },
    productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    productName: { fontSize: 16, fontWeight: '700' },
    productMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    changeBtn: { color: '#c0392b', fontWeight: '600', fontSize: 13 },
    existingBox: {
        backgroundColor: '#fef2f2',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    existingTitle: { fontSize: 13, fontWeight: '700', color: '#991b1b', marginBottom: 4 },
    existingRow: { fontSize: 13, color: '#991b1b' },
    existingEmpty: { fontSize: 13, color: '#16a34a', marginBottom: 12 },
    dateRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    dateField: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    dateValue: { fontSize: 16, fontWeight: '700' },
    submitBtn: {
        backgroundColor: '#c0392b',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
