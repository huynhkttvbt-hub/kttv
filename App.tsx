
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HydroDashboard from './components/HydroDashboard';
import HydroSummary from './components/HydroSummary';
import HydroGroupSummary from './components/HydroGroupSummary';
import DailySynthesis from './components/DailySynthesis';
import DailyMeteoSynthesis from './components/DailyMeteoSynthesis';
import MeteoDashboard from './components/MeteoDashboard';
import MeteoSummary from './components/MeteoSummary';
import SetupGuide from './components/SetupGuide';
import { MenuType, SubMenuType, StationMetadata, FilterState, MeteoFactor } from './types';
import { fetchMetadata, fetchMeteoMetadata, trackVisit } from './services/dataService';
import { isConfigured } from './supabaseClient';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mặc định mở
  const [activeMenu, setActiveMenu] = useState<MenuType>(MenuType.THUY_VAN);
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuType>(SubMenuType.CHI_TIET);
  const [metadata, setMetadata] = useState<StationMetadata[]>([]);
  const [hasConfig, setHasConfig] = useState(isConfigured());
  const [visitorCount, setVisitorCount] = useState<number>(0);

  const [filters, setFilters] = useState<FilterState>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    stationName: '',
    stationGroup: '',
    factor: MeteoFactor.NHIET_AM
  });

  useEffect(() => {
    if (hasConfig) {
      trackVisit().then(count => setVisitorCount(count));
    }
  }, [hasConfig]);

  useEffect(() => {
    if (!hasConfig) return;

    const loadMetadata = async () => {
      let data: StationMetadata[] = [];
      try {
        if (activeMenu === MenuType.KHI_TUONG) {
          data = await fetchMeteoMetadata();
        } else {
          data = await fetchMetadata();
        }
        
        setMetadata(data);

        if (data.length > 0) {
          const currentGroupExists = data.some(d => d.TenDai === filters.stationGroup);
          const currentStationExists = data.some(d => d.TenTram === filters.stationName);
          
          if (!currentGroupExists || !currentStationExists) {
             const firstItem = data[0];
             setFilters(prev => ({
               ...prev,
               stationGroup: firstItem.TenDai || '',
               stationName: firstItem.TenTram || ''
             }));
          }
        } else {
           setFilters(prev => ({ ...prev, stationGroup: '', stationName: '' }));
        }

      } catch (e) {
        console.error("Lỗi tải danh sách trạm:", e);
      }
    };

    loadMetadata();
  }, [hasConfig, activeMenu]);

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

    if (activeMenu === MenuType.KHI_TUONG) {
      if (activeSubMenu === SubMenuType.CHI_TIET) {
        return <MeteoDashboard 
          stations={filteredStations} 
          groups={availableGroups}
          filters={filters}
          onFilterChange={handleFilterChange}
        />;
      }
      if (activeSubMenu === SubMenuType.TONG_HOP_NGAY_KT) {
        return <DailyMeteoSynthesis />;
      }
      if (activeSubMenu === SubMenuType.DAC_TRUNG) {
        return <MeteoSummary />;
      }
      
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100 m-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Tính năng đang phát triển</h2>
          <p className="text-sm font-bold text-blue-500 mt-2">{activeSubMenu}</p>
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
    if (activeSubMenu === SubMenuType.TONG_HOP_NGAY) { 
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
      [SubMenuType.DAC_TRUNG]: 'Số liệu đặc trưng',
      [SubMenuType.TONG_HOP]: 'Tổng hợp đài',
      [SubMenuType.TONG_HOP_NGAY]: 'Tổng hợp ngày',
      [SubMenuType.TONG_HOP_NGAY_KT]: 'Tổng hợp ngày Khí tượng',
      [SubMenuType.KT_PHU_QUY]: 'Số liệu Khí tượng Phú Quý',
      [SubMenuType.TV_PHU_QUY]: 'Số liệu Hải văn Phú Quý'
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
