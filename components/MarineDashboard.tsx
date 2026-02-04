
import React, { useState, useEffect, useCallback } from 'react';
import { MarineFactor, MeteoData } from '../types';
import { fetchMarineData } from '../services/dataService';
import MarineTable from './MarineTable';
import { Waves, Calendar, Sliders, Search, Anchor } from 'lucide-react';
import { ErrorBanner, MainCard, ActionButtons, FilterContainer } from './Shared';
import * as XLSX from 'xlsx';

const MarineDashboard: React.FC = () => {
  const [data, setData] = useState<MeteoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [factor, setFactor] = useState<MarineFactor>(MarineFactor.NHIET_NUOC);
  
  const [dateFilters, setDateFilters] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchMarineData(dateFilters.from, dateFilters.to);
      setData(result);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [dateFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportExcel = () => {
    if (data.length === 0) return alert('Không có dữ liệu!');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HaiVanDetail");
    XLSX.writeFile(wb, `SoLieuHaiVan_${factor}_${dateFilters.from}.xlsx`);
  };

  const getTitle = () => {
    switch (factor) {
      case MarineFactor.NHIET_NUOC: return 'Nhiệt độ nước (°C)';
      case MarineFactor.SONG: return 'Độ cao sóng (m)';
      case MarineFactor.MUC_NUOC: return 'Mực nước (cm)';
      default: return '';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fadeIn max-w-[1600px] mx-auto">
      <ErrorBanner message={errorMessage} />

      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[200px]">
          <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 ml-1">
            <Sliders size={10} /> Yếu tố Hải Văn
          </label>
          <select 
            value={factor}
            onChange={(e) => setFactor(e.target.value as MarineFactor)}
            className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg p-2.5 outline-none cursor-pointer"
          >
            <option value={MarineFactor.NHIET_NUOC}>Nhiệt độ nước (°C)</option>
            <option value={MarineFactor.SONG}>Độ cao sóng (m)</option>
            <option value={MarineFactor.MUC_NUOC}>Mực nước (cm)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
            <Calendar size={10} /> Từ ngày
          </label>
          <input 
            type="date" 
            value={dateFilters.from}
            onChange={(e) => setDateFilters({...dateFilters, from: e.target.value})}
            className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg p-2.5 outline-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
            <Calendar size={10} /> Đến ngày
          </label>
          <input 
            type="date" 
            value={dateFilters.to}
            onChange={(e) => setDateFilters({...dateFilters, to: e.target.value})}
            className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg p-2.5 outline-none cursor-pointer"
          />
        </div>

        <button 
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-blue-100 transition-all uppercase tracking-tighter"
        >
          <Search size={16} /> Xem dữ liệu
        </button>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={fetchData} onExport={handleExportExcel} />
      </FilterContainer>

      <MainCard>
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg">
            <Anchor size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Chi tiết số liệu {getTitle()}
            </h3>
            <p className="text-[10px] text-sky-600 font-black uppercase tracking-widest tracking-widest">
              {factor === MarineFactor.MUC_NUOC ? '2 Trạm chính' : '5 Trạm Hải văn chính'} • {dateFilters.from} đến {dateFilters.to}
            </p>
          </div>
        </div>
        
        <div className="p-2">
          <MarineTable data={data} loading={loading} factor={factor} />
        </div>
      </MainCard>
    </div>
  );
};

export default MarineDashboard;
