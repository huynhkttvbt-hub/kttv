
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HydroDashboard from './components/HydroDashboard';
import HydroSummary from './components/HydroSummary';
import HydroGroupSummary from './components/HydroGroupSummary';
import DailySynthesis from './components/DailySynthesis'; // Import mới
import SetupGuide from './components/SetupGuide';
import { MenuType, SubMenuType, StationMetadata, FilterState } from './types';
import { fetchMetadata, trackVisit } from './services/dataService';
import { isConfigured } from './supabaseClient';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<MenuType>(MenuType.THUY_VAN);
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>(SubMenuType.CHI_TIET);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [hasConfig, setHasConfig] = useState(isConfigured());
  const [visitorCount, setVisitorCount] = useState<number>(0);

  // State lọc chung để quản lý đồng bộ dropdown
  const [filters, setFilters] = useState<FilterState>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    stationName: '',
    stationGroup: ''
  });

  useEffect(() => {
    if (hasConfig) {
      const load = async () => {
        try {
          // Track lượt truy cập
          const count = await trackVisit();
          setVisitorCount(count);

          const data = await fetchMetadata();
          setMetadata(data);
          
          // Khi mới load xong, nếu chưa có đài/trạm thì chọn cái đầu tiên
          if (data.length > 0 && !filters.stationGroup) {
            const firstItem = data[0];
            setFilters(prev => ({
              ...prev,
              stationGroup: firstItem.TenDai || '',
              stationName: firstItem.TenTram || ''
            }));
          }
        } catch (e) {
          console.error("Lỗi khởi tạo ứng dụng:", e);
        }
      };
      load();
    }
  }, [hasConfig]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const availableGroups = useMemo(() => 
    Array.from(new Set(metadata.map(m => m.TenDai).filter(Boolean))).sort() as string[]
  , [metadata]);

  const filteredStations = useMemo(() => {
    if (!filters.stationGroup) {
      return Array.from(new Set(metadata.map(m => m.TenTram).filter(Boolean))).sort() as string[];
    }
    return metadata
      .filter(m => m.TenDai === filters.stationGroup)
      .map(m => m.TenTram)
      .filter(Boolean)
      .sort() as string[];
  }, [metadata, filters.stationGroup]);

  const handleFilterChange = (newFilters: FilterState) => {
    if (newFilters.stationGroup !== filters.stationGroup) {
      const stationsForNewGroup = metadata
        .filter(m => m.TenDai === newFilters.stationGroup)
        .map(m => m.TenTram);
      
      const defaultStation = stationsForNewGroup.length > 0 ? stationsForNewGroup[0] : '';
      setFilters({ ...newFilters, stationName: defaultStation });
    } else {
      setFilters(newFilters);
    }
  };

  const renderContent = () => {
    if (!hasConfig) {
      return <SetupGuide />;
    }

    // Ghi chú tạm cho Khí tượng
    if (activeMenu === MenuType.KHI_TUONG) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100 m-6 shadow-sm">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dữ liệu Khí tượng</h2>
          <p className="text-sm font-bold text-blue-500 mt-2">CHƯA CÓ DỮ LIỆU - ĐANG TRONG QUÁ TRÌNH THIẾT LẬP BẢNG</p>
          <div className="mt-8">
             <span className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú: Đang cấu hình Supabase</span>
          </div>
        </div>
      );
    }

    if (activeSubMenu === SubMenuType.CHI_TIET) {
      return <HydroDashboard 
        activeMenu={activeMenu} 
        stations={filteredStations} 
        groups={availableGroups}
        filters={filters}
        onFilterChange={handleFilterChange}
      />;
    }
    if (activeSubMenu === SubMenuType.DAC_TRUNG) {
      return <HydroSummary />;
    }
    if (activeSubMenu === SubMenuType.TONG_HOP) {
      return <HydroGroupSummary />;
    }
    if (activeSubMenu === SubMenuType.TONG_HOP_NGAY) { // Xử lý render menu mới
      return <DailySynthesis />;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 m-6">
        <h2 className="text-lg font-bold text-slate-600 uppercase tracking-tight">Tính năng đang phát triển</h2>
      </div>
    );
  };

  const getMenuInfo = () => {
    const names: Record<string, string> = {
      [MenuType.THUY_VAN]: 'THUỶ VĂN',
      [MenuType.KHI_TUONG]: 'KHÍ TƯỢNG',
      [MenuType.MUA]: 'MƯA',
      [MenuType.PHU_QUY]: 'PHÚ QUÝ',
      [MenuType.HAI_VAN]: 'HẢI VĂN'
    };
    const subNames: Record<string, string> = {
      [SubMenuType.CHI_TIET]: 'Số liệu chi tiết',
      [SubMenuType.DAC_TRUNG]: 'Đặc trưng tháng',
      [SubMenuType.TONG_HOP]: 'Tổng hợp đài',
      [SubMenuType.TONG_HOP_NGAY]: 'Tổng hợp ngày' // Thêm tên
    };
    return { 
      menu: names[activeMenu] || activeMenu, 
      sub: subNames[activeSubMenu] || 'Dữ liệu' 
    };
  };

  const info = getMenuInfo();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeMenu={activeMenu} 
        activeSubMenu={activeSubMenu}
        onMenuSelect={(menu, sub) => {
          setActiveMenu(menu);
          setActiveSubMenu(sub);
        }}
        onToggle={toggleSidebar}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header 
          activeMenuName={info.menu} 
          activeSubMenuName={info.sub}
          isConfigured={hasConfig}
          visitorCount={visitorCount}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 pb-12">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
