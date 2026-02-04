
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMeteoMetadata, fetchClimData } from '../services/dataService';
import { ClimData, StationMetadata } from '../types';
import { Calendar, Layers, Table, Search, Droplets, Thermometer, CloudRain } from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState, ErrorBanner } from './Shared';
import * as XLSX from 'xlsx';

const ClimDashboard: React.FC = () => {
  const now = new Date();
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [data, setData] = useState<ClimData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Metadata để lấy danh sách Đài
  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMeteoMetadata();
      setMetadata(meta);
      if (meta.length > 0) {
        setSelectedGroup(meta[0].TenDai || '');
      }
    };
    loadMeta();
  }, []);

  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClimData(selectedGroup, selectedMonth, selectedYear);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải dữ liệu Clim');
    } finally {
      setLoading(false);
    }
  };

  // Tự động load khi thay đổi bộ lọc
  useEffect(() => {
    if (selectedGroup) {
      loadData();
    }
  }, [selectedGroup, selectedMonth, selectedYear]);

  const handleExportExcel = () => {
    if (data.length === 0) return alert('Không có dữ liệu!');
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ClimData");
    XLSX.writeFile(wb, `Clim_${selectedGroup}_${selectedMonth}_${selectedYear}.xlsx`);
  };

  // Format số liệu
  const fmt = (val: number | null | undefined, digits = 1) => {
    if (val === null || val === undefined) return '-';
    return Number(val).toFixed(digits);
  };

  // Format ngày (YYYY-MM-DD -> DD/MM)
  const fmtDate = (val: string | null | undefined | any) => {
    if (!val || val === '-') return '-';
    // Ensure val is string to prevent "val.split is not a function" error
    const strVal = String(val);
    const parts = strVal.split('-');
    if (parts.length < 3) return strVal;
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1800px] mx-auto">
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[200px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={12} /> Đài</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none cursor-pointer">
            <option value="">-- Tất cả --</option>
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-[100px]">
          <label className="text-xs font-bold text-blue-500 uppercase ml-1">Tháng</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-[100px]">
          <label className="text-xs font-bold text-blue-500 uppercase ml-1">Năm</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {[0,1,2,3,4,5,6,7,8,9,10].map(i => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}
          </select>
        </div>

        <button onClick={loadData} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-blue-100 transition-all uppercase tracking-tighter">
          <Search size={16} /> Xem số liệu
        </button>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={loadData} onExport={handleExportExcel} />
      </FilterContainer>

      <ErrorBanner message={error} />

      <MainCard>
        <PageHeader title="Số liệu Clim Khí tượng" subtitle={`${selectedGroup || 'Tất cả'} • Tháng ${selectedMonth}/${selectedYear}`} icon={Table} iconColorClass="bg-slate-600" />
        
        <div className="overflow-x-auto max-h-[700px]">
           <table className="w-full text-left border-collapse border-slate-300">
              <thead className="sticky top-0 z-30 bg-white shadow-sm">
                 <tr className="bg-slate-50">
                   {/* Column 1: Trạm */}
                   <th className="p-2.5 font-bold text-slate-800 border border-slate-300 sticky left-0 z-40 bg-slate-100 text-center w-[120px] shadow-[1px_0_0_0_#cbd5e1] uppercase align-middle">Trạm</th>
                   
                   {/* Nhiệt độ */}
                   {['Ttb', 'Txtb', 'Tntb', 'Tx', 'Ngày Tx', 'Tn', 'Ngày Tn'].map(h => (
                     <th key={h} className="p-2 text-[10px] font-bold text-red-700 border border-slate-300 text-center bg-red-50/10 min-w-[50px] uppercase align-middle">{h}</th>
                   ))}
                   
                   {/* Ẩm độ */}
                   {['UTb', 'Umin', 'Ngày Umin'].map(h => (
                     <th key={h} className="p-2 text-[10px] font-bold text-blue-700 border border-slate-300 text-center bg-blue-50/10 min-w-[50px] uppercase align-middle">{h}</th>
                   ))}

                   {/* Bốc hơi */}
                   <th className="p-2 text-[10px] font-bold text-purple-700 border border-slate-300 text-center bg-purple-50/10 min-w-[60px] uppercase align-middle">Bốc hơi</th>
                   
                   {/* Nắng - Mới thêm */}
                   <th className="p-2 text-[10px] font-bold text-amber-600 border border-slate-300 text-center bg-amber-50/10 min-w-[60px] uppercase align-middle">Nắng</th>

                   {/* Mưa */}
                   {['R Tổng', 'Số ngày', 'Rx', 'Ngày Rx'].map(h => (
                     <th key={h} className="p-2 text-[10px] font-bold text-emerald-700 border border-slate-300 text-center bg-emerald-50/10 min-w-[50px] uppercase align-middle">{h}</th>
                   ))}
                 </tr>
              </thead>
              <tbody className="text-[11px]">
                 {loading ? (
                   <tr><td colSpan={17}><LoadingState /></td></tr>
                 ) : data.length > 0 ? (
                   data.map((row, idx) => (
                     <tr key={idx} className="hover:bg-blue-50/30 transition-colors border border-slate-200">
                       <td className="p-2 font-bold text-slate-900 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-20 shadow-[1px_0_0_0_#cbd5e1]">
                         {row.Tram}
                       </td>
                       
                       <td className="p-2 text-center border border-slate-300 font-bold text-slate-800">{fmt(row.Ttb)}</td>
                       <td className="p-2 text-center border border-slate-300 text-slate-600">{fmt(row.Txtb)}</td>
                       <td className="p-2 text-center border border-slate-300 text-slate-600">{fmt(row.Tntb)}</td>
                       <td className="p-2 text-center border border-slate-300 font-black text-red-600">{fmt(row.Tx)}</td>
                       <td className="p-2 text-center border border-slate-300 text-[10px] italic text-slate-500">{fmtDate(row.NgayTx)}</td>
                       <td className="p-2 text-center border border-slate-300 font-black text-blue-600">{fmt(row.Tn)}</td>
                       <td className="p-2 text-center border border-slate-300 text-[10px] italic text-slate-500">{fmtDate(row.NgayTn)}</td>

                       <td className="p-2 text-center border border-slate-300 font-bold text-slate-800">{fmt(row.AmTb, 0)}</td>
                       <td className="p-2 text-center border border-slate-300 font-black text-orange-600">{fmt(row.Umin, 0)}</td>
                       <td className="p-2 text-center border border-slate-300 text-[10px] italic text-slate-500">{fmtDate(row.NgayUmin)}</td>

                       <td className="p-2 text-center border border-slate-300 font-bold text-purple-700">{fmt(row.BocHoi)}</td>
                       
                       <td className="p-2 text-center border border-slate-300 font-black text-amber-600">{fmt(row.Nang)}</td>

                       <td className="p-2 text-center border border-slate-300 font-black text-emerald-800 bg-emerald-50/10">{fmt(row.TongMua)}</td>
                       <td className="p-2 text-center border border-slate-300 font-bold text-slate-700">{row.SoNgayMua}</td>
                       <td className="p-2 text-center border border-slate-300 font-black text-emerald-600">{fmt(row.Rx)}</td>
                       <td className="p-2 text-center border border-slate-300 text-[10px] italic text-slate-500">{fmtDate(row.NgayRx)}</td>
                     </tr>
                   ))
                 ) : (
                   <tr><td colSpan={17}><EmptyState message="Không có số liệu Clim phù hợp" /></td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </MainCard>
    </div>
  );
};

export default ClimDashboard;
