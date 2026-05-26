
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMeteoMetadata } from '../services/dataService';
import { supabase } from '../supabaseClient';
import { MeteoData, StationMetadata } from '../types';
import {
  Calendar, Layers, Thermometer, Droplets, CloudRain, Wind, Zap,
  TrendingDown, TrendingUp, ChevronLeft, ChevronRight, FileText,
  BarChart3, Award
} from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState, ErrorBanner } from './Shared';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Cell
} from 'recharts';
import * as XLSX from 'xlsx';

// =========== TYPES ===========
interface DaySummary {
  date: string;
  label: string;
  TnMin: number; TnStation: string;
  TxMax: number; TxStation: string;
  UMin: number; UMinStation: string;
  RainMax: number; RainMaxStation: string;
  WindMax: number; WindDir: string; WindStation: string;
  thunderStations: string[];
  strongWindStations: string[];
  stationCount: number;
}

interface GroupSummary {
  groupName: string;
  TnMin: number; TnStation: string;
  TxMax: number; TxStation: string;
  UMin: number; UMinStation: string;
  RainMax: number; RainMaxStation: string;
  RainTotal: number;
  WindMax: number; WindDir: string; WindStation: string;
  thunderStations: string[];
  strongWindStations: string[];
  stationCount: number;
}

type PeriodType = '1D' | '2D' | '1W' | '10D' | '1M' | 'CUSTOM';

const normalizeMeteoRow = (item: any): MeteoData => {
  const result: any = { ...item };
  if (item.tram) result.Tram = item.tram;
  if (item.dai) result.Dai = item.dai;
  if (item.ngay) result.Ngay = item.ngay;
  if (item.matram) result.MaTram = item.matram;

  const uCols = ['U1h','U4h','U7h','U10h','U13h','U16h','U19h','U22h'];
  const uValues = uCols.map(col => {
    const rawVal = item[col] !== undefined ? item[col] : item[col.toLowerCase()];
    if (rawVal === null || rawVal === undefined || rawVal === '') return null;
    const val = Number(rawVal);
    return isNaN(val) ? null : val;
  }).filter(v => v !== null) as number[];

  if (uValues.length > 0) result.Umin = Math.min(...uValues);
  else result.Umin = item.umin || item.Umin || null;

  const r1h = parseFloat(item.R1h ?? item.r1h ?? '');
  const r7h = parseFloat(item.R7h ?? item.r7h ?? '');
  if (!isNaN(r1h) || !isNaN(r7h)) {
    result.R19_7 = Math.round(((isNaN(r1h)?0:r1h)+(isNaN(r7h)?0:r7h))*10)/10;
  }
  const r13h = parseFloat(item.R13h ?? item.r13h ?? '');
  const r19h = parseFloat(item.R19h ?? item.r19h ?? '');
  if (!isNaN(r13h) || !isNaN(r19h)) {
    result.R7_19 = Math.round(((isNaN(r13h)?0:r13h)+(isNaN(r19h)?0:r19h))*10)/10;
  }
  return result as MeteoData;
};

// =========== HELPERS ===========
const fmtDate = (d: string) => d.split('-').reverse().join('/');
const fmtVal = (v: any, dec = 1) => (v !== undefined && v !== null && v !== '' && !isNaN(Number(v))) ? Number(v).toFixed(dec) : '-';

const getWindInfo = (row: MeteoData) => {
  let maxFF = -1; let bestDD = '-';
  const hours = ['1h','4h','7h','10h','13h','16h','19h','22h'];
  hours.forEach(h => {
    const ff = Number(row[`ff${h}`] ?? row[`ff${h.toLowerCase()}`]);
    if (!isNaN(ff) && ff > maxFF) { maxFF = ff; bestDD = row[`dd${h}`] ?? row[`dd${h.toLowerCase()}`] ?? '-'; }
  });
  const fmaxHours = ['1h','7h','13h','19h'];
  fmaxHours.forEach(h => {
    const ff = Number(row[`Fmax${h}`] ?? row[`fmax${h}`] ?? row[`Fmax${h.toLowerCase()}`] ?? row[`fmax${h.toLowerCase()}`]);
    if (!isNaN(ff) && ff > maxFF) { 
      maxFF = ff; 
      bestDD = row[`Dmax${h}`] ?? row[`dmax${h}`] ?? row[`Dmax${h.toLowerCase()}`] ?? row[`dmax${h.toLowerCase()}`] ?? '-'; 
    }
  });
  return maxFF >= 0 ? { ff: maxFF, dd: bestDD } : null;
};

const hasThunder = (row: MeteoData): boolean => {
  const wHours = ['W1h','W4h','W7h','W10h','W13h','W16h','W19h','W22h'];
  return wHours.some(h => {
    const v = Number(row[h] ?? row[h.toLowerCase()]);
    return !isNaN(v) && (v === 17 || v === 29 || v === 95 || v === 96 || v === 97 || (v >= 13 && v <= 19) || (v >= 91 && v <= 99));
  });
};

const STRONG_WIND_THRESHOLD = 16; // m/s

// =========== SUB-COMPONENTS ===========
interface ExtremeRankingCardProps {
  title: string;
  icon: any;
  colorClass: string;
  data: any[] | undefined;
  type: 'tx' | 'tn' | 'rain' | 'wind' | 'umin';
  unit: string;
}

