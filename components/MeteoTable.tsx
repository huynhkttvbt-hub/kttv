
import React from 'react';
import { MeteoData, MeteoFactor } from '../types';
import { translateWeatherCode } from '../services/meteoUtils';

interface MeteoTableProps {
  data: MeteoData[];
  loading: boolean;
  factor: MeteoFactor;
}

const MeteoTable: React.FC<MeteoTableProps> = ({ data, loading, factor }) => {
  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Đang tải dữ liệu khí tượng...</span>
      </div>
    );
  }

  // Helper render ô dữ liệu thông thường
  const cell = (val: any, bold = false, colorClass = "text-slate-800") => (
    <td className={`p-2 border-r border-b border-slate-300 text-center ${bold ? 'font-bold' : 'font-medium'} ${colorClass} text-xs md:text-sm`}>
      {val !== undefined && val !== null ? val : '-'}
    </td>
  );

  // Render ô hiện tượng
  const weatherCell = (val: any, isPast: boolean = false) => {
    const text = translateWeatherCode(val, isPast);
    const isSpecial = text !== '-' && isNaN(Number(text));
    const textColorClass = isPast ? 'text-blue-700' : 'text-amber-700';
    const bgColorClass = isPast ? 'bg-blue-50/20' : 'bg-amber-50/20';

    return (
      <td className={`p-2 border-r border-b border-slate-300 text-center text-[11px] md:text-xs leading-tight ${isSpecial ? `${textColorClass} font-bold ${bgColorClass}` : 'text-slate-400 font-medium'}`}>
        {text}
      </td>
    );
  };

  const renderTableHeader = () => {
    const headerClass = "p-2 font-bold text-slate-700 border-r border-b border-slate-300 text-center text-xs uppercase";
    const subHeaderClass = "p-2 text-[10px] md:text-xs font-bold border-r border-b border-slate-300 text-center";

    switch (factor) {
      case MeteoFactor.NHIET_AM:
        return (
          <>
            <tr className="bg-slate-50">
              <th rowSpan={2} className={`${headerClass} w-[120px] sticky left-0 z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1] text-slate-900`}>Ngày</th>
              <th colSpan={11} className={`${headerClass} text-red-600 bg-red-50/30`}>Nhiệt độ (°C)</th>
              <th colSpan={10} className={`${headerClass} text-blue-600 bg-blue-50/30`}>Ẩm độ (%)</th>
            </tr>
            <tr className="bg-slate-50 sticky top-[37px] z-30">
              {['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h', 'TB', 'Tx', 'Tn'].map(h => (
                <th key={`t-${h}`} className={`${subHeaderClass} text-red-700 bg-red-50/10 w-[60px]`}>
                  {h === 'Tx' ? 'Tx' : h === 'Tn' ? 'Tn' : h === 'TB' ? 'T.Bình' : `T${h}`}
                </th>
              ))}
              {['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h', 'TB', 'Min'].map(h => (
                <th key={`u-${h}`} className={`${subHeaderClass} text-blue-700 bg-blue-50/10 w-[60px]`}>
                   {h === 'TB' ? 'T.Bình' : h === 'Min' ? 'Umin' : `U${h}`}
                </th>
              ))}
            </tr>
          </>
        );

      case MeteoFactor.KHI_AP:
        return (
          <>
            <tr className="bg-slate-50">
              <th rowSpan={2} className={`${headerClass} w-[120px] sticky left-0 z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1] text-slate-900`}>Ngày</th>
              <th colSpan={9} className={`${headerClass} text-indigo-600 bg-indigo-50/30`}>Khí áp trạm (mb)</th>
              <th colSpan={9} className={`${headerClass} text-violet-600 bg-violet-50/30`}>Khí áp biển (mb)</th>
            </tr>
            <tr className="bg-slate-50 sticky top-[37px] z-30">
              {['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h', 'TB'].map(h => (
                <th key={`pt-${h}`} className={`${subHeaderClass} text-indigo-700 bg-indigo-50/10 w-[65px]`}>Pt{h}</th>
              ))}
              {['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h', 'TB'].map(h => (
                <th key={`pb-${h}`} className={`${subHeaderClass} text-violet-700 bg-violet-50/10 w-[65px]`}>Pb{h}</th>
              ))}
            </tr>
          </>
        );

      case MeteoFactor.GIO:
        const hours = ['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h'];
        return (
          <>
             <tr className="bg-slate-50">
              <th rowSpan={2} className={`${headerClass} w-[120px] sticky left-0 z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1] text-slate-900`}>Ngày</th>
              {hours.map(h => (
                <th key={h} colSpan={2} className={`${headerClass} text-sky-600 bg-sky-50/30`}>{h}</th>
              ))}
            </tr>
            <tr className="bg-slate-50 sticky top-[37px] z-30">
              {hours.map(h => (
                <React.Fragment key={h}>
                   <th className={`${subHeaderClass} text-slate-500 bg-slate-50 w-[55px]`}>Hướng</th>
                   <th className={`${subHeaderClass} text-sky-700 bg-sky-50/10 w-[55px]`}>Tốc độ</th>
                </React.Fragment>
              ))}
            </tr>
          </>
        );

      case MeteoFactor.MUA:
        return (
          <tr className="bg-slate-50">
             <th className={`${headerClass} w-[120px] sticky left-0 z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1] text-slate-900`}>Ngày</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R1h</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R7h</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R13h</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R19h</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R19-7</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R7-19</th>
             <th className={`${headerClass} text-emerald-600 bg-emerald-50/10 w-[70px]`}>R24h</th>
          </tr>
        );
        
      case MeteoFactor.HIEN_TUONG:
        const wHours = ['1h', '4h', '7h', '10h', '13h', '16h', '19h', '22h'];
        return (
          <>
             <tr className="bg-slate-50">
              <th rowSpan={2} className={`${headerClass} w-[120px] sticky left-0 z-40 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1] text-slate-900`}>Ngày</th>
              {wHours.map(h => (
                <th key={h} colSpan={3} className={`${headerClass} text-amber-600 bg-amber-50/30`}>{h}</th>
              ))}
            </tr>
            <tr className="bg-slate-50 sticky top-[37px] z-30">
              {wHours.map(h => (
                <React.Fragment key={h}>
                   <th className={`${subHeaderClass} text-slate-500 bg-slate-50 w-[80px]`}>W</th>
                   <th className={`${subHeaderClass} text-slate-500 bg-slate-50 w-[80px]`}>W1</th>
                   <th className={`${subHeaderClass} text-slate-500 bg-slate-50 w-[80px]`}>W2</th>
                </React.Fragment>
              ))}
            </tr>
          </>
        );

      default: return null;
    }
  };

  const renderTableBody = () => {
    return data.map((row, idx) => {
      const dateDisplay = row.Ngay ? row.Ngay.split('-').reverse().join('/') : '-';
      
      return (
        <tr key={idx} className="hover:bg-blue-50/40 transition-colors group">
           <td className="p-2 font-bold text-slate-900 border-r border-b border-slate-300 sticky left-0 bg-white group-hover:bg-blue-50/60 z-20 whitespace-nowrap text-center shadow-[1px_0_0_0_#cbd5e1] text-xs md:text-sm">
              {dateDisplay}
           </td>

           {factor === MeteoFactor.NHIET_AM && (
             <>
               {cell(row.T1h)}{cell(row.T4h)}{cell(row.T7h)}{cell(row.T10h)}{cell(row.T13h)}{cell(row.T16h)}{cell(row.T19h)}{cell(row.T22h)}
               {cell(row.NhietTB !== undefined && row.NhietTB !== null ? Number(row.NhietTB).toFixed(1) : '-', true)}
               {cell(row.NhietTx, true, 'text-red-600')}
               {cell(row.NhietTn, true, 'text-blue-600')}
               {cell(row.U1h)}{cell(row.U4h)}{cell(row.U7h)}{cell(row.U10h)}{cell(row.U13h)}{cell(row.U16h)}{cell(row.U19h)}{cell(row.U22h)}
               {cell(row.AmTB, true)}{cell(row.Umin, true, 'text-orange-600')}
             </>
           )}

           {factor === MeteoFactor.KHI_AP && (
             <>
                {cell(row.Pt1h)}{cell(row.Pt4h)}{cell(row.Pt7h)}{cell(row.Pt10h)}{cell(row.Pt13h)}{cell(row.Pt16h)}{cell(row.Pt19h)}{cell(row.Pt22h)}{cell(row.PtTB, true)}
                {cell(row.Pb1h)}{cell(row.Pb4h)}{cell(row.Pb7h)}{cell(row.Pb10h)}{cell(row.Pb13h)}{cell(row.Pb16h)}{cell(row.Pb19h)}{cell(row.Pb22h)}{cell(row.PbTB, true)}
             </>
           )}

           {factor === MeteoFactor.GIO && (
             <>
                {cell(row.dd1h)}{cell(row.ff1h, true)}{cell(row.dd4h)}{cell(row.ff4h, true)}{cell(row.dd7h)}{cell(row.ff7h, true)}{cell(row.dd10h)}{cell(row.ff10h, true)}
                {cell(row.dd13h)}{cell(row.ff13h, true)}{cell(row.dd16h)}{cell(row.ff16h, true)}{cell(row.dd19h)}{cell(row.ff19h, true)}{cell(row.dd22h)}{cell(row.ff22h, true)}
             </>
           )}

           {factor === MeteoFactor.MUA && (
             <>
                {cell(row.R1h)}{cell(row.R7h)}{cell(row.R13h)}{cell(row.R19h)}
                {cell(row.R19_7)}{cell(row["R7-19"])}
                {cell(row.Mua24h, true, 'text-emerald-600')}
             </>
           )}
           
           {factor === MeteoFactor.HIEN_TUONG && (
             <>
               {weatherCell(row.W1h, false)}{weatherCell(row.W11h, true)}{weatherCell(row.W21h, true)}
               {weatherCell(row.W4h, false)}{weatherCell(row.W14h, true)}{weatherCell(row.W24h, true)}
               {weatherCell(row.W7h, false)}{weatherCell(row.W17h, true)}{weatherCell(row.W27h, true)}
               {weatherCell(row.W10h, false)}{weatherCell(row.W110h, true)}{weatherCell(row.W210h, true)}
               {weatherCell(row.W13h, false)}{weatherCell(row.W113h, true)}{weatherCell(row.W213h, true)}
               {weatherCell(row.W16h, false)}{weatherCell(row.W116h, true)}{weatherCell(row.W216h, true)}
               {weatherCell(row.W19h, false)}{weatherCell(row.W119h, true)}{weatherCell(row.W219h, true)}
               {weatherCell(row.W22h, false)}{weatherCell(row.W122h, true)}{weatherCell(row.W222h, true)}
             </>
           )}
        </tr>
      );
    });
  };

  return (
    <div className="relative overflow-auto max-h-[650px] w-full border border-slate-300 rounded-xl bg-white shadow-sm">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead className="sticky top-0 z-30">
          {renderTableHeader()}
        </thead>
        <tbody>
          {renderTableBody()}
          {data.length === 0 && !loading && (
             <tr>
              <td colSpan={100} className="p-24 text-center bg-white font-bold text-slate-400">
                KHÔNG CÓ DỮ LIỆU PHÙ HỢP
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MeteoTable;
