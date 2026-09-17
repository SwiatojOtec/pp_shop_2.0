import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { listWarehouses, Warehouse } from '../api/warehouses';
import { ApiError } from '../api/client';

export default function WarehousePickerScreen() {
    const navigation = useNavigation<any>();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        listWarehouses()
            .then(setWarehouses)
            .catch((err) => setError(err instanceof ApiError ? err.message : 'Не вдалося завантажити склади'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹ Назад</Text>
                </Pressable>
                <Text style={styles.title}>Оберіть склад</Text>
            </View>

            {loading && <ActivityIndicator style={{ marginTop: 24 }} color="#c0392b" />}
            {!!error && <Text style={styles.error}>{error}</Text>}

            <FlatList
                data={warehouses}
                keyExtractor={(w) => String(w.id)}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.row}
                        onPress={() => navigation.navigate('Recount', { warehouseId: item.id, warehouseName: item.name })}
                    >
                        <Text style={styles.rowText}>{item.name}</Text>
                        <Text style={styles.rowArrow}>›</Text>
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    back: { color: '#c0392b', fontSize: 15, marginBottom: 8 },
    title: { fontSize: 22, fontWeight: '800' },
    error: { color: '#c0392b', textAlign: 'center', marginTop: 16 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 10,
    },
    rowText: { fontSize: 16, fontWeight: '600' },
    rowArrow: { fontSize: 20, color: '#9ca3af' },
});
