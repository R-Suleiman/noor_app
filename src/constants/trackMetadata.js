export const MAQAM_OPTIONS = [
  { value: "NAHWAND", label: "Nahwand" },
  { value: "AJAM", label: "Ajam" },
  { value: "BAYATI", label: "Bayyāt" },
  { value: "SIKAH", label: "Sikah" },
  { value: "RAST", label: "Rast" },
  { value: "SABA", label: "Saba" },
  { value: "HIJAZ", label: "Hijaz" },
  { value: "KURD", label: "Kurd" },
];

const MAQAM_LABELS = Object.fromEntries(MAQAM_OPTIONS.map(({ value, label }) => [value, label]));

export const maqamLabel = (value) => MAQAM_LABELS[value] || value;
