
import React, { useState, useEffect, useMemo } from 'react';
import { fetchDailyData, fetchMetadata } from '../services/dataService';
import { HydroData, StationMetadata } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Layers, Clock, Download, RefreshCw } from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState } from './Shared';
import * as XLSX from 'xlsx';

const DailySynthesis: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<HydroData[]>([]);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>(''); // Mặc định rỗng là Tất cả

  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMetadata();
      setMetadata(meta);
      // Không tự động chọn group đầu tiên nữa để mặc định là "Tất cả"
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

  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  // Logic xử lý dữ liệu để hiển thị và xuất Excel
  // Trả về danh sách các Group cần hiển thị, và dữ liệu trạm bên trong mỗi group
  const groupedData = useMemo(() => {
    const targetGroups = selectedGroup ? [selectedGroup] : availableGroups;
    
    return targetGroups.map(groupName => {
      // Lấy danh sách trạm thuộc group này từ metadata
      const stationMetas = metadata.filter(m => m.TenDai === groupName);
      
      // Map sang dữ liệu thực tế
      const stations = stationMetas.map(meta => {
        const found = data.find(d => d.TenTram === meta.TenTram);
        return found || { 
            id: 0, 
            TenTram: meta.TenTram, 
            TenDai: groupName,
            MaTram: '',
            Ngay: date,
            '01h': null, '07h': null, '13h': null, '19h': null,
            Hmax: null, Hmin: null, Htb: null,
            R1: null, R7: null, R13: null, R19: null, R24: null
        } as HydroData;
      });

      return {
        groupName,
        stations
      };
    }).filter(g => g.stations.length > 0); // Chỉ lấy group nào có trạm
  }, [data, metadata, selectedGroup, availableGroups, date]);

  const handleExportExcel = () => {
     if (groupedData.length === 0) return alert('Không có dữ liệu!');
     
     // Làm phẳng dữ liệu để xuất Excel
     const flatData: any[] = [];
     
     groupedData.forEach(group => {
       // Thêm dòng tiêu đề nhóm vào Excel cho rõ ràng (tùy chọn, ở đây ta cứ xuất thẳng list)
       group.stations.forEach(d => {
         flatData.push({
           'Đài': d.TenDai,
           'Trạm': d.TenTram,
           'Ngày': d.Ngay,
           '01h': d['01h'] ?? '',
           '07h': d['07h'] ?? '',
           '13h': d['13h'] ?? '',
           '19h': d['19h'] ?? '',
           'Hmax': d.Hmax ?? '',
           'Hmin': d.Hmin ?? '',
           'Htb': d.Htb ?? '',
           'R1': d.R1 ?? '',
           'R7': d.R7 ?? '',
           'R13': d.R13 ?? '',
           'R19': d.R19 ?? '',
           'R24': d.R24 ?? ''
         });
       });
     });

     const ws = XLSX.utils.json_to_sheet(flatData);
     ws['!cols'] = [{wch: 15}, {wch: 20}, {wch: 12}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}];

     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "TongHopNgay");
     XLSX.writeFile(wb, `TongHopNgay_${selectedGroup || 'TatCa'}_${date}.xlsx`);
  };

  const renderCell = (val: any, isRain: boolean = false) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-300">-</span>;
    return <span className={isRain ? "text-emerald-700 font-bold" : "text-slate-800 font-bold"}>{val}</span>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1600px] mx-auto">
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[160px]">
           <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
             <Layers size={10} /> Đài Khí Tượng
           </label>
           <select 
             value={selectedGroup}
             onChange={(e) => setSelectedGroup(e.target.value)}
             className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
           >
             <option value="">-- Tất cả --</option>
             {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
           </select>
        </div>

        <div className="flex flex-col gap-1.5">
           <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
             <Calendar size={10} /> Ngày xem
           </label>
           <div className="flex items-center gap-1 bg-blue-50/50 border border-blue-100 rounded-lg p-1">
              <button onClick={() => adjustDate(-1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-black text-blue-900 focus:ring-0 w-[110px] text-center outline-none cursor-pointer"
              />
              <button onClick={() => adjustDate(1)} className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors">
                <ChevronRight size={14} />
              </button>
           </div>
        </div>

        <div className="flex-1"></div>
        
        <ActionButtons 
            loading={loading} 
            onRefresh={loadData} 
            onExport={handleExportExcel} 
        />
      </FilterContainer>

      <MainCard>
        <PageHeader 
          title="Tổng hợp số liệu ngày" 
          subtitle={`${selectedGroup || 'Tất cả các đài'} • ${date.split('-').reverse().join('/')}`} 
          icon={Clock} 
        />
        
        <div className="p-0 overflow-x-auto">
           <table className="w-full text-left border-collapse border-spacing-0">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                   <th rowSpan={2} className="p-3 text-[10px] font-black text-slate-500 uppercase border-r border-slate-200 min-w-[150px] sticky left-0 bg-slate-50 z-30 shadow-[1px_0_0_0_#e2e8f0]">ĐƠN VỊ</th>
                   
                   <th colSpan={7} className="p-2 text-[10px] font-black text-blue-600 uppercase border-r border-slate-200 text-center bg-blue-50/30">Mực nước (cm)</th>
                   <th colSpan={5} className="p-2 text-[10px] font-black text-emerald-600 uppercase text-center bg-emerald-50/30">Mưa (mm)</th>
                </tr>
                
                <tr>
                   <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 text-center min-w-[50px] bg-slate-50">01h</th>
                   <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 text-center min-w-[50px] bg-slate-50">07h</th>
                   <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 text-center min-w-[50px] bg-slate-50">13h</th>
                   <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-200 text-center min-w-[50px] bg-slate-50">19h</th>
                   <th className="p-2 text-[9px] font-black text-blue-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-blue-50/10">Hmax</th>
                   <th className="p-2 text-[9px] font-black text-blue-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-blue-50/10">Hmin</th>
                   <th className="p-2 text-[9px] font-black text-blue-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-blue-50/10">Htb</th>

                   <th className="p-2 text-[9px] font-black text-emerald-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-emerald-50/10">R1</th>
                   <th className="p-2 text-[9px] font-black text-emerald-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-emerald-50/10">R7</th>
                   <th className="p-2 text-[9px] font-black text-emerald-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-emerald-50/10">R13</th>
                   <th className="p-2 text-[9px] font-black text-emerald-600 uppercase border-r border-slate-200 text-center min-w-[50px] bg-emerald-50/10">R19</th>
                   <th className="p-2 text-[9px] font-black text-emerald-600 uppercase text-center min-w-[50px] bg-emerald-50/10">R24</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {loading ? (
                   <tr><td colSpan={13}><LoadingState /></td></tr>
                ) : groupedData.length > 0 ? (
                   // Duyệt qua từng Group (Đài)
                   groupedData.map((group) => (
                     <React.Fragment key={group.groupName}>
                       {/* Hàng Tiêu Đề Group */}
                       <tr className="bg-slate-100/80 hover:bg-slate-100">
                         <td colSpan={13} className="p-2.5 font-black text-slate-600 uppercase text-[10px] border-b border-slate-200 sticky left-0 z-20 bg-slate-100/95 backdrop-blur-sm tracking-wider pl-3 shadow-[1px_0_0_0_#e2e8f0]">
                           {group.groupName}
                         </td>
                       </tr>
                       
                       {/* Danh sách các trạm thuộc Group */}
                       {group.stations.map((row, idx) => (
                         <tr key={`${group.groupName}-${idx}`} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0 group">
                            <td className="p-3 font-bold text-slate-700 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[1px_0_0_0_#e2e8f0] pl-6">
                                {row.TenTram}
                            </td>
                            
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row['01h'])}</td>
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row['07h'])}</td>
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row['13h'])}</td>
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row['19h'])}</td>
                            <td className="p-2 text-center border-r border-slate-100 bg-blue-50/5 font-black text-blue-700">{renderCell(row.Hmax)}</td>
                            <td className="p-2 text-center border-r border-slate-100 bg-blue-50/5 font-black text-blue-700">{renderCell(row.Hmin)}</td>
                            <td className="p-2 text-center border-r border-slate-100 bg-blue-50/5 font-black text-blue-700">{renderCell(row.Htb)}</td>

                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row.R1, true)}</td>
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row.R7, true)}</td>
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row.R13, true)}</td>
                            <td className="p-2 text-center border-r border-slate-100">{renderCell(row.R19, true)}</td>
                            <td className="p-2 text-center bg-emerald-50/5 font-black text-emerald-600">{renderCell(row.R24, true)}</td>
                         </tr>
                       ))}
                     </React.Fragment>
                   ))
                ) : (
                   <tr><td colSpan={13}><EmptyState message="Không có dữ liệu trạm nào" /></td></tr>
                )}
              </tbody>
           </table>
        </div>
      </MainCard>
    </div>
  );
};

export default DailySynthesis;
