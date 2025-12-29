import React from "react";

export const HOURLY_COLUMNS = [
  "00h",
  "01h",
  "02h",
  "03h",
  "04h",
  "05h",
  "06h",
  "07h",
  "08h",
  "09h",
  "10h",
  "11h",
  "12h",
  "13h",
  "14h",
  "15h",
  "16h",
  "17h",
  "18h",
  "19h",
  "20h",
  "21h",
  "22h",
  "23h",
];

export const EXTRA_COLUMNS = [
  "D1",
  "TgD1",
  "D2",
  "TgD2",
  "D3",
  "TgD3",
  "C1",
  "TgC1",
  "C2",
  "TgC2",
  "C3",
  "TgC3",
  "Htb",
  "Hmax",
  "TgMax",
  "Hmin",
  "TgMin",
  "R1",
  "R7",
  "R13",
  "R19",
  "R24",
];

export const APP_LOGO = (
  <svg
    className="w-12 h-12"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Nền cỏ */}
    <path
      d="M20 120C40 115 60 122 80 118C100 114 110 120 120 118"
      stroke="#84cc16"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* Cây bị nghiêng do gió */}
    <path
      d="M60 120C58 100 65 90 85 75"
      stroke="#b45309"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M70 95C85 90 95 85 105 88"
      stroke="#b45309"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="88" cy="74" r="4" fill="#84cc16" />
    <circle cx="106" cy="88" r="3" fill="#84cc16" />
    <circle cx="92" cy="95" r="3" fill="#84cc16" />

    {/* Biểu tượng gió */}
    <path
      d="M15 80H40C45 80 45 75 40 75"
      stroke="#000"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10 88H35C40 88 40 83 35 83"
      stroke="#000"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M18 96H43C48 96 48 91 43 91"
      stroke="#000"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Đám mây xám */}
    <path
      d="M40 50C40 35 55 25 75 25C95 25 105 35 105 50C115 50 125 60 125 75C125 90 110 100 95 100H45C30 100 15 90 15 75C15 60 25 50 40 50Z"
      fill="url(#cloudGradient)"
    />

    {/* Sét */}
    <path
      d="M35 65L25 95L40 90L35 120"
      stroke="#facc15"
      strokeWidth="3"
      fill="#facc15"
      strokeLinejoin="round"
    />
    <path
      d="M55 65L45 95L60 90L55 120"
      stroke="#facc15"
      strokeWidth="3"
      fill="#facc15"
      strokeLinejoin="round"
    />
    <path
      d="M75 65L65 95L80 90L75 120"
      stroke="#facc15"
      strokeWidth="3"
      fill="#facc15"
      strokeLinejoin="round"
    />

    {/* Giọt mưa */}
    <path
      d="M25 55Q25 65 22 62"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M35 50Q35 60 32 57"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M50 70Q50 80 47 77"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M70 75Q70 85 67 82"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M90 65Q90 75 87 72"
      stroke="#60a5fa"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <defs>
      <linearGradient
        id="cloudGradient"
        x1="15"
        y1="25"
        x2="125"
        y2="100"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
    </defs>
  </svg>
);

export const STATIONS = [
  "TV Tà Pao",
  "Đại Ninh",
  "Liên Khương",
  "Bảo Lộc",
  "Đà Lạt",
  "Cát Tiên",
];

export const PROVINCE_GROUPS = ["Lâm Đồng", "Đắk Lắk", "Gia Lai", "Kon Tum"];
