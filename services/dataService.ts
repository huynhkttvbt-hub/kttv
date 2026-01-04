
import { supabase } from '../supabaseClient';
import { HydroData, MeteoData, FilterState, StationMetadata, TBNNData, AlarmLevels, HOURLY_COLUMNS } from '../types';

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
  return unique.sort((a, b) => a.TenTram.localeCompare(b.TenTram));
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
  return unique.sort((a, b) => a.TenTram.localeCompare(b.TenTram));
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

/**
 * CẢI TIẾN TOÀN DIỆN: Cập nhật an toàn với Schema-Aware
 */
export const updateHydroData = async (payload: { TenTram: string, TenDai: string, Ngay: string, column: string, value: string }): Promise<boolean> => {
  try {
    const { TenTram, TenDai, Ngay, column, value } = payload;
    
    // 1. Tìm bản ghi hiện tại - Thử PascalCase trước
    let { data: existing, error: findError } = await supabase
      .from('so_lieu_thuy_van')
      .select('*')
      .eq('TenTram', TenTram)
      .eq('Ngay', Ngay)
      .maybeSingle();

    // Nếu lỗi "Cột không tồn tại", thử tìm bằng lowercase
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
      // TRƯỜNG HỢP UPDATE: Chỉ cập nhật các phím đang tồn tại trong bản ghi
      const existingKeys = Object.keys(existing);
      
      // Tìm key chính xác cho cột cần update (ví dụ người dùng chọn 'Hmax' nhưng DB có 'hmax')
      const targetKey = existingKeys.find(k => k.toLowerCase() === column.toLowerCase()) || column;
      
      let updateObj: any = { [targetKey]: valNum };

      // Tính toán lại Hmax, Hmin, Htb dựa trên các phím giờ thực tế trong DB
      const hourlyKeysInDb = existingKeys.filter(k => 
        HOURLY_COLUMNS.map(hc => hc.toLowerCase()).includes(k.toLowerCase())
      );

      // Tạo một bản sao dữ liệu để tính toán cực trị
      const tempData = { ...existing, [targetKey]: valNum };
      const hourlyValues = hourlyKeysInDb
        .map(k => parseFloat(String(tempData[k] || '').replace(',', '.')))
        .filter(v => !isNaN(v));

      if (hourlyValues.length > 0) {
        const hMax = Math.max(...hourlyValues);
        const hMin = Math.min(...hourlyValues);
        const hTb = Math.round(hourlyValues.reduce((a, b) => a + b, 0) / hourlyValues.length);

        // Tìm phím đặc trưng tương ứng trong DB
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
      // TRƯỜNG HỢP INSERT: Nếu chưa có dữ liệu, tạo bản ghi mới (mặc định dùng Pascal cho an toàn nhất)
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
