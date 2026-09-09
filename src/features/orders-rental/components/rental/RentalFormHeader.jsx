import { Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getStatusOptions } from '../../../admin/model/status';

export default function RentalFormHeader({
    isNew,
    applicationNumber,
    status,
    onStatusChange,
    saving,
    onSave,
}) {
    const today = new Date().toLocaleDateString('uk-UA');

    return (
        <div className="rental-form-header">
            <div className="rental-form-header-left">
                <Link to="/admin/deals?type=rent" className="btn-back">
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="rental-form-title">
                        {isNew ? 'Нова заявка' : `Заявка ${applicationNumber}`}
                    </h1>
                    <span className="rental-form-date">{today}</span>
                </div>
            </div>
            <div className="rental-form-header-actions">
                <select value={status} onChange={e => onStatusChange(e.target.value)} className="status-select">
                    {getStatusOptions('rental').map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <button onClick={onSave} disabled={saving} className="ds-btn ds-btn--primary">
                    <Save size={16} /> {saving ? 'Збереження...' : 'Зберегти'}
                </button>
            </div>
        </div>
    );
}
