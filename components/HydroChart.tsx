
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import { HydroData, HOURLY_COLUMNS, AlarmLevels } from "../types";

interface HydroChartProps {
  data: HydroData[];
  stationName: string;
  alarms?: AlarmLevels | null;
}

// Custom Dot: Chỉ highlight Max và Min toàn cục
const CustomizedDot = (props: any) => {
  const { cx, cy, payload, globalMax, globalMin } = props;
  const val = payload.value;

  // Điểm có giá trị lớn nhất (Max) - Màu đỏ, tam giác lên
  if (globalMax !== null && val === globalMax) {
    return (
      <svg x={cx - 6} y={cy - 6} width={12} height={12} fill="#ef4444" viewBox="0 0 24 24" className="drop-shadow-sm">
        <path d="M12 2L2 22h20L12 2z" />
      </svg>
    );
  }
  
  // Điểm có giá trị nhỏ nhất (Min) - Màu xanh đậm, tam giác xuống
  if (globalMin !== null && val === globalMin) {
    return (
      <svg x={cx - 6} y={cy - 6} width={12} height={12} fill="#1e40af" viewBox="0 0 24 24" className="drop-shadow-sm">
        <path d="M12 22L22 2H2L12 22z" />
      </svg>
    );
  }

  // Các điểm còn lại (bao gồm cả D/C không phải cực trị) - Chấm nhỏ màu xanh nhạt
  return <circle cx={cx} cy={cy} r={2} fill="#3b82f6" stroke="none" opacity={0.8} />;
};

