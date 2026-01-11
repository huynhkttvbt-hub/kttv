
import React, { useState, useEffect, useCallback } from 'react';
import { FilterState, MeteoFactor, MeteoData, MarineFactor } from '../types';
import FilterBar from './FilterBar';
import MeteoChart from './MeteoChart';
import MeteoTable from './MeteoTable';
import { CloudSun, LayoutGrid } from 'lucide-react';
import { fetchMeteoData } from '../services/dataService';
import { ErrorBanner, MainCard, ActionButtons } from './Shared';
import * as XLSX from 'xlsx';

interface Props {
  stations: string[];
  groups: string[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const MeteoDashboard: React.FC<Props> = ({ stations, groups, filters, onFilterChange }) => {
  const [data, setData] = useState<MeteoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!filters.factor) {
      onFilterChange({ ...filters, factor: MeteoFactor.NHIET_AM });
    }
  }, [filters.factor]);

  const fetchData = useCallback(async () => {
    if (!filters.stationName || !filters.from || !filters.to) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchMeteoData(filters);
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
    
    let exportData: any[] = [];
    
    if (filters.factor === MeteoFactor.GIO) {
      exportData = data.map(d => ({
        'Ngày': d.Ngay,
        'dd1h': d.dd1h, 'ff1h': d.ff1h,
        'dd4h': d.dd4h, 'ff4h': d.ff4h,
        'dd7h': d.dd7h, 'ff7h': d.ff7h,
        'dd10h': d.dd10h, 'ff10h': d.ff10h,
        'dd13h': d.dd13h, 'ff13h': d.ff13h,
        'dd16h': d.dd16h, 'ff16h': d.ff16h,
        'dd19h': d.dd19h, 'ff19h': d.ff19h,
        'dd22h': d.dd22h, 'ff22h': d.ff22h,
        'Dmax1h': d.Dmax1h, 'Fmax1h': d.Fmax1h,
        'Dmax7h': d.Dmax7h, 'Fmax7h': d.Fmax7h,
        'Dmax13h': d.Dmax13h, 'Fmax13h': d.Fmax13h,
        'Dmax19h': d.Dmax19h, 'Fmax19h': d.Fmax19h,
      }));
    } else if (filters.factor === MeteoFactor.MUA) {
      exportData = data.map(d => ({
        'Ngày': d.Ngay,
        'R1h': d.R1h, 'R7h': d.R7h, 'R13h': d.R13h, 'R19h': d.R19h,
        'Mưa Đêm (R19-7)': d.R19_7,
        'Mưa Ngày (R7-19)': d.R7_19,
        'Mưa 24h': d.Mua24h
      }));
    } else {
      exportData = data;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MeteoData");
    XLSX.writeFile(wb, `KhiTuong_${filters.stationName}_${filters.factor}.xlsx`);
  };

  const getFactorLabel = (f?: MeteoFactor | MarineFactor) => {
    switch (f) {
      case MeteoFactor.NHIET_AM: return "Nhiệt độ - Ẩm độ";
      case MeteoFactor.KHI_AP: return "Khí áp";
      case MeteoFactor.GIO: return "Gió";
      case MeteoFactor.MUA: return "Mưa";
      case MeteoFactor.HIEN_TUONG: return "Hiện tượng";
      default: return "";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fadeIn max-w-[1600px] mx-auto">
      <ErrorBanner message={errorMessage} />

      <div className="flex flex-col xl:flex-row items-stretch gap-3">
        <FilterBar 
          filters={filters} 
          onFilterChange={onFilterChange} 
          stations={stations} 
          groups={groups}
          showFactor={true} 
        />
        <ActionButtons 
          loading={loading}
          onRefresh={fetchData}
          onExport={handleExportExcel}
        />
      </div>

      <div className="grid grid-cols-1 gap-5">
        <MainCard>
          <div className="p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                  <CloudSun size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-tight">Diễn biến {getFactorLabel(filters.factor)}</h3>
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">{filters.stationName || '...'}</p>
                </div>
              </div>
            </div>
            
            <div className="w-full">
              <MeteoChart data={data} factor={(filters.factor as MeteoFactor) || MeteoFactor.NHIET_AM} />
            </div>
          </div>
        </MainCard>

        <MainCard>
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 tracking-[0.1em]">
              <LayoutGrid size={14} className="text-emerald-500" /> Chi tiết số liệu quan trắc
            </h3>
            <div className="flex items-center gap-4">
               <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 uppercase">
                {getFactorLabel(filters.factor)}
              </span>
              <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 uppercase">
                {data.length} ngày
              </span>
            </div>
          </div>
          <div className="p-2">
            <MeteoTable data={data} loading={loading} factor={(filters.factor as MeteoFactor) || MeteoFactor.NHIET_AM} />
          </div>
        </MainCard>
      </div>
    </div>
  );
};

export default MeteoDashboard;
