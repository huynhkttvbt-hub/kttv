
import { supabase } from '../supabaseClient';
import { HydroData, MeteoData, ClimData, FilterState, StationMetadata, TBNNData, AlarmLevels, HOURLY_COLUMNS } from '../types';

// Helper to normalize keys to PascalCase if DB returns lowercase
const normalizeHydroData = (item: any): HydroData => {
  const result: any = { ...item };
  const keyMap: Record<string, string> = {
    'tentram': 'TenTram', 'tendai': 'TenDai', 'ngay': 'Ngay',
    'hmax': 'Hmax', 'hmin': 'Hmin', 'htb': 'Htb',
    'r1': 'R1', 'r7': 'R7', 'r13': 'R13', 'r19': 'R19', 'r24': 'R24'
  };
  Object.keys(item).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (keyMap[lowerKey]) result[keyMap[lowerKey]] = item[key];
  });
  return result as HydroData;
};

// Helper normalize MeteoData
const normalizeMeteoData = (item: any): MeteoData => {
  const result: any = { ...item };
  if (item.tram) result.Tram = item.tram;
  if (item.dai) result.Dai = item.dai;
  if (item.ngay) result.Ngay = item.ngay;
  if (item.matram) result.MaTram = item.matram;

  // Map các trường Hải văn (nếu DB trả về chữ thường)
  if (item.hnuoc1h !== undefined) result.Hnuoc1h = item.hnuoc1h;
  if (item.hnuoc7h !== undefined) result.Hnuoc7h = item.hnuoc7h;
  if (item.hnuoc13h !== undefined) result.Hnuoc13h = item.hnuoc13h;
  if (item.hnuoc19h !== undefined) result.Hnuoc19h = item.hnuoc19h;

  const uCols = ['U1h', 'U4h', 'U7h', 'U10h', 'U13h', 'U16h', 'U19h', 'U22h'];
  const uValues = uCols.map(col => {
     const rawVal = item[col] !== undefined ? item[col] : item[col.toLowerCase()];
     if (rawVal === null || rawVal === undefined || rawVal === '') return null;
     const val = Number(rawVal);
     return isNaN(val) ? null : val;
  }).filter(v => v !== null) as number[];

  if (uValues.length > 0) {
    result.Umin = Math.min(...uValues);
  } else {
    result.Umin = item.umin || item.Umin || null;
  }

  return result as MeteoData;
}

// Helper normalize ClimData
const normalizeClimData = (item: any): ClimData => {
  return {
    id: item.id,
    Dai: item.dai,
    Tram: item.tram || item.tentram,
    Ngay: item.ngay,
    Thang: item.thang,
    Ttb: item.nhiettb,
    Txtb: item.nhiettxtb,
    Tntb: item.nhiettntb,
    Tx: item.nhiettx,
    NgayTx: item.ngaynhiettx,
    Tn: item.nhiettn,
    NgayTn: item.ngaynhiettn,
    AmTb: item.amtb,
    Umin: item.un,
    NgayUmin: item.ngayun,
    BocHoi: item.bochoi,
    Nang: item.tongnang, // Map cột tổng nắng
    TongMua: item.tongluongmua,
    SoNgayMua: item.songaymua,
    Rx: item.muangaylonnhat,
    NgayRx: item.ngaymualonnhat
  };
};

export const fetchMetadata = async (): Promise<StationMetadata[]> => {
  let { data, error } = await supabase.from('so_lieu_thuy_van').select('TenTram, TenDai');
  if (error && error.code === '42703') {
     const res = await supabase.from('so_lieu_thuy_van').select('tentram, tendai');
     if (res.data) {
       data = res.data.map((d: any) => ({ TenTram: d.tentram, TenDai: d.tendai }));
       error = res.error;
     }
  }
  if (error) return [];
  const unique = Array.from(new Set((data || []).map((i: any) => JSON.stringify(i))))
    .map((s: string) => JSON.parse(s)) as StationMetadata[];
  return unique.sort((a, b) => (a.TenTram || '').localeCompare(b.TenTram || ''));
};

