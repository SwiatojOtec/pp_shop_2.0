import { useCountUp } from './useCountUp';

/** One KPI tile — value + label, optional hint line (e.g. margin %, coverage %).
 *  Pass `rawValue` + `format` for a number that animates in when it changes
 *  (period/product switch); pass a plain `value` string for anything else. */
export default function KpiCard({ label, value, rawValue, format, hint, tone }) {
    const animated = useCountUp(rawValue ?? 0);
    const display = rawValue != null && format ? format(animated) : value;

    return (
        <div className={`analytics-kpi${tone ? ` analytics-kpi--${tone}` : ''}`}>
            <span className="analytics-kpi-label">{label}</span>
            <span className="analytics-kpi-value">{display}</span>
            {hint && <span className="analytics-kpi-hint">{hint}</span>}
        </div>
    );
}
