
import React, { useState, useEffect, useMemo } from 'react';
import { fetchMeteoMetadata, fetchTBNN } from '../services/dataService';
import { supabase } from '../supabaseClient';
import { MeteoData, StationMetadata, MeteoStationSummary } from '../types';
import { Calendar, Layers, Clock, Thermometer, Droplets, CloudRain, TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, EmptyState, ErrorBanner } from './Shared';
import * as XLSX from 'xlsx';

type PeriodType = 'MONTH' | 'T1' | 'T2' | 'T3';

const MeteoSummary: React.FC = () => {
  const now = new Date();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<PeriodType>('MONTH');
  const [processedData, setProcessedData] = useState<Record<string, MeteoStationSummary[]>>({});

  // Memoize available groups
  const availableGroups = useMemo(() => {
    const groups = metadata.map(m => m.TenDai).filter(Boolean);
    return Array.from(new Set(groups)).sort() as string[];
  }, [metadata]);

  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMeteoMetadata();
      setMetadata(meta);
    };
    loadMeta();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const mStr = selectedMonth.toString().padStart(2, '0');
      const lastDayDate = new Date(selectedYear, selectedMonth, 0);
      let startDate = `${selectedYear}-${mStr}-01`;
      let endDate = `${selectedYear}-${mStr}-${lastDayDate.getDate()}`;

      if (period === 'T1') endDate = `${selectedYear}-${mStr}-10`;
      else if (period === 'T2') { startDate = `${selectedYear}-${mStr}-11`; endDate = `${selectedYear}-${mStr}-20`; }
      else if (period === 'T3') startDate = `${selectedYear}-${mStr}-21`;

      const { data: meteoData, error: meteoError } = await supabase
        .from('dulieu_khituong')
        .select('*')
        .gte('Ngay', startDate)
        .lte('Ngay', endDate);

      if (meteoError) throw meteoError;
      const meteoRows = (meteoData as any[]) || [];

      const { data: tbnnData } = await supabase
        .from('so_lieu_tbnn')
        .select('tentram, hmax, hmin, htb, rtb') 
        .eq('thang', selectedMonth)
        .eq('ky', period);
      const tbnnRows = (tbnnData as any[]) || [];

      // Sửa lỗi forEach: Ép kiểu rõ ràng cho groupsToProcess
      const groupsToProcess = (selectedGroup ? [selectedGroup] : availableGroups) as string[];
      const finalResult: Record<string, MeteoStationSummary[]> = {};

      groupsToProcess.forEach((groupName: string) => {
        const stationMetas = metadata.filter(m => m.TenDai === groupName);
        const summaries: MeteoStationSummary[] = stationMetas.map(meta => {
          const rows = meteoRows.filter(r => (r.Tram || r.tram) === meta.TenTram);
          
          let tSum = 0, tCount = 0, tx = -Infinity, tn = Infinity, ngayTx = '-', ngayTn = '-';
          let rSum = 0, rMax = -Infinity, ngayRMax = '-', rDays = 0;
          let uSum = 0, uCount = 0, uMin = Infinity, ngayUMin = '-';

          rows.forEach((r: any) => {
            const nTB = Number(r.NhietTB ?? r.nhiettb);
            const nTx = Number(r.NhietTx ?? r.nhiettx);
            const nTn = Number(r.NhietTn ?? r.nhiettn);
            const r24 = Number(r.Mua24h ?? r.mua24h);
            const aTB = Number(r.AmTB ?? r.amtb);
            
            // Đảm bảo ngay luôn là string để không lỗi khi gán vào NgayTn
            const ngay = String(r.Ngay ?? r.ngay ?? '-');
            
            const uHours = ['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h'];
            let rowUMin = Infinity;
            uHours.forEach(h => {
               const val = Number(r[`U${h}`] ?? r[`u${h}`]);
               if (!isNaN(val) && val > 0 && val < rowUMin) rowUMin = val;
            });
            
            if (rowUMin === Infinity) rowUMin = Number(r.Umin ?? r.umin);

            if (!isNaN(nTB)) { tSum += nTB; tCount++; }
            if (!isNaN(nTx) && nTx > tx) { tx = nTx; ngayTx = ngay; }
            if (!isNaN(nTn) && nTn < tn) { tn = nTn; ngayTn = ngay; }
            if (!isNaN(r24)) { 
              rSum += r24; 
              if (r24 > 0) rDays++; 
              if (r24 > rMax) { rMax = r24; ngayRMax = ngay; } 
            }
            if (!isNaN(aTB)) { uSum += aTB; uCount++; }
            if (!isNaN(rowUMin) && rowUMin < uMin) { uMin = rowUMin; ngayUMin = ngay; }
          });

          const tbnn = tbnnRows.find((t: any) => t.tentram === meta.TenTram);
          const tAvg = tCount > 0 ? tSum / tCount : 0;
          const uAvg = uCount > 0 ? uSum / uCount : 0;

          const tbTemp = tbnn?.htb || null;
          const tbRain = tbnn?.rtb || null;
          
          const tempDiff = tbTemp !== null ? Number((tAvg - tbTemp).toFixed(1)) : null;
          const rainPerc = (tbRain !== null && tbRain > 0) 
            ? Number((((rSum - tbRain) / tbRain) * 100).toFixed(1)) 
            : null;

          return {
            TenTram: meta.TenTram,
            Ttb: Number(tAvg.toFixed(1)),
            Tx: tx === -Infinity ? 0 : tx,
            NgayTx: ngayTx,
            Tn: tn === Infinity ? 0 : tn,
            NgayTn: ngayTn, // Đã được xử lý ở trên
            RainSum: Number(rSum.toFixed(1)),
            RainDays: rDays,
            RainMax: rMax === -Infinity ? 0 : rMax,
            NgayRainMax: ngayRMax,
            Utb: Math.round(uAvg),
            Umin: uMin === Infinity ? 0 : uMin,
            NgayUmin: ngayUMin,
            TbnnTemp: tbTemp,
            TbnnRain: tbRain,
            CompareTempDiff: tempDiff,
            CompareRainPerc: rainPerc,
            HasData: rows.length > 0
          };
        });
        finalResult[groupName] = summaries;
      });

      setProcessedData(finalResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGroup, selectedMonth, selectedYear, period, metadata, availableGroups]);

  const handleExportExcel = () => {
    const flat: any[] = [];
    Object.entries(processedData).forEach(([group, stations]) => {
      stations.forEach(s => {
        flat.push({
          'Đài': group, 'Trạm': s.TenTram,
          'Nhiệt TB': s.Ttb, 'Nhiệt Cao': s.Tx, 'Ngày Cao': s.NgayTx, 'Nhiệt Thấp': s.Tn, 'Ngày Thấp': s.NgayTn,
          'Tổng Mưa': s.RainSum, 'Số Ngày Mưa': s.RainDays, 'Mưa Max': s.RainMax, 'Ngày Mưa Max': s.NgayRainMax,
          'Ẩm TB': s.Utb, 'Ẩm Min': s.Umin, 'Ngày Ẩm Min': s.NgayUmin,
          'TBNN Nhiệt': s.TbnnTemp, 'TBNN Mưa': s.TbnnRain,
          'Chênh lệch Nhiệt (°C)': s.CompareTempDiff, 'Chênh lệch Mưa (%)': s.CompareRainPerc
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DacTrungKT");
    XLSX.writeFile(wb, `DacTrungKhituong_${period}_Thang${selectedMonth}.xlsx`);
  };

  const formatDate = (d: string) => d === '-' ? '-' : d.split('-').reverse().slice(0, 2).join('/');

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1700px] mx-auto">
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[160px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Layers size={12} /> Đài</label>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            <option value="">-- Tất cả --</option>
            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Clock size={12} /> Thời kỳ</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodType)} className="w-full bg-blue-50/50 border border-blue-100 text-blue-800 rounded-lg p-2.5 text-xs font-bold cursor-pointer">
            <option value="MONTH">Cả tháng</option>
            <option value="T1">Tuần 1 </option>
            <option value="T2">Tuần 2 </option>
            <option value="T3">Tuần 3 </option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-[90px]">
          <label className="text-xs font-bold text-blue-500 uppercase ml-1">Tháng</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-[100px]">
          <label className="text-xs font-bold text-blue-500 uppercase ml-1">Năm</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {[0,1,2,3,4].map(i => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}
          </select>
        </div>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={fetchData} onExport={handleExportExcel} />
      </FilterContainer>

      <ErrorBanner message={error} />

      <MainCard>
        <PageHeader title="Số liệu khí tượng đặc trưng" subtitle={`${period} • Tháng ${selectedMonth}/${selectedYear}`} icon={Calculator} iconColorClass="bg-indigo-600" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-slate-300">
            <thead className="sticky top-0 z-30 bg-white">
              <tr className="bg-slate-50">
                <th rowSpan={2} className="p-3 font-bold text-slate-900 border border-slate-300 w-[180px] sticky left-0 bg-slate-100 z-40 text-center text-xs shadow-[1px_0_0_0_#cbd5e1] uppercase">Đơn vị</th>
                <th colSpan={5} className="p-2 font-bold text-red-600 border border-slate-300 text-center bg-red-50/30 text-xs uppercase">Nhiệt độ (°C)</th>
                <th colSpan={4} className="p-2 font-bold text-emerald-600 border border-slate-300 text-center bg-emerald-50/30 text-xs uppercase">Lượng mưa (mm)</th>
                <th colSpan={3} className="p-2 font-bold text-blue-600 border border-slate-300 text-center bg-blue-50/30 text-xs uppercase">Ẩm độ (%)</th>
                <th colSpan={2} className="p-2 font-bold text-indigo-600 border border-slate-300 text-center bg-indigo-50/30 text-xs uppercase">TBNN</th>
                <th colSpan={2} className="p-2 font-bold text-violet-600 border border-slate-300 text-center bg-violet-50/30 text-xs uppercase">So TBNN</th>
              </tr>
              <tr className="bg-slate-50 sticky top-[30px] z-30 shadow-sm">
                {['T.Bình', 'T.Cao', 'Ngày', 'T.Thấp', 'Ngày'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-red-700 border border-slate-300 text-center w-[65px] bg-red-50/10">{h}</th>)}
                {['Tổng', 'Ngày', 'Max', 'Ngày'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-emerald-700 border border-slate-300 text-center w-[75px] bg-emerald-50/10">{h}</th>)}
                {['Utb', 'Umin', 'Ngày'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-blue-700 border border-slate-300 text-center w-[65px] bg-blue-50/10">{h}</th>)}
                {['Nhiệt', 'Mưa'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-indigo-700 border border-slate-300 text-center w-[70px] bg-indigo-50/10">{h}</th>)}
                {['ΔT (°C)', 'ΔR (%)'].map(h => <th key={h} className="p-2 text-[10px] md:text-xs font-bold text-violet-700 border border-slate-300 text-center w-[70px] bg-violet-50/10">{h}</th>)}
              </tr>
            </thead>
            <tbody className="text-xs md:text-sm">
              {loading ? (
                <tr><td colSpan={18}><LoadingState /></td></tr>
              ) : Object.keys(processedData).length > 0 ? (
                Object.entries(processedData).map(([group, stations]) => (
                  <React.Fragment key={group}>
                    <tr className="bg-slate-100/60">
                      <td colSpan={18} className="p-2.5 font-bold text-slate-800 uppercase text-[10px] md:text-xs border border-slate-300 sticky left-0 z-20 bg-slate-200 shadow-[1px_0_0_0_#cbd5e1] pl-3">
                        {group}
                      </td>
                    </tr>
                    {stations.map((s, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors border border-slate-300 group">
                        <td className="p-2.5 font-bold text-slate-900 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[1px_0_0_0_#cbd5e1] pl-6">{s.TenTram}</td>
                        
                        <td className="p-2.5 text-center border border-slate-300 font-bold text-slate-900">{s.HasData ? s.Ttb.toFixed(1) : '-'}</td>
                        <td className="p-2.5 text-center border border-slate-300 font-black text-red-600">{s.HasData ? s.Tx.toFixed(1) : '-'}</td>
                        <td className="p-2.5 text-center border border-slate-300 text-[10px] text-slate-600 font-bold italic">{formatDate(s.NgayTx)}</td>
                        <td className="p-2.5 text-center border border-slate-300 font-black text-blue-600">{s.HasData ? s.Tn.toFixed(1) : '-'}</td>
                        <td className="p-2.5 text-center border border-slate-300 text-[10px] text-slate-600 font-bold italic">{formatDate(s.NgayTn)}</td>

                        <td className="p-2.5 text-center border border-slate-300 font-black text-emerald-800">{s.RainSum}</td>
                        <td className="p-2.5 text-center border border-slate-300 text-slate-600 font-bold">{s.RainDays}</td>
                        <td className="p-2.5 text-center border border-slate-300 font-black text-emerald-600">{s.RainMax}</td>
                        <td className="p-2.5 text-center border border-slate-300 text-[10px] text-slate-600 font-bold italic">{formatDate(s.NgayRainMax)}</td>

                        <td className="p-2.5 text-center border border-slate-300 text-slate-900 font-bold">{Math.round(s.Utb)}</td>
                        <td className="p-2.5 text-center border border-slate-300 font-black text-orange-600">{Math.round(s.Umin)}</td>
                        <td className="p-2.5 text-center border border-slate-300 text-[10px] text-slate-600 font-bold italic">{formatDate(s.NgayUmin)}</td>

                        <td className="p-2.5 text-center border border-slate-300 text-slate-700 font-black">{s.TbnnTemp !== null ? Number(s.TbnnTemp).toFixed(1) : '-'}</td>
                        <td className="p-2.5 text-center border border-slate-300 text-slate-700 font-black">{s.TbnnRain ?? '-'}</td>

                        <td className={`p-2.5 text-center border border-slate-300 font-black ${s.CompareTempDiff !== null && s.CompareTempDiff > 0 ? 'text-red-700' : s.CompareTempDiff !== null && s.CompareTempDiff < 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                          {s.CompareTempDiff !== null ? (s.CompareTempDiff > 0 ? `+${s.CompareTempDiff.toFixed(1)}` : s.CompareTempDiff.toFixed(1)) : '-'}
                        </td>
                        
                        <td className={`p-2.5 text-center border border-slate-300 font-black ${s.CompareRainPerc !== null && s.CompareRainPerc > 0 ? 'text-emerald-700' : s.CompareRainPerc !== null && s.CompareRainPerc < 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                          {s.CompareRainPerc !== null ? (s.CompareRainPerc > 0 ? `+${s.CompareRainPerc}%` : `${s.CompareRainPerc}%`) : '-'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan={18}><EmptyState /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </MainCard>
    </div>
  );
};

export default MeteoSummary;
