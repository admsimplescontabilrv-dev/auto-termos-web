import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function run() {
  const snap = await getDocs(collection(db, "checklistRules"));
  const rules = [];
  snap.forEach(doc => {
    rules.push({ id: doc.id, ...doc.data() });
  });
  console.log("Total rules:", rules.length);
  
  const targetAll = rules.filter(r => r.targetType === 'ALL');
  console.log("targetType === 'ALL':", targetAll.length);
  targetAll.slice(0, 10).forEach(r => {
    console.log(` - ${r.taskName || r.description} (type: ${r.type}, processType: ${r.processType})`);
  });

  const calendarSnap = await getDocs(collection(db, "calendarEvents"));
  const events = [];
  calendarSnap.forEach(doc => events.push(doc.data()));
  console.log("Total calendar events:", events.length);
}

run().then(() => process.exit(0)).catch(console.error);
