import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const { logout } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>ПАН ПАРКЕТ</Text>
                    <Text style={styles.subtitle}>Адмін-додаток</Text>
                </View>
                <Pressable onPress={logout}>
                    <Text style={styles.logout}>Вийти</Text>
                </Pressable>
            </View>

            <View style={styles.menu}>
                <Pressable style={styles.card} onPress={() => navigation.navigate('QuickInvoice')}>
                    <Text style={styles.cardIcon}>🧾</Text>
                    <Text style={styles.cardTitle}>Швидкий рахунок</Text>
                    <Text style={styles.cardHint}>Товар, кількість, клієнт → PDF</Text>
                </Pressable>

                <Pressable style={styles.card} onPress={() => navigation.navigate('WarehousePicker')}>
                    <Text style={styles.cardIcon}>📷</Text>
                    <Text style={styles.cardTitle}>Переоблік</Text>
                    <Text style={styles.cardHint}>Сканування QR-наліпок на складі</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 24,
    },
    title: { fontSize: 24, fontWeight: '800' },
    subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    logout: { color: '#c0392b', fontWeight: '600' },
    menu: { paddingHorizontal: 20, gap: 14 },
    card: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        padding: 20,
        gap: 6,
    },
    cardIcon: { fontSize: 28 },
    cardTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
    cardHint: { fontSize: 13, color: '#6b7280' },
});
