
import React from 'react';
import { 
  ComposedChart, 
  LineChart,
  BarChart,
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { MeteoData, MeteoFactor } from '../types';

interface MeteoChartProps {
  data: MeteoData[];
  factor: MeteoFactor;
}

const MeteoChart: React.FC<MeteoChartProps> = ({ data, factor }) => {
  const chartData = React.useMemo(() => {
    return data.map(d => ({
      ...d,
      displayDate: d.Ngay ? d.Ngay.split('-').reverse().slice(0, 2).join('/') : '',
    }));
  }, [data]);

  // Transform wind data to linear timeline (Ngay + Hour)
  const windData = React.useMemo(() => {
    if (factor !== MeteoFactor.GIO) return [];
    const flattened: any[] = [];
    data.forEach(d => {
       const dateStr = d.Ngay ? d.Ngay.split('-').reverse().slice(0, 2).join('/') : '';
       const hours = ['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h'];
       hours.forEach(h => {
         const key = `ff${h}`;
         const val = d[key];
         if (val !== undefined && val !== null) {
            flattened.push({
               fullTime: `${dateStr} ${h}`,
               speed: val
            });
         }
       });
    });
    return flattened;
  }, [data, factor]);

  if ((!chartData || chartData.length === 0) && (!windData || windData.length === 0)) {
    return (
      <div className="w-full h-[250px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Không có dữ liệu biểu đồ</p>
      </div>
    );
  }

  // Ẩn biểu đồ Hiện tượng
  if (factor === MeteoFactor.HIEN_TUONG) return null;

  const renderChartContent = () => {
    switch (factor) {
      case MeteoFactor.NHIET_AM:
        return (
          <div className="flex flex-row h-full gap-4">
             {/* Biểu đồ Nhiệt độ */}
             <div className="flex-1 min-w-0 h-full bg-white rounded-xl border border-slate-200 p-2 relative">
                <span className="absolute top-2 left-2 text-[9px] font-black text-red-500 uppercase z-10 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-red-100">Diễn biến Nhiệt độ (°C)</span>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 35, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="displayDate" fontSize={9} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} dy={5} />
                    <YAxis fontSize={9} tick={{fill: '#ef4444', fontWeight: 700}} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend wrapperStyle={{fontSize: '10px', fontWeight: 700, paddingTop: '5px'}} iconSize={8} />
                    
                    <Line type="monotone" dataKey="NhietTx" name="Tx (Max)" stroke="#ef4444" strokeWidth={2} dot={{r:2}} activeDot={{r:4}} />
                    <Line type="monotone" dataKey="NhietTB" name="TB" stroke="#f97316" strokeWidth={2} dot={{r:2}} activeDot={{r:4}} />
                    <Line type="monotone" dataKey="NhietTn" name="Tn (Min)" stroke="#facc15" strokeWidth={2} dot={{r:2}} activeDot={{r:4}} />
                  </LineChart>
                </ResponsiveContainer>
             </div>

             {/* Biểu đồ Ẩm độ */}
             <div className="flex-1 min-w-0 h-full bg-white rounded-xl border border-slate-200 p-2 relative">
                <span className="absolute top-2 left-2 text-[9px] font-black text-blue-500 uppercase z-10 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-blue-100">Diễn biến Ẩm độ (%)</span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 35, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="displayDate" fontSize={9} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} dy={5} />
                    <YAxis fontSize={9} tick={{fill: '#3b82f6', fontWeight: 700}} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend wrapperStyle={{fontSize: '10px', fontWeight: 700, paddingTop: '5px'}} iconSize={8} />
                    
                    <Bar dataKey="AmTB" name="TB" fill="#93c5fd" radius={[2, 2, 0, 0]} barSize={12} />
                    <Bar dataKey="Umin" name="Umin" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        );

      case MeteoFactor.KHI_AP:
        return (
          <div className="w-full h-full bg-white rounded-xl border border-slate-200 p-2 relative">
             <span className="absolute top-2 left-2 text-[9px] font-black text-violet-500 uppercase z-10 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-violet-100">Khí áp mực biển (mb)</span>
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 35, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="displayDate" fontSize={9} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} dy={5}/>
                <YAxis fontSize={9} tick={{fill: '#8b5cf6', fontWeight: 700}} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{fontSize: '10px', fontWeight: 700, paddingTop: '5px'}} iconSize={8} />

                <Line type="monotone" dataKey="PbTB" name="Khí áp Biển TB" stroke="#8b5cf6" strokeWidth={2} dot={{r:3}} activeDot={{r:5}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case MeteoFactor.MUA:
        return (
          <div className="w-full h-full bg-white rounded-xl border border-slate-200 p-2 relative">
             <span className="absolute top-2 left-2 text-[9px] font-black text-emerald-500 uppercase z-10 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-emerald-100">Lượng mưa ngày (mm)</span>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 35, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="displayDate" fontSize={9} tick={{fill: '#94a3b8', fontWeight: 700}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} dy={5}/>
                <YAxis fontSize={9} tick={{fill: '#10b981', fontWeight: 700}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f0fdf4'}} contentStyle={{borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{fontSize: '10px', fontWeight: 700, paddingTop: '5px'}} iconSize={8} />

                <Bar dataKey="Mua24h" name="Mưa 24h" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      
      case MeteoFactor.GIO:
        return (
          <div className="w-full h-full bg-white rounded-xl border border-slate-200 p-2 relative">
             <span className="absolute top-2 left-2 text-[9px] font-black text-sky-500 uppercase z-10 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-sky-100">Diễn biến Tốc độ gió (m/s)</span>
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={windData} margin={{ top: 35, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="fullTime" 
                  fontSize={8} 
                  tick={{fill: '#94a3b8', fontWeight: 700}} 
                  axisLine={{stroke: '#e2e8f0'}} 
                  tickLine={false} 
                  interval={3} // Show fewer ticks to avoid clutter
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis fontSize={9} tick={{fill: '#0ea5e9', fontWeight: 700}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend wrapperStyle={{fontSize: '10px', fontWeight: 700, paddingTop: '0px'}} iconSize={8} />

                <Line type="monotone" dataKey="speed" name="Tốc độ" stroke="#0ea5e9" strokeWidth={1.5} dot={{r:1.5}} activeDot={{r:4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      default:
         return null;
    }
  };

  // Chiều cao giảm xuống 280px (khoảng 1/2 so với trước đây là 400px hoặc 500px của màn hình)
  return (
    <div className="w-full h-[200px] mt-4">
      {renderChartContent()}
    </div>
  );
};

export default MeteoChart;
