import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, query } from "firebase/firestore";
import fs from "fs";

const configStr = fs.readFileSync("firebase-applet-config.json", "utf-8");
const config = JSON.parse(configStr);
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function run() {
  const evSnap = await getDocs(query(collection(db, 'calendarEvents')));
  const existingEvents = evSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const itemsFixosNomes = [
    "ENVIAR RECIBO",
    "ENVIAR GUIA FGTS",
    "ENVIAR GUIA DCTF",
    "VERIFICAR ENVIO"
  ];

  let deletedCount = 0;
  for (const event of existingEvents) {
    if (itemsFixosNomes.includes(event.title) && event.isRecurrent === true && event.type === 'RECORRENTE') {
      await deleteDoc(doc(db, 'calendarEvents', event.id));
      deletedCount++;
    }
  }

  console.log(`Deleted ${deletedCount} generated calendar events.`);
}
run().then(() => process.exit(0)).catch(console.error);
