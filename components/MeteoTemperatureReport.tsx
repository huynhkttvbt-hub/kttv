
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMeteoMetadata, fetchMeteoDataByGroup } from '../services/dataService';
import { MeteoData, StationMetadata } from '../types';
import { Calendar, Layers, Thermometer, Search, FileSpreadsheet } from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState, ErrorBanner } from './Shared';
import * as XLSX from 'xlsx';

const MeteoTemperatureReport: React.FC = () => {
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [data, setData] = useState<MeteoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Metadata để lấy danh sách Đài
  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMeteoMetadata();
      setMetadata(meta);
      // Mặc định chọn Lâm Đồng nếu có, hoặc đài đầu tiên
      if (meta.length > 0) {
        const hasLamDong = meta.some(m => m.TenDai === 'Lâm Đồng');
        setSelectedGroup(hasLamDong ? 'Lâm Đồng' : meta[0].TenDai);
      }
    };
    loadMeta();
  }, []);

  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  // Xác định danh sách trạm cần hiển thị dựa trên Đài đã chọn
  // Đặc biệt: Nếu là Lâm Đồng thì dùng danh sách cố định theo yêu cầu
  const displayStations = useMemo(() => {
    if (selectedGroup === 'Lâm Đồng') {
      return ['Đà Lạt', 'Liên Khương', 'Bảo Lộc', 'Cát Tiên', 'Đắk Mil', 'Đắk Nông', 'Phan Rí', 'Phan Thiết', 'La Gi', 'Phú Quý'];
    }
    // Nếu không phải Lâm Đồng, lấy tất cả trạm thuộc đài đó từ metadata
    return metadata
      .filter(m => m.TenDai === selectedGroup)
      .map(m => m.TenTram)
      .sort();
  }, [selectedGroup, metadata]);

  const loadData = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setError(null);
    try {
      // Gọi API lấy dữ liệu trong khoảng thời gian
      const stationListForQuery = selectedGroup === 'Lâm Đồng' ? displayStations : null;
      const result = await fetchMeteoDataByGroup(selectedGroup, fromDate, toDate, stationListForQuery);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Lỗi tải dữ liệu nhiệt độ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      loadData();
    }
  }, []); // Chỉ load lần đầu hoặc khi bấm nút xem

  // Xử lý dữ liệu để hiển thị bảng Pivot: Ngày (Row) x Trạm (Col)
  const pivotData = useMemo(() => {
    const dates = Array.from(new Set(data.map(d => d.Ngay))).sort();
    
    return dates.map(date => {
      const row: any = { Ngay: date };
      displayStations.forEach(station => {
        const record = data.find(d => d.Ngay === date && (d.Tram === station || d.MaTram === station));
        
        // Helper lấy giá trị an toàn từ nhiều key (chữ hoa/thường) và ép kiểu số
        const getVal = (obj: any, keys: string[]) => {
           if (!obj) return null;
           for (const k of keys) {
             const v = obj[k];
             if (v !== undefined && v !== null && v !== '') {
               const n = Number(v);
               return isNaN(n) ? null : n;
             }
           }
           return null;
        };

        row[station] = {
          // Tm = NhietTn (Nhiệt độ tối thấp)
          Tm: getVal(record, ['NhietTn', 'nhiettn', 'Tn', 'tn']), 
          // Tx = NhietTx (Nhiệt độ tối cao)
          Tx: getVal(record, ['NhietTx', 'nhiettx', 'Tx', 'tx'])
        };
      });
      return row;
    });
  }, [data, displayStations]);

  const handleExportExcel = () => {
    if (pivotData.length === 0) return alert('Không có dữ liệu!');
    
    const wsData: any[][] = [];
    
    // Header 1: Trạm KT, Station 1, "", Station 2, "" ...
    const header1 = ["Trạm KT", ...displayStations.flatMap(s => [s, ""])];
    // Header 2: Ngày, Tm, Tx, Tm, Tx ...
    const header2 = ["Ngày", ...displayStations.flatMap(() => ["Tm", "Tx"])];

    wsData.push(header1);
    wsData.push(header2);

    pivotData.forEach(row => {
      const excelRow = [row.Ngay];
      displayStations.forEach(s => {
        const val = row[s];
        excelRow.push(val.Tm ?? '');
        excelRow.push(val.Tx ?? '');
      });
      wsData.push(excelRow);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Merge cells cho Header 1 (Tên trạm trải dài 2 cột Tm/Tx)
    const merges = [];
    let colIdx = 1; // Bắt đầu từ cột B (index 1)
    displayStations.forEach(() => {
      merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 1 } });
      colIdx += 2;
    });
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhietDo");
    XLSX.writeFile(wb, `SoLieuNhietDo_${selectedGroup}_${fromDate}_${toDate}.xlsx`);
  };

  const fmtVal = (val: any) => {
    if (val === null || val === undefined || val === '') return '-';
    return Number(val).toFixed(1);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1800px] mx-auto">
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[200px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={12} /> Đài</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none cursor-pointer">
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Calendar size={12} /> Từ ngày</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none w-full cursor-pointer" />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Calendar size={12} /> Đến ngày</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 outline-none w-full cursor-pointer" />
        </div>

        <button onClick={loadData} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-blue-100 transition-all uppercase tracking-tighter">
          <Search size={16} /> Xem số liệu
        </button>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={loadData} onExport={handleExportExcel} />
      </FilterContainer>

      <ErrorBanner message={error} />

      <MainCard>
        <PageHeader title="Bảng số liệu Nhiệt độ" subtitle={`${selectedGroup} • ${fromDate.split('-').reverse().join('/')} - ${toDate.split('-').reverse().join('/')}`} icon={Thermometer} iconColorClass="bg-red-500" />
        
        <div className="overflow-x-auto max-h-[700px]">
           <table className="w-full text-left border-collapse border-slate-300">
              <thead className="sticky top-0 z-30 bg-white shadow-sm">
                 {/* Header Row 1: Station Names */}
                 <tr className="bg-slate-50">
                   <th rowSpan={2} className="p-2 font-bold text-slate-800 border border-slate-300 sticky left-0 z-40 bg-slate-100 text-center w-[100px] shadow-[1px_0_0_0_#cbd5e1] align-middle">
                      <div className="flex flex-col items-center gap-1">
                        <span>Trạm KT</span>
                        <span className="text-[11px] font-normal text-slate-500 italic border-t border-slate-300 pt-1 w-full">Ngày</span>
                      </div>
                   </th>
                   {displayStations.map(station => (
                     <th key={station} colSpan={2} className="p-2 text-xs font-black text-slate-700 uppercase border border-slate-300 text-center bg-slate-50 min-w-[100px]">
                       {station}
                     </th>
                   ))}
                 </tr>
                 {/* Header Row 2: Tm / Tx */}
                 <tr className="bg-slate-50 sticky top-[25px] z-30 shadow-sm">
                   {displayStations.map(station => (
                     <React.Fragment key={`${station}-sub`}>
                       <th className="p-1.5 text-[11px] font-bold text-slate-600 border border-slate-300 text-center bg-slate-100 w-[50px]">Tm</th>
                       <th className="p-1.5 text-[11px] font-bold text-slate-600 border border-slate-300 text-center bg-slate-100 w-[50px]">Tx</th>
                     </React.Fragment>
                   ))}
                 </tr>
              </thead>
              <tbody className="text-xs">
                 {loading ? (
                   <tr><td colSpan={displayStations.length * 2 + 1}><LoadingState /></td></tr>
                 ) : pivotData.length > 0 ? (
                   pivotData.map((row, idx) => (
                     <tr key={idx} className="hover:bg-blue-50/30 transition-colors border border-slate-200">
                       <td className="p-2 font-bold text-slate-900 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-20 text-center shadow-[1px_0_0_0_#cbd5e1]">
                         {row.Ngay.split('-').reverse().slice(0,2).join('/')}
                       </td>
                       {displayStations.map(station => (
                         <React.Fragment key={`${station}-${row.Ngay}`}>
                           <td className="p-2 text-center border border-slate-300 text-slate-700 font-bold">{fmtVal(row[station]?.Tm)}</td>
                           <td className="p-2 text-center border border-slate-300 text-slate-700 font-bold">{fmtVal(row[station]?.Tx)}</td>
                         </React.Fragment>
                       ))}
                     </tr>
                   ))
                 ) : (
                   <tr><td colSpan={displayStations.length * 2 + 1}><EmptyState message="Không có số liệu phù hợp" /></td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </MainCard>
    </div>
  );
};

export default MeteoTemperatureReport;
