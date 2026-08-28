import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function run() {
  const snap = await getDocs(collection(db, "checklistItems"));
  const items = [];
  snap.forEach(d => {
    items.push({ id: d.id, ...d.data() });
  });

  console.log("Total checklistItems:", items.length);
  const byType = {};
  items.forEach(i => {
    byType[i.type] = (byType[i.type] || 0) + 1;
  });
  console.log("By type:", byType);
}
run().then(() => process.exit(0)).catch(console.error);
