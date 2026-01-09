
import React, { useState, useEffect, useMemo } from 'react';
import { StationMetadata, TBNNData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { FileSpreadsheet, Calendar, Filter, MapPin, Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { fetchMetadata, fetchTBNN } from '../services/dataService';
import { ErrorBanner, FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons } from './Shared';
import * as XLSX from 'xlsx';

type PeriodType = 'MONTH' | 'T1' | 'T2' | 'T3' | 'DAY';

const HydroSummary: React.FC = () => {
  const now = new Date();
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<PeriodType>('MONTH');
  const [specificDate, setSpecificDate] = useState(now.toISOString().split('T')[0]);

  const [rawStats, setRawStats] = useState<any[]>([]);
  const [tbnnData, setTbnnData] = useState<TBNNData | null>(null);

  // 1. Load Metadata
  useEffect(() => {
    const loadMetadata = async () => {
      const data = await fetchMetadata();
      setMetadata(data);
      if (data.length > 0) {
        const uniqueGroups = Array.from(new Set(data.map(m => m.TenDai).filter(Boolean))) as string[];
        setSelectedGroup(uniqueGroups[0] || '');
      }
    };
    loadMetadata();
  }, []);

  // 2. Dependent Stations List
  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  const filteredStations = useMemo(() => {
    const stations = metadata
      .filter(m => m.TenDai === selectedGroup)
      .map(m => m.TenTram)
      .filter(Boolean)
      .sort() as string[];
    
    if (stations.length > 0 && !stations.includes(selectedStation)) {
      setSelectedStation(stations[0]);
    }
    return stations;
  }, [metadata, selectedGroup, selectedStation]);

  // 3. Data Fetching
  const fetchSummaryData = async () => {
    if (!selectedStation) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('so_lieu_thuy_van').select('*').eq('TenTram', selectedStation);

      if (period === 'DAY') {
        query = query.eq('Ngay', specificDate);
      } else {
        const mStr = selectedMonth.toString().padStart(2, '0');
        const startDay = period === 'T1' ? '01' : period === 'T2' ? '11' : period === 'T3' ? '21' : '01';
        const lastDayDate = new Date(selectedYear, selectedMonth, 0);
        const endDay = period === 'T1' ? '10' : period === 'T2' ? '20' : period === 'T3' ? lastDayDate.getDate().toString().padStart(2, '0') : lastDayDate.getDate().toString().padStart(2, '0');
        
        query = query.gte('Ngay', `${selectedYear}-${mStr}-${startDay}`)
                     .lte('Ngay', `${selectedYear}-${mStr}-${endDay}`);
      }

      const { data, error: sbError } = await query.order('Ngay', { ascending: true });
      if (sbError) throw sbError;
      setRawStats(data || []);

      const monthForTbnn = period === 'DAY' ? new Date(specificDate).getMonth() + 1 : selectedMonth;
      const tbnn = await fetchTBNN(selectedStation, monthForTbnn, period);
      setTbnnData(tbnn);

    } catch (err: any) {
      setError(err?.message || 'Lỗi tải dữ liệu đặc trưng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [selectedStation, selectedMonth, selectedYear, period, specificDate]);

  // 4. Processing Stats (Memoized)
  const processedStats = useMemo(() => {
    if (rawStats.length === 0) return null;

    const hMaxArr = rawStats.map(d => parseFloat(d.Hmax)).filter(v => !isNaN(v));
    const hMinArr = rawStats.map(d => parseFloat(d.Hmin)).filter(v => !isNaN(v));
    const hTbArr = rawStats.map(d => parseFloat(d.Htb)).filter(v => !isNaN(v));
    const rainArr = rawStats.map(d => parseFloat(d.R24)).filter(v => !isNaN(v));

    const hMax = hMaxArr.length ? Math.max(...hMaxArr) : 0;
    const hMin = hMinArr.length ? Math.min(...hMinArr) : 0;
    const hTb = hTbArr.length ? (hTbArr.reduce((a, b) => a + b, 0) / hTbArr.length) : 0;
    const rainSum = rainArr.reduce((a, b) => a + b, 0).toFixed(1);
    const rainMax = rainArr.length ? Math.max(...rainArr) : 0;

    const maxDay = rawStats.find(d => parseFloat(d.Hmax) === hMax)?.Ngay || '-';
    const minDay = rawStats.find(d => parseFloat(d.Hmin) === hMin)?.Ngay || '-';
    const ngayRainMax = rawStats.find(d => parseFloat(d.R24) === rainMax)?.Ngay || '-';

    return { 
      hMax, hMin, hTb, rainSum, rainMax, maxDay, minDay, ngayRainMax,
      count: rawStats.length 
    };
  }, [rawStats]);

  const handleExportExcel = () => {
    if (!processedStats) return alert('Không có dữ liệu!');
    const exportData = [{
      'Trạm': selectedStation, 'Thời kỳ': period,
      'Hmax Thực tế': processedStats.hMax, 'Hmax TBNN': tbnnData?.Hmax || '-', 'Ngày Hmax': processedStats.maxDay,
      'Hmin Thực tế': processedStats.hMin, 'Hmin TBNN': tbnnData?.Hmin || '-', 'Ngày Hmin': processedStats.minDay,
      'Htb Thực tế': processedStats.hTb.toFixed(2), 'Htb TBNN': tbnnData?.Htb || '-',
      'Tổng mưa': processedStats.rainSum
    }];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DacTrung_SoSanh");
    XLSX.writeFile(wb, `DacTrung_${selectedStation}_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const ComparisonBadge = ({ current, target, unit = 'cm' }: { current: number, target: number | null, unit?: string }) => {
    if (target === null || target === undefined) return <span className="text-[9px] text-slate-300 italic">--</span>;
    const diff = current - target;
    const isHigher = diff > 0;
    const formattedDiff = Math.abs(diff).toFixed(2);
    if (Math.abs(diff) < 0.01) return <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Minus size={10} /> 0 {unit}</span>;
    return (
      <div className={`flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full ${isHigher ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
        {isHigher ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span>{isHigher ? '+' : '-'}{formattedDiff} {unit}</span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1400px] mx-auto">
      {/* 1. Filter Section */}
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[140px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={10} /> Đài</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all">
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-[160px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1"><MapPin size={10} /> Trạm</label>
          <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all">
            {filteredStations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1"><Calendar size={10} /> Thời kỳ</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodType)} className="w-full bg-blue-50/50 border border-blue-100 text-blue-800 rounded-lg p-2.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all">
            <option value="MONTH">Cả tháng</option>
            <option value="T1">Tuần 1 (1-10)</option>
            <option value="T2">Tuần 2 (11-20)</option>
            <option value="T3">Tuần 3 (21-Hết)</option>
            <option value="DAY">Ngày cụ thể</option>
          </select>
        </div>

        {period === 'DAY' ? (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-black text-blue-500 uppercase ml-1 flex items-center gap-1"><Calendar size={10} /> Chọn ngày</label>
            <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 w-full cursor-pointer transition-all"/>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 w-[80px]">
              <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Tháng</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all">
                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-[90px]">
              <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Năm</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all">
                {[0,1,2,3,4].map(i => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}
              </select>
            </div>
          </>
        )}
        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={fetchSummaryData} onExport={handleExportExcel} />
      </FilterContainer>

      <ErrorBanner message={error} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MainCard className="lg:col-span-2">
          <PageHeader 
            title="Số liệu đặc trưng & So sánh TBNN" 
            subtitle={`${selectedStation} • ${period}`} 
            icon={Filter} 
          />

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0 border border-slate-300 rounded-lg overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center">Yếu tố</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center">Thực đo</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center">TBNN</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center">So sánh</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase border-b border-slate-300 text-center">Thời gian xuất hiện</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {processedStats ? (
                  <>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-600 border-r border-b border-slate-300 uppercase">Hmax (cm)</td>
                      <td className="p-4 text-center border-r border-b border-slate-300"><span className="text-sm font-black text-red-600">{processedStats.hMax}</span></td>
                      <td className="p-4 text-center border-r border-b border-slate-300 text-xs font-bold text-slate-500">{tbnnData?.Hmax ?? '-'}</td>
                      <td className="p-4 border-r border-b border-slate-300">
                        <div className="flex items-center justify-center w-full h-full"><ComparisonBadge current={processedStats.hMax} target={tbnnData?.Hmax ?? null} /></div>
                      </td>
                      <td className="p-4 text-center border-b border-slate-300 text-[11px] font-bold text-slate-500">{processedStats.maxDay.split('-').reverse().join('/')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-600 border-r border-b border-slate-300 uppercase">Hmin (cm)</td>
                      <td className="p-4 text-center border-r border-b border-slate-300"><span className="text-sm font-black text-blue-600">{processedStats.hMin}</span></td>
                      <td className="p-4 text-center border-r border-b border-slate-300 text-xs font-bold text-slate-500">{tbnnData?.Hmin ?? '-'}</td>
                      <td className="p-4 border-r border-b border-slate-300">
                        <div className="flex items-center justify-center w-full h-full"><ComparisonBadge current={processedStats.hMin} target={tbnnData?.Hmin ?? null} /></div>
                      </td>
                      <td className="p-4 text-center border-b border-slate-300 text-[11px] font-bold text-slate-500">{processedStats.minDay.split('-').reverse().join('/')}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-600 border-r border-b border-slate-300 uppercase">Htb (cm)</td>
                      <td className="p-4 text-center border-r border-b border-slate-300"><span className="text-sm font-black text-slate-900">{Math.round(processedStats.hTb)}</span></td>
                      <td className="p-4 text-center border-r border-b border-slate-300 text-xs font-bold text-slate-500">{tbnnData?.Htb ?? '-'}</td>
                      <td className="p-4 border-r border-b border-slate-300">
                        <div className="flex items-center justify-center w-full h-full"><ComparisonBadge current={processedStats.hTb} target={tbnnData?.Htb ?? null} /></div>
                      </td>
                      <td className="p-4 text-center border-b border-slate-300 text-[11px] font-bold text-slate-400">({processedStats.count} ngày)</td>
                    </tr>
                    <tr className="bg-emerald-50/30 hover:bg-emerald-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-emerald-800 border-r border-slate-300 uppercase">Tổng mưa (mm)</td>
                      <td className="p-4 text-center border-r border-slate-300"><span className="text-sm font-black text-emerald-600">{processedStats.rainSum}</span></td>
                      <td className="p-4 text-center border-r border-slate-300 text-xs font-bold text-slate-500">{tbnnData?.Rtb ?? '-'}</td>
                      <td className="p-4 border-r border-slate-300">
                        <div className="flex items-center justify-center w-full h-full"><ComparisonBadge current={parseFloat(processedStats.rainSum)} target={tbnnData?.Rtb ?? null} unit="mm" /></div>
                      </td>
                      <td className="p-4 text-center text-[10px] font-black text-emerald-400 uppercase tracking-tighter">TOÀN THỜI KỲ</td>
                    </tr>
                  </>
                ) : (
                  <tr><td colSpan={5} className="p-20 text-center"><LoadingState message="Chưa có dữ liệu" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </MainCard>

        {/* Chart Visualization */}
        <MainCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><FileSpreadsheet size={18} /></div>
             <h4 className="text-xs font-black text-slate-700 uppercase">Biểu đồ lượng mưa</h4>
          </div>

          <div className="flex-1 min-h-[300px]">
             {rawStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rawStats.map(d => ({ day: d.Ngay.split('-')[2], rain: parseFloat(d.R24) || 0 }))}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" fontSize={9} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px'}}/>
                    <Bar dataKey="rain" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20}>
                       {rawStats.map((_, index) => <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-[10px] font-black text-slate-300 uppercase">Biểu đồ trống</div>
             )}
          </div>
          
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase text-xs">Lượng mưa lớn nhất</span>
                <span className="text-[10px] font-bold text-slate-700 text-sm">{processedStats?.rainMax !== undefined ? `${processedStats.rainMax} mm` : 'N/A'}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">Ngày xảy ra</span>
                <span className="text-[10px] font-black text-blue-600">{processedStats?.ngayRainMax !== '-' && processedStats?.ngayRainMax ? processedStats.ngayRainMax.split('-').reverse().join('/') : '--'}</span>
             </div>
          </div>
        </MainCard>
      </div>
    </div>
  );
};

export default HydroSummary;
