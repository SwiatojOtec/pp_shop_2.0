import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Save, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import StatusBadge from '../../../admin/ui/StatusBadge';
import { parseDiscountPercent } from '../../amounts/orderAmounts';
import {
    formatOrderNumberDisplay,
    formatOrderDate,
} from '../../amounts/orderHelpers';

const money = (value) => Number(value || 0).toLocaleString('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function OrderHeader({
    order,
    draft,
    linkedClient,
    linkedRentalApp,
    orderAmounts,
    liveDeposit = null,
    hasRent = false,
    saving,
    dirty,
    justSaved,
    onSave,
    onDeleteOpen,
}) {
    const navigate = useNavigate();
    const discount = parseDiscountPercent(draft?.discount);
    const deposit = liveDeposit != null
        ? Number(liveDeposit)
        : Number(linkedRentalApp?.depositAmount || 0);

    return (
        <header className="deal-header">
            <div className="deal-header__top">
                <button
                    type="button"
                    className="od-back"
                    onClick={() => navigate('/admin/deals')}
                    title="До списку"
                >
                    <ArrowLeft size={18} />
                </button>

                <div className="deal-header__ident">
                    <h1 className="od-title">
                        {formatOrderNumberDisplay(order.orderNumber || `#${order.id}`)}
                    </h1>
                    <StatusBadge domain="order" status={order.status} />
                    <span className="deal-header__date">
                        Створено {formatOrderDate(order.createdAt)}
                    </span>
                </div>

                <div className="deal-header__actions">
                    {dirty && <span className="deal-header__dirty">Є незбережені зміни</span>}
                    {!dirty && justSaved && (
                        <span className="deal-header__saved">
                            <Check size={14} /> Збережено
                        </span>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={onDeleteOpen}>
                        <Trash2 size={14} /> Видалити
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={saving}>
                        <Save size={14} /> {saving ? 'Збереження…' : 'Зберегти'}
                    </Button>
                </div>
            </div>

            <dl className="deal-summary">
                <div className="deal-summary__cell">
                    <dt>Клієнт</dt>
                    <dd>
                        {linkedClient ? (
                            <Link to={`/admin/clients/${linkedClient.id}`} className="deal-summary__link">
                                {linkedClient.fullName || draft?.customerName || '—'}
                            </Link>
                        ) : (
                            draft?.customerName || '—'
                        )}
                    </dd>
                </div>
                <div className="deal-summary__cell">
                    <dt>Сума замовлення</dt>
                    <dd className="deal-summary__accent">{money(orderAmounts?.total)} ₴</dd>
                </div>
                <div className="deal-summary__cell">
                    <dt>Знижка</dt>
                    <dd>{discount > 0 ? `${discount}%` : 'без знижки'}</dd>
                </div>
                {hasRent && (
                    <div className="deal-summary__cell">
                        <dt>Застава</dt>
                        <dd>{money(deposit)} ₴</dd>
                    </div>
                )}
                {linkedRentalApp && (
                    <div className="deal-summary__cell">
                        <dt>Заявка оренди</dt>
                        <dd>{linkedRentalApp.applicationNumber || `#${linkedRentalApp.id}`}</dd>
                    </div>
                )}
            </dl>
        </header>
    );
}
