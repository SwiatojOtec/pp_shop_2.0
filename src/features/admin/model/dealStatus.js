/* The Deal ("Угода") screen's single status chain
   (docs/admin-redesign/03-screens.md, «Угода»), replacing the old separate
   Order.status / RentalApplication.status selects. Labels/tones still come
   from ORDER_STATUS (model/status.js) — this file only orders the steps and
   decides which apply to a given deal. */
import { ORDER_STATUS } from './status';

/** Steps shown for every deal. */
const BASE_CHAIN = ['new', 'invoice', 'paid', 'done'];
/** Extra steps spliced in after `paid`, only for deals with rental items. */
const RENT_ONLY_STEPS = ['issued', 'returned'];

export function getDealChain(hasRent) {
    if (!hasRent) return BASE_CHAIN;
    const paidIndex = BASE_CHAIN.indexOf('paid');
    return [
        ...BASE_CHAIN.slice(0, paidIndex + 1),
        ...RENT_ONLY_STEPS,
        ...BASE_CHAIN.slice(paidIndex + 1),
    ];
}

/**
 * @returns {{key: string, label: string, state: 'done'|'now'|'todo'}[]}
 *   `cancelled` deals render the same chain frozen at the step they were on
 *   (no single position makes sense for a side-branch), the header is
 *   expected to show the Скасовано badge separately.
 */
export function getDealSteps(status, hasRent) {
    const chain = getDealChain(hasRent);
    const currentIndex = chain.indexOf(status);
    return chain.map((key, index) => ({
        key,
        label: ORDER_STATUS[key]?.label || key,
        state: currentIndex < 0
            ? 'todo'
            : index < currentIndex ? 'done' : index === currentIndex ? 'now' : 'todo',
    }));
}

export function isDealStatusInChain(status, hasRent) {
    return getDealChain(hasRent).includes(status);
}

/** Deals at or past this step have a return act to generate. */
export function isDealAtOrPastStep(status, hasRent, stepKey) {
    const chain = getDealChain(hasRent);
    const currentIndex = chain.indexOf(status);
    const stepIndex = chain.indexOf(stepKey);
    if (currentIndex < 0 || stepIndex < 0) return false;
    return currentIndex >= stepIndex;
}
