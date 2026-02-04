
import React, { useState } from 'react';
import { MenuType, SubMenuType } from '../types';
import { APP_LOGO } from '../constants';
import { 
  CloudSun, 
  Droplets, 
  Waves, 
  CloudRain, 
  Anchor, 
  ChevronDown, 
  ChevronRight,
  Menu,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean; 
  activeMenu: MenuType;
  activeSubMenu: SubMenuType;
  onMenuSelect: (menu: MenuType, sub: SubMenuType) => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeMenu, activeSubMenu, onMenuSelect, onToggle }) => {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleExpand = (e: React.MouseEvent, menu: string) => {
    e.stopPropagation();
    if (!isOpen) {
      onToggle();
    }
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const MenuItem = ({ icon: Icon, label, type, subMenus }: any) => {
    const isExpanded = expandedMenus[type];
    const isActive = activeMenu === type;

    return (
      <div className="mb-1">
        <button
          onClick={(e) => {
            if (subMenus) {
              toggleExpand(e, type);
            } else {
              onMenuSelect(type, SubMenuType.CHI_TIET);
            }
          }}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 ${
            isActive && !subMenus 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
              : 'hover:bg-slate-50 text-slate-600 hover:text-blue-600'
          }`}
          title={!isOpen ? label : ''}
        >
          <div className="flex items-center gap-3">
            <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
              <Icon size={20} className={isActive && !subMenus ? 'text-white' : (isActive ? 'text-blue-600' : 'text-slate-400')} />
            </div>
            {isOpen && (
              <span className="text-[13px] font-bold whitespace-nowrap transition-all duration-300 origin-left animate-fadeIn">
                {label}
              </span>
            )}
          </div>
          {isOpen && subMenus && (
            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          )}
        </button>
        
        {isOpen && (
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'
          }`}>
            <div className="ml-9 flex flex-col gap-1 border-l-2 border-slate-100 pl-2">
              {subMenus?.map((sub: any) => (
                <button
                  key={sub.type}
                  onClick={() => onMenuSelect(type, sub.type)}
                  className={`w-full text-left py-1.5 px-3 text-[12px] font-medium rounded-lg transition-colors ${
                    activeMenu === type && activeSubMenu === sub.type
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      className={`fixed md:relative h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out z-50 shadow-sm ${
        isOpen ? 'w-[200px]' : 'w-[64px]'
      }`}
    >
      <div className="h-[70px] flex items-center px-4 border-b border-slate-50 overflow-hidden">
        <div className="flex items-center gap-2.5 shrink-0">
           <div className="scale-75 origin-left">
            {APP_LOGO}
           </div>
           {isOpen && (
             <div className="text-left leading-none whitespace-nowrap animate-fadeIn">
               <h1 className="text-[10px] font-black text-blue-900 tracking-tighter uppercase"></h1>
               <h2 className="text-[12px] font-black text-blue-600 tracking-widest uppercase">KTTV Lâm Đồng</h2>
             </div>
           )}
        </div>
      </div>

      <div className="px-3 py-3 border-b border-slate-50 flex justify-center md:justify-end">
        <button 
          onClick={onToggle}
          className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all active:scale-90"
          title={isOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
        >
           {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar overflow-x-hidden">
        <MenuItem 
          icon={CloudSun} 
          label="KHÍ TƯỢNG" 
          type={MenuType.KHI_TUONG}
          subMenus={[
            { label: 'Số liệu chi tiết', type: SubMenuType.CHI_TIET },
            { label: 'Tổng hợp ngày', type: SubMenuType.TONG_HOP_NGAY_KT },
            { label: 'Số liệu đặc trưng', type: SubMenuType.DAC_TRUNG },
            { label: 'Số liệu Nhiệt độ', type: SubMenuType.NHIET_DO },
            { label: 'Số liệu CLim KT', type: SubMenuType.CLIM }
          ]}
        />
        <MenuItem 
          icon={Droplets} 
          label="THUỶ VĂN" 
          type={MenuType.THUY_VAN}
          subMenus={[
            { label: 'Số liệu chi tiết', type: SubMenuType.CHI_TIET },
            { label: 'Tổng hợp ngày', type: SubMenuType.TONG_HOP_NGAY },
            { label: 'Tổng hợp đài', type: SubMenuType.TONG_HOP },
            { label: 'Đặc trưng tháng', type: SubMenuType.DAC_TRUNG }
          ]}
        />
        <MenuItem 
          icon={Waves} 
          label="HẢI VĂN" 
          type={MenuType.HAI_VAN} 
          subMenus={[
            { label: 'Số liệu chi tiết', type: SubMenuType.CHI_TIET }
          ]}
        />
        <MenuItem icon={CloudRain} label="MƯA" type={MenuType.MUA} />
        <MenuItem 
          icon={Anchor} 
          label="TRẠM PHÚ QUÝ" 
          type={MenuType.PHU_QUY}
          subMenus={[
            { label: 'Khí tượng', type: SubMenuType.KT_PHU_QUY },
            { label: 'Hải văn', type: SubMenuType.TV_PHU_QUY }
          ]}
        />
         <MenuItem 
          icon={Anchor} 
          label="DỰ BÁO XU THẾ" 
          type={MenuType.XU_THE}
          subMenus={[
            { label: 'Xu thế nhiệt độ', type: SubMenuType.Xuthe_Nhiet },
            { label: 'Xu thế mưa', type: SubMenuType.Xuthe_Mua }
          ]}
        />
      </div>

      {isOpen && (
        <div className="p-4 border-t border-slate-50 text-center animate-fadeIn">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2026 HUYNH KTTVLĐ</p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
