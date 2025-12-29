
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
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  activeMenu: MenuType;
  activeSubMenu: SubMenuType;
  onMenuSelect: (menu: MenuType, sub: SubMenuType) => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeMenu, activeSubMenu, onMenuSelect, onToggle }) => {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    [MenuType.KHI_TUONG]: true,
    [MenuType.THUY_VAN]: true,
    [MenuType.PHU_QUY]: false
  });

  const toggleExpand = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const MenuItem = ({ icon: Icon, label, type, subMenus }: any) => {
    const isExpanded = expandedMenus[type];
    const isActive = activeMenu === type;

    return (
      <div className="mb-2">
        <button
          onClick={() => subMenus ? toggleExpand(type) : onMenuSelect(type, null as any)}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
            isActive && !subMenus ? 'bg-blue-50 text-blue-600 font-semibold' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
            {isOpen && <span className="text-sm font-medium">{label}</span>}
          </div>
          {isOpen && subMenus && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </button>
        
        {isOpen && subMenus && isExpanded && (
          <div className="ml-9 mt-1 space-y-1">
            {subMenus.map((sub: any) => (
              <button
                key={sub.type}
                onClick={() => onMenuSelect(type, sub.type)}
                className={`w-full text-left p-2 text-xs rounded-md transition-colors ${
                  activeMenu === type && activeSubMenu === sub.type
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out z-20`}>
      {/* Logo Section */}
      <div className="p-4 border-b border-slate-100 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
           {APP_LOGO}
           {isOpen && (
             <div className="text-center leading-tight">
               <h1 className="text-[10px] font-bold text-blue-900 tracking-tight">ĐÀI KHÍ TƯỢNG THUỶ VĂN</h1>
               <h2 className="text-[10px] font-bold text-blue-900 tracking-tight">TỈNH LÂM ĐỒNG</h2>
             </div>
           )}
        </div>
      </div>

      {/* Menu Container */}
      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <MenuItem 
          icon={CloudSun} 
          label="KHÍ TƯỢNG" 
          type={MenuType.KHI_TUONG}
          subMenus={[
            { label: 'Số liệu đặc trưng', type: SubMenuType.DAC_TRUNG },
            { label: 'Số liệu chi tiết', type: SubMenuType.CHI_TIET }
          ]}
        />
        <MenuItem 
          icon={Droplets} 
          label="THUỶ VĂN" 
          type={MenuType.THUY_VAN}
          subMenus={[
            { label: 'Tổng hợp theo ngày', type: SubMenuType.TONG_HOP_NGAY }, // Thêm menu này
            { label: 'Tổng hợp theo đài', type: SubMenuType.TONG_HOP },
            { label: 'Số liệu đặc trưng', type: SubMenuType.DAC_TRUNG },
            { label: 'Số liệu chi tiết', type: SubMenuType.CHI_TIET }
          ]}
        />
        <MenuItem 
          icon={Waves} 
          label="HẢI VĂN" 
          type={MenuType.HAI_VAN}
        />
        <MenuItem 
          icon={CloudRain} 
          label="MƯA" 
          type={MenuType.MUA}
        />
        <MenuItem 
          icon={Anchor} 
          label="TRẠM TĐ PHÚ QUÝ" 
          type={MenuType.PHU_QUY}
          subMenus={[
            { label: 'Số liệu Khí tượng', type: SubMenuType.KT_PHU_QUY },
            { label: 'Số liệu Hải văn', type: SubMenuType.TV_PHU_QUY }
          ]}
        />
      </div>

      {/* Collapse Trigger */}
      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
