
import React, { useMemo } from 'react';
import { MeteoData, MarineFactor } from '../types';
import { LoadingState, EmptyState } from './Shared';
import { translateWaveCode } from '../services/meteoUtils';

interface MarineTableProps {
  data: MeteoData[];
  loading: boolean;
  factor: MarineFactor;
}

const MarineTable: React.FC<MarineTableProps> = ({ data, loading, factor }) => {
  // Chuẩn hóa tên các trạm hải văn theo yêu cầu
  const stationMap: Record<string, string> = {
    '48889': 'Phú Quý',
    '48918': 'Côn Đảo',
    '48916': 'Thổ Chu',
    '48917': 'Phú Quốc',
    '48919': 'Huyền Trân'
  };

  const stationIds = Object.keys(stationMap);

  // Group data by Date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Record<string, MeteoData>> = {};
    data.forEach(item => {
      if (!groups[item.Ngay]) groups[item.Ngay] = {};
      groups[item.Ngay][item.MaTram] = item;
    });
    return groups;
  }, [data]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort();
  }, [groupedByDate]);

  if (loading) return <LoadingState />;
  if (sortedDates.length === 0) return <EmptyState />;

  const headerClass = "py-1.5 px-2 font-black text-slate-700 border border-slate-300 text-center text-[10px] md:text-xs uppercase";
  const subHeaderClass = "py-1 px-1 text-[9px] font-black border border-slate-300 text-center bg-slate-50/50";

  return (
    <div className="relative overflow-auto max-h-[650px] w-full border border-slate-300 rounded-xl bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-30">
          <tr className="bg-slate-100">
            <th rowSpan={2} className={`${headerClass} w-[100px] sticky left-0 z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1]`}>Ngày</th>
            {stationIds.map(id => (
              <th key={id} colSpan={4} className={`${headerClass} ${factor === MarineFactor.NHIET_NUOC ? 'text-blue-700 bg-blue-50/30' : 'text-sky-700 bg-sky-50/30'}`}>
                {stationMap[id]} - {id}
              </th>
            ))}
          </tr>
          <tr className="bg-slate-50 sticky top-[28px] z-30 shadow-sm">
            {stationIds.map(id => (
              <React.Fragment key={`${id}-hours`}>
                <th className={`${subHeaderClass} w-[50px]`}>1h</th>
                <th className={`${subHeaderClass} w-[50px]`}>7h</th>
                <th className={`${subHeaderClass} w-[50px]`}>13h</th>
                <th className={`${subHeaderClass} w-[50px]`}>19h</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody className="text-[11px] md:text-xs">
          {sortedDates.map(date => {
            const dateDisplay = date.split('-').reverse().join('/');
            const dateRows = groupedByDate[date];
            
            return (
              <tr key={date} className="hover:bg-blue-50/40 transition-colors group border-b border-slate-200">
                <td className="p-2 font-bold text-slate-900 border border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/60 z-20 text-center shadow-[1px_0_0_0_#cbd5e1]">
                  {dateDisplay}
                </td>
                {stationIds.map(id => {
                  const stationData = dateRows[id];
                  const prefix = factor === MarineFactor.NHIET_NUOC ? 'Tnuoc' : 'Hsong';
                  const hours = ['1h', '7h', '13h', '19h'];
                  
                  return hours.map(h => {
                    const val = stationData ? stationData[`${prefix}${h}`] : null;
                    // Chuyển đổi mã sóng sang mét nếu đang xem yếu tố Sóng
                    const displayVal = factor === MarineFactor.SONG ? translateWaveCode(val) : val;

                    return (
                      <td 
                        key={`${id}-${h}`} 
                        className={`p-2 border border-slate-200 text-center font-bold whitespace-nowrap ${
                          val !== null ? 'text-blue-700' : 'text-slate-300 italic'
                        }`}
                      >
                        {/* 
                          Dòng trên (text-blue-700) chính là nơi điều chỉnh màu chữ xanh dương 
                          cho các giá trị 1h, 7h, 13h, 19h 
                        */}
                        {displayVal !== null && displayVal !== undefined ? displayVal : '-'}
                      </td>
                    );
                  });
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MarineTable;
