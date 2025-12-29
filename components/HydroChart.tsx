
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { HydroData, HOURLY_COLUMNS } from '../types';

interface HydroChartProps {
  data: HydroData[];
  stationName: string;
}

const HydroChart: React.FC<HydroChartProps> = ({ data, stationName }) => {
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const result: any[] = [];
    data.forEach((day) => {
      HOURLY_COLUMNS.forEach((h) => {
        const rawVal = day[h];
        let val: number | null = null;
        
        if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
          val = typeof rawVal === 'string' ? parseFloat(rawVal.replace(',', '.')) : Number(rawVal);
        }
        if (val !== null && isNaN(val)) val = null;

        const dateStr = day.Ngay ? day.Ngay.split('-').reverse().slice(0, 2).join('/') : '';
        
        result.push({
          fullTime: `${dateStr} ${h}`,
          hourOnly: h,
          displayDate: dateStr,
          value: val,
        });
      });
    });
    return result;
  }, [data]);

  const hasValidData = chartData.some(d => d.value !== null);

  if (!hasValidData) {
    return (
      <div className="w-full h-[350px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Không có dữ liệu mực nước</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[380px] relative mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -10, bottom: 45 }}
        >
          {/* Lưới nét đứt mờ ảo theo mẫu */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={true} horizontal={true} />
          
          <XAxis 
            dataKey="fullTime" 
            axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
            tickLine={{ stroke: '#94a3b8' }}
            // Tự động tính toán khoảng cách tick để không quá dày
            interval={Math.floor(chartData.length / 12)} 
            fontSize={9}
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text 
                    x={0} 
                    y={0} 
                    dy={16} 
                    textAnchor="end" 
                    fill="#64748b" 
                    transform="rotate(-45)" 
                    className="font-bold text-[9px]"
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />
          
          <YAxis 
            domain={['dataMin - 5', 'dataMax + 5']}
            fontSize={9}
            stroke="#94a3b8"
            tick={{fill: '#475569', fontWeight: 700}}
            axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
            tickLine={{ stroke: '#94a3b8' }}
          />
          
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-white/95 backdrop-blur-sm p-3 border border-blue-200 rounded-xl shadow-2xl ring-1 ring-black/5">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1.5 border-b border-blue-50 pb-1">
                      {d.fullTime}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                      <p className="text-sm font-black text-slate-800">
                        {payload[0].value} <span className="text-[10px] text-slate-400 font-bold uppercase">cm</span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Line
            type="monotone"
            dataKey="value"
            name="Mực nước"
            stroke="#2563eb" // Màu xanh dương chủ đạo
            strokeWidth={2}
            // Điểm nút tròn tại mỗi giá trị dữ liệu
            dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#2563eb' }}
            connectNulls={true}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HydroChart;
