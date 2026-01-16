
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMeteoDailyData, fetchMeteoMetadata } from '../services/dataService';
import { MeteoData, StationMetadata } from '../types';
<<<<<<< HEAD
import { Calendar, ChevronLeft, ChevronRight, Layers, Clock, ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
=======
import { Calendar, ChevronLeft, ChevronRight, Layers, Clock, Wind, Thermometer, Droplets, CloudRain } from 'lucide-react';
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState } from './Shared';
import * as XLSX from 'xlsx';

const DailyMeteoSynthesis: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
<<<<<<< HEAD
  
  // Khởi tạo ngày so sánh mặc định là ngày hôm qua
  const [compareDate, setCompareDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

=======
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
  const [data, setData] = useState<MeteoData[]>([]);
  const [prevData, setPrevData] = useState<MeteoData[]>([]);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMeteoMetadata();
      setMetadata(meta);
    };
    loadMeta();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Gọi API song song cho 2 ngày được chọn
      const [currentRes, prevRes] = await Promise.all([
        fetchMeteoDailyData(date),
        fetchMeteoDailyData(compareDate)
      ]);
      
      setData(currentRes);
      setPrevData(prevRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Reload khi một trong hai ngày thay đổi
  useEffect(() => {
    loadData();
  }, [date, compareDate]);

  const adjustDate = (days: number) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    setDate(currentDate.toISOString().split('T')[0]);
  };

<<<<<<< HEAD
  const adjustCompareDate = (days: number) => {
    const d = new Date(compareDate);
    d.setDate(d.getDate() + days);
    setCompareDate(d.toISOString().split('T')[0]);
  };

=======
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  const processedGroups = useMemo(() => {
    const targetGroups = selectedGroup ? [selectedGroup] : availableGroups;
    
    return targetGroups.map(groupName => {
      const stationMetas = metadata.filter(m => m.TenDai === groupName);
      const stations = stationMetas.map(meta => {
        const row = data.find(d => d.Tram === meta.TenTram);
<<<<<<< HEAD
        const pRow = prevData.find(d => d.Tram === meta.TenTram);
        
=======
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
        let maxFF = -1;
        let bestDD = '-';
        const windHours = ['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h'];
        if (row) {
          windHours.forEach(h => {
            const ff = Number(row[`ff${h}`]);
            if (!isNaN(ff) && ff > maxFF) {
              maxFF = ff;
              bestDD = row[`dd${h}`] || '-';
            }
          });
        }
<<<<<<< HEAD

        // Tính delta
        const calcDelta = (curr: any, prev: any) => {
          if (curr === undefined || curr === null || curr === '' || prev === undefined || prev === null || prev === '') return null;
          return Number(curr) - Number(prev);
        };

        return {
          ...meta,
          row: row || null,
          prevRow: pRow || null,
          maxWind: maxFF >= 0 ? { ff: maxFF, dd: bestDD } : null,
          deltaTB: calcDelta(row?.NhietTB, pRow?.NhietTB),
          deltaTx: calcDelta(row?.NhietTx, pRow?.NhietTx),
          deltaTn: calcDelta(row?.NhietTn, pRow?.NhietTn)
=======
        return {
          ...meta,
          row: row || null,
          maxWind: maxFF >= 0 ? { ff: maxFF, dd: bestDD } : null
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
        };
      });
      return { groupName, stations };
    }).filter(g => g.stations.length > 0);
<<<<<<< HEAD
  }, [data, prevData, metadata, selectedGroup, availableGroups]);
=======
  }, [data, metadata, selectedGroup, availableGroups]);
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e

  const handleExportExcel = () => {
    if (processedGroups.length === 0) return alert('Không có dữ liệu!');
    const flatData = processedGroups.flatMap(group => 
      group.stations.map(s => ({
        'Đài': group.groupName, 'Trạm': s.TenTram,
<<<<<<< HEAD
        'T.Bình': s.row?.NhietTB || '', 'Delta Tb': s.deltaTB?.toFixed(1) || '',
        'T.Cao': s.row?.NhietTx || '', 'Delta Tx': s.deltaTx?.toFixed(1) || '',
        'T.Thấp': s.row?.NhietTn || '', 'Delta Tn': s.deltaTn?.toFixed(1) || '',
        'Ẩm TB (%)': s.row?.AmTB || '', 'Ẩm Min (%)': s.row?.Umin || '',
        'Mưa Đêm': s.row?.R19_7 || '', 'Mưa Ngày': s.row?.R7_19 || '', 'Mưa 24h': s.row?.Mua24h || '',
        'Hướng Gió': s.maxWind?.dd || '', 'Tốc Độ Gió': s.maxWind?.ff || ''
=======
        'T.Bình (°C)': s.row?.NhietTB || '', 'T.Cao (°C)': s.row?.NhietTx || '', 'T.Thấp (°C)': s.row?.NhietTn || '',
        'Ẩm TB (%)': s.row?.AmTB || '', 'Ẩm Min (%)': s.row?.Umin || '',
        'Mưa Đêm (19-7)': s.row?.R19_7 || '', 'Mưa Ngày (7-19)': s.row?.R7_19 || '', 'Mưa 24h': s.row?.Mua24h || '',
        'Hướng Gió ': s.maxWind?.dd || '', 'Tốc Độ Gió ': s.maxWind?.ff || ''
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
      }))
    );
    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TongHopNgayKT");
    XLSX.writeFile(wb, `TongHopNgay_KT_SoSanh_${date}_vs_${compareDate}.xlsx`);
  };

  // Helper formatting
  const fmtT = (val: any) => (val !== undefined && val !== null && val !== '') ? Number(val).toFixed(1) : '-';
  const fmtU = (val: any) => (val !== undefined && val !== null && val !== '') ? Math.round(Number(val)) : '-';
