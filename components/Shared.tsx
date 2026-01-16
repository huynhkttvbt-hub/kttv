
import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Download, Edit3, Save, X } from 'lucide-react';

// 1. Loading State
export const LoadingState: React.FC<{ message?: string }> = ({ message = "Đang tải dữ liệu..." }) => (
  <div className="p-12 flex flex-col items-center justify-center gap-4 min-h-[300px] animate-fadeIn">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
    </div>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{message}</span>
  </div>
);

// 2. Error State
export const ErrorBanner: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 shadow-sm border border-red-100 animate-slideUp">
      <AlertCircle className="text-red-500" size={18} />
      <p className="text-xs text-red-700 font-bold">{message}</p>
    </div>
  );
};

// 3. Empty State
export const EmptyState: React.FC<{ message?: string }> = ({ message = "Không có dữ liệu hiển thị" }) => (
  <div className="flex flex-col items-center justify-center py-20 opacity-40">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
      <span className="text-2xl font-black text-slate-400">?</span>
    </div>
    <span className="text-xs font-black uppercase tracking-widest text-slate-500">{message}</span>
  </div>
);

// 4. Page/Section Header
interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: any;
  iconColorClass?: string;
  rightControls?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, subtitle, icon: Icon, iconColorClass = "bg-blue-600", rightControls 
}) => (
  <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${iconColorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{subtitle}</p>
      </div>
    </div>
    {rightControls && <div className="flex items-center gap-2">{rightControls}</div>}
  </div>
);

// 5. Common Action Buttons
interface ActionButtonsProps {
  loading: boolean;
  onRefresh: () => void;
  onUpdate?: () => void;
  onExport?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ loading, onRefresh, onUpdate, onExport }) => (
  <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
    <button 
      onClick={onRefresh} 
      className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
      title="Làm mới"
    >
      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
    </button>
    
    {(onUpdate || onExport) && <div className="w-px h-6 bg-slate-200 mx-1"></div>}
    
    {onUpdate && (
      <button 
        onClick={onUpdate} 
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black transition-all shadow-lg shadow-blue-100 uppercase tracking-tighter active:scale-95"
      >
        <Edit3 size={14} /> Cập nhật
      </button>
    )}
    
    {onExport && (
      <button 
        onClick={onExport} 
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black transition-all shadow-lg shadow-emerald-100 uppercase tracking-tighter active:scale-95"
      >
        <Download size={14} /> Excel
      </button>
    )}
  </div>
);

// 6. Main Card Container
export const MainCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${className}`}>
    {children}
  </div>
);

// 7. Filter Container
export const FilterContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-4 animate-fadeIn">
    {children}
  </div>
);
