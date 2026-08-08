export const STATUS_META = {
    draft:    { label: 'Чернетка',     variant: 'secondary' },
    active:   { label: 'Активна',      variant: 'success'   },
    booked:   { label: 'Заброньовано', variant: 'default'   },
    overdue:  { label: 'Прострочено',  variant: 'danger'    },
    returned: { label: 'Повернуто',    variant: 'secondary' },
    cancelled:{ label: 'Скасована',    variant: 'danger'    },
};

export const STATUS_FILTER_OPTIONS = [
    { value: 'draft',     label: 'Чернетки' },
    { value: 'active',    label: 'Активні' },
    { value: 'booked',    label: 'Заброньовані' },
    { value: 'overdue',   label: 'Прострочені' },
    { value: 'returned',  label: 'Повернуто' },
    { value: 'cancelled', label: 'Скасовані' },
];

export function getStatusLabel(status) {
    return STATUS_META[status]?.label ?? status;
}

export const STATUS_SELECT_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
}));
