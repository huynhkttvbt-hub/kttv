
import React from 'react';
import { Database, CheckCircle, AlertCircle, Users, Activity } from 'lucide-react';

interface HeaderProps {
  activeMenuName: string;
  activeSubMenuName: string;
  isConfigured: boolean;
  visitorCount?: number;
}

const Header: React.FC<HeaderProps> = ({ activeMenuName, activeSubMenuName, isConfigured, visitorCount }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex flex-col">
        <h2 className="text-base md:text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5 md:gap-2">
          {activeMenuName} 
          <span className="text-blue-500">/</span> 
          <span className="text-slate-400 font-bold">{activeSubMenuName}</span>
        </h2>
        <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          <Activity size={10} className="text-blue-400" />
          <span> Thống kê nhanh dữ liệu </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Visitor Counter */}
        {visitorCount !== undefined && visitorCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 shadow-sm animate-fadeIn">
            <Users size={14} className="text-blue-600" />
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter mb-0.5"></span>
              <span className="text-xs md:text-sm font-black text-blue-800">
                {visitorCount.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Connection Status Badge */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          isConfigured ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
        }`}>
          {isConfigured ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span className="text-[10px] font-black uppercase tracking-wider">
            {isConfigured ? 'Kết nối OK' : 'Offline'}
          </span>
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs md:text-sm shadow-lg shadow-blue-200 border-2 border-white">
            LD
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