<<<<<<< HEAD

  const renderDelta = (val: number | null) => {
    if (val === null) return <span className="text-slate-300">-</span>;
    const isPos = val > 0;
    const isNeg = val < 0;
    const color = isPos ? 'text-red-500' : isNeg ? 'text-blue-500' : 'text-slate-400';
    const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
    
    return (
      <div className={`flex items-center justify-center gap-0.5 text-[9px] font-bold ${color}`}>
        <Icon size={10} strokeWidth={3} />
        <span>{Math.abs(val).toFixed(1)}</span>
      </div>
    );
  };
=======
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1600px] mx-auto">
      <FilterContainer>
        {/* Chọn Đài */}
        <div className="flex flex-col gap-1.5 w-[180px]">
<<<<<<< HEAD
           <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={12} /> Đài Khí Tượng</label>
=======
           <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={12} /> Đài </label>
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
           <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none cursor-pointer">
             <option value="">-- Tất cả --</option>
             {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
           </select>
        </div>

        {/* Ngày xem */}
        <div className="flex flex-col gap-1.5">
           <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Calendar size={12} /> Ngày xem</label>
           <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
              <button onClick={() => adjustDate(-1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronLeft size={16} /></button>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-blue-900 focus:ring-0 w-[120px] text-center outline-none cursor-pointer" />
              <button onClick={() => adjustDate(1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronRight size={16} /></button>
           </div>
        </div>

        {/* Ngày so sánh (New) */}
        <div className="flex flex-col gap-1.5">
           <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><ArrowLeftRight size={12} /> Ngày so sánh</label>
           <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
              <button onClick={() => adjustCompareDate(-1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronLeft size={16} /></button>
              <input type="date" value={compareDate} onChange={(e) => setCompareDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-blue-900 focus:ring-0 w-[120px] text-center outline-none cursor-pointer" />
              <button onClick={() => adjustCompareDate(1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronRight size={16} /></button>
           </div>
        </div>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={loadData} onExport={handleExportExcel} />
      </FilterContainer>

      <MainCard>
<<<<<<< HEAD
        <PageHeader title="Tổng hợp khí tượng & So sánh biến động" subtitle={`${selectedGroup || 'Tất cả các đài'} • ${date.split('-').reverse().join('/')} vs ${compareDate.split('-').reverse().join('/')}`} icon={Clock} iconColorClass="bg-emerald-600" />
=======
        <PageHeader title="Tổng hợp khí tượng ngày" subtitle={`${selectedGroup || 'Tất cả các đài'} • ${date.split('-').reverse().join('/')}`} icon={Clock} iconColorClass="bg-emerald-600" />
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse border-slate-300">
              <thead className="sticky top-0 z-30 bg-white">
                <tr className="bg-slate-50">
<<<<<<< HEAD
                   <th rowSpan={2} className="p-2 font-bold text-slate-700 border border-slate-300 w-[160px] sticky left-0 bg-slate-100 z-40 text-center text-xs shadow-[1px_0_0_0_#cbd5e1] uppercase">ĐƠN VỊ</th>
                   <th colSpan={6} className="p-2 font-bold text-red-600 border border-slate-300 text-center bg-red-50/30 text-xs uppercase">Nhiệt độ (°C) & Biến động</th>
                   <th colSpan={2} className="p-2 font-bold text-blue-600 border border-slate-300 text-center bg-blue-50/30 text-xs uppercase">Ẩm độ (%)</th>
                   <th colSpan={3} className="p-2 font-bold text-emerald-600 border border-slate-300 text-center bg-emerald-50/30 text-xs uppercase">Mưa (mm)</th>
                   <th colSpan={2} className="p-2 font-bold text-sky-600 border border-slate-300 text-center bg-sky-50/30 text-xs uppercase">Gió</th>
                </tr>
                <tr className="bg-slate-50 sticky top-[30px] z-30 shadow-sm">
                   {/* Nhiệt độ headers */}
                   <th className="p-1.5 text-[10px] font-bold text-red-700 border border-slate-300 text-center bg-red-50/10 w-[45px]">T.Tb</th>
                   <th className="p-1.5 text-[9px] font-black text-red-400 border border-slate-300 text-center bg-red-50/5 w-[35px]">Δ</th>
                   <th className="p-1.5 text-[10px] font-bold text-red-700 border border-slate-300 text-center bg-red-50/10 w-[45px]">T.Mx</th>
                   <th className="p-1.5 text-[9px] font-black text-red-400 border border-slate-300 text-center bg-red-50/5 w-[35px]">Δ</th>
                   <th className="p-1.5 text-[10px] font-bold text-red-700 border border-slate-300 text-center bg-red-50/10 w-[45px]">T.Mn</th>
                   <th className="p-1.5 text-[9px] font-black text-red-400 border border-slate-300 text-center bg-red-50/5 w-[35px]">Δ</th>
                   
                   {/* Ẩm độ headers */}
                   {['U.Tb', 'U.Min'].map(h => <th key={h} className="p-1.5 text-[10px] font-bold text-blue-700 border border-slate-300 text-center bg-blue-50/10 w-[55px]">{h}</th>)}
                   
                   {/* Mưa headers (Thu hẹp) */}
                   {['Đêm', 'Ngày', '24h'].map(h => <th key={h} className="p-1.5 text-[10px] font-bold text-emerald-700 border border-slate-300 text-center bg-emerald-50/10 w-[60px]">{h}</th>)}
                   
                   {/* Gió headers */}
                   {['H', 'T'].map(h => <th key={h} className="p-1.5 text-[10px] font-bold text-sky-700 border border-slate-300 text-center bg-sky-50/10 w-[45px]">{h}</th>)}
                </tr>
              </thead>
              <tbody className="text-xs">
                {loading ? (
                   <tr><td colSpan={18}><LoadingState /></td></tr>
=======
                   <th rowSpan={2} className="p-2 font-bold text-slate-700 border border-slate-300 w-[180px] sticky left-0 bg-slate-100 z-40 text-center text-xs shadow-[1px_0_0_0_#cbd5e1] uppercase">ĐƠN VỊ</th>
                   <th colSpan={3} className="p-2 font-bold text-red-600 border border-slate-300 text-center bg-red-50/30 text-xs uppercase">Nhiệt độ (°C)</th>
                   <th colSpan={2} className="p-2 font-bold text-blue-600 border border-slate-300 text-center bg-blue-50/30 text-xs uppercase">Ẩm độ (%)</th>
                   <th colSpan={3} className="p-2 font-bold text-emerald-600 border border-slate-300 text-center bg-emerald-50/30 text-xs uppercase">Lượng mưa (mm)</th>
                   <th colSpan={2} className="p-2 font-bold text-sky-600 border border-slate-300 text-center bg-sky-50/30 text-xs uppercase">Gió thịnh hành</th>
                </tr>
                <tr className="bg-slate-50 sticky top-[30px] z-30 shadow-sm">
                   {['T.Tb', 'T.Max', 'T.Min'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-red-700 border border-slate-300 text-center bg-red-50/10 w-[70px]">{h}</th>)}
                   {['U.Tb', 'U.Min'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-blue-700 border border-slate-300 text-center bg-blue-50/10 w-[70px]">{h}</th>)}
                   {['Đêm (19-7)', 'Ngày (7-19)', '24h'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-emerald-700 border border-slate-300 text-center bg-emerald-50/10 w-[90px]">{h}</th>)}
                   {['Hướng', 'Tốc độ'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-sky-700 border border-slate-300 text-center bg-sky-50/10 w-[70px]">{h}</th>)}
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {loading ? (
                   <tr><td colSpan={15}><LoadingState /></td></tr>
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
                ) : processedGroups.length > 0 ? (
                   processedGroups.map((group) => (
                     <React.Fragment key={group.groupName}>
                       <tr className="bg-slate-100">
<<<<<<< HEAD
                         <td colSpan={18} className="p-2 font-bold text-slate-800 uppercase text-[10px] border border-slate-300 sticky left-0 z-20 bg-slate-200 shadow-[1px_0_0_0_#cbd5e1] pl-3">
=======
                         <td colSpan={15} className="p-2.5 font-bold text-slate-800 uppercase text-[10px] border border-slate-300 sticky left-0 z-20 bg-slate-200 shadow-[1px_0_0_0_#cbd5e1] pl-3">
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
                           {group.groupName}
                         </td>
                       </tr>
                       {group.stations.map((s, idx) => (
                         <tr key={idx} className="hover:bg-blue-50/30 transition-colors border border-slate-300 group">
<<<<<<< HEAD
                            <td className="p-2 font-bold text-slate-700 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[1px_0_0_0_#cbd5e1] pl-6">{s.TenTram}</td>
                            
                            {/* T.Tb & Delta */}
                            <td className="p-2 text-center border border-slate-300 text-slate-800 font-bold">{fmtT(s.row?.NhietTB)}</td>
                            <td className="p-1 text-center border border-slate-300 bg-slate-50/30">{renderDelta(s.deltaTB)}</td>
                            
                            {/* T.Max & Delta */}
                            <td className="p-2 text-center border border-slate-300 text-red-600 font-black">{fmtT(s.row?.NhietTx)}</td>
                            <td className="p-1 text-center border border-slate-300 bg-slate-50/30">{renderDelta(s.deltaTx)}</td>
                            
                            {/* T.Min & Delta */}
                            <td className="p-2 text-center border border-slate-300 text-blue-600 font-black">{fmtT(s.row?.NhietTn)}</td>
                            <td className="p-1 text-center border border-slate-300 bg-slate-50/30">{renderDelta(s.deltaTn)}</td>

                            <td className="p-2 text-center border border-slate-300 text-slate-800 font-bold">{fmtU(s.row?.AmTB)}</td>
                            <td className="p-2 text-center border border-slate-300 text-orange-600 font-black">{fmtU(s.row?.Umin)}</td>
                            
                            <td className="p-2 text-center border border-slate-300 text-emerald-700 font-bold">{s.row?.R19_7 ?? '-'}</td>
                            <td className="p-2 text-center border border-slate-300 text-emerald-700 font-bold">{s.row?.R7_19 ?? '-'}</td>
                            <td className="p-2 text-center border border-slate-300 text-emerald-800 font-black bg-emerald-50/5">{s.row?.Mua24h ?? '-'}</td>
                            
                            <td className="p-2 text-center border border-slate-300 text-sky-800 font-bold">{s.maxWind?.dd ?? '-'}</td>
                            <td className="p-2 text-center border border-slate-300 text-sky-900 font-black bg-sky-50/5">{s.maxWind?.ff ?? '-'}</td>
=======
                            <td className="p-2.5 font-bold text-slate-700 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[1px_0_0_0_#cbd5e1] pl-6">{s.TenTram}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-slate-800 font-bold">{fmtT(s.row?.NhietTB)}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-red-600 font-black">{fmtT(s.row?.NhietTx)}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-blue-600 font-black">{fmtT(s.row?.NhietTn)}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-slate-800 font-bold">{fmtU(s.row?.AmTB)}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-orange-600 font-black">{fmtU(s.row?.Umin)}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-emerald-700 font-bold">{s.row?.R19_7 ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-emerald-700 font-bold">{s.row?.R7_19 ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-emerald-800 font-black bg-emerald-50/5">{s.row?.Mua24h ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-sky-800 font-bold">{s.maxWind?.dd ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-sky-900 font-black bg-sky-50/5">{s.maxWind?.ff ?? '-'}</td>
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
                         </tr>
                       ))}
                     </React.Fragment>
                   ))
                ) : (
<<<<<<< HEAD
                   <tr><td colSpan={18}><EmptyState message="Không có dữ liệu" /></td></tr>
=======
                   <tr><td colSpan={15}><EmptyState message="Không có dữ liệu" /></td></tr>
>>>>>>> 120d3ae5a591056c914629f173d33a88a361258e
                )}
              </tbody>
           </table>
        </div>
      </MainCard>
    </div>
  );
};

export default DailyMeteoSynthesis;
