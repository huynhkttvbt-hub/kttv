
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RainForecastRecord } from '../types';
import { fetchRainForecastData, fetchRainForecastFilters, fetchLatestRainRunDate } from '../services/dataService';
import { LoadingState, ErrorBanner, EmptyState, MainCard, PageHeader, ActionButtons } from './Shared';
import { CloudRain, Filter, ChevronUp, ChevronDown, Search, X, Calendar, MapPin, Droplets, BarChart3 } from 'lucide-react';

// ======================== HELPERS ========================

const formatNum = (val: number | null | undefined, decimals = 1): string => {
  if (val === null || val === undefined) return '-';
  return Number(val).toFixed(decimals);
};

const formatPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  const pct = Number(val) * 100;
  return pct.toFixed(1) + '%';
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Color helpers for rain intensity
const getRainColor = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '';
  const v = Number(val);
  if (v >= 50) return 'bg-red-500 text-white font-bold';
  if (v >= 30) return 'bg-orange-400 text-white font-bold';
  if (v >= 20) return 'bg-amber-300 text-slate-800 font-semibold';
  if (v >= 15) return 'bg-yellow-200 text-slate-800';
  if (v >= 10) return 'bg-yellow-100 text-slate-700';
  if (v >= 5) return 'bg-yellow-50 text-slate-600';
  return '';
};

const getProbColor = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '';
  const pct = Number(val) * 100;
  if (pct >= 80) return 'bg-red-500 text-white font-bold';
  if (pct >= 60) return 'bg-orange-400 text-white font-bold';
  if (pct >= 40) return 'bg-amber-300 text-slate-800 font-semibold';
  if (pct >= 20) return 'bg-yellow-200 text-slate-700';
  if (pct > 0) return 'bg-yellow-50 text-slate-600';
  return '';
};

type SortKey = keyof RainForecastRecord;
type SortDir = 'asc' | 'desc';

// ======================== COMPONENT ========================

