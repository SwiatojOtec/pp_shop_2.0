import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { timesheetApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isTimesheetViewer } from '../../utils/adminRoles';
import { downloadTimesheetXlsx } from '../../utils/timesheetExport';
import './PanPivdenbud.css';

const TABS = [{ id: 'timesheet', label: 'Табель' }];

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

function TimesheetCalendarTable({
    labels,
    slots,
    getCell,
    dayMeta,
    readOnly,
    handleField,
    calendarWrapRef
}) {
    const slotList = slots?.length
        ? slots
        : Array.from({ length: Math.max(labels?.length || 0, 1) }, (_, i) => i + 1);
    return (
        <div ref={calendarWrapRef} className="timesheet-calendar-wrap">
            <table className="timesheet-cal-table">
                <thead>
                    <tr>
                        <th className="timesheet-cal-corner" />
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
                                        <td className="timesheet-cal-name" rowSpan={2}>
                                            <span className="timesheet-cal-name-text">
                                                {labels[slot - 1] || `Співробітник ${slot}`}
                                            </span>
                                        </td>
                                    )}
                                    {dayMeta.map(({ day, weekend }) => {
                                        const c = getCell(day, slot);
                                        const isArrival = rowIdx === 0;
                                        const h = isArrival ? c.ah : c.dh;
                                        const m = isArrival ? c.am : c.dm;
                                        const showEmpty = !h && !m;
                                        return (
                                            <td
                                                key={`c-${slot}-${day}-${rowIdx}`}
                                                className={`timesheet-cal-cell ${weekend ? 'timesheet-cal-cell--weekend' : ''} ${
                                                    readOnly ? 'timesheet-cal-cell--readonly' : ''
                                                }`}
                                            >
                                                <div className="timesheet-time-pair">
                                                    {readOnly ? (
                                                        <>
                                                            <span className="timesheet-time-read timesheet-time-read--h">
                                                                {showEmpty ? '—' : h || '—'}
                                                            </span>
                                                            <span className="timesheet-time-colon" aria-hidden>
                                                                :
                                                            </span>
                                                            <span className="timesheet-time-read timesheet-time-read--m">
                                                                {showEmpty ? '—' : m || '—'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                maxLength={2}
                                                                className="timesheet-time-inp timesheet-time-inp--h"
                                                                placeholder="—"
                                                                value={isArrival ? c.ah : c.dh}
                                                                onChange={e =>
                                                                    handleField(day, slot, isArrival ? 'ah' : 'dh', e.target.value)
                                                                }
                                                                aria-label={`${labels[slot - 1] || slot}, день ${day}, ${
                                                                    isArrival ? 'прихід' : 'вихід'
                                                                }, години`}
                                                            />
                                                            <span className="timesheet-time-colon" aria-hidden>
                                                                :
                                                            </span>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                maxLength={2}
                                                                className="timesheet-time-inp timesheet-time-inp--m"
                                                                placeholder="—"
                                                                value={isArrival ? c.am : c.dm}
                                                                onChange={e =>
                                                                    handleField(day, slot, isArrival ? 'am' : 'dm', e.target.value)
                                                                }
                                                                aria-label={`${labels[slot - 1] || slot}, день ${day}, ${
                                                                    isArrival ? 'прихід' : 'вихід'
                                                                }, хвилини`}
                                                            />
                                                        </>
                                                    )}
                                                </div>
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
    const [activeTab, setActiveTab] = useState('timesheet');

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
        if (!token || activeTab !== 'timesheet' || authLoading || !user) return;
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
            })
            .finally(() => setLoading(false));
    }, [token, year, month, activeTab, isViewer, authLoading, user]);

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
        if (!el || loading || activeTab !== 'timesheet' || isViewer) return undefined;

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
    }, [loading, activeTab, lastDay, year, month, isViewer]);

    const getCell = useCallback(
        (day, slot) => {
            const c = grid[cellKey(day, slot)];
            return c || emptyCell();
        },
        [grid]
    );

    const handleField = (day, slot, part, value) => {
        const k = cellKey(day, slot);
        setGrid(prev => {
            const cur = prev[k] || emptyCell();
            return {
                ...prev,
                [k]: { ...cur, [part]: value }
            };
        });
    };

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
            alert('Табель збережено');
        } catch (e) {
            alert(e.message);
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
            alert(e.message || 'Помилка експорту в Excel');
        } finally {
            setExporting(false);
        }
    };

    const noopField = () => {};
    const visibleOverviewSheets = useMemo(() => {
        if (selectedGroup === 'all') return overviewSheets;
        return overviewSheets.filter(sheet => String(sheet.headUserId) === selectedGroup);
    }, [overviewSheets, selectedGroup]);

    return (
        <div className="pan-pivdenbud">
            <div className="admin-header" style={{ marginBottom: '16px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>ПАН ПІВДЕНЬБУД</h1>
                <p style={{ color: '#888', marginTop: '6px', fontSize: '0.9rem' }}>
                    Внутрішні інструменти для команди компанії
                </p>
            </div>

            <div className="pan-pivdenbud-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`pan-pivdenbud-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'timesheet' && (
                <div className="pan-pivdenbud-panel admin-section">
                    <div className="timesheet-toolbar">
                        <label>
                            Рік:&nbsp;
                            <input
                                type="number"
                                min={2020}
                                max={2100}
                                value={year}
                                onChange={e => setYear(parseInt(e.target.value, 10) || year)}
                                className="timesheet-input-year"
                            />
                        </label>
                        <label>
                            Місяць:&nbsp;
                            <select
                                value={month}
                                onChange={e => setMonth(parseInt(e.target.value, 10))}
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
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saving || loading || exporting}
                            >
                                {saving ? 'Збереження...' : 'Зберегти табель'}
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleExportXlsx}
                            disabled={loading || exporting || (isViewer && visibleOverviewSheets.length === 0)}
                            title={
                                isViewer
                                    ? 'Експорт для обраного підрозділу'
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
                        </p>
                    ) : (
                        <p className="timesheet-hint">
                            У кожній клітинці два рядки: прихід і вихід; години та хвилини поруч. Вихідні підсвічені.{' '}
                            У Excel на кожен день — <strong>три стовпці злиті в одну клітинку</strong>; час одним текстом{' '}
                            <strong>12:00</strong>. Окремо рядок «прихід» і рядок «вихід» для кожного співробітника — як у
                            ручному шаблоні.
                        </p>
                    )}

                    {authLoading || !user ? (
                        <p style={{ color: '#999' }}>Завантаження...</p>
                    ) : loading ? (
                        <p style={{ color: '#999' }}>Завантаження...</p>
                    ) : isViewer ? (
                        visibleOverviewSheets.length === 0 ? (
                            <p style={{ color: '#888' }}>
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
                                                handleField={noopField}
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
                            handleField={handleField}
                            calendarWrapRef={calendarWrapRef}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