export const fetchMeteoMetadata = async (): Promise<StationMetadata[]> => {
  let { data, error } = await supabase.from('dulieu_khituong').select('Tram, Dai');
  if (error && error.code === '42703') {
     const res = await supabase.from('dulieu_khituong').select('tram, dai');
     if (res.data) {
       data = res.data.map((d: any) => ({ Tram: d.tram, Dai: d.dai }));
       error = res.error;
     }
  }
  if (error) return [];
  const unique = Array.from(new Set((data || []).map((i: any) => JSON.stringify({
    TenTram: i.Tram,
    TenDai: i.Dai
  })))).map((s: string) => JSON.parse(s)) as StationMetadata[];
  return unique.sort((a, b) => (a.TenTram || '').localeCompare(b.TenTram || ''));
};

export const fetchMarineData = async (from: string, to: string): Promise<MeteoData[]> => {
  const marineStations = ['48889', '48918', '48916', '48917', '48919'];
  const { data, error } = await supabase
    .from('dulieu_khituong')
    .select('*')
    .in('MaTram', marineStations)
    .gte('Ngay', from)
    .lte('Ngay', to)
    .order('Ngay', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeMeteoData);
};

export const fetchAlarmLevels = async (station: string): Promise<AlarmLevels | null> => {
  const { data, error } = await supabase.from('so_lieu_bao_dong').select('TenTram, BD1, BD2, BD3').eq('TenTram', station).maybeSingle();
  if (error && error.code === '42703') {
     const res = await supabase.from('so_lieu_bao_dong').select('tentram, bd1, bd2, bd3').eq('tentram', station).maybeSingle();
     if (res.data) return { TenTram: res.data.tentram, BD1: res.data.bd1, BD2: res.data.bd2, BD3: res.data.bd3 };
  }
  return data || null;
};

export const fetchHydroData = async (filters: FilterState): Promise<HydroData[]> => {
  if (!filters.stationName || !filters.from || !filters.to) return [];
  let { data, error } = await supabase.from('so_lieu_thuy_van').select('*').eq('TenTram', filters.stationName).gte('Ngay', filters.from).lte('Ngay', filters.to).order('Ngay', { ascending: true });
  if (error && error.code === '42703') {
     const res = await supabase.from('so_lieu_thuy_van').select('*').eq('tentram', filters.stationName).gte('ngay', filters.from).lte('ngay', filters.to).order('ngay', { ascending: true });
     data = res.data ? res.data.map(normalizeHydroData) : null;
     error = res.error;
  }
  if (error) throw error;
  return data || [];
};

export const fetchMeteoData = async (filters: FilterState): Promise<MeteoData[]> => {
  if (!filters.stationName || !filters.from || !filters.to) return [];
  let { data, error } = await supabase.from('dulieu_khituong').select('*').eq('Tram', filters.stationName).gte('Ngay', filters.from).lte('Ngay', filters.to).order('Ngay', { ascending: true });
  if (error) throw error;
  return data ? data.map(normalizeMeteoData) : [];
};

export const fetchMeteoDataByGroup = async (group: string, from: string, to: string, stationNames: string[] | null = null): Promise<MeteoData[]> => {
  let query = supabase.from('dulieu_khituong')
    .select('*')
    .gte('Ngay', from)
    .lte('Ngay', to);

  // Nếu có danh sách trạm cụ thể thì lọc theo list đó, ngược lại lọc theo tên Đài
  if (stationNames && stationNames.length > 0) {
    query = query.in('Tram', stationNames);
  } else if (group) {
    query = query.eq('Dai', group);
  }

  const { data, error } = await query.order('Ngay', { ascending: true });
  if (error) throw error;
  return data ? data.map(normalizeMeteoData) : [];
};

