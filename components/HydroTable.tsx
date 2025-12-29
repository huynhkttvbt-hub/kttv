
import React from 'react';
import { HydroData } from '../types';
import { HOURLY_COLUMNS, EXTRA_COLUMNS } from '../constants';

interface HydroTableProps {
  data: HydroData[];
  loading: boolean;
}

const HydroTable: React.FC<HydroTableProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-auto max-h-[650px] w-full border border-slate-300 rounded-xl bg-white shadow-sm">
      <table className="w-full text-left text-[11px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-30">
          <tr className="bg-slate-50">
            <th className="p-2 font-black text-slate-700 border-r border-b border-slate-300 whitespace-nowrap sticky left-0 top-0 z-40 bg-slate-50 uppercase tracking-tighter text-center shadow-[1px_0_0_0_#cbd5e1]">
              Ngày
            </th>
            {HOURLY_COLUMNS.map(h => (
              <th key={h} className="p-2 font-black text-slate-500 border-r border-b border-slate-300 text-center min-w-[42px] uppercase bg-slate-50">
                {h}
              </th>
            ))}
            {EXTRA_COLUMNS.map(col => (
              <th key={col} className={`p-2 font-black border-r border-b border-slate-300 text-center min-w-[50px] uppercase tracking-tighter ${
                col.includes('R') ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id || idx} className="hover:bg-blue-50/40 transition-colors group">
              <td className="p-2 font-bold text-slate-900 border-r border-b border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/60 z-20 whitespace-nowrap text-center shadow-[1px_0_0_0_#cbd5e1]">
                {row.Ngay ? row.Ngay.split('-').reverse().join('/') : '-'}
              </td>
              {HOURLY_COLUMNS.map(h => (
                <td key={h} className="p-2 text-slate-900 border-r border-b border-slate-200 text-center font-bold">
                  {row[h] !== undefined && row[h] !== null && row[h] !== '' ? row[h] : '-'}
                </td>
              ))}
              {EXTRA_COLUMNS.map(col => (
                <td key={col} className={`p-2 border-r border-b border-slate-200 text-center font-black ${
                  col.startsWith('Tg') 
                    ? 'text-slate-400 italic text-[9px] font-medium' 
                    : col.includes('R') ? 'text-emerald-600' : 'text-blue-800'
                }`}>
                  {row[col] !== undefined && row[col] !== null && row[col] !== '' ? row[col] : '-'}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && !loading && (
            <tr>
              <td colSpan={100} className="p-24 text-center bg-white">
                <div className="flex flex-col items-center gap-2 opacity-20">
                  <div className="w-12 h-12 border-2 border-slate-400 rounded-lg flex items-center justify-center">
                    <span className="font-black text-2xl">?</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Không có dữ liệu phù hợp</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default HydroTable;
