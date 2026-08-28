import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function run() {
  const snap = await getDocs(collection(db, "calendarEvents"));
  const events = [];
  snap.forEach(d => {
    events.push({ id: d.id, ...d.data() });
  });
  console.log("Events targetTypes:");
  const byTarget = {};
  events.forEach(r => {
    const tt = r.targetType || 'NO_TARGET_TYPE';
    byTarget[tt] = (byTarget[tt] || 0) + 1;
  });
  console.log(byTarget);
  
  console.log("\nEvents without targetType specific to sindicato:");
  events.filter(e => e.targetType !== 'SPECIFIC_SINDICATO' && e.targetType !== 'SINDICATO').slice(0, 10).forEach(e => {
     console.log(`- ${e.title} (type: ${e.type}, targetType: ${e.targetType}, empresaId: ${e.empresaId})`);
  });
}
run().then(() => process.exit(0)).catch(console.error);
