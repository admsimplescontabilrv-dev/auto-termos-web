const admissao = new Date('2025-04-07T00:00:00');
const afastamento = new Date('2026-08-21T00:00:00');
const dataProjetada = new Date('2026-09-20T00:00:00');

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
          console.log(`Remaining days for end ${end}: ${remainingDays}`);
          if (remainingDays >= 15) meses++;
          break;
      }
  }
  return meses;
};

console.log('Base:', calcAvosFeriasAbsoluto(admissao, afastamento));
console.log('Proj:', calcAvosFeriasAbsoluto(admissao, dataProjetada));
