import React from 'react';
import './RentalApplicationPrint.css';

const fmt = (n) => n ? Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2 }) : '—';
const fmtDate = (d) => {
    if (!d) return '___/___/______';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
};

const RentalApplicationPrint = React.forwardRef(({
    applicationNumber,
    lessor,
    client,
    responsible,
    items,
    totalRental,
    totalDeposit,
    discountType = 'fixed',
    discountValue = 0,
    discountAmount = 0,
    totalRentalAfterDiscount
}, ref) => {
    const safeDiscountAmount = Math.max(0, Number(discountAmount || 0));
    const safeTotalRentalAfterDiscount =
        totalRentalAfterDiscount != null
            ? Number(totalRentalAfterDiscount || 0)
            : Math.max(Number(totalRental || 0) - safeDiscountAmount, 0);
    const grandTotal = safeTotalRentalAfterDiscount + Number(totalDeposit || 0);
    const discountLabel =
        discountType === 'percent'
            ? `Знижка (${Number(discountValue || 0).toFixed(2)}%)`
            : 'Знижка (грн)';

    return (
        <div ref={ref} className="print-wrap">
            {/* Title */}
            <div className="print-title-block">
                <div className="print-appendix">Додаток № 2<br/>до Договору оренди обладнання №____<br/>від ___________2026 року.</div>
                <h2 className="print-title">
                    Акт приймання-передачі №_____ від ____/____/2026 року.
                </h2>
            </div>

            {/* Parties */}
            <table className="print-parties">
                <tbody>
                    <tr>
                        <td className="party-col">
                            <div className="party-header">ОРЕНДОДАВЕЦЬ:</div>
                            <div className="party-row"><b>Фізична особа-підприємець П.І.Б.:</b> {lessor.name}</div>
                            <div className="party-row"><b>ІПН:</b> {lessor.ipn}</div>
                            <div className="party-row"><b>Адреса:</b> {lessor.address}</div>
                            <div className="party-row"><b>Телефон:</b> {lessor.phone}</div>
                            <div className="party-row"><b>e-mail:</b> {lessor.email}</div>
                            <div className="party-row"><b>Адреса складського майданчика:</b> {lessor.warehouseAddress}</div>
                            <div className="party-row"><b>Відповідальний П.І.Б.:</b> ___________________________</div>
                        </td>
                        <td className="party-col">
                            <div className="party-header">ОРЕНДАРЬ:</div>
                            <div className="party-row"><b>Фізична особа П.І.Б.:</b> {client.name || '___________________________'}</div>
                            <div className="party-row"><b>ІПН:</b> ___________________________</div>
                            <div className="party-row"><b>Телефон:</b> {client.phone || '___________________________'}</div>
                            <div className="party-row"><b>e-mail:</b> {client.email || '___________________________'}</div>
                            <div className="party-row"><b>Адреса проживання:</b> {client.address || '___________________________'}</div>
                            <div className="party-row"><b>Адреса будівельного майданчика:</b> {client.siteAddress || '___________________________'}</div>
                            {responsible && responsible.length > 0 && responsible.map((r, i) => (
                                <div key={i} className="party-row"><b>Відповідальна особа {responsible.length > 1 ? i + 1 : ''}:</b> {r.name}{r.phone ? `, ${r.phone}` : ''}</div>
                            ))}
                            {(!responsible || responsible.length === 0) && (
                                <div className="party-row"><b>Відповідальна особа:</b> ___________________________</div>
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Instrument label */}
            <div className="print-instrument-header">ІНСТРУМЕНТ:</div>

            {/* Main table */}
            <table className="print-main-table">
                <thead>
                    <tr className="header-row-1">
                        <th rowSpan={2} className="col-num">№п/п</th>
                        <th rowSpan={2} className="col-name">Комплектація</th>
                        <th rowSpan={2} className="col-serial">Серійний номер</th>
                        <th rowSpan={2} className="col-inv">Інвентарний номер</th>
                        <th rowSpan={2} className="col-state">Технічний стан</th>
                        <th rowSpan={2} className="col-unit">Одиниця виміру</th>
                        <th rowSpan={2} className="col-qty">Кількість одиниць</th>
                        <th rowSpan={2} className="col-weight">Вага загальна /кг.</th>
                        <th colSpan={2} className="col-group">Відновлювальна вартість</th>
                        <th colSpan={2} className="col-group">Гарантійний платіж</th>
                        <th colSpan={3} className="col-group">Дата</th>
                        <th rowSpan={2} className="col-rate">Тариф за одиницю Грн/доба</th>
                        <th rowSpan={2} className="col-total">Сума оренди Грн.</th>
                    </tr>
                    <tr className="header-row-2">
                        <th>Грн/за одиницю</th>
                        <th>Сума</th>
                        <th>%</th>
                        <th>Сума</th>
                        <th>Початку оренди</th>
                        <th>Планованого закінчення</th>
                        <th>Всього діб</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <React.Fragment key={item._key || idx}>
                            {/* Main row */}
                            <tr className="main-item-row">
                                <td className="td-num">{idx + 1}</td>
                                <td className="td-name">{item.name}</td>
                                <td>{item.serialNumber || 'б/н'}</td>
                                <td>{item.inventoryNumber || '—'}</td>
                                <td>{item.technicalCondition || '—'}</td>
                                <td>{item.unit || 'шт'}</td>
                                <td className="td-center">{item.quantity}</td>
                                <td className="td-center">{item.weightTotal || '—'}</td>
                                <td className="td-right">{fmt(item.replacementCostPerUnit)}</td>
                                <td className="td-right">{fmt(item.replacementCostTotal)}</td>
                                <td className="td-center">{item.depositPercent}%</td>
                                <td className="td-right">{fmt(item.depositAmount)}</td>
                                <td className="td-center">{fmtDate(item.rentFrom)}</td>
                                <td className="td-center">{fmtDate(item.rentTo)}</td>
                                <td className="td-center">{item.days || '—'}</td>
                                <td className="td-right">{fmt(item.pricePerDay)}</td>
                                <td className="td-right bold">{fmt(item.totalRental)}</td>
                            </tr>
                            {/* Kit sub-rows */}
                            {Array.isArray(item.kitItems) && item.kitItems.map((kit, ki) => (
                                <tr key={ki} className="kit-sub-row">
                                    <td className="td-num sub">{idx + 1}.{ki + 1}</td>
                                    <td className="td-name sub">{kit}</td>
                                    <td>б/н</td>
                                    <td>—</td>
                                    <td>справний</td>
                                    <td>шт</td>
                                    <td className="td-center">1</td>
                                    <td colSpan={10}></td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Totals row */}
                    <tr className="totals-row">
                        <td colSpan={9} className="td-right bold">РАЗОМ:</td>
                        <td className="td-right bold">{fmt(items.reduce((s,i) => s + parseFloat(i.replacementCostTotal||0), 0))}</td>
                        <td></td>
                        <td className="td-right bold">{fmt(totalDeposit)}</td>
                        <td colSpan={4}></td>
                        <td className="td-right bold">{fmt(totalRental)}</td>
                    </tr>
                </tbody>
            </table>

            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', fontSize: '12px' }}>
                {safeDiscountAmount > 0 && (
                    <>
                        <div><b>{discountLabel}:</b> -{fmt(safeDiscountAmount)} грн</div>
                        <div><b>Оренда зі знижкою:</b> {fmt(safeTotalRentalAfterDiscount)} грн</div>
                    </>
                )}
                <div><b>До сплати:</b> {fmt(grandTotal)} грн</div>
            </div>

            {/* Signatures */}
            <div className="print-signatures">
                <div className="sig-block">
                    <div className="sig-title">Передав (Орендодавець):</div>
                    <div className="sig-line">П.І.Б.: ___________________________</div>
                    <div className="sig-line">Підпис: ___________________________</div>
                    <div className="sig-line">Дата: ____/____/________</div>
                </div>
                <div className="sig-block">
                    <div className="sig-title">Прийняв (Орендар):</div>
                    <div className="sig-line">П.І.Б.: {client.name || '___________________________'}</div>
                    <div className="sig-line">Підпис: ___________________________</div>
                    <div className="sig-line">Дата: ____/____/________</div>
                </div>
            </div>
        </div>
    );
});

RentalApplicationPrint.displayName = 'RentalApplicationPrint';
export default RentalApplicationPrint;
