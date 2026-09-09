import { Check } from 'lucide-react';
import './admin-ui.css';

/**
 * Props:
 *   steps    – [{key, label, state: 'done'|'now'|'todo'}]
 *   onSelect – (key) => void, optional — clicking a step changes status
 *   disabled – true while a change is in flight
 */
export default function StepChain({ steps, onSelect, disabled = false }) {
    return (
        <ol className="ds-steps">
            {steps.map((step, index) => (
                <li key={step.key} className={`ds-step ds-step--${step.state}`}>
                    <button
                        type="button"
                        className="ds-step-btn"
                        onClick={() => onSelect?.(step.key)}
                        disabled={disabled || !onSelect}
                    >
                        <span className="ds-step-marker">
                            {step.state === 'done' ? <Check size={12} /> : index + 1}
                        </span>
                        <span className="ds-step-label">{step.label}</span>
                    </button>
                </li>
            ))}
        </ol>
    );
}