const ExtremeRankingCard: React.FC<ExtremeRankingCardProps> = ({ title, icon: Icon, colorClass, data, type, unit }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center min-h-[260px]">
        <Icon className="text-slate-300 mb-2" size={24} />
        <span className="text-xs text-slate-400 font-bold uppercase">{title}</span>
        <span className="text-[10px] text-slate-300 mt-1">Không có dữ liệu</span>
      </div>
    );
  }

  // Find max value in this specific dataset to scale progress bars relative to the top rank
  const maxVal = data[0] ? (
    type === 'tx' ? data[0].maxTx :
    type === 'tn' ? data[0].minTn :
    type === 'rain' ? data[0].maxRain :
    type === 'wind' ? data[0].maxWind :
    data[0].minU
  ) : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${colorClass} shadow-sm`}>
            <Icon size={14} />
          </div>
          <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{title}</span>
        </div>
        <span className="text-[9px] bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-500 uppercase">Top {data.length}</span>
      </div>
      
      <div className="p-3 flex flex-col gap-3 min-h-[220px]">
        {data.map((item: any, idx: number) => {
          let value = 0;
          let dateStr = '';
          let stationInfo = item.station;
          let subInfo = item.dai;

          if (type === 'tx') { value = item.maxTx; dateStr = item.maxTxDate; }
          else if (type === 'tn') { value = item.minTn; dateStr = item.minTnDate; }
          else if (type === 'rain') { value = item.maxRain; dateStr = item.maxRainDate; }
          else if (type === 'wind') { value = item.maxWind; dateStr = item.maxWindDate; }
          else if (type === 'umin') { value = item.minU; dateStr = item.minUDate; }

          const displayDate = dateStr ? dateStr.split('-').slice(1).reverse().join('/') : '';
          
          // Calculate progress percentage
          let pct = 0;
          if (type === 'tn') {
            pct = value > 0 ? (35 - value) / (35 - maxVal) * 100 : 0;
          } else {
            pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
          }
          pct = Math.min(100, Math.max(15, pct));

          const rankColors = [
            'bg-amber-400 text-white shadow-amber-100', // Gold
            'bg-slate-300 text-slate-700 shadow-slate-100', // Silver
            'bg-orange-400 text-white shadow-orange-100', // Bronze
            'bg-slate-100 text-slate-500',
            'bg-slate-50 text-slate-400'
          ];

          return (
            <div key={idx} className="flex flex-col gap-1 transition-all hover:translate-x-0.5 duration-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm shrink-0 ${rankColors[idx] || 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-slate-700 truncate">{stationInfo}</span>
                    <span className="text-[9px] text-slate-400 font-semibold truncate">{subInfo}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-black text-slate-800">
                    {type === 'umin' ? Math.round(value) : value.toFixed(1)}
                    <span className="text-[9px] font-bold text-slate-400 ml-0.5">{unit}</span>
                  </span>
                  {displayDate && (
                    <span className="text-[8px] text-slate-400 font-bold bg-slate-50 px-1 py-0.2 rounded border border-slate-100 leading-none mt-0.5">
                      {displayDate}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden mt-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    type === 'tx' ? 'bg-red-500' :
                    type === 'tn' ? 'bg-blue-500' :
                    type === 'rain' ? 'bg-emerald-500' :
                    type === 'wind' ? 'bg-indigo-500' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========== MAIN COMPONENT ===========
const KTTVOverview: React.FC = () => {
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodType, setPeriodType] = useState<PeriodType>('1D');
  const [customFrom, setCustomFrom] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [rawData, setRawData] = useState<MeteoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchMeteoMetadata().then(setMetadata); }, []);

  const availableGroups = useMemo(() =>
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[], [metadata]);

  const dateRange = useMemo(() => {
    const end = new Date(endDate);
    let start = new Date(endDate);
    switch (periodType) {
      case '1D': break;
      case '2D': start.setDate(end.getDate() - 1); break;
      case '1W': start.setDate(end.getDate() - 6); break;
      case '10D': start.setDate(end.getDate() - 9); break;
      case '1M': start.setMonth(end.getMonth() - 1); start.setDate(start.getDate() + 1); break;
      case 'CUSTOM': start = customFrom ? new Date(customFrom) : new Date(endDate); break;
    }
    return { from: start.toISOString().split('T')[0], to: endDate };
  }, [endDate, periodType, customFrom]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      let query = supabase.from('dulieu_khituong').select('*')
        .gte('Ngay', dateRange.from).lte('Ngay', dateRange.to);
      if (selectedGroup) query = query.eq('Dai', selectedGroup);
      const { data, error: err } = await query.order('Ngay', { ascending: true });
      if (err) throw err;
      setRawData((data || []).map(normalizeMeteoRow));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateRange.from, dateRange.to, selectedGroup]);

  // ===== DAILY SUMMARIES =====
  const dailySummaries = useMemo((): DaySummary[] => {
    if (!rawData.length) return [];
    const byDate: Record<string, MeteoData[]> = {};
    rawData.forEach(r => { const d = r.Ngay; if (!byDate[d]) byDate[d] = []; byDate[d].push(r); });

    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, rows]) => {
      let tnMin = Infinity, tnSt = '-', txMax = -Infinity, txSt = '-';
      let uMin = Infinity, uMinSt = '-';
      let rainMax = -Infinity, rainSt = '-';
      let windMax = -Infinity, windDir = '-', windSt = '-';
      const thunderSts: string[] = []; const strongWindSts: string[] = [];

      rows.forEach(r => {
        const tn = Number(r.NhietTn ?? r.nhietttn);
        const tx = Number(r.NhietTx ?? r.nhiettx);
        const umin = Number(r.Umin ?? r.umin);
        const rain = Number(r.Mua24h ?? r.mua24h);
        const station = r.Tram || r.tram || '-';
        const w = getWindInfo(r);

        if (!isNaN(tn) && tn < tnMin) { tnMin = tn; tnSt = station; }
        if (!isNaN(tx) && tx > txMax) { txMax = tx; txSt = station; }
        if (!isNaN(umin) && umin > 0 && umin < uMin) { uMin = umin; uMinSt = station; }
        if (!isNaN(rain) && rain > rainMax) { rainMax = rain; rainSt = station; }
        if (w && w.ff > windMax) { windMax = w.ff; windDir = w.dd; windSt = station; }
        if (w && w.ff >= STRONG_WIND_THRESHOLD && !strongWindSts.includes(station)) strongWindSts.push(station);
        if (hasThunder(r) && !thunderSts.includes(station)) thunderSts.push(station);
      });

      return {
        date, label: fmtDate(date),
        TnMin: tnMin === Infinity ? 0 : tnMin, TnStation: tnSt,
        TxMax: txMax === -Infinity ? 0 : txMax, TxStation: txSt,
        UMin: uMin === Infinity ? 0 : uMin, UMinStation: uMinSt,
        RainMax: rainMax === -Infinity ? 0 : rainMax, RainMaxStation: rainSt,
        WindMax: windMax === -Infinity ? 0 : windMax, WindDir: windDir, WindStation: windSt,
        thunderStations: thunderSts, strongWindStations: strongWindSts,
        stationCount: rows.length
      };
    });
  }, [rawData]);

  // ===== OVERALL SUMMARY =====
  const overallSummary = useMemo(() => {
    if (!dailySummaries.length) return null;
    let tnMin = Infinity, tnSt = '-', tnDate = '-';
    let txMax = -Infinity, txSt = '-', txDate = '-';
    let uMin = Infinity, uMinSt = '-', uMinDate = '-';
    let rainMax = -Infinity, rainSt = '-', rainDate = '-';
    let windMax = -Infinity, windDir = '-', windSt = '-', windDate = '-';
    const allThunder = new Set<string>(); const allStrongWind = new Set<string>();

    dailySummaries.forEach(d => {
      if (d.TnMin < tnMin) { tnMin = d.TnMin; tnSt = d.TnStation; tnDate = d.label; }
      if (d.TxMax > txMax) { txMax = d.TxMax; txSt = d.TxStation; txDate = d.label; }
      if (d.UMin > 0 && d.UMin < uMin) { uMin = d.UMin; uMinSt = d.UMinStation; uMinDate = d.label; }
      if (d.RainMax > rainMax) { rainMax = d.RainMax; rainSt = d.RainMaxStation; rainDate = d.label; }
      if (d.WindMax > windMax) { windMax = d.WindMax; windDir = d.WindDir; windSt = d.WindStation; windDate = d.label; }
      d.thunderStations.forEach(s => allThunder.add(s));
      d.strongWindStations.forEach(s => allStrongWind.add(s));
    });

    return {
      TnMin: tnMin === Infinity ? 0 : tnMin, TnStation: tnSt, TnDate: tnDate,
      TxMax: txMax === -Infinity ? 0 : txMax, TxStation: txSt, TxDate: txDate,
      UMin: uMin === Infinity ? 0 : uMin, UMinStation: uMinSt, UMinDate: uMinDate,
      RainMax: rainMax === -Infinity ? 0 : rainMax, RainStation: rainSt, RainDate: rainDate,
      WindMax: windMax === -Infinity ? 0 : windMax, WindDir: windDir, WindStation: windSt, WindDate: windDate,
      ThunderStations: Array.from(allThunder),
      StrongWindStations: Array.from(allStrongWind),
      TotalDays: dailySummaries.length,
      TotalStations: new Set(rawData.map(r => r.Tram || r.tram)).size,
    };
  }, [dailySummaries, rawData]);

  // ===== TOP 5 EXTREMES =====
  const topExtremes = useMemo(() => {
    if (!rawData.length) return null;

    // Aggregate extremes per station over the period to rank them fairly
    const stationData: Record<string, {
      station: string;
      dai: string;
      maxTx: number; maxTxDate: string;
      minTn: number; minTnDate: string;
      maxRain: number; maxRainDate: string;
      maxWind: number; maxWindDir: string; maxWindDate: string;
      minU: number; minUDate: string;
    }> = {};

    rawData.forEach(r => {
      const station = r.Tram || r.tram || '-';
      const dai = r.Dai || r.dai || '-';
      const date = r.Ngay;
      
      const tx = Number(r.NhietTx ?? r.nhiettx);
      const tn = Number(r.NhietTn ?? r.nhietttn);
      const rain = Number(r.Mua24h ?? r.mua24h);
      const u = Number(r.Umin ?? r.umin);
      const w = getWindInfo(r);

      if (!stationData[station]) {
        stationData[station] = {
          station,
          dai,
          maxTx: -Infinity, maxTxDate: '',
          minTn: Infinity, minTnDate: '',
          maxRain: -Infinity, maxRainDate: '',
          maxWind: -Infinity, maxWindDir: '', maxWindDate: '',
          minU: Infinity, minUDate: '',
        };
      }

      const s = stationData[station];

      if (!isNaN(tx) && tx > s.maxTx) { s.maxTx = tx; s.maxTxDate = date; }
      if (!isNaN(tn) && tn < s.minTn) { s.minTn = tn; s.minTnDate = date; }
      if (!isNaN(rain) && rain > s.maxRain) { s.maxRain = rain; s.maxRainDate = date; }
      if (!isNaN(u) && u > 0 && u < s.minU) { s.minU = u; s.minUDate = date; }
      if (w && w.ff > s.maxWind) { s.maxWind = w.ff; s.maxWindDir = w.dd; s.maxWindDate = date; }
    });

    const list = Object.values(stationData);

    const topTx = list
      .filter(s => s.maxTx !== -Infinity)
      .sort((a, b) => b.maxTx - a.maxTx)
      .slice(0, 5);

    const topTn = list
      .filter(s => s.minTn !== Infinity)
      .sort((a, b) => a.minTn - b.minTn)
      .slice(0, 5);

    const topRain = list
      .filter(s => s.maxRain > 0)
      .sort((a, b) => b.maxRain - a.maxRain)
      .slice(0, 5);

    const topWind = list
      .filter(s => s.maxWind > 0)
      .sort((a, b) => b.maxWind - a.maxWind)
      .slice(0, 5);

    const topHumidity = list
      .filter(s => s.minU !== Infinity && s.minU > 0)
      .sort((a, b) => a.minU - b.minU)
      .slice(0, 5);

    return { topTx, topTn, topRain, topWind, topHumidity };
  }, [rawData]);

  // ===== STATION CHART DATA (FOR 1 DAY PERIOD) =====
  const stationChartData = useMemo(() => {
    if (dailySummaries.length !== 1 || !rawData.length) return [];
    return rawData.map(r => ({
      station: r.Tram || r.tram || '-',
      Tx: Number(r.NhietTx ?? r.nhiettx) || 0,
      Tn: Number(r.NhietTn ?? r.nhietttn) || 0,
      Rain: Number(r.Mua24h ?? r.mua24h) || 0,
      Wind: getWindInfo(r)?.ff || 0
    })).sort((a, b) => b.Tx - a.Tx);
  }, [rawData, dailySummaries]);

  // ===== GROUP SUMMARIES =====
  const groupSummaries = useMemo((): GroupSummary[] => {
    if (!rawData.length) return [];
    const groups = selectedGroup ? [selectedGroup] : availableGroups;
    return groups.map(g => {
      const rows = rawData.filter(r => (r.Dai || r.dai) === g);
      if (!rows.length) return null;
      let tnMin = Infinity, tnSt = '-', txMax = -Infinity, txSt = '-';
      let uMin = Infinity, uMinSt = '-', rainMax = -Infinity, rainSt = '-', rainTotal = 0;
      let windMax = -Infinity, windDir = '-', windSt = '-';
      const thunderSts = new Set<string>(); const strongWindSts = new Set<string>();

      rows.forEach(r => {
        const station = r.Tram || r.tram || '-';
        const tn = Number(r.NhietTn); const tx = Number(r.NhietTx);
        const umin = Number(r.Umin); const rain = Number(r.Mua24h);
        const w = getWindInfo(r);

        if (!isNaN(tn) && tn < tnMin) { tnMin = tn; tnSt = station; }
        if (!isNaN(tx) && tx > txMax) { txMax = tx; txSt = station; }
        if (!isNaN(umin) && umin > 0 && umin < uMin) { uMin = umin; uMinSt = station; }
        if (!isNaN(rain)) { rainTotal += rain; if (rain > rainMax) { rainMax = rain; rainSt = station; } }
        if (w && w.ff > windMax) { windMax = w.ff; windDir = w.dd; windSt = station; }
        if (w && w.ff >= STRONG_WIND_THRESHOLD) strongWindSts.add(station);
        if (hasThunder(r)) thunderSts.add(station);
      });

      return {
        groupName: g,
        TnMin: tnMin === Infinity ? 0 : tnMin, TnStation: tnSt,
        TxMax: txMax === -Infinity ? 0 : txMax, TxStation: txSt,
        UMin: uMin === Infinity ? 0 : uMin, UMinStation: uMinSt,
        RainMax: rainMax === -Infinity ? 0 : Math.round(rainMax*10)/10, RainMaxStation: rainSt,
        RainTotal: Math.round(rainTotal*10)/10,
        WindMax: windMax === -Infinity ? 0 : windMax, WindDir: windDir, WindStation: windSt,
        thunderStations: Array.from(thunderSts), strongWindStations: Array.from(strongWindSts),
        stationCount: new Set(rows.map(r => r.Tram || r.tram)).size,
      } as GroupSummary;
    }).filter(Boolean) as GroupSummary[];
  }, [rawData, selectedGroup, availableGroups]);

  // ===== NARRATIVE TEXT =====
  const narrativeText = useMemo(() => {
    if (!overallSummary) return '';
    const s = overallSummary;
    const periodLabel = s.TotalDays === 1
      ? `Ngày ${dailySummaries[0]?.label || ''}`
      : `Từ ${fmtDate(dateRange.from)} đến ${fmtDate(dateRange.to)} (${s.TotalDays} ngày)`;
    const groupLabel = selectedGroup || 'tất cả các Đài';

    let text = `📋 **${periodLabel}**, khu vực ${groupLabel} ghi nhận ${s.TotalStations} trạm quan trắc:\n\n`;

    // Temperature
    text += `🌡️ **Nhiệt độ**: `;
    if (s.TxMax >= 37) text += `Nắng nóng gay gắt với nhiệt độ `;
    else if (s.TxMax >= 35) text += `Nắng nóng với nhiệt độ `;
    else text += `Nhiệt độ `;
    text += `cao nhất đạt **${fmtVal(s.TxMax)}°C** tại trạm **${s.TxStation}**`;
    if (s.TotalDays > 1) text += ` (${s.TxDate})`;
    text += `; thấp nhất **${fmtVal(s.TnMin)}°C** tại trạm **${s.TnStation}**`;
    if (s.TotalDays > 1) text += ` (${s.TnDate})`;
    text += '.\n\n';

    // Humidity
    if (s.UMin > 0) {
      text += `💧 **Độ ẩm**: Độ ẩm thấp nhất ghi nhận **${Math.round(s.UMin)}%** tại trạm **${s.UMinStation}**`;
      if (s.TotalDays > 1) text += ` (${s.UMinDate})`;
      if (s.UMin < 50) text += '. Độ ẩm khá thấp, cần chú ý';
      else if (s.UMin < 30) text += '. Độ ẩm rât thấp, cần chú ý phòng cháy chữa cháy rừng';
      text += '.\n\n';
    }

    // Rainfall
    text += `🌧️ **Lượng mưa**: `;
    if (s.RainMax <= 0) {
      text += 'Không ghi nhận mưa trong kỳ.\n\n';
    } else {
      text += `Lượng mưa lớn nhất đạt **${fmtVal(s.RainMax)} mm** tại trạm **${s.RainStation}**`;
      if (s.TotalDays > 1) text += ` (${s.RainDate})`;
      if (s.RainMax >= 100) text += '. Mưa rất to';
      else if (s.RainMax >= 50) text += '. Mưa to';
      else if (s.RainMax >= 16) text += '. Mưa vừa';
      else text += '. Mưa nhỏ';
      text += '.\n\n';
    }

    // Wind
    text += `💨 **Gió**: `;
    if (s.WindMax > 0) {
      text += `Gió mạnh nhất hướng **${s.WindDir}**, tốc độ **${s.WindMax} m/s** tại trạm **${s.WindStation}**`;
      if (s.TotalDays > 1) text += ` (${s.WindDate})`;
      if (s.WindMax >= 15) text += '. Gió mạnh cấp 7 trở lên';
      else if (s.WindMax >= STRONG_WIND_THRESHOLD) text += '. Gió khá mạnh';
      text += '.\n\n';
    } else {
      text += 'Gió nhẹ.\n\n';
    }

    // Thunder
    if (s.ThunderStations.length > 0) {
      text += `⚡ **Dông**: Có dông xảy ra tại ${s.ThunderStations.length} trạm: **${s.ThunderStations.join(', ')}**.\n\n`;
    }

    // Strong wind stations
    if (s.StrongWindStations.length > 0) {
      text += `🌀 **Gió mạnh (≥${STRONG_WIND_THRESHOLD} m/s)**: Ghi nhận tại ${s.StrongWindStations.length} trạm: **${s.StrongWindStations.join(', ')}**.\n\n`;
    }

    // Overall assessment
    text += '📊 **Đánh giá chung**: ';
    if (s.TxMax > 35 && s.RainMax <= 0) text += 'Thời tiết nắng nóng, không mưa. Cần đề phòng nguy cơ cháy rừng và thiếu nước.';
    else if (s.RainMax >= 50) text += 'Mưa lớn có khả năng gây ngập úng cục bộ tại một số khu vực trũng.';
    else if (s.WindMax >= 15) text += 'Gió mạnh ảnh hưởng đến hoạt động ngoài trời.';
    else if (s.ThunderStations.length > 3) text += 'Dông hoạt động mạnh trên diện rộng, cần đề phòng sét, lốc xoáy, mưa đá và gió giật mạnh.';
    else text += 'Thời tiết tương đối ổn định, không có hiện tượng cực đoan diện rộng.';

    return text;
  }, [overallSummary, dailySummaries, dateRange, selectedGroup]);

  // ===== EXPORT =====
  const handleExport = () => {
    if (!dailySummaries.length) return;
    const flat = dailySummaries.map(d => ({
      'Ngày': d.label, 'Tn Min (°C)': d.TnMin, 'Trạm Tn': d.TnStation,
      'Tx Max (°C)': d.TxMax, 'Trạm Tx': d.TxStation,
      'Ẩm Min (%)': d.UMin, 'Trạm Ẩm': d.UMinStation,
      'Mưa Max (mm)': d.RainMax, 'Trạm Mưa': d.RainMaxStation,
      'Gió Max (m/s)': d.WindMax, 'Hướng': d.WindDir, 'Trạm Gió': d.WindStation,
      'Trạm có dông': d.thunderStations.join(', '),
      'Trạm gió mạnh': d.strongWindStations.join(', ')
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TongQuanKTTV');
    XLSX.writeFile(wb, `TongQuan_KTTV_${dateRange.from}_${dateRange.to}.xlsx`);
  };

  const adjustEndDate = (days: number) => {
    const d = new Date(endDate); d.setDate(d.getDate() + days);
    setEndDate(d.toISOString().split('T')[0]);
  };

  // ===== CHART DATA =====
  const chartData = useMemo(() => dailySummaries.map(d => ({
    date: d.label, 
    TnMin: d.TnMin, TnStation: d.TnStation,
    TxMax: d.TxMax, TxStation: d.TxStation,
    RainMax: d.RainMax, RainMaxStation: d.RainMaxStation, 
    WindMax: d.WindMax, WindStation: d.WindStation, WindDir: d.WindDir
  })), [dailySummaries]);

  // ===== CUSTOM TOOLTIPS =====
  const CustomMeteoTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => {
            let station = '';
            if (entry.dataKey === 'TxMax') station = entry.payload.TxStation;
            if (entry.dataKey === 'TnMin') station = entry.payload.TnStation;
            if (entry.dataKey === 'RainMax') station = entry.payload.RainMaxStation;
            
            return (
              <div key={index} className="flex justify-between items-center gap-4 text-xs font-bold my-1">
                <span style={{ color: entry.color }}>{entry.name}:</span>
                <span className="text-slate-700">
                  {entry.value} {entry.dataKey === 'RainMax' ? 'mm' : '°C'}
                  <span className="text-[10px] text-slate-400 font-bold ml-1">({station})</span>
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomWindTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl">
          <p className="font-black text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
          <div className="flex justify-between items-center gap-4 text-xs font-bold my-1">
             <span style={{ color: entry.fill }}>Gió Max:</span>
             <span className="text-slate-700">{entry.value} m/s</span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-1 text-right">
            Trạm: {entry.payload.WindStation} • Hướng: {entry.payload.WindDir}
          </div>
        </div>
      );
    }
    return null;
  };

  // ===== SUMMARY CARD =====
  const SummaryCard = ({ icon: Icon, label, value, unit, station, extra, color, bgGradient }: any) => (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 group ${bgGradient}`}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.07] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500" style={{ background: color }}></div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: color }}>
            <Icon size={18} />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black" style={{ color }}>{value}</span>
          <span className="text-xs font-bold text-slate-400">{unit}</span>
        </div>
        <div className="text-[11px] font-bold text-slate-600 truncate" title={station}>📍 {station}</div>
        {extra && <div className="text-[10px] font-bold text-slate-400 truncate" title={extra}>{extra}</div>}
      </div>
    </div>
  );

  // Simple markdown-like renderer for narrative
  const renderNarrative = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="text-slate-800">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });
      return <p key={i} className="text-[13px] leading-relaxed text-slate-600 mb-1">{parts}</p>;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1600px] mx-auto">
      {/* ===== FILTER BAR ===== */}
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[170px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={12} />Đài</label>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none cursor-pointer">
            <option value="">-- Nam Bộ --</option>
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-[140px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Calendar size={12} /> Thời kỳ</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value as PeriodType)}
            className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            <option value="1D">1 ngày</option>
            <option value="2D">2 ngày</option>
            <option value="1W">1 tuần</option>
            <option value="10D">10 ngày</option>
            <option value="1M">1 tháng</option>
            <option value="CUSTOM">Tự chọn</option>
          </select>
        </div>

        {periodType === 'CUSTOM' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-blue-500 uppercase ml-1">Từ ngày</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none cursor-pointer" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-blue-500 uppercase ml-1">{periodType === 'CUSTOM' ? 'Đến ngày' : 'Ngày'}</label>
          <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
            <button onClick={() => adjustEndDate(-1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronLeft size={16} /></button>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-blue-900 w-[120px] text-center outline-none cursor-pointer" />
            <button onClick={() => adjustEndDate(1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={fetchData} onExport={handleExport} />
      </FilterContainer>

      <ErrorBanner message={error} />

      {loading ? <LoadingState /> : !overallSummary ? <MainCard><EmptyState message="Không có dữ liệu trong khoảng thời gian đã chọn" /></MainCard> : (
        <>
          {/* ===== SUMMARY CARDS ===== */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard icon={TrendingDown} label="Nhiệt tối thấp" value={fmtVal(overallSummary.TnMin)} unit="°C"
              station={overallSummary.TnStation} extra={overallSummary.TotalDays > 1 ? overallSummary.TnDate : undefined}
              color="#3b82f6" bgGradient="bg-gradient-to-br from-blue-50 to-white" />

            <SummaryCard icon={TrendingUp} label="Nhiệt tối cao" value={fmtVal(overallSummary.TxMax)} unit="°C"
              station={overallSummary.TxStation} extra={overallSummary.TotalDays > 1 ? overallSummary.TxDate : undefined}
              color="#ef4444" bgGradient="bg-gradient-to-br from-red-50 to-white" />

            <SummaryCard icon={Droplets} label="Ẩm thấp nhất" value={overallSummary.UMin > 0 ? Math.round(overallSummary.UMin) : '-'} unit="%"
              station={overallSummary.UMinStation} extra={overallSummary.TotalDays > 1 ? overallSummary.UMinDate : undefined}
              color="#f59e0b" bgGradient="bg-gradient-to-br from-amber-50 to-white" />

            <SummaryCard icon={CloudRain} label="Mưa lớn nhất" value={fmtVal(overallSummary.RainMax)} unit="mm"
              station={overallSummary.RainStation} extra={overallSummary.TotalDays > 1 ? overallSummary.RainDate : undefined}
              color="#10b981" bgGradient="bg-gradient-to-br from-emerald-50 to-white" />

            <SummaryCard icon={Wind} label="Gió mạnh nhất" value={overallSummary.WindMax > 0 ? overallSummary.WindMax : '-'} unit="m/s"
              station={`${overallSummary.WindDir} • ${overallSummary.WindStation}`} extra={overallSummary.TotalDays > 1 ? overallSummary.WindDate : undefined}
              color="#6366f1" bgGradient="bg-gradient-to-br from-indigo-50 to-white" />

            <SummaryCard icon={Zap} label="Trạm có dông" value={overallSummary.ThunderStations.length} unit="trạm"
              station={overallSummary.ThunderStations.length > 0 ? overallSummary.ThunderStations.slice(0, 3).join(', ') + (overallSummary.ThunderStations.length > 3 ? '...' : '') : 'Không có'}
              color="#8b5cf6" bgGradient="bg-gradient-to-br from-violet-50 to-white" />
          </div>

          {/* ===== EXTREME RANKINGS LEADERBOARD (NEW) ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Award size={15} className="text-amber-500 animate-pulse" /> Bảng xếp hạng các trạm cực trị trong kỳ
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">
                (Hiển thị tối đa 5 trạm cực đoan nhất)
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <ExtremeRankingCard 
                title="Nhiệt độ tối cao" 
                icon={TrendingUp} 
                colorClass="bg-red-500" 
                data={topExtremes?.topTx} 
                type="tx" 
                unit="°C" 
              />
              <ExtremeRankingCard 
                title="Nhiệt độ tối thấp" 
                icon={TrendingDown} 
                colorClass="bg-blue-500" 
                data={topExtremes?.topTn} 
                type="tn" 
                unit="°C" 
              />
              <ExtremeRankingCard 
                title="Lượng mưa lớn nhất" 
                icon={CloudRain} 
                colorClass="bg-emerald-500" 
                data={topExtremes?.topRain} 
                type="rain" 
                unit="mm" 
              />
              <ExtremeRankingCard 
                title="Sức gió mạnh nhất" 
                icon={Wind} 
                colorClass="bg-indigo-500" 
                data={topExtremes?.topWind} 
                type="wind" 
                unit="m/s" 
              />
              <ExtremeRankingCard 
                title="Độ ẩm thấp nhất" 
                icon={Droplets} 
                colorClass="bg-amber-500" 
                data={topExtremes?.topHumidity} 
                type="umin" 
                unit="%" 
              />
            </div>
          </div>

          {/* ===== CHARTS FOR 1 DAY (NEW) ===== */}
          {dailySummaries.length === 1 && stationChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Station Temp Chart */}
              <MainCard>
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 tracking-tight flex items-center gap-2">
                    <Thermometer size={18} className="text-red-500" /> So sánh Nhiệt độ giữa các Trạm (°C)
                  </h4>
                </div>
                <div className="p-3" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stationChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="station" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                      <Tooltip formatter={(value: any) => [`${value} °C`]} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      <Bar dataKey="Tx" name="Nhiệt độ tối cao (Tx)" fill="#f87171" radius={[4,4,0,0]} />
                      <Bar dataKey="Tn" name="Nhiệt độ tối thấp (Tn)" fill="#60a5fa" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </MainCard>

              {/* Station Rain Chart */}
              <MainCard>
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 tracking-tight flex items-center gap-2">
                    <CloudRain size={18} className="text-emerald-500" /> So sánh Lượng mưa 24h giữa các Trạm (mm)
                  </h4>
                </div>
                <div className="p-3" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stationChartData.filter(s => s.Rain > 0).sort((a,b) => b.Rain - a.Rain)} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="station" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip formatter={(value: any) => [`${value} mm`]} />
                      <Bar dataKey="Rain" name="Lượng mưa 24h" fill="#34d399" radius={[4,4,0,0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </MainCard>
            </div>
          )}

          {/* ===== CHARTS FOR PERIOD (MULTIPLE DAYS) ===== */}
          {dailySummaries.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Temperature + Rain Chart */}
              <MainCard>
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 tracking-tight flex items-center gap-2">
                    <Thermometer size={18} className="text-red-500" /> Nhiệt độ & Lượng mưa theo ngày
                  </h4>
                </div>
                <div className="p-3" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                      <YAxis yAxisId="temp" tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                      <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 10, fill: '#10b981' }} />
                      <Tooltip content={<CustomMeteoTooltip />} cursor={{fill: 'rgba(0, 0, 0, 0.04)'}} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      <Bar yAxisId="rain" dataKey="RainMax" name="Mưa max (mm)" fill="#6ee7b7" radius={[4,4,0,0]} barSize={20} opacity={0.8} />
                      <Line yAxisId="temp" type="monotone" dataKey="TxMax" name="Tx (°C)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} />
                      <Line yAxisId="temp" type="monotone" dataKey="TnMin" name="Tn (°C)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </MainCard>

              {/* Wind Chart */}
              <MainCard>
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 tracking-tight flex items-center gap-2">
                    <Wind size={18} className="text-indigo-500" /> Gió mạnh nhất theo ngày (m/s)
                  </h4>
                </div>
                <div className="p-3" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip content={<CustomWindTooltip />} cursor={{fill: 'rgba(0, 0, 0, 0.04)'}} />
                      <Bar dataKey="WindMax" name="Gió max (m/s)" radius={[6,6,0,0]} barSize={24}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.WindMax >= STRONG_WIND_THRESHOLD ? '#ef4444' : entry.WindMax >= 6 ? '#f59e0b' : '#818cf8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </MainCard>
            </div>
          )}

          {/* ===== NARRATIVE ===== */}
          <MainCard>
            <div className="p-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
                <FileText size={14} className="text-emerald-500" /> Tóm tắt tình hình thời tiết
              </h4>
            </div>
            <div className="p-5 bg-gradient-to-br from-slate-50/50 to-white">
              {renderNarrative(narrativeText)}
            </div>
          </MainCard>

          {/* ===== GROUP DETAIL TABLE ===== */}
          {groupSummaries.length > 0 && (
            <MainCard>
              <PageHeader title="Chi tiết từng Đài" subtitle={`${selectedGroup || 'Tất cả'} • ${fmtDate(dateRange.from)} → ${fmtDate(dateRange.to)}`} icon={BarChart3} iconColorClass="bg-sky-600" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-slate-300">
                  <thead className="sticky top-0 z-30 bg-white">
                    <tr className="bg-slate-50">
                      <th className="p-2 font-bold text-slate-700 border border-slate-300 text-center text-xs sticky left-0 bg-slate-100 z-40 shadow-[1px_0_0_0_#cbd5e1] w-[100px]">Đài</th>
                      <th className="p-2 font-bold text-blue-600 border border-slate-300 text-center text-xs bg-blue-50/30 w-[70px]">Tn Min</th>
                      <th className="p-2 font-bold text-blue-600 border border-slate-300 text-center text-xs bg-blue-50/30 w-[90px]">Trạm</th>
                      <th className="p-2 font-bold text-red-600 border border-slate-300 text-center text-xs bg-red-50/30 w-[70px]">Tx Max</th>
                      <th className="p-2 font-bold text-red-600 border border-slate-300 text-center text-xs bg-red-50/30 w-[90px]">Trạm</th>
                      <th className="p-2 font-bold text-amber-600 border border-slate-300 text-center text-xs bg-amber-50/30 w-[60px]">Umin</th>
                      <th className="p-2 font-bold text-emerald-600 border border-slate-300 text-center text-xs bg-emerald-50/30 w-[95px]">Mưa Max</th>
                      <th className="p-2 font-bold text-emerald-600 border border-slate-300 text-center text-xs bg-emerald-50/30 w-[100px]">Trạm</th>
                      <th className="p-2 font-bold text-indigo-600 border border-slate-300 text-center text-xs bg-indigo-50/30 w-[80px]">Gió Max</th>
                      <th className="p-2 font-bold text-indigo-600 border border-slate-300 text-center text-xs bg-indigo-50/30 w-[75px]">Hướng</th>
                      <th className="p-2 font-bold text-violet-600 border border-slate-300 text-center text-xs bg-violet-50/30 w-[70px]">Dông</th>
                      <th className="p-2 font-bold text-rose-600 border border-slate-300 text-center text-xs bg-rose-50/30 w-[70px]">Gió ≥16</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {groupSummaries.map((g, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors border border-slate-300 group">
                        <td className="p-2.5 font-bold text-slate-800 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[1px_0_0_0_#cbd5e1] uppercase text-[11px]">{g.groupName}</td>
                        <td className="p-2 text-center border border-slate-300 text-blue-700 font-black">{fmtVal(g.TnMin)}</td>
                        <td className="p-2 text-center border border-slate-300 text-slate-600 font-bold text-[10px]">{g.TnStation}</td>
                        <td className="p-2 text-center border border-slate-300 text-red-700 font-black">{fmtVal(g.TxMax)}</td>
                        <td className="p-2 text-center border border-slate-300 text-slate-600 font-bold text-[10px]">{g.TxStation}</td>
                        <td className="p-2 text-center border border-slate-300 text-amber-700 font-black">{g.UMin > 0 ? Math.round(g.UMin) + '%' : '-'}</td>
                        <td className="p-2 text-center border border-slate-300 text-emerald-700 font-black">{fmtVal(g.RainMax)}</td>
                        <td className="p-2 text-center border border-slate-300 text-slate-600 font-bold text-[10px]">{g.RainMaxStation}</td>
                        <td className="p-2 text-center border border-slate-300 text-indigo-700 font-black">{g.WindMax > 0 ? g.WindMax : '-'}</td>
                        <td className="p-2 text-center border border-slate-300 text-indigo-600 font-bold">{g.WindDir}</td>
                        <td className="p-2 text-center border border-slate-300 font-bold">
                          {g.thunderStations.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-violet-600" title={g.thunderStations.join(', ')}>
                              <Zap size={11} /> {g.thunderStations.length}
                            </span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-2 text-center border border-slate-300 font-bold">
                          {g.strongWindStations.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-rose-600" title={g.strongWindStations.join(', ')}>
                              <Wind size={11} /> {g.strongWindStations.length}
                            </span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MainCard>
          )}
        </>
      )}
    </div>
  );
};

export default KTTVOverview;
