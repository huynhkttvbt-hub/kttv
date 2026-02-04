
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { fetchMeteoMetadata, fetchTBNNSeries } from '../services/dataService'; // Đã thêm hàm fetchTBNNSeries
import { StationMetadata, MeteoData, TBNNData } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area
} from 'recharts';
import { 
  CloudRain, 
  Calendar, 
  MapPin, 
  Droplets,
  Clock,
  Waves,
  TrendingUp
} from 'lucide-react';
import { FilterContainer, MainCard, PageHeader, LoadingState, ActionButtons, ErrorBanner } from './Shared';

const TrendRainfall: React.FC = () => {
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
  const [forecastStats, setForecastStats] = useState<any>(null);

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

      // 1. Fetch dữ liệu thực đo
      const { data: mData, error: meteoError } = await supabase
        .from('dulieu_khituong')
        .select('*')
        .eq('Tram', selectedStation)
        .gte('Ngay', startDate)
        .lte('Ngay', endDate)
        .order('Ngay', { ascending: true });

      if (meteoError) throw meteoError;
      setMeteoData(mData || []);

       // 2. Fetch TBNN 
      const tData = await fetchTBNNSeries(selectedStation);
      setTbnnData(tData);

      // 3. Xử lý & Dự báo
      let cumulative = 0;
      let finalData = (mData || []).map((d: any) => {
        const rain = Number(d.Mua24h || d.mua24h || 0);
        cumulative += rain;
        return {
           Ngay: d.Ngay,
           displayDate: d.Ngay ? d.Ngay.split('-').reverse()[0] : '',
           Mua24h: rain,       // Thực đo
           ForecastRain: null, // Dự báo = null
           TichLuy: cumulative,
           ForecastCum: null,
           type: 'observed'
        };
      });

      // Logic dự báo mưa (10 ngày tới)
      if (finalData.length > 0 && tData.length > 0) {
        const lastRecord = finalData[finalData.length - 1];
        const lastDate = new Date(lastRecord.Ngay);
        let currentCum = lastRecord.TichLuy;

        // Lấy TBNN tháng hiện tại và tháng sau
        const currentMonthTBNN = tData.find(t => t.Thang === selectedMonth)?.Rtb || 0;
        
        // Tính trung bình mỗi ngày theo TBNN (giả định phân bố đều để làm đường nền)
        // Hệ số điều chỉnh: Nếu hiện tại mưa đang nhiều hơn TBNN theo tỷ lệ thời gian, dự báo cũng sẽ tăng nhẹ
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const avgRainPerDay = currentMonthTBNN / daysInMonth; 
        
        // Tính hệ số xu thế hiện tại (Current Trend Factor)
        // Ví dụ: Đã qua 10 ngày, mưa 100mm. TBNN cả tháng 300mm -> TBNN 10 ngày ~ 100mm. Tỷ lệ = 1.0
        const daysPassed = finalData.length;
        const expectedRainSoFar = avgRainPerDay * daysPassed;
        let trendFactor = 1;
        if (expectedRainSoFar > 0) {
           trendFactor = currentCum / expectedRainSoFar;
           // Giới hạn hệ số trend để không dự báo quá cực đoan (0.5 - 2.0)
           trendFactor = Math.max(0.5, Math.min(trendFactor, 2.0));
        }

        const forecastPoints = [];
        // Dự báo 10 ngày
        for (let i = 1; i <= 10; i++) {
           const nextDate = new Date(lastDate);
           nextDate.setDate(lastDate.getDate() + i);
           
           // Mưa dự báo = TBNN ngày * Hệ số xu thế * Hệ số suy giảm (đưa về bình thường)
           // Decay: 0.9 mỗi ngày
           const decay = Math.pow(0.9, i);
           const adjustedFactor = 1 + (trendFactor - 1) * decay;
           const predRain = avgRainPerDay * adjustedFactor;
           
           currentCum += predRain;

           forecastPoints.push({
             Ngay: nextDate.toISOString().split('T')[0],
             displayDate: nextDate.getDate().toString(), // Chỉ hiện ngày số
             Mua24h: null,
             ForecastRain: Number(predRain.toFixed(1)),
             TichLuy: null, // Ngắt nét đường thực đo
             ForecastCum: Number(currentCum.toFixed(1)), // Đường dự báo tích lũy
             type: 'forecast'
           });
        }
        
        // Điểm nối cho đường tích lũy (để liền mạch đồ thị)
        if (forecastPoints.length > 0) {
           // Hack: thêm 1 điểm forecast tại ngày cuối cùng của observed nhưng giá trị bằng observed
           // Để Recharts nối 2 line lại với nhau
           forecastPoints.unshift({
              Ngay: lastRecord.Ngay,
              displayDate: lastRecord.displayDate,
              Mua24h: null,
              ForecastRain: null,
              TichLuy: null,
              ForecastCum: lastRecord.TichLuy,
              type: 'bridge'
           });
           // Xóa điểm bridge khỏi hiển thị tooltip nếu cần, nhưng ở đây cứ để đơn giản
        }

        finalData = [...finalData, ...forecastPoints];
        
        // Lưu thống kê dự báo
        setForecastStats({
           currentTotal: lastRecord.TichLuy,
           forecastTotal: currentCum, // Tổng sau 10 ngày dự báo
           tbnnTotal: currentMonthTBNN,
           trend: trendFactor > 1.1 ? 'Mưa nhiều' : trendFactor < 0.9 ? 'Mưa ít' : 'Xấp xỉ TBNN'  
        });
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

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn max-w-[1700px] mx-auto">
      <FilterContainer>
         {/* Filters reused */}
         <div className="flex flex-col gap-1.5 w-[200px]">
          <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 ml-1"><MapPin size={12} /> Trạm</label>
          <select value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)} className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-xs font-bold text-blue-800 cursor-pointer">
            {metadata.map(m => <option key={m.TenTram} value={m.TenTram}>{m.TenTram}</option>)}
          </select>
        </div>

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
              title="Xu thế & Dự báo mưa (10 ngày)" 
              subtitle={`Trạm ${selectedStation} • Tháng ${selectedMonth}/${selectedYear}`} 
              icon={CloudRain} 
              iconColorClass="bg-blue-600" 
            />
            
            <div className="h-[450px] mt-6 w-full">
              {loading ? <LoadingState /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="displayDate" fontSize={11} tick={{fill: '#64748b', fontWeight: 600}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} />
                    
                    {/* Y-Axis Trái: Mưa ngày */}
                    <YAxis yAxisId="left" fontSize={11} tick={{fill: '#0891b2', fontWeight: 600}} axisLine={false} tickLine={false} label={{ value: 'Mưa ngày (mm)', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    
                    {/* Y-Axis Phải: Tích lũy */}
                    <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{fill: '#3b82f6', fontWeight: 600}} axisLine={false} tickLine={false} label={{ value: 'Tích lũy (mm)', angle: 90, position: 'insideRight', fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    
                    <Tooltip 
                       contentStyle={{borderRadius: '12px', padding: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                       labelFormatter={(label) => `Ngày ${label}`}
                    />
                    <Legend verticalAlign="top" height={36} />

                    {/* Mưa thực đo */}
                    <Bar yAxisId="left" dataKey="Mua24h" name="Mưa ngày (Thực tế)" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={20} />
                    {/* Mưa dự báo */}
                    <Bar yAxisId="left" dataKey="ForecastRain" name="Mưa ngày (Dự báo)" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} strokeDasharray="3 3" />
                    
                    {/* Tích lũy thực đo (Area) */}
                    <Area yAxisId="right" type="monotone" dataKey="TichLuy" name="Tích lũy (Thực tế)" stroke="#3b82f6" fill="url(#colorReal)" strokeWidth={3} />
                    
                    {/* Tích lũy dự báo (Line đứt) */}
                    <Line yAxisId="right" type="monotone" dataKey="ForecastCum" name="Tích lũy (Dự báo)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{r:3}} />

                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </MainCard>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Waves size={14} className="text-blue-500" /> Thống kê & Dự báo
             </h3>
             <div className="space-y-4">
                <StatItem label="Hiện tại" value={forecastStats?.currentTotal?.toFixed(1)} unit="mm" color="text-blue-600" />
                <StatItem label="Dự báo (+10 ngày)" value={forecastStats?.forecastTotal?.toFixed(1)} unit="mm" color="text-orange-500" />
                <div className="pt-4 border-t border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">TBNN Tháng: {forecastStats?.tbnnTotal || '-'} mm</p>
                  <div className="text-lg font-black text-slate-800 mt-1">
                     {forecastStats?.trend || 'Không xác định'}
                  </div>
                </div>
             </div>
          </div>

          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
             <h3 className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-3 relative z-10">Phân tích nguồn nước</h3>
             <p className="text-[11px] leading-relaxed font-medium text-blue-50 relative z-10">
               {forecastStats?.forecastTotal > (forecastStats?.tbnnTotal * 1.2) 
                 ? "Dự báo tổng lượng mưa sẽ vượt mức trung bình nhiều năm. Cần đề phòng ngập úng."
                 : forecastStats?.forecastTotal < (forecastStats?.tbnnTotal * 0.8)
                 ? "Dự báo thiếu hụt lượng mưa so với trung bình. Cần có kế hoạch sử dụng nước tiết kiệm."
                 : "Lượng mưa dự báo ở mức xấp xỉ trung bình nhiều năm, thuận lợi cho sản xuất."}
             </p>
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

export default TrendRainfall;
