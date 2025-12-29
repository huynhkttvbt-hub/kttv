
import { createClient } from '@supabase/supabase-js';

/**
 * Hàm lấy biến môi trường an toàn, kiểm tra cả import.meta.env và process.env
 */
const getEnv = (name: string): string | undefined => {
  try {
    // Thử lấy từ import.meta.env (Vite standard)
    if (typeof import.meta !== 'undefined') {
      const meta = import.meta as any;
      if (meta.env && meta.env[name]) {
        return meta.env[name];
      }
    }
    // Thử lấy từ process.env (đã được define trong vite.config.ts)
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as any)[name];
      if (val) return val;
    }
  } catch (e) {
    // Bỏ qua lỗi truy cập
  }
  return undefined;
};

// Sử dụng Key người dùng cung cấp làm giá trị mặc định nếu không có biến môi trường
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://spwahrmekpickgkeqtbd.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwd2Focm1la3BpY2tna2VxdGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTk1NDUsImV4cCI6MjA4MDc3NTU0NX0.mj2CA8G6L9NsqW786yzMhQx2_CbxRkIU1xnGRq6lkCc';

// Kiểm tra cấu hình đã đầy đủ chưa
export const isConfigured = () => {
  return !!supabaseUrl && 
         !!supabaseAnonKey && 
         supabaseUrl !== 'https://placeholder.supabase.co' && 
         !supabaseUrl.includes('your-project');
};

// Khởi tạo client.
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);
