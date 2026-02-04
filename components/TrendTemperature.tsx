
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { fetchMeteoMetadata, generateForecastData, fetchTBNNSeries } from '../services/dataService';
import { StationMetadata, MeteoData, TBNNData } from '../types';
import { 
  AreaChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import { 
  Thermometer, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, ErrorBanner } from './Shared';

const TrendTemperature: React.FC = () => {
  const now = new Date();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const [meteoData, setMeteoData] = useState<MeteoData[]>([]);
  const [tbnnData, setTbnnData] = useState<TBNNData[]>([]);
  const [combinedData, setCombinedData] = useState<any[]>([]);

  useEffect(() => {
    const loadMeta = async () => {
      const meta = await fetchMeteoMetadata();
      setMetadata(meta);
      if (meta.length > 0) setSelectedStation(meta[0].TenTram);
    };
    loadMeta();
  }, []);

  const fetchData = async () => {
    if (!selectedStation) return;
    setLoading(true);
    setError(null);
    try {
      const mStr = selectedMonth.toString().padStart(2, '0');
      const lastDayDate = new Date(selectedYear, selectedMonth, 0);
      const startDate = `${selectedYear}-${mStr}-01`;
      const endDate = `${selectedYear}-${mStr}-${lastDayDate.getDate()}`;

      // 1. Fetch meteo data (Thực đo)
      const { data: mData, error: meteoError } = await supabase
        .from('dulieu_khituong')
        .select('*')
        .eq('Tram', selectedStation)
        .gte('Ngay', startDate)
        .lte('Ngay', endDate)
        .order('Ngay', { ascending: true });

      if (meteoError) throw meteoError;
      setMeteoData(mData || []);

      // 2. Fetch toàn bộ TBNN (để dùng cho dự báo và hiển thị)
      const tData = await fetchTBNNSeries(selectedStation);
      setTbnnData(tData);

      // 3. Xử lý logic dự báo
      let finalData = (mData || []).map((d: any) => ({
        ...d,
        type: 'observed',
        displayDate: d.Ngay ? d.Ngay.split('-').reverse()[0] : '', 
        NhietTB: Number(d.NhietTB || d.nhiettb),
        Forecast: null // observed data thì ko có forecast
      }));

      // Nếu có dữ liệu thực đo, tiến hành dự báo tiếp 10 ngày từ ngày cuối cùng
      if (finalData.length > 0 && tData.length > 0) {
        const lastRecord = finalData[finalData.length - 1];
        const lastVal = lastRecord.NhietTB;
        const lastDate = lastRecord.Ngay;
        const currentMonthTBNN = tData.find(t => t.Thang === selectedMonth)?.Htb || lastVal;

        if (!isNaN(lastVal)) {
           const predictions = generateForecastData(lastDate, lastVal, currentMonthTBNN, tData, 10);
           
           // Nối dự báo vào chuỗi data
           const forecastPoints = predictions.map(p => ({
             Ngay: p.date,
             displayDate: p.date.split('-').reverse().slice(0, 2).join('/'),
             type: 'forecast',
             NhietTB: null, // cột thực đo để null
             Forecast: p.value // cột dự báo có giá trị
           }));

           finalData = [...finalData, ...forecastPoints];
        }
      }

      setCombinedData(finalData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStation, selectedMonth, selectedYear]);

  // Lấy giá trị TBNN của tháng đang chọn để hiển thị tham chiếu
  const currentTBNN = useMemo(() => {
     return tbnnData.find(t => t.Thang === selectedMonth)?.Htb || null;
  }, [tbnnData, selectedMonth]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1700px] mx-auto">
      <FilterContainer>
        <div className="flex flex-col gap-1.5 w-[200px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><MapPin size={12} /> Trạm</label>
          <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {metadata.map(m => <option key={m.TenTram} value={m.TenTram}>{m.TenTram}</option>)}
          </select>
        </div>
        
        {/* Tháng/Năm selectors giữ nguyên */}
        <div className="flex flex-col gap-1.5 w-[100px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Calendar size={12} /> Tháng</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 w-[100px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><Clock size={12} /> Năm</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {[0,1,2,3,4].map(i => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}
          </select>
        </div>

        <div className="flex-1"></div>
        <ActionButtons loading={loading} onRefresh={fetchData} />
      </FilterContainer>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <MainCard>
            <PageHeader 
              title="Xu thế & Dự báo nhiệt độ (10 ngày)" 
              subtitle={`Trạm ${selectedStation} • Tháng ${selectedMonth}/${selectedYear}`} 
              icon={Zap} 
              iconColorClass="bg-orange-500" 
            />
            
            <div className="h-[450px] mt-6 w-full">
              {loading ? <LoadingState /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="displayDate" fontSize={11} tick={{fill: '#64748b', fontWeight: 600}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} />
                    <YAxis fontSize={11} tick={{fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{borderRadius: '12px', padding: '12px'}} />
                    <Legend verticalAlign="top" height={36} />
                    
                    {currentTBNN && (
                       <ReferenceLine y={currentTBNN} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: `TBNN: ${currentTBNN}°C`, position: 'right', fill: '#94a3b8', fontSize: 10 }} />
                    )}
                    
                    {/* Dữ liệu thực đo: Vùng màu đỏ */}
                    <Area type="monotone" dataKey="NhietTB" name="Thực đo (Observed)" stroke="#ef4444" fill="url(#colorTemp)" strokeWidth={2} dot={{r:3}} connectNulls={false} />
                    
                    {/* Dữ liệu dự báo: Đường đứt nét màu cam */}
                    <Line type="monotone" dataKey="Forecast" name="Dự báo (Forecast)" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={{r:3}} connectNulls={true} />
                    
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </MainCard>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative group">
             {/* Box thông báo dự báo */}
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 relative z-10">Mô hình dự báo</h3>
             <div className="space-y-4 relative z-10">
                <div className="flex items-start gap-3">
                   <TrendingUp size={16} className="text-orange-400 mt-1" />
                   <div>
                     <p className="text-sm font-bold text-white">Xu thế Persistence (Quán tính)</p>
                     <p className="text-[11px] text-slate-400 opacity-80 mt-1.5 leading-relaxed">
                       Dựa trên độ "lệch chuẩn" hiện tại so với TBNN, mô hình dự báo nhiệt độ sẽ tiếp tục duy trì xu hướng này và giảm dần trong 10 ngày tới.
                     </p>
                   </div>
                </div>
                <div className="h-px bg-white/10 w-full"></div>
                <div>
                   <span className="text-[10px] uppercase font-bold text-slate-500">Độ tin cậy</span>
                   <div className="flex items-center gap-1 mt-1">
                      <div className="h-1.5 w-8 rounded-full bg-green-500"></div>
                      <div className="h-1.5 w-8 rounded-full bg-green-500"></div>
                      <div className="h-1.5 w-8 rounded-full bg-slate-700"></div>
                      <span className="ml-2 text-xs font-bold text-slate-300">Trung bình</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, unit, color }: any) => (
  <div className="flex justify-between items-end">
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <div className={`text-2xl font-black tracking-tighter ${color}`}>{value || '-'} <span className="text-xs font-bold text-slate-300 ml-0.5">{unit}</span></div>
    </div>
  </div>
);

export default TrendTemperature;