export const fetchClimData = async (group: string, month: number, year: number): Promise<ClimData[]> => {
  let query = supabase.from('climthang')
    .select('*')
    .eq('thang', month)
    .gte('ngay', `${year}-01-01`)
    .lte('ngay', `${year}-12-31`);

  if (group) {
    query = query.eq('dai', group);
  }

  const { data, error } = await query.order('tram', { ascending: true });
  if (error) throw error;
  return data ? data.map(normalizeClimData) : [];
};

export const fetchDailyData = async (date: string): Promise<HydroData[]> => {
  if (!date) return [];
  let { data, error } = await supabase.from('so_lieu_thuy_van').select('*').eq('Ngay', date).order('TenTram', { ascending: true });
  if (error && error.code === '42703') {
     const res = await supabase.from('so_lieu_thuy_van').select('*').eq('ngay', date).order('tentram', { ascending: true });
     data = res.data ? res.data.map(normalizeHydroData) : null;
     error = res.error;
  }
  return data || [];
};

export const fetchMeteoDailyData = async (date: string): Promise<MeteoData[]> => {
  if (!date) return [];
  let { data, error } = await supabase.from('dulieu_khituong').select('*').eq('Ngay', date).order('Tram', { ascending: true });
  if (error && error.code === '42703') {
     const res = await supabase.from('dulieu_khituong').select('*').eq('ngay', date).order('tram', { ascending: true });
     data = res.data ? res.data.map(normalizeMeteoData) : null;
     error = res.error;
  }
  if (error) throw error;
  return data ? data.map(normalizeMeteoData) : [];
};

export const fetchTBNN = async (station: string, month: number, period: string): Promise<TBNNData | null> => {
  let searchPeriod = (period === 'DAY' || period === 'WEEK') ? 'MONTH' : period;
  const { data, error } = await supabase.from('so_lieu_tbnn').select('*').eq('tentram', station).eq('thang', month).eq('ky', searchPeriod).maybeSingle();
  if (error || !data) return null;
  return { TenTram: data.tentram, Thang: data.thang, Ky: data.ky, Htb: data.htb, Hmax: data.hmax, Hmin: data.hmin, Rtb: data.rtb } as TBNNData;
};

// Hàm lấy chuỗi TBNN cho cả năm (phục vụ dự báo)
export const fetchTBNNSeries = async (station: string): Promise<TBNNData[]> => {
  const { data, error } = await supabase
    .from('so_lieu_tbnn')
    .select('*')
    .eq('tentram', station)
    .eq('ky', 'MONTH')
    .order('thang', { ascending: true });
  
  if (error) return [];
  return (data || []).map((d:any) => ({
    TenTram: d.tentram, 
    Thang: d.thang, 
    Ky: d.ky, 
    Htb: d.htb, 
    Rtb: d.rtb 
  } as TBNNData));
};

// Hàm sinh dữ liệu Dự báo (Forecast Generation)
// Thuật toán: Anomaly Persistence (Dị thường + Quán tính)
// T_forecast = TBNN + (CurrentDiff * DecayFactor^days)
export const generateForecastData = (
  lastDateStr: string, 
  lastVal: number, 
  tbnnValCurrentMonth: number, 
  tbnnData: TBNNData[],
  forecastDays: number = 10
): { date: string, value: number, isForecast: boolean }[] => {
  const predictions = [];
  const lastDate = new Date(lastDateStr);
  const currentDiff = lastVal - tbnnValCurrentMonth; // Độ lệch so với TBNN hiện tại
  
  // Hệ số suy giảm (Decay Factor): Độ lệch sẽ giảm dần về 0 (trở về TBNN)
  // 0.85 nghĩa là mỗi ngày độ lệch giảm đi 15%
  const decayFactor = 0.85; 

  for (let i = 1; i <= forecastDays; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i);
    const nextMonth = nextDate.getMonth() + 1;

    // Lấy TBNN của tháng tương ứng
    const tbnnItem = tbnnData.find(t => t.Thang === nextMonth);
    const baseVal = tbnnItem?.Htb || tbnnValCurrentMonth;

    // Tính giá trị dự báo
    const predDiff = currentDiff * Math.pow(decayFactor, i);
    const predVal = baseVal + predDiff;

    predictions.push({
      date: nextDate.toISOString().split('T')[0],
      value: Number(predVal.toFixed(1)),
      isForecast: true
    });
  }
  return predictions;
};

