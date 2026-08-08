import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import {
    ORDER_STATUS_VARIANT,
    getOrderStatusLabel,
    formatOrderNumberDisplay,
    formatOrderDate,
} from '../../amounts/orderHelpers';

export default function OrderHeader({
    order,
    linkedClient,
    saving,
    onSave,
    onDeleteOpen,
}) {
    const navigate = useNavigate();

    return (
        <div className="od-header">
            <button type="button" className="od-back" onClick={() => navigate('/admin/orders')} title="До списку">
                <ArrowLeft size={18} />
            </button>

            <div className="od-header-main">
                <h1 className="od-title">{formatOrderNumberDisplay(order.orderNumber || `#${order.id}`)}</h1>
                <div className="od-meta">
                    <Badge variant={ORDER_STATUS_VARIANT[order.status] || 'secondary'}>
                        {getOrderStatusLabel(order.status)}
                    </Badge>
                    <span>Створено {formatOrderDate(order.createdAt)}</span>
                    {linkedClient && (
                        <Link to={`/admin/clients/${linkedClient.id}`} className="text-[#e63946] font-semibold no-underline hover:underline">
                            Картка клієнта →
                        </Link>
                    )}
                </div>
            </div>

            <div className="od-header-actions">
                <Button variant="ghost" size="sm" className="text-red-500" onClick={onDeleteOpen}>
                    <Trash2 size={14} /> Видалити
                </Button>
                <Button size="sm" onClick={onSave} disabled={saving}>
                    <Save size={14} /> {saving ? 'Збереження...' : 'Зберегти'}
                </Button>
            </div>
        </div>
    );
}
