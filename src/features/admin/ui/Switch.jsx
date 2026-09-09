import './admin-ui.css';

/** Props: checked, onChange(next), disabled, label (for aria-label) */
export default function Switch({ checked, onChange, disabled = false, label }) {
    return (
        <label className="ds-switch" aria-label={label}>
            <input
                type="checkbox"
                checked={!!checked}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.checked)}
            />
            <span className="ds-switch-track" />
        </label>
    );
}
