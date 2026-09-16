import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../../admin/ui/ConfirmDialog';
import StepChain from '../../../admin/ui/StepChain';
import { getDealSteps } from '../../../admin/model/dealStatus';
import { getSeller } from '../../../../constants/sellers';
import { orderHasShopItems, formatOrderNumberDisplay, formatOrderDate } from '../../amounts/orderHelpers';

export default function OrderHeader({
    order,
    draft,
    linkedClient,
    hasRent,
    rentProductIds,
    saving,
    dirty,
    justSaved,
    onSave,
    onDeleteOpen,
    onStatusChange,
}) {
    const [pendingStep, setPendingStep] = useState(null);
    const isDelivery = draft.deliveryMethod === 'delivery';
    const steps = getDealSteps(draft.status, hasRent, isDelivery);
    const currentIndex = steps.findIndex((s) => s.state === 'now');
    const hasShop = orderHasShopItems(draft, rentProductIds);

    function handleStepClick(key) {
        const idx = steps.findIndex((s) => s.key === key);
        if (idx < 0 || idx === currentIndex) return;
        if (idx < currentIndex) {
            setPendingStep(key);
        } else {
            onStatusChange(key);
        }
    }

    const pendingLabel = steps.find((s) => s.key === pendingStep)?.label || '';

    return (
        <header className="deal-header">
            <div className="deal-header__top">
                <Link to="/admin/deals" className="ds-icon-btn" title="До списку">
                    <ArrowLeft size={18} />
                </Link>

                <div className="deal-header__ident">
                    <div className="deal-header__title-row">
                        <span className="deal-header__number">
                            {formatOrderNumberDisplay(order.orderNumber || `#${order.id}`)}
                        </span>
                        {hasRent && <span className="ds-badge ds-badge--info">оренда</span>}
                        {hasShop && <span className="ds-badge ds-badge--neutral">магазин</span>}
                        {draft.status === 'cancelled' && <span className="ds-badge ds-badge--danger">Скасовано</span>}
                    </div>
                    <div className="deal-header__sub">
                        Створено {formatOrderDate(order.createdAt)}
                        {order.createdByName && ` (${order.createdByName})`}
                        {' · '}{linkedClient?.fullName || draft.customerName || '—'}
                        {' · '}{getSeller(draft.sellerId).label}
                        {order.closedByName && ` · Закрив: ${order.closedByName}`}
                    </div>
                </div>

                <div className="deal-header__actions">
                    {dirty && <span className="deal-header__dirty">Є незбережені зміни</span>}
                    {!dirty && justSaved && (
                        <span className="deal-header__saved">
                            <Check size={14} /> Збережено
                        </span>
                    )}
                    <button type="button" className="ds-icon-btn" onClick={onDeleteOpen} title="Видалити угоду">
                        <Trash2 size={16} />
                    </button>
                    <button type="button" className="ds-btn ds-btn--primary" onClick={onSave} disabled={saving}>
                        {saving ? 'Збереження…' : 'Зберегти'}
                    </button>
                </div>
            </div>

            <StepChain steps={steps} onSelect={handleStepClick} disabled={saving} />

            <ConfirmDialog
                open={!!pendingStep}
                danger={false}
                title="Повернути угоду на попередній крок?"
                message={`Статус зміниться на «${pendingLabel}». Це не пов'язано з фактичним поверненням інструменту — переконайтесь, що це саме те, що сталось.`}
                confirmText="Змінити"
                onConfirm={() => {
                    onStatusChange(pendingStep);
                    setPendingStep(null);
                }}
                onCancel={() => setPendingStep(null)}
            />
        </header>
    );
}