const HydroChart: React.FC<HydroChartProps> = ({
  data,
  stationName,
  alarms,
}) => {
  
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const result: any[] = [];

    // Helper: Parse chuỗi thời gian (1h, 01h, 13:30, 14h15) thành số phút từ đầu ngày
    const parseMinutes = (str: string): number => {
      if (!str) return -1;
      const match = String(str).match(/(\d{1,2})[:hH]?(\d{0,2})/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2] || '0', 10);
        return h * 60 + m;
      }
      return -1;
    };

    // Helper: Parse giá trị số
    const parseVal = (val: any) => {
       if (val !== null && val !== undefined && val !== "" && val !== "-") {
          const num = typeof val === "string" ? parseFloat(val.replace(",", ".")) : Number(val);
          return isNaN(num) ? null : num;
       }
       return null;
    };

    data.forEach((day) => {
      const dateStr = day.Ngay ? day.Ngay.split("-").reverse().slice(0, 2).join("/") : "";
      
      let dailyPoints: any[] = [];

      // 1. Thêm các điểm giờ (00h - 23h)
      HOURLY_COLUMNS.forEach((h) => {
        const val = parseVal(day[h]);
        const minutes = parseMinutes(h);
        if (minutes >= 0 && val !== null) {
          dailyPoints.push({
            minutes,
            displayTime: h,
            val,
            type: 'hourly'
          });
        }
      });

      // 2. Thêm các điểm Đỉnh (D1, D2, D3)
      const peaks = [
        { valKey: 'D1', timeKey: 'TgD1' },
        { valKey: 'D2', timeKey: 'TgD2' },
        { valKey: 'D3', timeKey: 'TgD3' }
      ];

      peaks.forEach(p => {
        const val = parseVal(day[p.valKey]);
        const timeStr = day[p.timeKey];
        if (val !== null && timeStr && timeStr !== '-') {
          const minutes = parseMinutes(timeStr);
          if (minutes >= 0) {
            dailyPoints.push({
              minutes,
              displayTime: timeStr,
              val,
              type: 'peak',
              label: p.valKey
            });
          }
        }
      });

      // 3. Thêm các điểm Chân (C1, C2, C3)
      const bases = [
        { valKey: 'C1', timeKey: 'TgC1' },
        { valKey: 'C2', timeKey: 'TgC2' },
        { valKey: 'C3', timeKey: 'TgC3' }
      ];

      bases.forEach(p => {
        const val = parseVal(day[p.valKey]);
        const timeStr = day[p.timeKey];
        if (val !== null && timeStr && timeStr !== '-') {
          const minutes = parseMinutes(timeStr);
          if (minutes >= 0) {
            dailyPoints.push({
              minutes,
              displayTime: timeStr,
              val,
              type: 'base',
              label: p.valKey
            });
          }
        }
      });

      // 4. Sắp xếp và thêm vào kết quả
      dailyPoints.sort((a, b) => a.minutes - b.minutes);
      dailyPoints.forEach(p => {
         result.push({
            fullTime: `${dateStr} ${p.displayTime}`,
            displayDate: dateStr,
            value: p.val,
            pointType: p.type,
            pointLabel: p.label
         });
      });
    });

    return result;
  }, [data]);

  // Tính toán Max/Min toàn cục để truyền vào CustomizedDot
  const allValues = React.useMemo(() => 
    chartData.map(d => d.value).filter(v => v !== null) as number[]
  , [chartData]);
  
  const globalMax = allValues.length > 0 ? Math.max(...allValues) : null;
  const globalMin = allValues.length > 0 ? Math.min(...allValues) : null;

  const hasValidData = chartData.some((d) => d.value !== null);

  const activeAlarms = React.useMemo(() => {
    if (!alarms) return { showBD1: false, showBD2: false, showBD3: false };
    const maxVal = globalMax ?? -Infinity;
    return { 
      showBD1: !!alarms.BD1 && maxVal >= alarms.BD1, 
      showBD2: !!alarms.BD2 && maxVal >= alarms.BD2, 
      showBD3: !!alarms.BD3 && maxVal >= alarms.BD3 
    };
  }, [alarms, globalMax]);

  const getYDomain = () => {
    if (allValues.length === 0) return [0, 100];
    let min = globalMin!;
    let max = globalMax!;
    if (alarms) {
      if (activeAlarms.showBD1 && alarms.BD1) max = Math.max(max, alarms.BD1);
      if (activeAlarms.showBD2 && alarms.BD2) max = Math.max(max, alarms.BD2);
      if (activeAlarms.showBD3 && alarms.BD3) max = Math.max(max, alarms.BD3);
    }
    const padding = 5;
    return [Math.floor(min - padding), Math.ceil(max + padding + 5)];
  };

  if (!hasValidData) {
    return (
      <div className="w-full h-[350px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
          Không có dữ liệu mực nước
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[280px] relative mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: -20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={true}
            horizontal={true}
          />

          <XAxis
            dataKey="fullTime"
            axisLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
            tickLine={{ stroke: "#94a3b8" }}
            interval={Math.floor(chartData.length / 10)}
            fontSize={7}
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
            domain={getYDomain()}
            fontSize={9}
            stroke="#94a3b8"
            tick={{ fill: "#475569", fontWeight: 700 }}
            axisLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
            tickLine={{ stroke: "#94a3b8" }}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                const val = payload[0].value as number;
                let status = "Bình thường";
                let statusColor = "text-blue-600";
                
                // Label phụ để biết đó là Đỉnh/Chân nào (dù không highlight màu trên line)
                let typeLabel = "";
                if (d.pointType === 'peak') typeLabel = `ĐỈNH (${d.pointLabel})`; 
                else if (d.pointType === 'base') typeLabel = `CHÂN (${d.pointLabel})`; 

                // Xác định màu badge trong tooltip dựa trên Max/Min toàn cục
                let dotColor = "bg-blue-500";
                if (globalMax !== null && val === globalMax) dotColor = "bg-red-500";
                else if (globalMin !== null && val === globalMin) dotColor = "bg-blue-800";

                if (alarms) {
                  if (alarms.BD3 && val >= alarms.BD3) {
                    status = "TRÊN BÁO ĐỘNG 3";
                    statusColor = "text-red-600";
                  } else if (alarms.BD2 && val >= alarms.BD2) {
                    status = "TRÊN BÁO ĐỘNG 2";
                    statusColor = "text-orange-600";
                  } else if (alarms.BD1 && val >= alarms.BD1) {
                    status = "TRÊN BÁO ĐỘNG 1";
                    statusColor = "text-yellow-600";
                  }
                }

                return (
                  <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 rounded-xl shadow-2xl ring-1 ring-black/5 z-50">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1 border-b pb-1">
                      {d.fullTime}
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                      <p className="text-sm font-black text-slate-800">
                        {val} cm
                      </p>
                    </div>
                    {typeLabel && (
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">
                         {typeLabel}
                       </p>
                    )}
                    <p className={`text-[9px] font-black uppercase tracking-tighter ${statusColor}`}>
                      {status}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          {activeAlarms.showBD1 && alarms?.BD1 && (
            <ReferenceLine
              y={alarms.BD1}
              stroke="#eab308"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            >
              <Label
                value={`BD1: ${alarms.BD1}`}
                position="right"
                fill="#eab308"
                fontSize={9}
                fontWeight="900"
              />
            </ReferenceLine>
          )}
          {activeAlarms.showBD2 && alarms?.BD2 && (
            <ReferenceLine
              y={alarms.BD2}
              stroke="#f97316"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            >
              <Label
                value={`BD2: ${alarms.BD2}`}
                position="right"
                fill="#f97316"
                fontSize={9}
                fontWeight="900"
              />
            </ReferenceLine>
          )}
          {activeAlarms.showBD3 && alarms?.BD3 && (
            <ReferenceLine
              y={alarms.BD3}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={2}
            >
              <Label
                value={`BD3: ${alarms.BD3}`}
                position="right"
                fill="#ef4444"
                fontSize={9}
                fontWeight="900"
              />
            </ReferenceLine>
          )}

          <Line
            type="monotone"
            dataKey="value"
            name="Mực nước"
            stroke="#2563eb"
            strokeWidth={2}
            dot={<CustomizedDot globalMax={globalMax} globalMin={globalMin} />}
            activeDot={{
              r: 6,
              strokeWidth: 2,
              stroke: "#fff",
              fill: "#2563eb",
            }}
            connectNulls={true}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HydroChart;
