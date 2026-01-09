
import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { HOURLY_COLUMNS, EXTRA_COLUMNS } from '../types';
import { updateHydroData } from '../services/dataService';

interface UpdateModalProps {
  onClose: () => void;
  onSave: () => void;
  stationGroups: string[];
  stations: string[];
  initialGroup?: string;
  initialStation?: string;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ 
  onClose, 
  onSave, 
  stationGroups, 
  stations,
  initialGroup,
  initialStation
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    TenDai: initialGroup || stationGroups[0] || '',
    TenTram: initialStation || stations[0] || '',
    Ngay: new Date().toISOString().split('T')[0],
    column: 'Hmax',
    value: ''
  });

  const allColumns = [...HOURLY_COLUMNS, ...EXTRA_COLUMNS];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value) return alert('Vui lòng nhập giá trị!');
    
    setLoading(true);
    try {
      const success = await updateHydroData({
        TenTram: formData.TenTram,
        TenDai: formData.TenDai,
        Ngay: formData.Ngay,
        column: formData.column,
        value: formData.value
      });

      if (success) {
        alert('Cập nhật thành công!');
        onSave();
        onClose();
      }
    } catch (err: any) {
      // Hiển thị lỗi chi tiết thay vì [object Object]
      alert(`LỖI LƯU DỮ LIỆU: ${err.message || 'Hãy kiểm tra cấu hình Database hoặc quyền truy cập.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp border border-slate-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Save size={18} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Cập nhật số liệu</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase ml-1">Đài</label>
                <select 
                  value={formData.TenDai}
                  onChange={(e) => setFormData({...formData, TenDai: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  {stationGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase ml-1">Trạm</label>
                <select 
                  value={formData.TenTram}
                  onChange={(e) => setFormData({...formData, TenTram: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  {stations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-800 uppercase ml-1">Ngày quan trắc</label>
              <input 
                type="date"
                value={formData.Ngay}
                onChange={(e) => setFormData({...formData, Ngay: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase ml-1">Cột dữ liệu</label>
                <select 
                  value={formData.column}
                  onChange={(e) => setFormData({...formData, column: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer"
                >
                  {allColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-800 uppercase ml-1">Giá trị mới</label>
                <input 
                  type="text"
                  placeholder="Nhập số..."
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-2.5 text-xs font-black text-blue-900 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              LƯU DỮ LIỆU
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateModal;
