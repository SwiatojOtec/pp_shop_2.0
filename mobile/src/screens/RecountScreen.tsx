import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { listUnits, checkUnit, ProductUnit } from '../api/productUnits';
import { ApiError } from '../api/client';

const QR_PREFIX = 'PPU:';

function unitLabel(unit: ProductUnit): string {
    return unit.inventoryNumber || unit.serialNumber || `#${unit.id}`;
}

export default function RecountScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { warehouseId, warehouseName } = route.params as { warehouseId: number; warehouseName: string };

    const [units, setUnits] = useState<ProductUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [activeUnit, setActiveUnit] = useState<ProductUnit | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const [permission, requestPermission] = useCameraPermissions();

    const lastScan = useRef<{ id: number; at: number } | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        listUnits(warehouseId)
            .then(setUnits)
            .catch((err) => Alert.alert('Помилка', err instanceof ApiError ? err.message : 'Не вдалося завантажити одиниці'))
            .finally(() => setLoading(false));
    }, [warehouseId]);

    useEffect(() => { load(); }, [load]);

    const checkedCount = units.filter((u) => u.lastCheckedAt).length;

    function openManual(unit: ProductUnit) {
        setScanMessage('');
        setActiveUnit(unit);
    }

    function handleBarcodeScanned(result: BarcodeScanningResult) {
        const data = result.data || '';
        if (!data.startsWith(QR_PREFIX)) return;
        const id = Number(data.slice(QR_PREFIX.length));
        if (!Number.isFinite(id)) return;

        const now = Date.now();
        if (lastScan.current && lastScan.current.id === id && now - lastScan.current.at < 2000) {
            return; // дебаунс — той самий код щойно вже сканували
        }
        lastScan.current = { id, at: now };

        const unit = units.find((u) => u.id === id);
        if (!unit) {
            setScanMessage('Цієї одиниці немає в списку цього складу.');
            return;
        }
        setScanMessage('');
        setActiveUnit(unit);
    }

    async function confirmUnit(patch?: { technicalCondition?: string; isActive?: boolean }) {
        if (!activeUnit) return;
        setConfirming(true);
        try {
            const updated = await checkUnit(activeUnit.id, patch);
            setUnits((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
            setActiveUnit(null);
        } catch (err) {
            Alert.alert('Помилка', err instanceof ApiError ? err.message : 'Не вдалося підтвердити одиницю');
        } finally {
            setConfirming(false);
        }
    }

    async function handleOpenScanner() {
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) {
                Alert.alert('Потрібен дозвіл', 'Без доступу до камери сканування не працюватиме.');
                return;
            }
        }
        setScanning(true);
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹ Назад</Text>
                </Pressable>
                <Text style={styles.title}>{warehouseName}</Text>
                <Text style={styles.progress}>Перевірено {checkedCount} з {units.length}</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 24 }} color="#c0392b" />
            ) : (
                <FlatList
                    data={units}
                    keyExtractor={(u) => String(u.id)}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <Pressable style={[styles.row, item.lastCheckedAt && styles.rowChecked]} onPress={() => openManual(item)}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rowName} numberOfLines={1}>{item.Product?.name || '—'}</Text>
                                <Text style={styles.rowMeta}>{unitLabel(item)}</Text>
                            </View>
                            <Text style={item.lastCheckedAt ? styles.check : styles.checkEmpty}>
                                {item.lastCheckedAt ? '✓' : '—'}
                            </Text>
                        </Pressable>
                    )}
                />
            )}

            <Pressable style={styles.scanBtn} onPress={handleOpenScanner}>
                <Text style={styles.scanBtnText}>📷 Сканувати</Text>
            </Pressable>

            {scanning && (
                <View style={StyleSheet.absoluteFill}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={handleBarcodeScanned}
                    />
                    <View style={styles.scanOverlay}>
                        {!!scanMessage && <Text style={styles.scanMessage}>{scanMessage}</Text>}
                        <Pressable style={styles.scanCloseBtn} onPress={() => setScanning(false)}>
                            <Text style={styles.scanCloseBtnText}>✕ Закрити</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {activeUnit && (
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>{activeUnit.Product?.name || '—'}</Text>
                        <Text style={styles.confirmMeta}>{unitLabel(activeUnit)}</Text>
                        {confirming ? (
                            <ActivityIndicator color="#c0392b" style={{ marginTop: 16 }} />
                        ) : (
                            <View style={styles.confirmActions}>
                                <Pressable style={[styles.confirmBtn, styles.confirmBtnOk]} onPress={() => confirmUnit()}>
                                    <Text style={styles.confirmBtnOkText}>✓ Все ОК</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.confirmBtn}
                                    onPress={() => confirmUnit({ technicalCondition: 'Потребує ремонту' })}
                                >
                                    <Text style={styles.confirmBtnText}>Потребує ремонту</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.confirmBtn}
                                    onPress={() => confirmUnit({ isActive: false })}
                                >
                                    <Text style={styles.confirmBtnText}>Списати</Text>
                                </Pressable>
                                <Pressable style={styles.confirmCancel} onPress={() => setActiveUnit(null)}>
                                    <Text style={styles.confirmCancelText}>Скасувати</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    back: { color: '#c0392b', fontSize: 15, marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '800' },
    progress: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 8,
    },
    rowChecked: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
    rowName: { fontSize: 15, fontWeight: '600' },
    rowMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    check: { fontSize: 18, color: '#16a34a', fontWeight: '800' },
    checkEmpty: { fontSize: 18, color: '#d1d5db' },
    scanBtn: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        backgroundColor: '#c0392b',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    scanBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    scanOverlay: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        alignItems: 'center',
        gap: 10,
    },
    scanMessage: {
        color: '#fff',
        backgroundColor: 'rgba(192,57,43,0.9)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    scanCloseBtn: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
    },
    scanCloseBtnText: { color: '#fff', fontWeight: '700' },
    confirmOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    confirmCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
    },
    confirmTitle: { fontSize: 17, fontWeight: '800' },
    confirmMeta: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 16 },
    confirmActions: { gap: 10 },
    confirmBtn: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    confirmBtnOk: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    confirmBtnOkText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    confirmBtnText: { fontWeight: '600', fontSize: 15 },
    confirmCancel: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
    confirmCancelText: { color: '#9ca3af' },
});
