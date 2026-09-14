import { Repeat, ThumbsUp, AlertTriangle, Ban } from 'lucide-react';

// Статусні прапорці клієнта — незалежні один від одного (може бути кілька
// одразу). Спільний список для списку клієнтів і картки клієнта.
export const CLIENT_FLAGS = [
    { key: 'isRegularClient', label: 'Постійний клієнт', icon: Repeat, tone: 'info' },
    { key: 'isGoodClient', label: 'Хороший клієнт', icon: ThumbsUp, tone: 'success' },
    { key: 'hasComplaint', label: 'Претензія до клієнта', icon: AlertTriangle, tone: 'warning' },
    { key: 'isBlacklisted', label: 'Клієнт у чорному списку', icon: Ban, tone: 'danger' },
];
