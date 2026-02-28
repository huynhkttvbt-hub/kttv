
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HydroDashboard from './components/HydroDashboard';
import HydroSummary from './components/HydroSummary';
import HydroGroupSummary from './components/HydroGroupSummary';
import DailySynthesis from './components/DailySynthesis';
import DailyMeteoSynthesis from './components/DailyMeteoSynthesis';
import MeteoDashboard from './components/MeteoDashboard';
import MeteoTemperatureReport from './components/MeteoTemperatureReport';
import MarineDashboard from './components/MarineDashboard';
import MeteoSummary from './components/MeteoSummary';
import ClimDashboard from './components/ClimDashboard';
import SetupGuide from './components/SetupGuide';
import KTTVOverview from './components/KTTVOverview';
import { MenuType, SubMenuType, StationMetadata, FilterState, MeteoFactor } from './types';
import { fetchMetadata, fetchMeteoMetadata, trackVisit } from './services/dataService';
import { isConfigured } from './supabaseClient';
import { CloudRain } from 'lucide-react';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<MenuType>(MenuType.TONG_QUAN);
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
        } else if (activeMenu === MenuType.HAI_VAN) {
          // Metadata cho hải văn có thể lấy từ metadata khí tượng lọc ra trạm biển
          const meteo = await fetchMeteoMetadata();
          const marineIds = ['48889', '48918', '48916', '48917', '48919'];
          data = meteo.filter((m: any) => marineIds.includes(String(m.MaTram || '')));
          
          if (data.length === 0) {
             data = [
               { TenTram: 'Phú Quý', TenDai: 'Hải Văn' },
               { TenTram: 'Trường Sa', TenDai: 'Hải Văn' },
               { TenTram: 'Song Tử Tây', TenDai: 'Hải Văn' },
               { TenTram: 'Thổ Chu', TenDai: 'Hải Văn' },
               { TenTram: 'Huyền Trân', TenDai: 'Hải Văn' }
             ];
          }
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
    if (!hasConfig) return <SetupGuide />;

    if (activeMenu === MenuType.TONG_QUAN) {
       return <KTTVOverview />;
    }

    if (activeMenu === MenuType.HAI_VAN) {
       return <MarineDashboard />;
    }

    if (activeMenu === MenuType.MUA) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 m-6 animate-fadeIn">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 shadow-inner">
            <CloudRain size={40} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-600 uppercase tracking-tight">Tính năng Mưa đang phát triển</h2>
          <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Vui lòng quay lại sau</p>
        </div>
      );
    }

    if (activeMenu === MenuType.KHI_TUONG) {
      if (activeSubMenu === SubMenuType.CHI_TIET) {
        return <MeteoDashboard stations={filteredStations} groups={availableGroups} filters={filters} onFilterChange={handleFilterChange} />;
      }
      if (activeSubMenu === SubMenuType.NHIET_DO) {
        return <MeteoTemperatureReport />;
      }
      if (activeSubMenu === SubMenuType.TONG_HOP_NGAY_KT) {
        return <DailyMeteoSynthesis />;
      }
      if (activeSubMenu === SubMenuType.DAC_TRUNG) {
        return <MeteoSummary />;
      }
      if (activeSubMenu === SubMenuType.CLIM) {
        return <ClimDashboard />;
      }
    }

    if (activeSubMenu === SubMenuType.CHI_TIET) {
      return <HydroDashboard activeMenu={activeMenu} stations={filteredStations} groups={availableGroups} filters={filters} onFilterChange={handleFilterChange} />;
    }
    if (activeSubMenu === SubMenuType.DAC_TRUNG) return <HydroSummary />;
    if (activeSubMenu === SubMenuType.TONG_HOP) return <HydroGroupSummary />;
    if (activeSubMenu === SubMenuType.TONG_HOP_NGAY) return <DailySynthesis />;

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 m-6">
        <h2 className="text-lg font-bold text-slate-600 uppercase tracking-tight">Tính năng đang phát triển</h2>
      </div>
    );
  };

  const getMenuInfo = () => {
    const names: Record<string, string> = {
      [MenuType.TONG_QUAN]: 'TỔNG QUAN',
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
      [SubMenuType.NHIET_DO]: 'Số liệu Nhiệt độ',
      [SubMenuType.CLIM]: 'Số liệu CLim KT'
    };
    return { menu: names[activeMenu] || activeMenu, sub: subNames[activeSubMenu] || 'Dữ liệu' };
  };

  const info = getMenuInfo();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      <Sidebar isOpen={isSidebarOpen} activeMenu={activeMenu} activeSubMenu={activeSubMenu} onMenuSelect={(menu, sub) => { setActiveMenu(menu); setActiveSubMenu(sub); }} onToggle={toggleSidebar} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header activeMenuName={info.menu} activeSubMenuName={info.sub} isConfigured={hasConfig} visitorCount={visitorCount} />
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 pb-12">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
