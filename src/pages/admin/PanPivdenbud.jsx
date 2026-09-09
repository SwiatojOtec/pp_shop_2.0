import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { timesheetApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isTimesheetViewer } from '../../utils/adminRoles';
import { downloadTimesheetXlsx } from '../../utils/timesheetExport';
import PageHeader from '../../features/admin/ui/PageHeader';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import './PanPivdenbud.css';

const WD_UK = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function emptyCell() {
    return { ah: '', am: '', dh: '', dm: '' };
}

function cellKey(day, slot) {
    return `${day}-${slot}`;
}

function padNum(n) {
    if (n === '' || n === undefined || n === null) return '';
    const s = String(n).trim();
    if (s === '') return '';
    const v = parseInt(s, 10);
    if (Number.isNaN(v)) return s;
    return String(v).padStart(2, '0');
}

function entriesToGetCell(entries) {
    const g = {};
    (entries || []).forEach(e => {
        g[cellKey(e.day, e.slot)] = {
            ah: e.arrivalHour != null ? padNum(e.arrivalHour) : '',
            am: e.arrivalMinute != null ? padNum(e.arrivalMinute) : '',
            dh: e.departureHour != null ? padNum(e.departureHour) : '',
            dm: e.departureMinute != null ? padNum(e.departureMinute) : ''
        };
    });
    return (day, slot) => g[cellKey(day, slot)] || emptyCell();
}

/** «08:30» — одне поле замість окремих годин/хвилин. */
function formatHM(h, m) {
    const hs = String(h ?? '').trim();
    const ms = String(m ?? '').trim();
    if (!hs && !ms) return '';
    return `${padNum(hs) || '00'}:${padNum(ms) || '00'}`;
}

