const start = new Date('2024-01-10T00:00:00');
const end1 = new Date('2025-01-05T00:00:00');
const end2 = new Date('2025-02-04T00:00:00');

const calcAvosFeriasAbsoluto = (start, end) => {
  let temp = new Date(start);
  let meses = 0;
  while (temp < end) {
      let proximoMes = new Date(temp);
      proximoMes.setMonth(proximoMes.getMonth() + 1);
      if (proximoMes <= end) {
          meses++;
          temp = proximoMes;
      } else {
          let remainingMs = end.getTime() - temp.getTime();
          let remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24)) + 1; 
          if (remainingDays >= 15) meses++;
          break;
      }
  }
  return meses;
};

console.log(calcAvosFeriasAbsoluto(start, end1));
console.log(calcAvosFeriasAbsoluto(start, end2));
