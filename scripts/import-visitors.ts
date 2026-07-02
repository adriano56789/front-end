import fs from 'fs';
import path from 'path';
import mongoose, { Schema, Document, Model } from 'mongoose';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente se disponíveis
dotenv.config();

console.log('🚀 INICIANDO IMPORTAÇÃO DE VISITANTES PARA O MONGODB');

// Configurações de conexão (Tenta carregar do env, depois usa os padrões)
const DEFAULT_MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:adriano123@127.0.0.1:27017/api?authSource=admin';
const FALLBACK_MONGO_URI = 'mongodb://localhost:27017/livego';

// Definir Schema de Visitantes idêntico ao do server.ts
interface IVisitorModel extends Document {
  visitorId: string;
  visitedId: string;
  visitTimestamp: Date;
}

const VisitorSchema = new Schema<IVisitorModel>({
  visitorId: { type: String, required: true, index: true },
  visitedId: { type: String, required: true, index: true },
  visitTimestamp: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'visitors' // Nome exato da coleção
});

const VisitorModel: Model<IVisitorModel> = mongoose.models.Visitor || mongoose.model<IVisitorModel>('Visitor', VisitorSchema);

async function importVisitors() {
  let connectionUri = DEFAULT_MONGO_URI;
  
  try {
    console.log(`🔗 Conectando ao MongoDB em: ${connectionUri}...`);
    await mongoose.connect(connectionUri);
  } catch (error: any) {
    console.warn(`⚠️ Falha ao se conectar usando URI padrão: ${error.message}`);
    connectionUri = FALLBACK_MONGO_URI;
    try {
      console.log(`🔗 Tentando conexão alternativa: ${connectionUri}...`);
      await mongoose.connect(connectionUri);
    } catch (fallbackError: any) {
      console.error(`❌ Erro crítico: Não foi possível conectar ao MongoDB em nenhuma URI.`);
      console.error(fallbackError);
      process.exit(1);
    }
  }

  console.log('✅ Conexão estabelecida com sucesso!');

  // Determinar caminho do arquivo JSON de visitantes
  const rootDir = process.cwd();
  // Verificar caminhos comuns (tanto rodando de / como de /front-end)
  const pathsToTry = [
    path.join(rootDir, 'front-end', 'api.json', 'api.visitors.json'),
    path.join(rootDir, 'api.json', 'api.visitors.json'),
    path.join(rootDir, 'api.visitors.json')
  ];

  let visitorsJsonPath = '';
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      visitorsJsonPath = p;
      break;
    }
  }

  if (!visitorsJsonPath) {
    console.error(`❌ Arquivo api.visitors.json não foi encontrado. Tentativas fracassadas em:`);
    pathsToTry.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  console.log(`📂 Lendo registros de visitantes a partir de: ${visitorsJsonPath}`);

  try {
    const rawData = fs.readFileSync(visitorsJsonPath, 'utf-8');
    const visitorsArray = JSON.parse(rawData);

    if (!Array.isArray(visitorsArray)) {
      console.error('❌ Formato de arquivo inválido. O JSON deve ser um array de visitantes.');
      process.exit(1);
    }

    console.log(`📊 Encontrados ${visitorsArray.length} registros no arquivo JSON.`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const v of visitorsArray) {
      const { visitorId, visitedId, visitTimestamp } = v;

      if (!visitorId || !visitedId) {
        console.warn(`⚠️ Registro pulado por estar incompleto:`, v);
        skippedCount++;
        continue;
      }

      const timestampDate = visitTimestamp ? new Date(visitTimestamp) : new Date();

      // Verificar se este visitante específico no mesmo timestamp já existe no MongoDB para evitar duplicações
      const matchRangeStart = new Date(timestampDate.getTime() - 1000); // 1 segundo antes
      const matchRangeEnd = new Date(timestampDate.getTime() + 1000);   // 1 segundo depois

      const exists = await VisitorModel.findOne({
        visitorId,
        visitedId,
        visitTimestamp: {
          $gte: matchRangeStart,
          $lte: matchRangeEnd
        }
      });

      if (exists) {
        skippedCount++;
        continue;
      }

      // Inserir registro correspondendo perfeitamente ao formato real do aplicativo
      const newDoc = new VisitorModel({
        visitorId,
        visitedId,
        visitTimestamp: timestampDate
      });

      await newDoc.save();
      importedCount++;
    }

    console.log(`\n🎉 PROCESSO CONCLUÍDO COM SUCESSO!`);
    console.log(`📈 Registros novos importados para o banco: ${importedCount}`);
    console.log(`⏳ Registros pulados (já existentes ou duplicados): ${skippedCount}`);

  } catch (err: any) {
    console.error('❌ Ocorreu um erro durante a importação:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão com MongoDB finalizada.');
  }
}

importVisitors();
