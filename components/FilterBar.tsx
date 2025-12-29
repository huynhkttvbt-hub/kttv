
import React from 'react';
import { FilterState } from '../types';
import { Search, MapPin, Calendar } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  stations: string[];
  groups: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, stations, groups }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-3 flex-1">
      {/* Cột Đài */}
      <div className="flex flex-col gap-1.5 w-[140px]">
        <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
          <MapPin size={10} /> Đài
        </label>
        <select 
          name="stationGroup"
          value={filters.stationGroup}
          onChange={handleChange}
          className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none block w-full p-2.5 transition-all appearance-none cursor-pointer"
        >
          <option value="">-- Tất cả --</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Cột Trạm */}
      <div className="flex flex-col gap-1.5 w-[160px]">
        <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
          <MapPin size={10} /> Trạm
        </label>
        <select 
          name="stationName"
          value={filters.stationName}
          onChange={handleChange}
          className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none block w-full p-2.5 transition-all appearance-none cursor-pointer"
        >
          <option value="">-- Chọn trạm --</option>
          {stations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
          <Calendar size={10} /> Từ ngày
        </label>
        <input 
          type="date" 
          name="from"
          value={filters.from}
          onChange={handleChange}
          className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none block w-full p-2.5 transition-all cursor-pointer"
        />
      </div>

      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
          <Calendar size={10} /> Đến ngày
        </label>
        <input 
          type="date" 
          name="to"
          value={filters.to}
          onChange={handleChange}
          className="bg-blue-50/50 border border-blue-100 text-blue-800 text-[11px] font-black rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none block w-full p-2.5 transition-all cursor-pointer"
        />
      </div>

      <button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-tighter">
        <Search size={16} /> Xem dữ liệu
      </button>
    </div>
  );
};

export default FilterBar;
