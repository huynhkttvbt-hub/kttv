
export interface HydroData {
  id: number;
  Ngay: string; // YYYY-MM-DD
  MaTram: string;
  TenTram: string | null;
  TenDai: string | null;
  [key: string]: any; // Cho phép truy cập hourly columns 00h-23h và các cột extra
}

export interface StationMetadata {
  TenTram: string;
  TenDai: string;
}

export interface TBNNData {
  TenTram: string;
  Thang: number;
  Ky: string; // 'MONTH', 'T1', 'T2', 'T3'
  Htb: number | null;
  Hmax: number | null;
  Hmin: number | null;
  Rtb: number | null;
}

export interface FilterState {
  from: string;
  to: string;
  stationName: string;
  stationGroup: string;
}

export enum MenuType {
  KHI_TUONG = 'KHI_TUONG',
  THUY_VAN = 'THUY_VAN',
  MUA = 'MUA',
  PHU_QUY = 'PHU_QUY',
  HAI_VAN = 'HAI_VAN'
}

export enum SubMenuType {
  DAC_TRUNG = 'DAC_TRUNG',
  CHI_TIET = 'CHI_TIET',
  TONG_HOP = 'TONG_HOP',
  TONG_HOP_NGAY = 'TONG_HOP_NGAY', // Thêm mới
  KT_PHU_QUY = 'KT_PHU_QUY',
  TV_PHU_QUY = 'TV_PHU_QUY'
}

export const HOURLY_COLUMNS = [
  "00h", "01h", "02h", "03h", "04h", "05h", "06h", "07h", 
  "08h", "09h", "10h", "11h", "12h", "13h", "14h", "15h", 
  "16h", "17h", "18h", "19h", "20h", "21h", "22h", "23h"
];

export const EXTRA_COLUMNS = [
  "D1", "TgD1", "D2", "TgD2", "D3", "TgD3", 
  "C1", "TgC1", "C2", "TgC2", "C3", "TgC3",
  "Htb", "Hmax", "TgMax", "Hmin", "TgMin", 
  "R1", "R7", "R13", "R19", "R24"
];