export const updateHydroData = async (payload: { TenTram: string, TenDai: string, Ngay: string, column: string, value: string }): Promise<boolean> => {
  try {
    const { TenTram, TenDai, Ngay, column, value } = payload;
    let { data: existing, error: findError } = await supabase
      .from('so_lieu_thuy_van')
      .select('*')
      .eq('TenTram', TenTram)
      .eq('Ngay', Ngay)
      .maybeSingle();

    if (findError && findError.code === '42703') {
      const res = await supabase
        .from('so_lieu_thuy_van')
        .select('*')
        .eq('tentram', TenTram)
        .eq('ngay', Ngay)
        .maybeSingle();
      existing = res.data;
    }

    const valNum = parseFloat(value.replace(',', '.'));
    if (isNaN(valNum)) throw new Error("Giá trị nhập vào không phải là số.");

    if (existing) {
      const existingKeys = Object.keys(existing);
      const targetKey = existingKeys.find(k => k.toLowerCase() === column.toLowerCase()) || column;
      let updateObj: any = { [targetKey]: valNum };
      const hourlyKeysInDb = existingKeys.filter(k => 
        HOURLY_COLUMNS.map(hc => hc.toLowerCase()).includes(k.toLowerCase())
      );
      const tempData = { ...existing, [targetKey]: valNum };
      const hourlyValues = hourlyKeysInDb
        .map(k => parseFloat(String(tempData[k] || '').replace(',', '.')))
        .filter(v => !isNaN(v));

      if (hourlyValues.length > 0) {
        const hMax = Math.max(...hourlyValues);
        const hMin = Math.min(...hourlyValues);
        const hTb = Math.round(hourlyValues.reduce((a, b) => a + b, 0) / hourlyValues.length);
        const kMax = existingKeys.find(k => k.toLowerCase() === 'hmax') || 'Hmax';
        const kMin = existingKeys.find(k => k.toLowerCase() === 'hmin') || 'Hmin';
        const kTb = existingKeys.find(k => k.toLowerCase() === 'htb') || 'Htb';
        updateObj[kMax] = hMax;
        updateObj[kMin] = hMin;
        updateObj[kTb] = hTb;
      }
      const { error: updErr } = await supabase
        .from('so_lieu_thuy_van')
        .update(updateObj)
        .eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      const insertObj: any = {
        TenTram, TenDai, Ngay,
        tentram: TenTram, tendai: TenDai, ngay: Ngay,
        [column]: valNum,
        [column.toLowerCase()]: valNum
      };
      const { error: insErr } = await supabase
        .from('so_lieu_thuy_van')
        .insert([insertObj]);
      if (insErr) throw insErr;
    }
    return true;
  } catch (err: any) {
    console.error("Lỗi updateHydroData:", err.message || err);
    throw new Error(err.message || "Lỗi không xác định khi lưu dữ liệu");
  }
};

export const trackVisit = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.from('app_stats').select('count').eq('counter_name', 'total_visits').maybeSingle();
    if (error) throw error;
    let newCount = (data?.count || 0) + 1;
    if (!data) {
      await supabase.from('app_stats').insert([{ counter_name: 'total_visits', count: 1 }]);
      return 1;
    } else {
      await supabase.from('app_stats').update({ count: newCount }).eq('counter_name', 'total_visits');
      return newCount;
    }
  } catch (e) { return 0; }
};
