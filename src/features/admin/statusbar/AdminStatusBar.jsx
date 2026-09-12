import { useEffect, useState } from 'react';
import { Clock, Coins, Cloud, Siren, ShieldCheck } from 'lucide-react';
import { statusBarApi } from '../../../services/api';
import './statusbar.css';

const REFRESH_MS = 60 * 1000;

function useKyivClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return now.toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
}

function formatRate(v) {
    return v == null ? '—' : v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// alerts.in.ua позначає тип загрози машинним кодом — переклад для показу.
const AIR_RAID_TYPE_LABELS = {
    air_raid: 'повітряна тривога',
    artillery_shelling: 'артобстріл',
    urban_fights: 'вуличні бої',
    chemical: 'хімічна загроза',
    nuclear: 'ядерна загроза',
};

function airRaidTypeLabel(type) {
    return type ? (AIR_RAID_TYPE_LABELS[type] || type) : '';
}

/** Смужка під хедером адмінки: курс валют (НБУ), погода в Києві (Open-Meteo),
 *  час і повітряна тривога (alerts.in.ua, коли налаштовано ALERTS_IN_UA_TOKEN)
 *  — орієнтир при плануванні доставки. Не чутливі дані, видно всім ролям. */
export default function AdminStatusBar() {
    const [data, setData] = useState(null);
    const time = useKyivClock();

    useEffect(() => {
        let cancelled = false;
        function load() {
            statusBarApi.get().then((res) => {
                if (!cancelled) setData(res);
            }).catch(() => {});
        }
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="admin-status-bar">
            <span className="admin-status-item">
                <Clock size={14} />
                {time}
            </span>

            {data?.currency && (
                <span className="admin-status-item">
                    <Coins size={14} />
                    $ {formatRate(data.currency.usd)} · € {formatRate(data.currency.eur)}
                </span>
            )}

            {data?.weather && data.weather.tempC != null && (
                <span className="admin-status-item">
                    <Cloud size={14} />
                    {Math.round(data.weather.tempC)}°C{data.weather.label ? ` · ${data.weather.label}` : ''}
                </span>
            )}

            {data?.airRaid?.configured && (
                <span className={`admin-status-item admin-status-item--airraid${data.airRaid.active ? ' admin-status-item--danger' : ''}`}>
                    {data.airRaid.active ? <Siren size={14} /> : <ShieldCheck size={14} />}
                    {data.airRaid.active ? `Тривога в Києві${data.airRaid.type ? ` · ${airRaidTypeLabel(data.airRaid.type)}` : ''}` : 'Київ: спокійно'}
                </span>
            )}
        </div>
    );
}
