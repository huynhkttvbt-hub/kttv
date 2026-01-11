
export interface HydroData {
  id: number;
  Ngay: string; // YYYY-MM-DD
  MaTram: string;
  TenTram: string | null;
  TenDai: string | null;
  [key: string]: any; 
}

export interface MeteoData {
  id: number;
  Ngay: string;
  MaTram: string;
  Tram: string | null;
  Dai: string | null;
  // Nhiệt độ
  T1h?: number; T4h?: number; T7h?: number; T10h?: number; T13h?: number; T16h?: number; T19h?: number; T22h?: number;
  NhietTB?: number; NhietTx?: number; NhietTn?: number;
  // Ẩm độ
  U1h?: number; U4h?: number; U7h?: number; U10h?: number; U13h?: number; U16h?: number; U19h?: number; U22h?: number;
  AmTB?: number; Umin?: number;
  // Khí áp
  Pt1h?: number; Pt4h?: number; Pt7h?: number; Pt10h?: number; Pt13h?: number; Pt16h?: number; Pt19h?: number; Pt22h?: number; PtTB?: number;
  Pb1h?: number; Pb4h?: number; Pb7h?: number; Pb10h?: number; Pb13h?: number; Pb16h?: number; Pb19h?: number; Pb22h?: number; PbTB?: number;
  // Gió Obs
  dd1h?: string; ff1h?: number;
  dd4h?: string; ff4h?: number;
  dd7h?: string; ff7h?: number;
  dd10h?: string; ff10h?: number;
  dd13h?: string; ff13h?: number;
  dd16h?: string; ff16h?: number;
  dd19h?: string; ff19h?: number;
  dd22h?: string; ff22h?: number;
  // Gió Mạnh (Max)
  Dmax1h?: string; Fmax1h?: number;
  Dmax7h?: string; Fmax7h?: number;
  Dmax13h?: string; Fmax13h?: number;
  Dmax19h?: string; Fmax19h?: number;
  // Mưa
  R1h?: number; R7h?: number; R13h?: number; R19h?: number; Mua24h?: number;
  R19_7?: number; R7_19?: number; "R7-19"?: number;
  // Hải văn (Mới)
  Tnuoc1h?: number; Tnuoc7h?: number; Tnuoc13h?: number; Tnuoc19h?: number;
  Hsong1h?: number; Hsong7h?: number; Hsong13h?: number; Hsong19h?: number;
  // Hiện tượng
  W1h?: number; W4h?: number; W7h?: number; W10h?: number; W13h?: number; W16h?: number; W19h?: number; W22h?: number;
  [key: string]: any;
}

export interface AlarmLevels {
  TenTram: string;
  BD1: number | null;
  BD2: number | null;
  BD3: number | null;
}

export interface StationMetadata {
  TenTram: string;
  TenDai: string;
}

export interface TBNNData {
  TenTram: string;
  Thang: number;
  Ky: string; 
  Htb: number | null;
  Hmax: number | null;
  Hmin: number | null;
  Rtb: number | null;
}

export interface MeteoStationSummary {
  TenTram: string;
  Ttb: number;
  Tx: number;
  NgayTx: string;
  Tn: number;
  NgayTn: string;
  RainSum: number;
  RainDays: number;
  RainMax: number;
  NgayRainMax: string;
  Utb: number;
  Umin: number;
  NgayUmin: string;
  TbnnTemp: number | null;
  TbnnRain: number | null;
  CompareTempDiff: number | null;
  CompareRainPerc: number | null;
  HasData: boolean;
}

export interface FilterState {
  from: string;
  to: string;
  stationName: string;
  stationGroup: string;
  factor?: MeteoFactor | MarineFactor;
}

export enum MeteoFactor {
  NHIET_AM = 'NHIET_AM',
  KHI_AP = 'KHI_AP',
  GIO = 'GIO',
  MUA = 'MUA',
  HIEN_TUONG = 'HIEN_TUONG'
}

export enum MarineFactor {
  NHIET_NUOC = 'NHIET_NUOC',
  SONG = 'SONG'
}

export enum MenuType {
  KHI_TUONG = 'KHI_TUONG',
  THUY_VAN = 'THUY_VAN',
  MUA = 'MUA',
  PHU_QUY = 'PHU_QUY',
  HAI_VAN = 'HAI_VAN',
  XU_THE = 'XU_THE'
}

export enum SubMenuType {
  DAC_TRUNG = 'DAC_TRUNG',
  CHI_TIET = 'CHI_TIET',
  TONG_HOP = 'TONG_HOP',
  TONG_HOP_NGAY = 'TONG_HOP_NGAY',
  TONG_HOP_NGAY_KT = 'TONG_HOP_NGAY_KT',
  KT_PHU_QUY = 'KT_PHU_QUY',
  TV_PHU_QUY = 'TV_PHU_QUY',
  Xuthe_Nhiet = 'Xuthe_Nhiet',
  Xuthe_Mua = 'Xuthe_Mua'
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
