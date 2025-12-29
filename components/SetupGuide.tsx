
import React from 'react';
import { Database, Key, ExternalLink, Settings } from 'lucide-react';

const SetupGuide: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Database size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Kết nối Cơ sở dữ liệu</h1>
              <p className="text-blue-100 text-sm">Vui lòng cấu hình Supabase để xem số liệu thực tế.</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">1</span>
                Lấy thông tin API
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Truy cập vào <strong>Supabase Dashboard</strong> &gt; <strong>Project Settings</strong> &gt; <strong>API</strong>. 
                Sao chép <code>Project URL</code> và <code>anon public key</code>.
              </p>
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mở Supabase Dashboard <ExternalLink size={14} />
              </a>
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-slate-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">2</span>
                Cập nhật mã nguồn
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Mở file <code>supabaseClient.ts</code> và dán thông tin vào hai biến <code>supabaseUrl</code> và <code>supabaseAnonKey</code>.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600">
                const supabaseUrl = 'https://abc.supabase.co';<br/>
                const supabaseAnonKey = 'eyJhbG...';
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4 animate-pulse">
              <Key size={24} />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">Đang chờ cấu hình...</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Ứng dụng sẽ tự động tải lại và hiển thị bảng điều khiển ngay khi phát hiện thông tin kết nối hợp lệ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide;
