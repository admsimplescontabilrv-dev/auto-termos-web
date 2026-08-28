import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function run() {
  const snap = await getDocs(collection(db, "empresas"));
  const empresas = [];
  let countWithTemplate = 0;
  snap.forEach(d => {
    const data = d.data();
    empresas.push({ id: d.id, ...data });
    if (data.fechamentoTemplate) countWithTemplate++;
  });

  console.log("Total empresas:", empresas.length);
  console.log("With fechamentoTemplate:", countWithTemplate);
}
run().then(() => process.exit(0)).catch(console.error);
