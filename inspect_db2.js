import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function run() {
  const snap = await getDocs(collection(db, "checklistRules"));
  const rules = [];
  snap.forEach(d => {
    rules.push({ id: d.id, ...d.data() });
  });
  console.log("Rules targetTypes:");
  const byTarget = {};
  rules.forEach(r => {
    byTarget[r.targetType] = (byTarget[r.targetType] || 0) + 1;
  });
  console.log(byTarget);

  console.log("\nGLOBAL rules:");
  rules.filter(r => r.targetType === 'GLOBAL' || !r.targetType).forEach(r => console.log(r.taskName, r.targetType));
  
  console.log("\nALL rules:");
  rules.filter(r => r.targetType === 'ALL').forEach(r => console.log(r.taskName, r.targetType));

  console.log("\nEMPRESA rules (targetType === 'SPECIFIC_EMPRESA' or 'EMPRESA'):");
  rules.filter(r => r.targetType === 'SPECIFIC_EMPRESA' || r.targetType === 'EMPRESA').slice(0,5).forEach(r => console.log(r.taskName, r.targetType));

}
run().then(() => process.exit(0)).catch(console.error);
