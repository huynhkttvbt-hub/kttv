
import React, { useState, useEffect, useMemo } from 'react';
import { fetchDailyData, fetchMetadata } from '../services/dataService';
import { HydroData, StationMetadata } from '../types';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, FileSpreadsheet, Droplets, Clock, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';

const DailySynthesis: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<HydroData[]>([]);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>(''); // State cho bộ lọc đài

  // Load danh sách đài/trạm để đảm bảo hiển thị đủ các trạm ngay cả khi không có số liệu
  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMetadata();
      setMetadata(meta);
    };
    loadMeta();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const dailyData = await fetchDailyData(date);
      setData(dailyData);
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

  // Lấy danh sách các Đài duy nhất để đưa vào dropdown
  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  // Gom nhóm dữ liệu theo Đài (TenDai) và lọc theo selectedGroup
  const groupedData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // Nếu chưa có metadata, dùng data tải về để group
    const sourceStations = metadata.length > 0 ? metadata : data.map(d => ({ TenTram: d.TenTram || '', TenDai: d.TenDai || 'Khác' }));

    // Tạo danh sách tất cả các trạm cần hiển thị
    const allStations = new Map();
    sourceStations.forEach(s => {
      if (s.TenTram) {
        allStations.set(s.TenTram, { TenDai: s.TenDai || 'Khác', TenTram: s.TenTram, ...s });
      }
    });

    // Merge dữ liệu thực tế vào
    data.forEach(d => {
      if (d.TenTram && allStations.has(d.TenTram)) {
        allStations.set(d.TenTram, { ...allStations.get(d.TenTram), ...d });
      }
    });

    // Gom vào nhóm và áp dụng bộ lọc
    allStations.forEach(station => {
      const groupName = station.TenDai || 'Khác';
      
      // LOGIC LỌC: Nếu có chọn Group mà không khớp thì bỏ qua
      if (selectedGroup && selectedGroup !== '' && groupName !== selectedGroup) {
        return;
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(station);
    });

    return groups;
  }, [data, metadata, selectedGroup]);

  const handleExportExcel = () => {
    // Flat data for export
    const exportData: any[] = [];
    Object.keys(groupedData).forEach(groupName => {
      groupedData[groupName].forEach(row => {
        exportData.push({
          'Đài': groupName,
          'Trạm': row.TenTram,
          'Ngày': date,
          'R1 (mm)': row.R1 || '-',
          'R7 (mm)': row.R7 || '-',
          'R13 (mm)': row.R13 || '-',
          'R19 (mm)': row.R19 || '-',
          'R24 (mm)': row.R24 || '-',
          '01h (cm)': row['01h'] || '-',
          '07h (cm)': row['07h'] || '-',
          '13h (cm)': row['13h'] || '-',
          '19h (cm)': row['19h'] || '-',
          'Hmax (cm)': row.Hmax || '-',
          'Hmin (cm)': row.Hmin || '-'
        });
      });
    });

    if (exportData.length === 0) return alert('Không có dữ liệu để xuất!');
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TongHopNgay");
    XLSX.writeFile(wb, `TongHopNgay_${date}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fadeIn max-w-[1600px] mx-auto">
      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Nút lùi ngày */}
          <button onClick={() => adjustDate(-1)} className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          
          {/* Chọn ngày */}
          <div className="flex flex-col gap-1 w-[140px]">
             <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
               <Calendar size={10} /> Chọn ngày
             </label>
             <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-lg p-2 focus:ring-2 focus:ring-blue-500/20 outline-none w-full cursor-pointer"
            />
          </div>

          {/* Nút tiến ngày */}
          <button onClick={() => adjustDate(1)} className="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

          {/* Chọn Đài (Filter) */}
          <div className="flex flex-col gap-1 w-[160px]">
             <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
               <Layers size={10} /> Lọc theo Đài
             </label>
             <select 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-blue-50/50 border border-blue-100 text-blue-900 text-sm font-bold rounded-lg p-2 focus:ring-2 focus:ring-blue-500/20 outline-none w-full cursor-pointer appearance-none"
            >
              <option value="">-- Tất cả các đài --</option>
              {availableGroups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button onClick={loadData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors ml-2" title="Làm mới dữ liệu">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <button 
          onClick={handleExportExcel}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-emerald-100 flex items-center gap-2 uppercase transition-all tracking-tighter"
        >
          <FileSpreadsheet size={16} /> Xuất Excel
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
             <FileSpreadsheet className="text-blue-500" size={18} />
             Bảng tổng hợp số liệu ngày {date.split('-').reverse().join('/')}
           </h3>
           {selectedGroup && (
             <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded uppercase tracking-wider">
               {selectedGroup}
             </span>
           )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th rowSpan={2} className="p-3 text-[10px] font-black text-slate-600 uppercase border-r border-b border-slate-300 text-left sticky left-0 bg-slate-100 min-w-[150px] z-10">Trạm / Đài</th>
                <th colSpan={5} className="p-2 text-[10px] font-black text-emerald-600 uppercase border-r border-b border-slate-300 text-center bg-emerald-50/30">
                  <div className="flex items-center justify-center gap-1"><Droplets size={12}/> Lượng mưa (mm)</div>
                </th>
                <th colSpan={4} className="p-2 text-[10px] font-black text-blue-600 uppercase border-r border-b border-slate-300 text-center bg-blue-50/30">
                  <div className="flex items-center justify-center gap-1"><Clock size={12}/> Mực nước obs (cm)</div>
                </th>
                <th colSpan={2} className="p-2 text-[10px] font-black text-rose-600 uppercase border-b border-slate-300 text-center bg-rose-50/30">
                  <div className="flex items-center justify-center gap-1"><ArrowUp size={12}/> Đặc trưng (cm) <ArrowDown size={12}/></div>
                </th>
              </tr>
              <tr>
                {/* Mưa */}
                {['R1', 'R7', 'R13', 'R19', 'R24'].map(col => (
                  <th key={col} className="p-2 text-[10px] font-black text-emerald-700 border-r border-b border-slate-300 text-center min-w-[50px]">{col}</th>
                ))}
                {/* Mực nước */}
                {['01h', '07h', '13h', '19h'].map(col => (
                  <th key={col} className="p-2 text-[10px] font-black text-blue-700 border-r border-b border-slate-300 text-center min-w-[50px]">{col}</th>
                ))}
                {/* Max Min */}
                <th className="p-2 text-[10px] font-black text-rose-700 border-r border-b border-slate-300 text-center min-w-[60px]">Hmax</th>
                <th className="p-2 text-[10px] font-black text-blue-700 border-b border-slate-300 text-center min-w-[60px]">Hmin</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw size={24} className="animate-spin" />
                      <span className="text-[10px] font-bold uppercase">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : Object.keys(groupedData).length > 0 ? (
                Object.keys(groupedData).sort().map(groupName => (
                  <React.Fragment key={groupName}>
                    {/* Group Header */}
                    <tr className="bg-slate-200/50">
                      <td colSpan={12} className="p-2 font-black text-slate-700 uppercase tracking-widest border-b border-slate-300 sticky left-0 z-10 bg-slate-200/95 pl-4 shadow-sm">
                        {groupName}
                      </td>
                    </tr>
                    {/* Rows */}
                    {groupedData[groupName].sort((a,b) => a.TenTram.localeCompare(b.TenTram)).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                        <td className="p-3 font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-0">
                          {row.TenTram}
                        </td>
                        
                        {/* Mưa */}
                        <td className="p-2 text-center text-emerald-600 font-bold border-r border-slate-200">{row.R1 || '-'}</td>
                        <td className="p-2 text-center text-emerald-600 font-bold border-r border-slate-200">{row.R7 || '-'}</td>
                        <td className="p-2 text-center text-emerald-600 font-bold border-r border-slate-200">{row.R13 || '-'}</td>
                        <td className="p-2 text-center text-emerald-600 font-bold border-r border-slate-200">{row.R19 || '-'}</td>
                        {/* Cột R24 đã điều chỉnh màu sắc nhẹ nhàng hơn */}
                        <td className="p-2 text-center text-emerald-700 font-black border-r border-slate-200 bg-emerald-50">{row.R24 || '-'}</td>

                        {/* Mực nước */}
                        <td className="p-2 text-center text-blue-700 font-medium border-r border-slate-200">{row['01h'] || '-'}</td>
                        <td className="p-2 text-center text-blue-700 font-medium border-r border-slate-200">{row['07h'] || '-'}</td>
                        <td className="p-2 text-center text-blue-700 font-medium border-r border-slate-200">{row['13h'] || '-'}</td>
                        <td className="p-2 text-center text-blue-700 font-medium border-r border-slate-200">{row['19h'] || '-'}</td>

                        {/* Max/Min */}
                        <td className="p-2 text-center text-rose-600 font-black border-r border-slate-200 bg-rose-50/20">{row.Hmax || '-'}</td>
                        <td className="p-2 text-center text-blue-600 font-black bg-blue-50/20">{row.Hmin || '-'}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                 <tr>
                  <td colSpan={12} className="p-12 text-center text-slate-400 text-xs font-bold uppercase">
                    {selectedGroup ? `Không có trạm nào thuộc ${selectedGroup}` : 'Không tìm thấy dữ liệu'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailySynthesis;
