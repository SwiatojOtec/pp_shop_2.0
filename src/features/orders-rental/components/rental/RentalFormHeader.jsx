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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Link to="/admin/deals?type=rent" className="btn-back">
                    <ArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="admin-title" style={{ marginBottom: 2 }}>
                        {isNew ? 'Нова заявка' : `Заявка ${applicationNumber}`}
                    </h1>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>{today}</span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <select value={status} onChange={e => onStatusChange(e.target.value)} className="status-select">
                    {getStatusOptions('rental').map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <button onClick={onSave} disabled={saving} className="btn btn-primary">
                    <Save size={16} /> {saving ? 'Збереження...' : 'Зберегти'}
                </button>
            </div>
        </div>
    );
}