const RainDashboard: React.FC = () => {
  // Data state
  const [data, setData] = useState<RainForecastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options
  const [allRegions, setAllRegions] = useState<string[]>([]);
  const [allCommunes, setAllCommunes] = useState<string[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);

  // Filter state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('forecast_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Load filter options on mount
  useEffect(() => {
    const loadFilters = async () => {
      const { regions, communes, dates } = await fetchRainForecastFilters();
      setAllRegions(regions);
      setAllCommunes(communes);
      setAllDates(dates);
      
      // Auto-set date to latest available date if available
      if (dates && dates.length > 0) {
        setSelectedDate(dates[0]);
      } else {
        const latestDate = await fetchLatestRainRunDate();
        if (latestDate) {
          setSelectedDate(latestDate);
        }
      }
    };
    loadFilters();
  }, []);

  // Fetch data when server-side filters change
  const loadData = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRainForecastData({
        date: selectedDate,
        region: selectedRegion || undefined,
        commune: selectedCommune || undefined,
      });
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedRegion, selectedCommune]);

  useEffect(() => {
    if (selectedDate) {
      loadData();
    }
  }, [loadData, selectedDate]);

  // Filter communes by selected region
  const filteredCommunes = useMemo(() => {
    if (!selectedRegion) return allCommunes;
    // Filter communes based on data that matches the selected region
    const communesForRegion = data
      .filter(d => d.region === selectedRegion)
      .map(d => d.commune_name);
    const unique = Array.from(new Set(communesForRegion)).sort();
    return unique.length > 0 ? unique : allCommunes;
  }, [selectedRegion, allCommunes, data]);

  // Client-side filtering (sorting only now since other filters removed)
  const filteredData = useMemo(() => {
    let result = [...data];

    // Sort
    result.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });

    return result;
  }, [data, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => {
    if (sortKey !== col) return <ChevronDown size={10} className="opacity-20 ml-0.5" />;
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="text-blue-500 ml-0.5" />
      : <ChevronDown size={10} className="text-blue-500 ml-0.5" />;
  };

  const clearFilters = () => {
    setSelectedRegion('');
    setSelectedCommune('');
  };

  const handleExport = () => {
    try {
      // Dynamic import xlsx
      import('xlsx').then(XLSX => {
        const exportData = filteredData.map((d, idx) => ({
          'STT': idx + 1,
          'Xã/Phường': d.commune_name,
          'Lat': d.lat,
          'Lon': d.lon,
          'Khu vực': d.region || '',
          'Ngày': formatDate(d.forecast_date),
          'Số MH': d.model_count,
          'Min': d.rain_min,
          'Trung vị': d.rain_median,
          'Max': d.rain_max,
          'MaxWRF': d.rain_max_wrf,
          'P≥5': formatPercent(d.prob_gte_5),
          'P≥10': formatPercent(d.prob_gte_10),
          'P≥15': formatPercent(d.prob_gte_15),
          'P≥20': formatPercent(d.prob_gte_20),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DuBaoMua');
        XLSX.writeFile(wb, `DuBaoMua_${selectedDate}.xlsx`);
      });
    } catch (e) {
      console.error('Lỗi xuất Excel:', e);
    }
  };

  // Stats summary
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const maxRain = Math.max(...filteredData.map(d => d.rain_max ?? 0));
    const avgMedian = filteredData.reduce((sum, d) => sum + (d.rain_median ?? 0), 0) / filteredData.length;
    const highProbCount = filteredData.filter(d => (d.prob_gte_20 ?? 0) > 0.5).length;
    const uniqueDates = new Set(filteredData.map(d => d.forecast_date)).size;
    return { maxRain, avgMedian, highProbCount, uniqueDates, total: filteredData.length };
  }, [filteredData]);

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fadeIn">

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fadeIn">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng bản ghi</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Số ngày</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{stats.uniqueDates}</p>
          </div>
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Mưa (mm)</p>
            <p className="text-2xl font-black text-orange-500 mt-1">{formatNum(stats.maxRain)}</p>
          </div>
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TB Trung vị (mm)</p>
            <p className="text-2xl font-black text-cyan-600 mt-1">{formatNum(stats.avgMedian)}</p>
          </div>
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">P≥20 &gt;50%</p>
            <p className="text-2xl font-black text-red-500 mt-1">{stats.highProbCount}</p>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <MainCard>
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shadow-inner">
              <Filter size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Bộ lọc dữ liệu</span>
          </div>
          <ActionButtons loading={loading} onRefresh={loadData} onExport={handleExport} />
        </div>

        <div className="p-4 flex flex-wrap items-end gap-4">
          {/* Date Selector */}
          <div className="space-y-1.5 w-48">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} /> Ngày dự báo
            </label>
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:bg-slate-50"
            >
              {allDates.length === 0 && <option value="">-- Trống --</option>}
              {allDates.map(d => (
                <option key={d} value={d}>{formatDate(d)} - {d}</option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div className="space-y-1.5 w-48">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <MapPin size={10} /> Khu vực
            </label>
            <select
              value={selectedRegion}
              onChange={e => { setSelectedRegion(e.target.value); setSelectedCommune(''); }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:bg-slate-50"
            >
              <option value="">-- Tất cả --</option>
              {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Commune */}
          <div className="space-y-1.5 w-48">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <MapPin size={10} /> Xã/Phường
            </label>
            <select
              value={selectedCommune}
              onChange={e => setSelectedCommune(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all hover:bg-slate-50"
            >
              <option value="">-- Tất cả --</option>
              {filteredCommunes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Search button */}
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            {(selectedRegion || selectedCommune) && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-bold text-slate-500 hover:text-red-500 px-3 py-2 rounded-lg transition-colors uppercase tracking-wider flex items-center gap-1"
              >
                <X size={12} /> Xóa lọc
              </button>
            )}
          </div>
        </div>
      </MainCard>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Data Table */}
      <MainCard>
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Hiển thị {filteredData.length.toLocaleString()} bản ghi
          </span>
        </div>

        {loading ? (
          <LoadingState message="Đang tải dữ liệu dự báo mưa..." />
        ) : filteredData.length === 0 ? (
          <EmptyState message="Không có dữ liệu phù hợp với bộ lọc" />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse border border-slate-300 min-w-[1200px] text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 divide-x divide-slate-300 border-b border-slate-300 shadow-sm">
                  <Th col="stt" label="STT" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="commune_name" label="Xã/Phường" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} wide />
                  <Th col="lat" label="Lat" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="lon" label="Lon" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="region" label="Khu vực" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="forecast_date" label="Ngày" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="model_count" label="Số MH" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="rain_min" label="Min" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <Th col="rain_median" label="Trung vị" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="cyan" />
                  <Th col="rain_max" label="Max" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="amber" />
                  <Th col="rain_max_wrf" label="MaxWRF" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="orange" />
                  <Th col="prob_gte_5" label="P≥5" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="green" />
                  <Th col="prob_gte_10" label="P≥10" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="yellow" />
                  <Th col="prob_gte_15" label="P≥15" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="orange" />
                  <Th col="prob_gte_20" label="P≥20" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} highlight="red" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`divide-x divide-slate-200 transition-colors hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <Td className="text-slate-500 font-medium">{idx + 1}</Td>
                    <Td className="font-bold text-slate-800 text-left whitespace-nowrap">{row.commune_name}</Td>
                    <Td className="text-slate-500 tabular-nums">{formatNum(row.lat, 2)}</Td>
                    <Td className="text-slate-500 tabular-nums">{formatNum(row.lon, 2)}</Td>
                    <Td>
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
                        {row.region || '-'}
                      </span>
                    </Td>
                    <Td className="font-semibold tabular-nums text-slate-700">{formatDate(row.forecast_date)}</Td>
                    <Td className="tabular-nums font-medium text-slate-600">{row.model_count ?? '-'}</Td>
                    <Td className="tabular-nums text-slate-600">{formatNum(row.rain_min)}</Td>
                    <Td className={`tabular-nums font-semibold ${getRainColor(row.rain_median)}`}>{formatNum(row.rain_median)}</Td>
                    <Td className={`tabular-nums font-bold ${getRainColor(row.rain_max)}`}>{formatNum(row.rain_max)}</Td>
                    <Td className={`tabular-nums font-bold ${getRainColor(row.rain_max_wrf)}`}>{formatNum(row.rain_max_wrf)}</Td>
                    <Td className={`tabular-nums font-medium ${getProbColor(row.prob_gte_5)}`}>{formatPercent(row.prob_gte_5)}</Td>
                    <Td className={`tabular-nums font-medium ${getProbColor(row.prob_gte_10)}`}>{formatPercent(row.prob_gte_10)}</Td>
                    <Td className={`tabular-nums font-medium ${getProbColor(row.prob_gte_15)}`}>{formatPercent(row.prob_gte_15)}</Td>
                    <Td className={`tabular-nums font-medium ${getProbColor(row.prob_gte_20)}`}>{formatPercent(row.prob_gte_20)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MainCard>
    </div>
  );
};

// ======================== TABLE COMPONENTS ========================

interface ThProps {
  col: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  wide?: boolean;
  highlight?: 'cyan' | 'amber' | 'orange' | 'red' | 'green' | 'yellow';
}

const Th: React.FC<ThProps> = ({ col, label, sortKey, sortDir, onSort, wide, highlight }) => {
  const highlightClasses: Record<string, string> = {
    cyan: 'bg-cyan-600/30',
    amber: 'bg-amber-500/30',
    orange: 'bg-orange-500/30',
    red: 'bg-red-500/30',
    green: 'bg-emerald-500/30',
    yellow: 'bg-yellow-400/30',
  };

  return (
    <th
      onClick={() => onSort(col)}
      className={`px-2 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-200 ${wide ? 'min-w-[140px] text-left' : 'text-center'} ${highlight ? highlightClasses[highlight] : ''}`}
    >
      <div className={`flex items-center gap-1 ${wide ? '' : 'justify-center'}`}>
        {label}
        {sortKey === col ? (
          sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
        ) : (
          <ChevronDown size={12} className="opacity-20 hover:opacity-100" />
        )}
      </div>
    </th>
  );
};

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-2 py-2 text-center align-middle ${className}`}>
    {children}
  </td>
);

export default RainDashboard;