/** Ліниво розбирає цифри користувача на години/хвилини під час набору: "083" → 08:3. */
function maskTimeDigits(raw) {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function digitsToHM(raw) {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
    return { h: digits.slice(0, 2), m: digits.slice(2, 4) };
}

/** Хвилини відпрацьовано за день з клітинки {ah,am,dh,dm}, або null якщо немає обох міток. */
function workedMinutes(c) {
    if (!c) return null;
    const ah = c.ah !== '' ? parseInt(c.ah, 10) : null;
    const am = c.am !== '' ? parseInt(c.am, 10) : 0;
    const dh = c.dh !== '' ? parseInt(c.dh, 10) : null;
    const dm = c.dm !== '' ? parseInt(c.dm, 10) : 0;
    if (ah == null || dh == null) return null;
    const diff = (dh * 60 + dm) - (ah * 60 + am);
    return diff > 0 ? diff : null;
}

function formatTotalHours(totalMinutes) {
    if (!totalMinutes) return '—';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
}

function TimesheetCalendarTable({
    labels,
    slots,
    getCell,
    dayMeta,
    readOnly,
    handleTimeField,
    calendarWrapRef
}) {
    const [drafts, setDrafts] = useState({});
    const slotList = slots?.length
        ? slots
        : Array.from({ length: Math.max(labels?.length || 0, 1) }, (_, i) => i + 1);

    function totalMinutesForSlot(slot) {
        return dayMeta.reduce((sum, { day }) => sum + (workedMinutes(getCell(day, slot)) || 0), 0);
    }

    return (
        <div ref={calendarWrapRef} className="timesheet-calendar-wrap">
            <table className="timesheet-cal-table">
                <thead>
                    <tr>
                        <th className="timesheet-cal-corner" />
                        <th className="timesheet-cal-hours-corner">Годин</th>
                        {dayMeta.map(({ day, weekend, wdLabel }) => (
                            <th
                                key={`h-${day}`}
                                className={`timesheet-cal-th-day ${weekend ? 'timesheet-cal-th--weekend' : ''}`}
                            >
                                <span className="timesheet-cal-th-day-num">{day}</span>
                                <span className="timesheet-cal-th-day-wd">{wdLabel}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {slotList.map(slot => (
                        <React.Fragment key={`slot-${slot}`}>
                            {[0, 1].map(rowIdx => (
                                <tr key={`${slot}-r${rowIdx}`}>
                                    {rowIdx === 0 && (
                                        <>
                                            <td className="timesheet-cal-name" rowSpan={2}>
                                                <span className="timesheet-cal-name-text">
                                                    {labels[slot - 1] || `Співробітник ${slot}`}
                                                </span>
                                            </td>
                                            <td className="timesheet-cal-hours" rowSpan={2}>
                                                {formatTotalHours(totalMinutesForSlot(slot))}
                                            </td>
                                        </>
                                    )}
                                    {dayMeta.map(({ day, weekend }) => {
                                        const c = getCell(day, slot);
                                        const isArrival = rowIdx === 0;
                                        const h = isArrival ? c.ah : c.dh;
                                        const m = isArrival ? c.am : c.dm;
                                        const eventKind = isArrival ? 'прихід' : 'вихід';
                                        const draftKey = `${day}-${slot}-${isArrival ? 'a' : 'd'}`;
                                        const committedValue = formatHM(h, m);
                                        return (
                                            <td
                                                key={`c-${slot}-${day}-${rowIdx}`}
                                                className={`timesheet-cal-cell ${weekend ? 'timesheet-cal-cell--weekend' : ''} ${
                                                    readOnly ? 'timesheet-cal-cell--readonly' : ''
                                                }`}
                                            >
                                                {readOnly ? (
                                                    <span className="timesheet-time-read">{committedValue || '—'}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={5}
                                                        className="timesheet-time-inp"
                                                        placeholder="—"
                                                        value={draftKey in drafts ? drafts[draftKey] : committedValue}
                                                        onChange={e => {
                                                            const masked = maskTimeDigits(e.target.value);
                                                            setDrafts(prev => ({ ...prev, [draftKey]: masked }));
                                                            const { h: nh, m: nm } = digitsToHM(masked);
                                                            handleTimeField(day, slot, isArrival, nh, nm);
                                                        }}
                                                        onBlur={() => setDrafts(prev => {
                                                            const next = { ...prev };
                                                            delete next[draftKey];
                                                            return next;
                                                        })}
                                                        aria-label={`${labels[slot - 1] || slot}, день ${day}, ${eventKind}`}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PanPivdenbud() {
    const { token, user, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [labels, setLabels] = useState(['']);
    const [grid, setGrid] = useState(() => ({}));
    const [overviewSheets, setOverviewSheets] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [pendingChange, setPendingChange] = useState(null);
    const calendarWrapRef = useRef(null);

    const isViewer = isTimesheetViewer(user?.role);

    const lastDay = useMemo(() => daysInMonth(year, month), [year, month]);

    const dayMeta = useMemo(
        () =>
            Array.from({ length: lastDay }, (_, i) => {
                const day = i + 1;
                const dt = new Date(year, month - 1, day);
                const wd = dt.getDay();
                return {
                    day,
                    weekend: wd === 0 || wd === 6,
                    wdLabel: WD_UK[wd]
                };
            }),
        [year, month, lastDay]
    );

    useEffect(() => {
        if (!token || authLoading || !user) return;
        setLoading(true);
        if (isViewer) {
            timesheetApi.overview({ year, month })
                .then(data => {
                    if (!data) return;
                    setOverviewSheets(Array.isArray(data.sheets) ? data.sheets : []);
                })
                .finally(() => setLoading(false));
            return;
        }
        timesheetApi.list({ year, month })
            .then(data => {
                if (!data) return;
                setLabels(Array.isArray(data.labels) && data.labels.length ? data.labels : ['']);
                const g = {};
                (data.entries || []).forEach(e => {
                    const k = cellKey(e.day, e.slot);
                    g[k] = {
                        ah: e.arrivalHour != null ? padNum(e.arrivalHour) : '',
                        am: e.arrivalMinute != null ? padNum(e.arrivalMinute) : '',
                        dh: e.departureHour != null ? padNum(e.departureHour) : '',
                        dm: e.departureMinute != null ? padNum(e.departureMinute) : ''
                    };
                });
                setGrid(g);
                setDirty(false);
            })
            .finally(() => setLoading(false));
    }, [token, year, month, isViewer, authLoading, user]);

    useEffect(() => {
        if (selectedGroup === 'all') return;
        const hasSelected = overviewSheets.some(sheet => String(sheet.headUserId) === selectedGroup);
        if (!hasSelected) {
            setSelectedGroup('all');
        }
    }, [overviewSheets, selectedGroup]);

    /** Вертикальне колесо → горизонтальний скрол (лише режим редагування) */
    useEffect(() => {
        const el = calendarWrapRef.current;
        if (!el || loading || isViewer) return undefined;

        const onWheel = e => {
            if (el.scrollWidth <= el.clientWidth) return;

            const delta =
                Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            const maxScroll = el.scrollWidth - el.clientWidth;
            const nextLeft = el.scrollLeft + delta;

            if (delta > 0 && el.scrollLeft >= maxScroll - 0.5) return;
            if (delta < 0 && el.scrollLeft <= 0.5) return;

            e.preventDefault();
            el.scrollLeft = nextLeft;
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [loading, lastDay, year, month, isViewer]);

    const getCell = useCallback(
        (day, slot) => {
            const c = grid[cellKey(day, slot)];
            return c || emptyCell();
        },
        [grid]
    );

    const handleTimeField = (day, slot, isArrival, h, m) => {
        const k = cellKey(day, slot);
        setGrid(prev => {
            const cur = prev[k] || emptyCell();
            return {
                ...prev,
                [k]: isArrival ? { ...cur, ah: h, am: m } : { ...cur, dh: h, dm: m }
            };
        });
        setDirty(true);
    };

    function requestYearChange(nextYear) {
        if (dirty) { setPendingChange({ type: 'year', value: nextYear }); return; }
        setYear(nextYear);
    }

    function requestMonthChange(nextMonth) {
        if (dirty) { setPendingChange({ type: 'month', value: nextMonth }); return; }
        setMonth(nextMonth);
    }

    function confirmPendingChange() {
        if (pendingChange?.type === 'year') setYear(pendingChange.value);
        else if (pendingChange?.type === 'month') setMonth(pendingChange.value);
        setPendingChange(null);
    }

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        const cells = [];
        const slotCount = Math.max(labels.length, 1);
        for (let d = 1; d <= lastDay; d++) {
            for (let s = 1; s <= slotCount; s++) {
                const c = grid[cellKey(d, s)] || emptyCell();
                const has =
                    String(c.ah).trim() !== '' ||
                    String(c.am).trim() !== '' ||
                    String(c.dh).trim() !== '' ||
                    String(c.dm).trim() !== '';
                if (has) {
                    cells.push({
                        day: d,
                        slot: s,
                        arrivalHour: c.ah,
                        arrivalMinute: c.am,
                        departureHour: c.dh,
                        departureMinute: c.dm
                    });
                }
            }
        }
        try {
            await timesheetApi.saveMonth({ year, month, cells });
            showToast('Табель збережено', 'success');
            setDirty(false);
        } catch (e) {
            showToast(e.message, 'warning');
        } finally {
            setSaving(false);
        }
    };

    const handleExportXlsx = async () => {
        setExporting(true);
        try {
            if (isViewer) {
                if (visibleOverviewSheets.length === 0) {
                    throw new Error('Немає даних для експорту');
                }
                if (selectedGroup === 'all' && visibleOverviewSheets.length > 1) {
                    throw new Error('Оберіть конкретний підрозділ для експорту');
                }
                const sheet = visibleOverviewSheets[0];
                await downloadTimesheetXlsx({
                    year,
                    month,
                    lastDay,
                    dayMeta,
                    labels: sheet.labels || ['', '', ''],
                    getCell: entriesToGetCell(sheet.entries || [])
                });
                return;
            }

            await downloadTimesheetXlsx({ year, month, lastDay, dayMeta, labels, getCell });
        } catch (e) {
            showToast(e.message || 'Помилка експорту в Excel', 'warning');
        } finally {
            setExporting(false);
        }
    };

    const visibleOverviewSheets = useMemo(() => {
        if (selectedGroup === 'all') return overviewSheets;
        return overviewSheets.filter(sheet => String(sheet.headUserId) === selectedGroup);
    }, [overviewSheets, selectedGroup]);

    const exportBlockedForViewer = isViewer && (
        visibleOverviewSheets.length === 0
        || (selectedGroup === 'all' && visibleOverviewSheets.length > 1)
    );

    return (
        <div className="pan-pivdenbud">
            <PageHeader title="ПАН ПІВДЕНЬБУД" subtitle="Внутрішні інструменти для команди компанії" />

            <div className="pan-pivdenbud-panel">
                <div className="timesheet-toolbar">
                    <label>
                        Рік:&nbsp;
                        <input
                            type="number"
                            min={2020}
                            max={2100}
                            value={year}
                            onChange={e => requestYearChange(parseInt(e.target.value, 10) || year)}
                            className="timesheet-input-year"
                        />
                    </label>
                    <label>
                        Місяць:&nbsp;
                        <select
                            value={month}
                            onChange={e => requestMonthChange(parseInt(e.target.value, 10))}
                            className="timesheet-select-month"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>
                                    {new Date(2000, m - 1, 1).toLocaleString('uk-UA', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </label>
                    {isViewer && (
                        <label>
                            Підрозділ:&nbsp;
                            <select
                                value={selectedGroup}
                                onChange={e => setSelectedGroup(e.target.value)}
                                className="timesheet-select-group"
                            >
                                <option value="all">Всі підрозділи</option>
                                {overviewSheets.map(sheet => {
                                    const title =
                                        sheet.subdivisionName ||
                                        sheet.headDisplayName ||
                                        `Голова #${sheet.headUserId}`;
                                    return (
                                        <option key={`group-${sheet.headUserId}`} value={String(sheet.headUserId)}>
                                            {title}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                    )}
                    {!isViewer && (
                        <button
                            type="button"
                            className="ds-btn ds-btn--primary"
                            onClick={handleSave}
                            disabled={saving || loading || exporting}
                        >
                            {saving ? 'Збереження...' : 'Зберегти табель'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        onClick={handleExportXlsx}
                        disabled={loading || exporting || exportBlockedForViewer}
                        title={
                            isViewer
                                ? 'Оберіть конкретний підрозділ для експорту'
                                : 'На кожен день 3 стовпці злиті в одну клітинку; час як 12:00, окремо рядок приходу та виходу'
                        }
                    >
                        {exporting ? 'Експорт...' : 'Excel (.xlsx)'}
                    </button>
                </div>
                {isViewer ? (
                    <p className="timesheet-hint">
                        Табелі підрозділів: після натискання «Зберегти табель» головами підрозділів дані з’являються тут
                        (за обраний рік і місяць). Редагування недоступне.
                        {exportBlockedForViewer && visibleOverviewSheets.length > 1 && ' Оберіть підрозділ вище, щоб експортувати в Excel.'}
                    </p>
                ) : (
                    <p className="timesheet-hint">
                        Час — одним полем «08:30» на прихід і на вихід. Колонка «Годин» — сума відпрацьованого за
                        місяць. Вихідні підсвічені.{' '}
                        У Excel на кожен день — <strong>три стовпці злиті в одну клітинку</strong>; час одним текстом{' '}
                        <strong>12:00</strong>. Окремо рядок «прихід» і рядок «вихід» для кожного співробітника — як у
                        ручному шаблоні.
                    </p>
                )}

                {authLoading || !user ? (
                    <p className="timesheet-muted">Завантаження...</p>
                ) : loading ? (
                    <p className="timesheet-muted">Завантаження...</p>
                ) : isViewer ? (
                    visibleOverviewSheets.length === 0 ? (
                        <p className="timesheet-muted">
                            {overviewSheets.length === 0
                                ? 'Немає збережених табелів за цей місяць (голови підрозділів ще не натиснули «Зберегти табель» або немає даних).'
                                : 'Для обраного підрозділу ще немає збереженого табеля за цей місяць.'}
                        </p>
                    ) : (
                        <div className="timesheet-overview-list">
                            {visibleOverviewSheets.map(sheet => {
                                const getCellRo = entriesToGetCell(sheet.entries);
                                const title =
                                    sheet.subdivisionName ||
                                    sheet.headDisplayName ||
                                    `Голова #${sheet.headUserId}`;
                                return (
                                    <section key={sheet.headUserId} className="timesheet-overview-block">
                                        <h2 className="timesheet-overview-title">{title}</h2>
                                        {sheet.subdivisionName && (
                                            <p className="timesheet-overview-meta">
                                                Голова: {sheet.headDisplayName}
                                                {sheet.headEmail ? ` · ${sheet.headEmail}` : ''}
                                            </p>
                                        )}
                                        {!sheet.subdivisionName && sheet.headEmail && (
                                            <p className="timesheet-overview-meta">{sheet.headEmail}</p>
                                        )}
                                        <TimesheetCalendarTable
                                            labels={sheet.labels || ['', '', '']}
                                            getCell={getCellRo}
                                            dayMeta={dayMeta}
                                            readOnly
                                            calendarWrapRef={null}
                                        />
                                    </section>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <TimesheetCalendarTable
                        labels={labels}
                        getCell={getCell}
                        dayMeta={dayMeta}
                        readOnly={false}
                        handleTimeField={handleTimeField}
                        calendarWrapRef={calendarWrapRef}
                    />
                )}
            </div>

            <ConfirmDialog
                open={!!pendingChange}
                title="Є незбережені зміни"
                message="У табелі є незбережені зміни. Перейти на інший місяць без збереження?"
                confirmText="Перейти без збереження"
                onConfirm={confirmPendingChange}
                onCancel={() => setPendingChange(null)}
            />
        </div>
    );
}
