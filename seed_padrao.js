import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, addDoc } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);

const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "sindicatos"), where("nome", "==", "REGRAS GERAIS PADRÃO"));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, "sindicatos"), {
      nome: "REGRAS GERAIS PADRÃO",
      cnpj: "",
      codigo: "",
      validadeCCT: "",
      regiaoAtuacao: "Global",
      createdAt: Date.now()
    });
    console.log("Criado Sindicato Padrão com sucesso.");
  } else {
    console.log("Sindicato Padrão já existe.");
  }
}
run().then(() => process.exit(0)).catch(console.error);
