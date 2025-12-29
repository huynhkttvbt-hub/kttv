
import { supabase } from '../supabaseClient';
import { HydroData, FilterState, StationMetadata, TBNNData } from '../types';

// Helper to normalize keys to PascalCase if DB returns lowercase
const normalizeHydroData = (item: any): HydroData => {
  const result: any = { ...item };
  
  // Mapping dictionary for lowercase -> PascalCase
  const keyMap: Record<string, string> = {
    'tentram': 'TenTram',
    'tendai': 'TenDai',
    'ngay': 'Ngay',
    'hmax': 'Hmax',
    'hmin': 'Hmin',
    'htb': 'Htb',
    'r1': 'R1',
    'r7': 'R7',
    'r13': 'R13',
    'r19': 'R19',
    'r24': 'R24'
  };

  Object.keys(item).forEach(key => {
    // Check exact matches for mapped keys
    const lowerKey = key.toLowerCase();
    // Nếu key trong DB là lowercase và khớp với map, gán giá trị vào key PascalCase
    if (keyMap[lowerKey]) {
        result[keyMap[lowerKey]] = item[key];
    }
  });

  return result as HydroData;
};

export const fetchMetadata = async (): Promise<StationMetadata[]> => {
  // Try PascalCase
  let { data, error } = await supabase
    .from('so_lieu_thuy_van')
    .select('TenTram, TenDai');

  // Fallback to lowercase if column error
  if (error && error.code === '42703') {
     const res = await supabase.from('so_lieu_thuy_van').select('tentram, tendai');
     if (res.data) {
       data = res.data.map((d: any) => ({
         TenTram: d.tentram,
         TenDai: d.tendai
       }));
       error = res.error;
     }
  }

  if (error) {
    console.error("Lỗi fetch metadata:", error.message || error);
    return [];
  }

  // Lọc unique trạm và đài
  const unique = Array.from(new Set((data || []).map((i: any) => JSON.stringify(i))))
    .map((s: string) => JSON.parse(s)) as StationMetadata[];
    
  return unique.sort((a, b) => a.TenTram.localeCompare(b.TenTram));
};

export const fetchHydroData = async (filters: FilterState): Promise<HydroData[]> => {
  if (!filters.stationName || !filters.from || !filters.to) return [];

  // Try PascalCase
  let { data, error } = await supabase
    .from('so_lieu_thuy_van')
    .select('*')
    .eq('TenTram', filters.stationName)
    .gte('Ngay', filters.from)
    .lte('Ngay', filters.to)
    .order('Ngay', { ascending: true });

  // Fallback to lowercase
  if (error && error.code === '42703') {
     const res = await supabase
      .from('so_lieu_thuy_van')
      .select('*')
      .eq('tentram', filters.stationName)
      .gte('ngay', filters.from)
      .lte('ngay', filters.to)
      .order('ngay', { ascending: true });
      
      data = res.data ? res.data.map(normalizeHydroData) : null;
      error = res.error;
  }

  if (error) throw error;
  return data || [];
};

/**
 * Lấy dữ liệu của TẤT CẢ các trạm trong 1 ngày cụ thể
 */
export const fetchDailyData = async (date: string): Promise<HydroData[]> => {
  if (!date) return []; // Sửa lỗi: Trả về mảng rỗng nếu không có ngày

  // Try PascalCase
  let { data, error } = await supabase
    .from('so_lieu_thuy_van')
    .select('*')
    .eq('Ngay', date)
    .order('TenTram', { ascending: true });

  // Fallback to lowercase if column error (42703)
  if (error && error.code === '42703') {
     const res = await supabase
      .from('so_lieu_thuy_van')
      .select('*')
      .eq('ngay', date)
      .order('tentram', { ascending: true });
      
     data = res.data ? res.data.map(normalizeHydroData) : null;
     error = res.error;
  }

  if (error) {
    // Log message rõ ràng thay vì [object Object]
    console.error("Lỗi fetch daily data:", error.message || JSON.stringify(error));
    return [];
  }
  return data || [];
};

/**
 * Lấy số liệu Trung Bình Nhiều Năm (TBNN) để so sánh
 */
export const fetchTBNN = async (station: string, month: number, period: string): Promise<TBNNData | null> => {
  // Logic map period: 'DAY' và 'WEEK' sẽ lấy dữ liệu TBNN của 'MONTH'
  let searchPeriod = period;
  if (period === 'DAY' || period === 'WEEK') {
    searchPeriod = 'MONTH'; 
  }

  // Sử dụng tên cột chữ thường (lowercase) vì Postgres tự động chuyển về thường khi tạo bảng không có quote
  const { data, error } = await supabase
    .from('so_lieu_tbnn')
    .select('*')
    .eq('tentram', station)
    .eq('thang', month)
    .eq('ky', searchPeriod)
    .maybeSingle();

  if (error) {
    // console.warn("[TBNN Error]", error);
    return null;
  }
  
  if (!data) return null;

  return {
    TenTram: data.tentram,
    Thang: data.thang,
    Ky: data.ky,
    Htb: data.htb,
    Hmax: data.hmax,
    Hmin: data.hmin,
    Rtb: data.rtb
  } as TBNNData;
};

export const updateHydroData = async (payload: any): Promise<boolean> => {
  const pascalPayload = { ...payload };
  const lowerPayload: any = {};
  Object.keys(payload).forEach(k => {
    lowerPayload[k.toLowerCase()] = payload[k];
  });

  // Try Pascal insert/update
  const { data: existing, error: findError } = await supabase
    .from('so_lieu_thuy_van')
    .select('id')
    .eq('TenTram', payload.TenTram)
    .eq('Ngay', payload.Ngay)
    .maybeSingle();
    
  // If Pascal failed with column error, try lowercase flow
  if (findError && findError.code === '42703') {
     const { data: existingLow } = await supabase
      .from('so_lieu_thuy_van')
      .select('id')
      .eq('tentram', lowerPayload.tentram)
      .eq('ngay', lowerPayload.ngay)
      .maybeSingle();

     if (existingLow) {
        const { error } = await supabase
          .from('so_lieu_thuy_van')
          .update(lowerPayload)
          .eq('id', existingLow.id);
        return !error;
     } else {
        const { error } = await supabase
          .from('so_lieu_thuy_van')
          .insert([lowerPayload]);
        return !error;
     }
  }

  if (existing) {
    const { error } = await supabase
      .from('so_lieu_thuy_van')
      .update(pascalPayload)
      .eq('id', existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from('so_lieu_thuy_van')
      .insert([pascalPayload]);
    return !error;
  }
};

export const trackVisit = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('app_stats')
      .select('count')
      .eq('counter_name', 'total_visits')
      .maybeSingle();

    if (error) throw error;

    let newCount = (data?.count || 0) + 1;

    if (!data) {
      await supabase.from('app_stats').insert([{ counter_name: 'total_visits', count: 1 }]);
      return 1;
    } else {
      await supabase
        .from('app_stats')
        .update({ count: newCount })
        .eq('counter_name', 'total_visits');
      return newCount;
    }
  } catch (e) {
    console.warn("Visitor counter error:", e);
    return 0;
  }
};
