import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0268052290",
  appId: "1:445445483531:web:122cd94abb982a970eab0e",
  apiKey: "AIzaSyA6mN8aSdPR2y7gxvyc3pePY400LdCzt40",
  authDomain: "gen-lang-client-0268052290.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const empresasSnap = await getDocs(collection(db, "empresas"));
  const empresas = empresasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Encontradas ${empresas.length} empresas.`);

  const itemsFixos = [
    { nome: "ENVIAR RECIBO", tipo: "FOLHA" },
    { nome: "ENVIAR GUIA FGTS", tipo: "FOLHA" },
    { nome: "ENVIAR GUIA DCTF", tipo: "FOLHA" },
    { nome: "VERIFICAR ENVIO", tipo: "FOLHA" }
  ];

  for (const emp of empresas) {
    console.log(`Processando empresa: ${emp.nome}`);
    for (const item of itemsFixos) {
      await addDoc(collection(db, "calendarEvents"), {
        title: item.nome,
        date: Date.now(),
        empresaId: emp.id,
        empresaNome: emp.nome,
        type: 'RECORRENTE',
        isRecurrent: true,
        recurrentDay: 5,
        recurrentMonth: 0,
        recurrentRule: 'MONTHLY_EXACT',
        status: 'ATIVO',
        createdAt: Date.now()
      });
      console.log(`  - Adicionado: ${item.nome}`);
    }
  }

  console.log("Migração concluída!");
  process.exit(0);
}

run().catch(console.error);