
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Terminal, Loader2, Sparkles, 
  FileCode, BarChart3, HelpCircle, ChevronRight, 
  Download, Database, MessageSquare
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const RAnalysis: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [output, setOutput] = useState<string[]>(['> Hệ thống WebR đang khởi tạo...']);
  const [code, setCode] = useState(`# Phân tích số liệu thủy văn Lâm Đồng
# Dữ liệu mẫu 'df' đã được cấu trúc sẵn:
# Ngay, TenTram, Hmax, Hmin, Htb, R24 (Lượng mưa)

# Ví dụ vẽ biểu đồ phân bổ mực nước:
hist(rnorm(100), main="Biểu đồ phân bổ mẫu", col="skyblue", border="white")
`);
  const [running, setRunning] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const webR = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cấu trúc bảng để AI hiểu
  const TABLE_SCHEMA = `
    Bảng: so_lieu_thuy_van
    Cột chính: 
    - Ngay (Date: YYYY-MM-DD)
    - TenTram (String)
    - Hmax, Hmin, Htb (Numeric: Mực nước cm)
    - R24 (Numeric: Lượng mưa mm)
    - 00h đến 23h (Numeric: Mực nước giờ)
  `;

  useEffect(() => {
    const initWebR = async () => {
      try {
        // @ts-ignore
        const { WebR } = await import('https://webr.r-wasm.org/latest/webr.mjs');
        webR.current = new WebR();
        await webR.current.init();
        setReady(true);
        setOutput(prev => [...prev, '> Môi trường R đã sẵn sàng!', '> Bạn có thể sử dụng AI để tạo mã phân tích.']);
      } catch (e) {
        setOutput(prev => [...prev, '> Lỗi: Không thể tải WebR. Kiểm tra kết nối internet.']);
      }
    };
    initWebR();
  }, []);

  const handleAiAssistant = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Bạn là chuyên gia ngôn ngữ R trong ngành Thủy văn. 
        Dựa trên cấu trúc dữ liệu sau: ${TABLE_SCHEMA}.
        Hãy viết mã R (chỉ trả về mã, không giải thích) để thực hiện yêu cầu: ${aiPrompt}. 
        Giả sử dữ liệu đã được nạp vào biến 'df'.`
      });
      
      const generatedCode = response.text || '';
      // Làm sạch mã (loại bỏ markdown nếu có)
      const cleanCode = generatedCode.replace(/```r|```/g, '').trim();
      setCode(cleanCode);
      setAiPrompt('');
    } catch (error) {
      console.error("AI Error:", error);
      alert("Không thể kết nối với trợ lý AI lúc này.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const runCode = async () => {
    if (!webR.current || !ready) return;
    setRunning(true);
    setOutput(prev => [...prev, `\n> Đang thực thi mã...`]);
    
    try {
      // Thiết lập canvas để vẽ đồ họa
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        await webR.current.evalRVoid(`canvas(width=600, height=450)`);
      }

      const shelter = await new webR.current.Shelter();
      const result = await shelter.captureR(code, {
        withAutoprint: true,
        captureStreams: true,
        captureConditions: true
      });

      const outLines = result.output.map((line: any) => {
         if (line.type === 'stdout') return line.data;
         if (line.type === 'stderr') return `!! ${line.data}`;
         return '';
      }).filter(Boolean);
      
      setOutput(prev => [...prev, ...outLines]);

      // Kiểm tra xem có hình ảnh nào được sinh ra không
      const msgs = await webR.current.flush();
      msgs.forEach((msg: any) => {
        if (msg.type === 'canvas' && msg.msg === 'canvasImage' && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          const img = new Image();
          img.onload = () => ctx?.drawImage(img, 0, 0);
          img.src = msg.data.toDataURL();
        }
      });

      shelter.purge();
    } catch (e: any) {
      setOutput(prev => [...prev, `Lỗi thực thi: ${e.message}`]);
    } finally {
      setRunning(false);
    }
  };

  const insertTemplate = (type: string) => {
    const templates: Record<string, string> = {
      summary: "summary(df)\nsapply(df[,sapply(df, is.numeric)], sd, na.rm=TRUE)",
      plot: "plot(df$Hmax, type='l', col='blue', main='Biểu đồ mực nước', ylab='cm')\ngrid()",
      corr: "cor(df$Hmax, df$R24, use='complete.obs')\nplot(df$Hmax, df$R24, pch=19, col='darkgreen')"
    };
    setCode(templates[type] || code);
  };

  return (
    <div className="p-4 md:p-6 min-h-screen bg-slate-50 animate-fadeIn">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-3 tracking-tight">
            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200">
              <Terminal size={24} />
            </span>
            Phòng Phân Tích R-Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">Tương tác trực tiếp với số liệu thủy văn bằng ngôn ngữ chuyên dụng</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className={`px-4 py-2 rounded-full border text-xs font-black flex items-center gap-2 transition-all ${
             ready ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-orange-50 border-orange-100 text-orange-500'
           }`}>
             {ready ? <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> : <Loader2 size={14} className="animate-spin" />}
             {ready ? 'R ENGINE ONLINE' : 'ĐANG KHỞI TẠO R...'}
           </div>
        </div>
      </div>

      {/* AI Assistant Bar */}
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex flex-col md:flex-row gap-4 items-center ring-4 ring-blue-50/50">
        <div className="flex items-center gap-3 text-blue-600 shrink-0">
          <Sparkles size={24} className="animate-bounce" />
          <span className="text-xs font-black uppercase tracking-widest">Trợ lý AI</span>
        </div>
        <input 
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAiAssistant()}
          placeholder="Ví dụ: Vẽ biểu đồ cột lượng mưa tháng và tính tổng lượng mưa..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-medium transition-all"
        />
        <button 
          onClick={handleAiAssistant}
          disabled={!ready || isAiGenerating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
        >
          {isAiGenerating ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
          YÊU CẦU AI
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Sidebar Templates */}
        <div className="xl:col-span-2 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mẫu phân tích</p>
          <button onClick={() => insertTemplate('summary')} className="w-full flex items-center gap-3 p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all group">
            <Database size={16} className="text-blue-500 group-hover:scale-110 transition-transform" /> Thống kê mô tả
          </button>
          <button onClick={() => insertTemplate('plot')} className="w-full flex items-center gap-3 p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all group">
            <BarChart3 size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" /> Biểu đồ mực nước
          </button>
          <button onClick={() => insertTemplate('corr')} className="w-full flex items-center gap-3 p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all group">
            <FileCode size={16} className="text-orange-500 group-hover:scale-110 transition-transform" /> Kiểm định tương quan
          </button>
        </div>

        {/* Editor & Output */}
        <div className="xl:col-span-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
            <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Script.R</span>
               </div>
               <button onClick={() => setCode('')} className="text-slate-500 hover:text-white transition-colors">
                 <RotateCcw size={16} />
               </button>
            </div>
            <textarea 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 p-6 font-mono text-sm resize-none focus:outline-none text-blue-100 bg-[#0f172a] leading-relaxed selection:bg-blue-500/30"
              spellCheck={false}
            />
            <div className="p-4 bg-[#0f172a] border-t border-slate-800 flex justify-end">
              <button 
                onClick={runCode}
                disabled={!ready || running}
                className={`flex items-center gap-3 px-10 py-3 rounded-xl text-sm font-black text-white shadow-2xl transition-all active:scale-95 ${
                  !ready || running 
                    ? 'bg-slate-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                }`}
              >
                {running ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                {running ? 'ĐANG CHẠY...' : 'THỰC THI (CTRL+ENTER)'}
              </button>
            </div>
          </div>

          {/* Results Console & Plots */}
          <div className="flex flex-col gap-6">
            {/* Visual Plot Output */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden h-[300px] flex flex-col">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BarChart3 size={14} /> Đồ họa R (Plots)
              </p>
              <div className="flex-1 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                <canvas 
                  ref={canvasRef} 
                  width={600} 
                  height={450} 
                  className="max-w-full max-h-full object-contain"
                />
                {!running && output.length <= 1 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                    <BarChart3 size={40} strokeWidth={1} />
                    <span className="text-[10px] font-bold mt-2 uppercase tracking-tighter">Chưa có biểu đồ được tạo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Console */}
            <div className="bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden border border-slate-800 flex-1 min-h-[250px] flex flex-col">
              <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#3e3e3e] flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">R Console Output</span>
                <button onClick={() => setOutput(['> Console cleared.'])} className="text-[9px] font-bold text-slate-400 hover:text-white">XÓA</button>
              </div>
              <div className="flex-1 p-4 font-mono text-[13px] text-slate-300 overflow-y-auto custom-scrollbar leading-relaxed">
                {output.map((line, idx) => (
                  <div key={idx} className={`mb-1 ${
                    line.startsWith('>') ? 'text-blue-400 font-bold' : 
                    line.startsWith('!!') ? 'text-red-400 bg-red-900/10 px-2' : 'text-slate-300'
                  }`}>
                    {line}
                  </div>
                ))}
                {running && <div className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RAnalysis;
