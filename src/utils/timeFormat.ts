export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase().replace(/h/g, ':').replace(/m/g, '').replace(/\s+/g, '');
  const isNegative = clean.startsWith('-');
  const unsigned = isNegative ? clean.slice(1) : clean;
  
  if (!unsigned.includes(':')) {
    const num = parseInt(unsigned, 10);
    return isNaN(num) ? 0 : (isNegative ? -num * 60 : num * 60);
  }
  
  const [hStr, mStr] = unsigned.split(':');
  const hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;
  const total = hours * 60 + minutes;
  return isNegative ? -total : total;
};

export const minutesToTime = (totalMinutes: number): string => {
  const sign = totalMinutes < 0 ? '-' : '';
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const formatMinutesToPdfTime = (totalMinutes: number): string => {
  const sign = totalMinutes < 0 ? '-' : '';
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `${sign}${hours}:${String(minutes).padStart(2, '0')}`;
};
