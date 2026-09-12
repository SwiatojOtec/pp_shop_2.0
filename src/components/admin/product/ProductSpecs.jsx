import { useState } from 'react';
import { Settings, Trash2, Plus, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getOrderedSpecEntries } from '../../../utils/specsOrder';

function SortableSpecRow({ id, keyLabel, value, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="spec-item">
            <button
                type="button"
                className="spec-drag-handle"
                title="Перетягнути для зміни порядку"
                {...attributes}
                {...listeners}
            >
                <GripVertical size={16} />
            </button>
            <span className="spec-item-text"><strong>{keyLabel}:</strong> {value}</span>
            <button
                type="button"
                className="ds-icon-btn ds-icon-btn--danger"
                onClick={() => onRemove(keyLabel)}
                title="Видалити"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

/**
 * Product specifications (key-value pairs) editor, з перетягуванням для
 * зміни порядку показу. `specs` лишається обʼєктом (для сумісності з
 * JSONB-фільтром каталогу на сервері) — порядок зберігається окремо, у
 * specsOrder (масив ключів), див. src/utils/specsOrder.js.
 */
export default function ProductSpecs({ specs = {}, specsOrder = [], onChange }) {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const orderedEntries = getOrderedSpecEntries(specs, specsOrder);
    const orderedKeys = orderedEntries.map(([key]) => key);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function addSpec() {
        if (!newKey.trim() || !newValue.trim()) return;
        const key = newKey.trim();
        onChange({ ...specs, [key]: newValue.trim() }, [...orderedKeys, key]);
        setNewKey('');
        setNewValue('');
    }

    function removeSpec(key) {
        const next = { ...specs };
        delete next[key];
        onChange(next, orderedKeys.filter((k) => k !== key));
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = orderedKeys.indexOf(active.id);
        const newIndex = orderedKeys.indexOf(over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const nextOrder = [...orderedKeys];
        nextOrder.splice(oldIndex, 1);
        nextOrder.splice(newIndex, 0, active.id);
        onChange(specs, nextOrder);
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <Settings size={20} />
                <h2 className="section-title">Характеристики</h2>
            </div>

            <div className="specs-list">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedKeys} strategy={verticalListSortingStrategy}>
                        {orderedEntries.map(([key, value]) => (
                            <SortableSpecRow key={key} id={key} keyLabel={key} value={value} onRemove={removeSpec} />
                        ))}
                    </SortableContext>
                </DndContext>
                {orderedEntries.length === 0 && (
                    <p className="empty-hint">Характеристик ще немає</p>
                )}
            </div>

            <div className="add-spec-form">
                <input
                    type="text"
                    placeholder="Назва (напр. Товщина)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())}
                />
                <input
                    type="text"
                    placeholder="Значення (напр. 14 мм)"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpec())}
                />
                <button type="button" onClick={addSpec} className="ds-btn ds-btn--secondary">
                    <Plus size={18} />
                </button>
            </div>
        </div>
    );
}
