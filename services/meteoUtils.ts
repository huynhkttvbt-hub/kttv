
/**
 * Bảng mã Hiện tượng hiện tại (WW - Present Weather)
 */
export const WW_CODES: Record<number, string> = {
  0: "Trời trong",
  1: "Mây",
  2: "Có mây",
  3: "Mây",
  4: "Khói",
  5: "Mù khô",
  6: "Bụi",
  10: "Mù nhẹ",
  13: "Chớp",
  14: "Mưa xa",
  17: "Dông",
  29: "Dông",
  18: "Tố",
  19: "Vòi rồng",
  20: "Mưa phùn",
  21: "Mưa",
  28: "Sương Mù",
  25: "Mưa rào",
  42: "Sương Mù",
  43: "Sương Mù",
  44: "Sương Mù",
  46: "Sương Mù",
  47: "Sương Mù",
  45: "Sương mù",
  60: "Mưa nhỏ",
  61: "Mưa vừa",
  63: "Mưa to",
  65: "Mưa mạnh",
  66: "Mưa mạnh",
  80: "Mưa rào",
  81: "Mưa rào ",
  82: "Mưa rào",
  91: "Dông",
  95: "Dông",
};

/**
 * Bảng mã Hiện tượng quá khứ (W1, W2 - Past Weather)
 * Chỉ từ 0 đến 9
 */
export const PAST_WEATHER_CODES: Record<number, string> = {
  0: "Ít mây",
  1: "Có mây",
  2: "Nhiều mây",
  3: "Bão bụi",
  4: "Sương mù",
  5: "Mưa phùn",
  6: "Mưa",
  7: "Tuyết",
  8: "Mưa rào",
  9: "Dông",
};

/**
 * Bảng mã quy ước độ cao sóng (Hsong)
 * Quy ước: Mã số -> Khoảng mét thực tế
 */
export const MARINE_WAVE_CODES: Record<number, string> = {
  0: "0.25",
  1: "0.75",
  2: "1.25",
  3: "1.75",
  4: "2.25",
  5: "2.75",
  6: "3.25",
  7: "3.75",
  8: "4.25",
  9: "4.75",

};

/**
 * Hàm chuyển đổi mã số sang tên hiện tượng
 * @param isPast Nếu true sẽ tra bảng W1, W2. Nếu false sẽ tra bảng WW.
 */
export const translateWeatherCode = (code: any, isPast: boolean = false): string => {
  if (code === null || code === undefined || code === '') return '-';
  const numericCode = Number(code);
  const dictionary = isPast ? PAST_WEATHER_CODES : WW_CODES;
  return dictionary[numericCode] || `${code}`;
};

/**
 * Hàm chuyển đổi mã độ cao sóng sang khoảng mét thực tế
 */
export const translateWaveCode = (code: any): string => {
  if (code === null || code === undefined || code === '') return '-';
  const numericCode = Number(code);
  return MARINE_WAVE_CODES[numericCode] || `${code}`;
};
