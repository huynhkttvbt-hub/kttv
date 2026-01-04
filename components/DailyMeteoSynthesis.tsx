
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMeteoDailyData, fetchMeteoMetadata } from '../services/dataService';
import { MeteoData, StationMetadata } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Layers, Clock, Wind, Thermometer, Droplets, CloudRain } from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState } from './Shared';
import * as XLSX from 'xlsx';

const DailyMeteoSynthesis: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<MeteoData[]>([]);
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
      const meteoData = await fetchMeteoDailyData(date);
      setData(meteoData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const adjustDate = (days: number) => {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + days);
    setDate(currentDate.toISOString().split('T')[0]);
  };

  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  const processedGroups = useMemo(() => {
    const targetGroups = selectedGroup ? [selectedGroup] : availableGroups;
    
    return targetGroups.map(groupName => {
      const stationMetas = metadata.filter(m => m.TenDai === groupName);
      const stations = stationMetas.map(meta => {
        const row = data.find(d => d.Tram === meta.TenTram);
        
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

        return {
          ...meta,
          row: row || null,
          maxWind: maxFF >= 0 ? { ff: maxFF, dd: bestDD } : null
        };
      });

      return { groupName, stations };
    }).filter(g => g.stations.length > 0);
  }, [data, metadata, selectedGroup, availableGroups]);

  const handleExportExcel = () => {
    if (processedGroups.length === 0) return alert('Không có dữ liệu!');
    const flatData = processedGroups.flatMap(group => 
      group.stations.map(s => ({
        'Đài': group.groupName,
        'Trạm': s.TenTram,
        'T.Bình (°C)': s.row?.NhietTB || '',
        'T.Cao (°C)': s.row?.NhietTx || '',
        'T.Thấp (°C)': s.row?.NhietTn || '',
        'Ẩm TB (%)': s.row?.AmTB || '',
        'Ẩm Min (%)': s.row?.Umin || '',
        'Mưa Đêm (19-7)': s.row?.R19_7 || '',
        'Mưa Ngày (7-19)': s.row?.['R7-19'] || '',
        'Mưa 24h': s.row?.Mua24h || '',
        'Hướng Gió Max': s.maxWind?.dd || '',
        'Tốc Độ Gió Max': s.maxWind?.ff || ''
      }))
    );

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TongHopNgayKT");
    XLSX.writeFile(wb, `TongHopNgay_KT_${date}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1600px] mx-auto">
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[180px]">
           <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1">
             <Layers size={12} /> Đài Khí Tượng
           </label>
           <select 
             value={selectedGroup}
             onChange={(e) => setSelectedGroup(e.target.value)}
             className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none cursor-pointer"
           >
             <option value="">-- Tất cả --</option>
             {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
           </select>
        </div>

        <div className="flex flex-col gap-1.5">
           <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1">
             <Calendar size={12} /> Ngày xem
           </label>
           <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
              <button onClick={() => adjustDate(-1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronLeft size={16} /></button>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-blue-900 focus:ring-0 w-[120px] text-center outline-none cursor-pointer" />
              <button onClick={() => adjustDate(1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"><ChevronRight size={16} /></button>
           </div>
        </div>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={loadData} onExport={handleExportExcel} />
      </FilterContainer>

      <MainCard>
        <PageHeader title="Tổng hợp khí tượng ngày" subtitle={`${selectedGroup || 'Tất cả các đài'} • ${date.split('-').reverse().join('/')}`} icon={Clock} iconColorClass="bg-emerald-600" />
        
        <div className="overflow-x-auto">
           {/* SỬA ĐỔI: Sử dụng border-collapse để khít hoàn toàn */}
           <table className="w-full text-left border-collapse border-slate-300">
              <thead className="sticky top-0 z-30 bg-white">
                <tr className="bg-slate-50">
                   <th rowSpan={2} className="p-2 font-bold text-slate-900 border border-slate-300 w-[180px] sticky left-0 bg-slate-100 z-40 text-center text-xs shadow-[1px_0_0_0_#cbd5e1] uppercase">Đơn vị / Trạm</th>
                   <th colSpan={3} className="p-2 font-bold text-red-600 border border-slate-300 text-center bg-red-50/30 text-xs uppercase">Nhiệt độ (°C)</th>
                   <th colSpan={2} className="p-2 font-bold text-blue-600 border border-slate-300 text-center bg-blue-50/30 text-xs uppercase">Ẩm độ (%)</th>
                   <th colSpan={3} className="p-2 font-bold text-emerald-600 border border-slate-300 text-center bg-emerald-50/30 text-xs uppercase">Lượng mưa (mm)</th>
                   <th colSpan={2} className="p-2 font-bold text-sky-600 border border-slate-300 text-center bg-sky-50/30 text-xs uppercase">Gió Max (m/s)</th>
                </tr>
                <tr className="bg-slate-50 sticky top-[37px] z-30 shadow-sm">
                   {['T.Bình', 'T.Cao', 'T.Thấp'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-red-700 border border-slate-300 text-center bg-red-50/10 w-[70px]">{h}</th>)}
                   {['U.Bình', 'U.Min'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-blue-700 border border-slate-300 text-center bg-blue-50/10 w-[70px]">{h}</th>)}
                   {['Đêm (19-7)', 'Ngày (7-19)', '24h'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-emerald-700 border border-slate-300 text-center bg-emerald-50/10 w-[90px]">{h}</th>)}
                   {['Hướng', 'Tốc độ'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-sky-700 border border-slate-300 text-center bg-sky-50/10 w-[70px]">{h}</th>)}
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm">
                {loading ? (
                   <tr><td colSpan={15}><LoadingState /></td></tr>
                ) : processedGroups.length > 0 ? (
                   processedGroups.map((group) => (
                     <React.Fragment key={group.groupName}>
                       <tr className="bg-slate-100/60">
                         <td colSpan={15} className="p-2.5 font-bold text-slate-800 uppercase text-[10px] md:text-xs border border-slate-300 sticky left-0 z-20 bg-slate-200 shadow-[1px_0_0_0_#cbd5e1] pl-3">
                           {group.groupName}
                         </td>
                       </tr>
                       {group.stations.map((s, idx) => (
                         <tr key={idx} className="hover:bg-blue-50/30 transition-colors border border-slate-300 group">
                            <td className="p-2.5 font-bold text-slate-900 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[1px_0_0_0_#cbd5e1] pl-6">
                                {s.TenTram}
                            </td>
                            <td className="p-2.5 text-center border border-slate-300 text-slate-800 font-bold">{s.row?.NhietTB ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-red-600 font-bold">{s.row?.NhietTx ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-blue-600 font-bold">{s.row?.NhietTn ?? '-'}</td>
                            
                            <td className="p-2.5 text-center border border-slate-300 text-slate-800 font-bold">{s.row?.AmTB ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-orange-600 font-bold">{s.row?.Umin ?? '-'}</td>

                            <td className="p-2.5 text-center border border-slate-300 text-emerald-700 font-bold">{s.row?.R19_7 ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-emerald-700 font-bold">{s.row?.['R7-19'] ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-emerald-800 font-black bg-emerald-50/5">{s.row?.Mua24h ?? '-'}</td>

                            <td className="p-2.5 text-center border border-slate-300 text-sky-800 font-bold bg-sky-50/5">{s.maxWind?.dd ?? '-'}</td>
                            <td className="p-2.5 text-center border border-slate-300 text-sky-900 font-black bg-sky-50/10">{s.maxWind?.ff ?? '-'}</td>
                         </tr>
                       ))}
                     </React.Fragment>
                   ))
                ) : (
                   <tr><td colSpan={15}><EmptyState message="Không có dữ liệu trạm nào" /></td></tr>
                )}
              </tbody>
           </table>
        </div>
      </MainCard>
    </div>
  );
};

export default DailyMeteoSynthesis;
