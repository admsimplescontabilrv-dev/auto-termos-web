const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

if (getApps().length === 0) {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf-8'));
  initializeApp({ projectId: firebaseConfig.projectId });
}
const db = getFirestore(undefined, "ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636");

async function importCCTs(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (file.endsWith('.txt')) {
        const unionName = path.basename(file, '.txt');
        const filePath = path.join(folderPath, file);
        const textContent = fs.readFileSync(filePath, 'utf8');

        console.log(`Processando CCT: ${unionName}`);

        const sindicatosRef = db.collection('sindicatos');
        const snapshot = await sindicatosRef.where('nome', '==', unionName).get();

        let sindicatoId;
        if (snapshot.empty) {
          const newSindicatoRef = sindicatosRef.doc();
          await newSindicatoRef.set({
            nome: unionName,
            cnpj: "",
            codigo: "",
            createdAt: FieldValue.serverTimestamp(),
          });
          sindicatoId = newSindicatoRef.id;
          console.log(`  -> Sindicato não encontrado. Criado novo sindicato com ID: ${sindicatoId}`);
        } else {
          sindicatoId = snapshot.docs[0].id;
          console.log(`  -> Sindicato encontrado com ID: ${sindicatoId}`);
        }

        const cctRef = db.collection('sindicatos').doc(sindicatoId).collection('cct_textos').doc('vigente');
        await cctRef.set({
          texto_puro: textContent,
          updatedAt: FieldValue.serverTimestamp()
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
  console.error("Exemplo de uso: node scripts/import_ccts.js ./caminho_dos_arquivos");
  process.exit(1);
}

importCCTs(targetFolder).then(() => {
  console.log("\\nImportação finalizada com sucesso!");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
