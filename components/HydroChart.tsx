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

const HydroChart: React.FC<HydroChartProps> = ({
  data,
  stationName,
  alarms,
}) => {
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const result: any[] = [];
    data.forEach((day) => {
      HOURLY_COLUMNS.forEach((h) => {
        const rawVal = day[h];
        let val: number | null = null;

        if (rawVal !== null && rawVal !== undefined && rawVal !== "") {
          val =
            typeof rawVal === "string"
              ? parseFloat(rawVal.replace(",", "."))
              : Number(rawVal);
        }
        if (val !== null && isNaN(val)) val = null;

        const dateStr = day.Ngay
          ? day.Ngay.split("-").reverse().slice(0, 2).join("/")
          : "";

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

  const hasValidData = chartData.some((d) => d.value !== null);

  // Xác định các cấp báo động nào thực sự cần hiện lên biểu đồ
  const activeAlarms = React.useMemo(() => {
    if (!alarms) return { showBD1: false, showBD2: false, showBD3: false };

    const vals = chartData
      .map((d) => d.value)
      .filter((v) => v !== null) as number[];
    const maxVal = vals.length > 0 ? Math.max(...vals) : -Infinity;

    // Chỉ hiển thị nếu mực nước cao nhất trong dải dữ liệu đạt hoặc vượt ngưỡng báo động
    const showBD1 = !!alarms.BD1 && maxVal >= alarms.BD1;
    const showBD2 = !!alarms.BD2 && maxVal >= alarms.BD2;
    const showBD3 = !!alarms.BD3 && maxVal >= alarms.BD3;

    return { showBD1, showBD2, showBD3 };
  }, [alarms, chartData]);

  // Tính toán domain tự động
  const getYDomain = () => {
    const vals = chartData
      .map((d) => d.value)
      .filter((v) => v !== null) as number[];
    if (vals.length === 0) return [0, 100];

    let min = Math.min(...vals);
    let max = Math.max(...vals);

    // Nếu có báo động đang active, mở rộng domain để chứa cả đường báo động đó
    if (alarms) {
      if (activeAlarms.showBD1 && alarms.BD1) max = Math.max(max, alarms.BD1);
      if (activeAlarms.showBD2 && alarms.BD2) max = Math.max(max, alarms.BD2);
      if (activeAlarms.showBD3 && alarms.BD3) max = Math.max(max, alarms.BD3);
    }

    // Khoảng đệm nhỏ (10cm) để đồ thị uốn lượn đẹp hơn khi không có báo động
    const padding = 10;
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
    <div className="w-full h-[300px] relative mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: -10, bottom: 20 }}
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

                // Tooltip vẫn báo trạng thái chính xác dựa trên trị số, kể cả khi đường kẻ đang ẩn
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
                  <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 rounded-xl shadow-2xl ring-1 ring-black/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1 border-b pb-1">
                      {d.fullTime}
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-sm font-black text-slate-800">
                        {val} cm
                      </p>
                    </div>
                    <p
                      className={`text-[9px] font-black uppercase tracking-tighter ${statusColor}`}
                    >
                      {status}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Chỉ vẽ các đường báo động khi mực nước đã chạm tới */}
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
            strokeWidth={2.5}
            dot={{ r: 2, fill: "#2563eb", strokeWidth: 0 }}
            activeDot={{
              r: 5,
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
