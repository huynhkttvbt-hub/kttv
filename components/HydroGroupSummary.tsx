import React, { useState, useEffect, useMemo } from "react";
import { StationMetadata } from "../types";
import { supabase } from "../supabaseClient";
import { fetchMetadata } from "../services/dataService";
import {
  Layers,
  Calendar,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  MapPin,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import * as XLSX from "xlsx";

type PeriodType = "MONTH" | "T1" | "T2" | "T3" | "DAY" | "WEEK";

interface StationSummary {
  TenTram: string;
  Hmax: number;
  NgayHmax: string;
  Hmin: number;
  NgayHmin: string;
  RainSum: number;
  RainMax: number;
  NgayRainMax: string;
  RainDays: number;
  HasData: boolean;
  // TBNN Stats
  TBNN_Hmax?: number;
  TBNN_Hmin?: number;
  TBNN_Rtb?: number; // Thêm trường mưa TBNN
}

const HydroGroupSummary: React.FC = () => {
  const now = new Date();
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<PeriodType>("MONTH");
  const [specificDate, setSpecificDate] = useState(
    now.toISOString().split("T")[0]
  );

  // Data
  const [summaryData, setSummaryData] = useState<StationSummary[]>([]);

  useEffect(() => {
    const loadMetadata = async () => {
      const data = await fetchMetadata();
      setMetadata(data);
      if (data.length > 0) {
        const uniqueGroups = Array.from(
          new Set(data.map((m) => m.TenDai).filter(Boolean))
        ) as string[];
        setSelectedGroup(uniqueGroups[0] || "");
      }
    };
    loadMetadata();
  }, []);

  const availableGroups = useMemo(
    () =>
      Array.from(
        new Set(metadata.map((m) => m.TenDai).filter(Boolean))
      ).sort() as string[],
    [metadata]
  );

  const fetchGroupData = async () => {
    if (!selectedGroup) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get all stations in the group
      const stationsInGroup = metadata
        .filter((m) => m.TenDai === selectedGroup)
        .map((m) => m.TenTram);

      if (stationsInGroup.length === 0) {
        setSummaryData([]);
        setLoading(false);
        return;
      }

      // 2. Determine Date Range
      let startDate = "";
      let endDate = "";
      let searchPeriod =
        period === "WEEK" ? "MONTH" : period === "DAY" ? "MONTH" : period;
      let searchMonth = selectedMonth;

      if (period === "DAY") {
        startDate = specificDate;
        endDate = specificDate;
        searchMonth = new Date(specificDate).getMonth() + 1;
      } else {
        const mStr = selectedMonth.toString().padStart(2, "0");
        const lastDayDate = new Date(selectedYear, selectedMonth, 0);

        if (period === "MONTH") {
          startDate = `${selectedYear}-${mStr}-01`;
          endDate = `${selectedYear}-${mStr}-${lastDayDate.getDate()}`;
        } else if (period === "T1") {
          startDate = `${selectedYear}-${mStr}-01`;
          endDate = `${selectedYear}-${mStr}-10`;
        } else if (period === "T2") {
          startDate = `${selectedYear}-${mStr}-11`;
          endDate = `${selectedYear}-${mStr}-20`;
        } else if (period === "T3") {
          startDate = `${selectedYear}-${mStr}-21`;
          endDate = `${selectedYear}-${mStr}-${lastDayDate.getDate()}`;
        } else if (period === "WEEK") {
          if (specificDate) {
            const start = new Date(specificDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            startDate = start.toISOString().split("T")[0];
            endDate = end.toISOString().split("T")[0];
            searchMonth = start.getMonth() + 1;
          } else {
            startDate = `${selectedYear}-${mStr}-01`;
            endDate = `${selectedYear}-${mStr}-07`;
          }
        }
      }

      // 3. Fetch Data for ALL stations in range
      const { data, error: sbError } = await supabase
        .from("so_lieu_thuy_van")
        .select("*")
        .in("TenTram", stationsInGroup)
        .gte("Ngay", startDate)
        .lte("Ngay", endDate);

      if (sbError) throw sbError;

      // 3b. Fetch TBNN for ALL stations in group
      // Chú ý: Sử dụng tên cột lowercase (tentram, hmax...) để khớp với database
      const { data: tbnnList } = await supabase
        .from("so_lieu_tbnn")
        .select("tentram, hmax, hmin, rtb")
        .eq("thang", searchMonth)
        .eq("ky", searchPeriod)
        .in("tentram", stationsInGroup);

      // 4. Aggregate Data per Station
      const results: StationSummary[] = stationsInGroup.map((station) => {
        const stationRows =
          data?.filter((row) => row.TenTram === station) || [];

        // Map using lowercase keys from TBNN result
        const stationTbnn = tbnnList?.find((t: any) => t.tentram === station);

        // Base structure
        const summary = {
          TenTram: station,
          Hmax: 0,
          NgayHmax: "-",
          Hmin: 0,
          NgayHmin: "-",
          RainSum: 0,
          RainMax: 0,
          NgayRainMax: "-",
          RainDays: 0,
          HasData: false,
          TBNN_Hmax: stationTbnn?.hmax,
          TBNN_Hmin: stationTbnn?.hmin,
          TBNN_Rtb: stationTbnn?.rtb,
        };

        if (stationRows.length === 0) return summary;

        let hMax = -Infinity;
        let hMin = Infinity;
        let ngayHmax = "-";
        let ngayHmin = "-";
        let rainSum = 0;
        let rainMax = -Infinity;
        let ngayRainMax = "-";
        let rainDays = 0;
        let hasH = false;

        stationRows.forEach((row) => {
          // Parse H
          const hValMax = parseFloat(row.Hmax);
          const hValMin = parseFloat(row.Hmin);

          if (!isNaN(hValMax)) {
            hasH = true;
            if (hValMax > hMax) {
              hMax = hValMax;
              ngayHmax = row.Ngay;
            }
          }
          if (!isNaN(hValMin)) {
            hasH = true;
            if (hValMin < hMin) {
              hMin = hValMin;
              ngayHmin = row.Ngay;
            }
          }

          // Parse Rain
          const r = parseFloat(row.R24);
          if (!isNaN(r)) {
            rainSum += r;
            if (r > 0) rainDays++;
            if (r > rainMax) {
              rainMax = r;
              ngayRainMax = row.Ngay;
            }
          }
        });

        summary.Hmax = hasH ? hMax : 0;
        summary.NgayHmax = ngayHmax;
        summary.Hmin = hasH ? hMin : 0;
        summary.NgayHmin = ngayHmin;
        summary.RainSum = Number(rainSum.toFixed(1));
        summary.RainMax = rainMax === -Infinity ? 0 : rainMax;
        summary.NgayRainMax = ngayRainMax;
        summary.RainDays = rainDays;
        summary.HasData = hasH || rainSum > 0;

        return summary;
      });

      setSummaryData(results);
    } catch (err: any) {
      setError(err?.message || "Lỗi tải dữ liệu tổng hợp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [selectedGroup, selectedMonth, selectedYear, period, specificDate]);

  const handleExportExcel = () => {
    if (summaryData.length === 0) return alert("Không có dữ liệu!");

    // Format data for Excel
    const excelData = summaryData.map((s) => ({
      Trạm: s.TenTram,
      "Hmax (cm)": s.HasData ? s.Hmax : "-",
      "TBNN Hmax": s.TBNN_Hmax ?? "-",
      "Ngày Hmax": s.NgayHmax,
      "Hmin (cm)": s.HasData ? s.Hmin : "-",
      "TBNN Hmin": s.TBNN_Hmin ?? "-",
      "Ngày Hmin": s.NgayHmin,
      "Tổng mưa (mm)": s.RainSum,
      "TBNN Mưa": s.TBNN_Rtb ?? "-",
      "Ngày mưa": s.RainDays,
      "Mưa lớn nhất": s.RainMax,
      "Ngày mưa lớn nhất": s.NgayRainMax,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TongHop");
    XLSX.writeFile(wb, `TongHop_${selectedGroup}_${period}.xlsx`);
  };

  const renderComparison = (current: number, target: number | undefined) => {
    if (target === undefined || !current) return null;
    const diff = current - target;
    const isHigher = diff > 0;
    return (
      <div
        className={`flex items-center justify-center gap-0.5 text-[9px] font-black mt-1 ${
          isHigher ? "text-red-500" : "text-blue-500"
        }`}
      >
        {isHigher ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
        <span>
          {isHigher ? "+" : ""}
          {diff.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fadeIn w-full">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-4">
        {/* ... (Keep existing filters) ... */}
        <div className="flex flex-col gap-1.5 w-[140px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
            <Layers size={10} /> Đài
          </label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
          >
            {availableGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[130px]">
          <label className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 ml-1">
            <Calendar size={10} /> Thời kỳ
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="w-full bg-blue-50/50 border border-blue-100 text-blue-800 rounded-lg p-2.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
          >
            <option value="MONTH">Cả tháng</option>
            <option value="T1">Tuần 1 (1-10)</option>
            <option value="T2">Tuần 2 (11-20)</option>
            <option value="T3">Tuần 3 (21-Hết)</option>
            <option value="DAY">1 Ngày</option>
            <option value="WEEK">1 Tuần (từ ngày chọn)</option>
          </select>
        </div>

        {period === "DAY" || period === "WEEK" ? (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-black text-blue-500 uppercase ml-1 flex items-center gap-1">
              <Calendar size={10} /> Chọn ngày
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 w-full cursor-pointer transition-all"
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 w-[80px]">
              <label className="text-[10px] font-black text-blue-500 uppercase ml-1">
                Tháng
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-[90px]">
              <label className="text-[10px] font-black text-blue-500 uppercase ml-1">
                Năm
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-[11px] font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <option key={i} value={now.getFullYear() - i}>
                    {now.getFullYear() - i}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          onClick={handleExportExcel}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-emerald-100 flex items-center gap-2 uppercase transition-all tracking-tighter"
        >
          <FileSpreadsheet size={16} /> Xuất Excel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 shadow-sm">
          <AlertCircle size={20} />
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Tổng hợp số liệu & So sánh TBNN
              </h3>
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
                {selectedGroup} • {period}
              </p>
            </div>
          </div>
          <button
            onClick={fetchGroupData}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th
                  rowSpan={2}
                  className="p-3 text-[10px] font-black text-slate-600 uppercase border-r border-b border-slate-300 text-left sticky left-0 bg-slate-100 min-w-[120px]"
                >
                  Trạm
                </th>
                <th
                  colSpan={4}
                  className="p-2 text-[10px] font-black text-blue-600 uppercase border-r border-b border-slate-300 text-center bg-blue-50/30"
                >
                  Mực nước (cm)
                </th>
                <th
                  colSpan={4}
                  className="p-2 text-[10px] font-black text-emerald-600 uppercase border-b border-slate-300 text-center bg-emerald-50/30"
                >
                  Mưa (mm)
                </th>
              </tr>
              <tr>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[60px]">
                  Hmax
                </th>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[80px]">
                  Ngày
                </th>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[60px]">
                  Hmin
                </th>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[80px]">
                  Ngày
                </th>

                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[60px]">
                  Tổng
                </th>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[50px]">
                  Ngày mưa
                </th>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-r border-b border-slate-300 text-center min-w-[60px]">
                  Max
                </th>
                <th className="p-2 text-[9px] font-black text-slate-500 uppercase border-b border-slate-300 text-center min-w-[80px]">
                  Ngày
                </th>
              </tr>
            </thead>
            <tbody className="bg-white text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw size={24} className="animate-spin" />
                      <span className="text-[10px] font-bold uppercase">
                        Đang tổng hợp dữ liệu...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : summaryData.length > 0 ? (
                summaryData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50">
                      {row.TenTram}
                    </td>

                    <td className="p-3 text-center font-bold text-red-600 border-r border-slate-200 bg-red-50/10">
                      <div>{row.HasData ? row.Hmax : "-"}</div>
                      {renderComparison(row.Hmax, row.TBNN_Hmax)}
                    </td>
                    <td className="p-3 text-center text-slate-500 font-medium border-r border-slate-200">
                      {row.NgayHmax !== "-"
                        ? row.NgayHmax.split("-")
                            .reverse()
                            .slice(0, 2)
                            .join("/")
                        : "-"}
                    </td>

                    <td className="p-3 text-center font-bold text-blue-600 border-r border-slate-200 bg-blue-50/10">
                      <div>{row.HasData ? row.Hmin : "-"}</div>
                      {renderComparison(row.Hmin, row.TBNN_Hmin)}
                    </td>
                    <td className="p-3 text-center text-slate-500 font-medium border-r border-slate-200">
                      {row.NgayHmin !== "-"
                        ? row.NgayHmin.split("-")
                            .reverse()
                            .slice(0, 2)
                            .join("/")
                        : "-"}
                    </td>

                    <td className="p-3 text-center font-black text-emerald-600 border-r border-slate-200 bg-emerald-50/10">
                      <div>{row.RainSum}</div>
                      {renderComparison(row.RainSum, row.TBNN_Rtb)}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700 border-r border-slate-200">
                      {row.RainDays}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-500 border-r border-slate-200">
                      {row.RainMax}
                    </td>
                    <td className="p-3 text-center text-slate-500 font-medium">
                      {row.NgayRainMax !== "-"
                        ? row.NgayRainMax.split("-")
                            .reverse()
                            .slice(0, 2)
                            .join("/")
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="p-12 text-center text-slate-400 text-xs font-bold uppercase"
                  >
                    Chưa có dữ liệu cho đài này trong khoảng thời gian đã chọn
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HydroGroupSummary;
