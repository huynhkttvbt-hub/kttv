import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FilterState, MenuType, AlarmLevels, HOURLY_COLUMNS } from "../types";
import FilterBar from "./FilterBar";
import HydroChart from "./HydroChart";
import HydroTable from "./HydroTable";
import UpdateModal from "./UpdateModal";
import {
  LineChart,
  LayoutGrid,
  AlertTriangle,
  Waves,
  ArrowDown,
  CloudRain,
  Info,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { fetchHydroData, fetchAlarmLevels } from "../services/dataService";
import { ErrorBanner, MainCard, PageHeader, ActionButtons } from "./Shared";
import * as XLSX from "xlsx";

interface Props {
  activeMenu: MenuType;
  stations: string[];
  groups: string[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const HydroDashboard: React.FC<Props> = ({
  activeMenu,
  stations,
  groups,
  filters,
  onFilterChange,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [alarms, setAlarms] = useState<AlarmLevels | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!filters.stationName) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [hydroResult, alarmResult] = await Promise.all([
        fetchHydroData(filters),
        fetchAlarmLevels(filters.stationName),
      ]);

      setData(hydroResult);
      setAlarms(alarmResult);
    } catch (err: any) {
      setErrorMessage(err?.message || "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * CẢI TIẾN LOGIC TÍNH TOÁN:
   * Quét qua toàn bộ các cột giờ (00h-23h) và các cột Hmax/Hmin/Htb
   * để tìm giá trị cực trị chính xác nhất của cả thời kỳ.
   */
  const periodStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    let globalMax = -Infinity;
    let globalMin = Infinity;
    let totalRain = 0;
    let maxHDay = "-";
    let minHDay = "-";

    data.forEach((day) => {
      // 1. Thu thập tất cả các giá trị số có trong ngày (bao gồm các giờ và cột tổng hợp)
      const allValuesInDay: number[] = [];

      // Kiểm tra các cột giờ 00h -> 23h
      HOURLY_COLUMNS.forEach((col) => {
        const val = parseFloat(String(day[col] || "").replace(",", "."));
        if (!isNaN(val)) allValuesInDay.push(val);
      });

      // Kiểm tra các cột đặc trưng có sẵn (Hmax, Hmin, Htb)
      ["Hmax", "Hmin", "Htb"].forEach((col) => {
        const val = parseFloat(String(day[col] || "").replace(",", "."));
        if (!isNaN(val)) allValuesInDay.push(val);
      });

      // 2. Tìm max/min của ngày này để so với toàn thời kỳ
      if (allValuesInDay.length > 0) {
        const dayMax = Math.max(...allValuesInDay);
        const dayMin = Math.min(...allValuesInDay);

        if (dayMax > globalMax) {
          globalMax = dayMax;
          maxHDay = day.Ngay;
        }
        if (dayMin < globalMin) {
          globalMin = dayMin;
          minHDay = day.Ngay;
        }
      }

      // 3. Tính lượng mưa
      const r24 = parseFloat(String(day.R24 || "").replace(",", "."));
      if (!isNaN(r24)) {
        totalRain += r24;
      }
    });

    return {
      maxH: globalMax === -Infinity ? null : globalMax,
      minH: globalMin === Infinity ? null : globalMin,
      sumR: totalRain,
      maxHDay,
      minHDay,
    };
  }, [data]);

  const handleExportExcel = () => {
    if (data.length === 0) return alert("Không có dữ liệu!");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `SoLieu_${filters.stationName}_${filters.from}.xlsx`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr === "-") return "-";
    return dateStr.split("-").reverse().slice(0, 2).join("/");
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fadeIn max-w-[1600px] mx-auto">
      <ErrorBanner message={errorMessage} />

      {/* Filter and Actions Section */}
      <div className="flex flex-col xl:flex-row items-stretch gap-3">
        <FilterBar
          filters={filters}
          onFilterChange={onFilterChange}
          stations={stations}
          groups={groups}
        />
        <ActionButtons
          loading={loading}
          onRefresh={fetchData}
          onUpdate={() => setIsUpdateModalOpen(true)}
          onExport={handleExportExcel}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Chart Section - CHIẾM 5/6 */}
        <MainCard className="lg:w-5/6">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                  <LineChart size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-tight">
                    Diễn biến mực nước
                  </h3>
                  <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">
                    {filters.stationName || "..."}
                  </p>
                </div>
              </div>

              {alarms && (
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-yellow-600 uppercase">
                      BD1
                    </span>
                    <span className="text-[10px] font-black text-slate-700">
                      {alarms.BD1 || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-orange-600 uppercase">
                      BD2
                    </span>
                    <span className="text-[10px] font-black text-slate-700">
                      {alarms.BD2 || "-"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-red-600 uppercase">
                      BD3
                    </span>
                    <span className="text-[10px] font-black text-slate-700">
                      {alarms.BD3 || "-"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full flex-1">
              <HydroChart
                data={data}
                stationName={filters.stationName}
                alarms={alarms}
              />
            </div>
          </div>
        </MainCard>

        {/* Quick Stats Summary - CHIẾM 1/6 */}
        <MainCard className="lg:w-1/6">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                <Info size={15} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-tight">
                  Đặc trưng thời kỳ
                </h4>
                <p className="text-[8px] text-indigo-400 font-black uppercase tracking-widest">
                  Tóm tắt trị số
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 opacity-50">
                <RefreshCw size={20} className="animate-spin text-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  Đang tính toán...
                </span>
              </div>
            ) : periodStats ? (
              <div className="space-y-4 flex-1">
                {/* Hmax Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group hover:border-red-200 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                        <Waves size={16} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase">
                        Mực nước Max
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(periodStats.maxHDay)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {periodStats.maxH ?? "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-400">cm</span>
                  </div>
                </div>

                {/* Hmin Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <ArrowDown size={10} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase">
                        Mực nước Min
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(periodStats.minHDay)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {periodStats.minH ?? "-"}
                    </span>
                    <span className="text-xs font-bold text-slate-400">cm</span>
                  </div>
                </div>

                {/* Rain Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CloudRain size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      Tổng lượng mưa
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {periodStats.sumR.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">mm</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <Info size={30} strokeWidth={1} />
                <span className="text-[10px] font-black uppercase mt-2">
                  Chưa có dữ liệu
                </span>
              </div>
            )}
          </div>
        </MainCard>
      </div>

      {/* Table Section - CHIẾM 100% NHƯ CŨ */}
      <MainCard>
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 tracking-[0.1em]">
            <LayoutGrid size={10} className="text-blue-500" /> Chi tiết số liệu
            quan trắc
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
              {filters.from} - {filters.to}
            </span>
            <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 uppercase">
              {data.length} ngày
            </span>
          </div>
        </div>
        <div className="p-2">
          <HydroTable data={data} loading={loading} />
        </div>
      </MainCard>

      {isUpdateModalOpen && (
        <UpdateModal
          onClose={() => setIsUpdateModalOpen(false)}
          onSave={fetchData}
          stationGroups={groups}
          stations={stations}
          initialGroup={filters.stationGroup}
          initialStation={filters.stationName}
        />
      )}
    </div>
  );
};

export default HydroDashboard;
