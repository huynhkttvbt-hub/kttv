
import React, { useState, useEffect, useCallback } from 'react';
import { FilterState, HydroData, MenuType } from '../types';
import FilterBar from './FilterBar';
import HydroChart from './HydroChart';
import HydroTable from './HydroTable';
import UpdateModal from './UpdateModal';
import { Download, Edit3, LineChart, RefreshCw, AlertCircle, LayoutGrid } from 'lucide-react';
import { fetchHydroData } from '../services/dataService';
import * as XLSX from 'xlsx';

interface Props {
  activeMenu: MenuType;
  stations: string[];
  groups: string[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const HydroDashboard: React.FC<Props> = ({ activeMenu, stations, groups, filters, onFilterChange }) => {
  const [data, setData] = useState<HydroData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!filters.stationName) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchHydroData(filters);
      setData(result);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportExcel = () => {
    if (data.length === 0) return alert('Không có dữ liệu!');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `SoLieu_${filters.stationName}_${filters.from}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fadeIn max-w-[1600px] mx-auto">
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 shadow-sm border border-red-100">
          <AlertCircle className="text-red-500" size={18} />
          <p className="text-xs text-red-700 font-bold">{errorMessage}</p>
        </div>
      )}

      {/* Filter and Actions Section */}
      <div className="flex flex-col xl:flex-row items-stretch gap-3">
        <FilterBar 
          filters={filters} 
          onFilterChange={onFilterChange} 
          stations={stations} 
          groups={groups} 
        />
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={fetchData} 
            className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
            title="Làm mới"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => setIsUpdateModalOpen(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black transition-all shadow-lg shadow-blue-100 uppercase tracking-tighter"
          >
            <Edit3 size={14} /> Cập nhật
          </button>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black transition-all shadow-lg shadow-emerald-100 uppercase tracking-tighter"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Chart Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                <LineChart size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-tight">Diễn biến mực nước</h3>
                <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{filters.stationName || '...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-500 rounded-full"></span> THỰC TẾ (CM)
              </div>
            </div>
          </div>
          
          <div className="w-full">
            <HydroChart data={data} stationName={filters.stationName} />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 tracking-[0.1em]">
              <LayoutGrid size={14} className="text-blue-500" /> Chi tiết số liệu quan trắc
            </h3>
            <div className="flex items-center gap-4">
               <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                {filters.from} - {filters.to}
              </span>
              <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 uppercase">
                {data.length} ngày
              </span>
            </div>
          </div>
          <div className="p-2">
            <HydroTable data={data} loading={loading} />
          </div>
        </div>
      </div>

      {isUpdateModalOpen && (
        <UpdateModal 
          onClose={() => setIsUpdateModalOpen(false)} 
          onSave={fetchData} 
          stationGroups={groups} 
          stations={stations}
          initialGroup={filters.stationGroup}
          initialStation={filters.stationName}
        />
      )}
    </div>
  );
};

export default HydroDashboard;
