/**
 * Filter-dropdown labels only ("show all X" reads better in the plural in
 * Ukrainian). The badge/select labels themselves come from the single status
 * source at src/features/admin/model/status.js (domain 'rental') — don't add
 * another status map here.
 */
export const STATUS_FILTER_OPTIONS = [
    { value: 'draft',     label: 'Чернетки' },
    { value: 'active',    label: 'Активні' },
    { value: 'booked',    label: 'Заброньовані' },
    { value: 'overdue',   label: 'Прострочені' },
    { value: 'returned',  label: 'Повернуто' },
    { value: 'cancelled', label: 'Скасовані' },
];
