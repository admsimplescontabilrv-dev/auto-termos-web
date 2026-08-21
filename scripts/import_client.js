import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function importCCTs(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (file.endsWith('.txt')) {
        const unionName = path.basename(file, '.txt');
        const filePath = path.join(folderPath, file);
        const textContent = fs.readFileSync(filePath, 'utf8');

        console.log(`Processando CCT: ${unionName}`);

        const sindicatosRef = collection(db, 'sindicatos');
        const q = query(sindicatosRef, where('nome', '==', unionName));
        const snapshot = await getDocs(q);

        let sindicatoId;
        if (snapshot.empty) {
          const newSindicatoRef = doc(sindicatosRef);
          await setDoc(newSindicatoRef, {
            nome: unionName,
            cnpj: "",
            codigo: "",
            createdAt: serverTimestamp(),
          });
          sindicatoId = newSindicatoRef.id;
          console.log(`  -> Sindicato não encontrado. Criado novo sindicato com ID: ${sindicatoId}`);
        } else {
          sindicatoId = snapshot.docs[0].id;
          console.log(`  -> Sindicato encontrado com ID: ${sindicatoId}`);
        }

        const cctRef = doc(db, 'sindicatos', sindicatoId, 'cct_textos', 'vigente');
        await setDoc(cctRef, {
          texto_puro: textContent,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        console.log(`  -> Texto da CCT salvo em sindicatos/${sindicatoId}/cct_textos/vigente`);
      }
    }
  } catch (error) {
    console.error("Erro durante a importação:", error);
    process.exit(1);
  }
}

const targetFolder = process.argv[2];
if (!targetFolder) {
  console.error("Por favor, informe o caminho da pasta com os arquivos .txt.");
  process.exit(1);
}

importCCTs(targetFolder).then(() => {
  console.log("Importação finalizada com sucesso!");
  process.exit(0);
});
