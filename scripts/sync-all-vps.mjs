import { Client } from 'ssh2';
import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VPS_PASS = 'MshrUfZrh09hWr#';

const BACKEND_VPS = '/app/backend';
const FRONTEND_VPS = '/app/frontend';
const BACKEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\backend';
const FRONTEND_LOCAL = 'C:\\Users\\adria\\OneDrive\\Documentos\\Área de Trabalho\\front-end';

// Source code patterns to include - ONLY source files
const INCLUDE_PATTERNS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'];
const EXCLUDE_PATTERNS = [
  'node_modules', 'dist/', '.git/', 'build/', 'uploads/', 
  'package-lock.json', '.bak', '.log', '.env',
  'coverage/', '.cache', '.tmp', '.tar', '.zip',
  'mongod.log', 'cert.pem', 'key.pem',
  'sdk-nodejs',  // big SDK, only check if needed
];

function isSourceFile(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  
  // Must have source extension
  if (!INCLUDE_PATTERNS.some(ext => filename.endsWith(ext))) return false;
  
  // Must not be in excluded dirs
  const fullPath = filePath.replace(/\\/g, '/');
  for (const excl of EXCLUDE_PATTERNS) {
    if (fullPath.includes(excl)) return false;
  }
  
  return true;
}

function md5(content) {
  return createHash('md5').update(content).digest('hex');
}

async function execCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('data', (d) => stdout += d.toString());
      stream.stderr.on('data', (d) => stderr += d.toString());
      stream.on('close', () => resolve({ stdout, stderr }));
    });
  });
}

function getAllLocalFiles(dir, basePath = dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(basePath, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || 
            entry.name === 'dist' || entry.name === 'build' || 
            entry.name === 'uploads' || entry.name === 'sdk-nodejs') continue;
        results.push(...getAllLocalFiles(fullPath, basePath));
      } else {
        if (isSourceFile(relPath)) {
          results.push(relPath);
        }
      }
    }
  } catch (e) {
    // Directory might not exist yet
  }
  return results;
}

async function main() {
  console.log('🔌 Conectando à VPS...\n');
  
  const conn = new Client();
  conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
    finish([VPS_PASS]);
  });

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect({
      host: '2.25.192.154', port: 22, username: 'root',
      password: VPS_PASS, readyTimeout: 15000, tryKeyboard: true,
    });
  });

  console.log('✅ Conectado!\n');

  try {
    const sftp = await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
    });

    const readVpsFile = (path) => new Promise((resolve, reject) => {
      sftp.readFile(path, (err, buf) => err ? reject(err) : resolve(buf));
    });

    const projects = [
      { name: 'BACKEND', vps: BACKEND_VPS, local: BACKEND_LOCAL, srcDirs: ['src'] },
      { name: 'FRONTEND', vps: FRONTEND_VPS, local: FRONTEND_LOCAL, srcDirs: ['components', 'hooks', 'services', 'src', 'utils', 'scripts', 'i18n'] },
    ];

    let totalFiles = 0;
    let diffFiles = 0;
    let newFiles = 0;
    let errorFiles = 0;
    const syncedFiles = [];

    for (const project of projects) {
      console.log(`\n=== 📁 ${project.name} ===\n`);

      // List all source files on VPS
      for (const srcDir of project.srcDirs) {
        const vpsDir = `${project.vps}/${srcDir}`;
        
        // Check if directory exists on VPS
        const checkDir = await execCmd(conn, `test -d ${vpsDir} && echo "EXISTS" || echo "NOT_FOUND"`);
        if (checkDir.stdout.trim() === 'NOT_FOUND') {
          console.log(`   ⚠️  ${srcDir}/ - não encontrado na VPS`);
          continue;
        }

        // Get all source files recursively from VPS
        const findCmd = `find ${vpsDir} -type f \\( ${INCLUDE_PATTERNS.map(p => `-name "*${p}"`).join(' -o ')} \\)`;
        const excludeCmds = EXCLUDE_PATTERNS.map(p => `-not -path "*/${p}*"`).join(' ');
        const vpsFilesCmd = `${findCmd} ${excludeCmds} 2>/dev/null | sort`;
        
        const vpsResult = await execCmd(conn, vpsFilesCmd);
        const vpsFiles = vpsResult.stdout.split('\n').filter(f => f.trim());
        
        console.log(`   📂 ${srcDir}/: ${vpsFiles.length} arquivos-fonte na VPS`);

        for (const vpsFullPath of vpsFiles) {
          totalFiles++;
          const relPath = vpsFullPath.replace(vpsDir + '/', '');
          const relFullPath = srcDir + '/' + relPath;
          const localPath = join(project.local, relFullPath);

          try {
            // Read VPS file content
            let vpsContent;
            try {
              vpsContent = await readVpsFile(vpsFullPath);
            } catch (e) {
              console.log(`   ❌ ${relFullPath} - erro ao ler da VPS: ${e.message}`);
              errorFiles++;
              continue;
            }

            const vpsHash = md5(vpsContent);

            // Check local file
            if (existsSync(localPath)) {
              const localContent = readFileSync(localPath);
              const localHash = md5(localContent);

              if (vpsHash !== localHash) {
                // Files differ - backup local and copy VPS version
                const bakPath = localPath + '.bak';
                writeFileSync(bakPath, localContent);
                writeFileSync(localPath, vpsContent);
                console.log(`   🔄 ${relFullPath} - ATUALIZADO (${localContent.length} → ${vpsContent.length} bytes)`);
                diffFiles++;
                syncedFiles.push({ file: relFullPath, project: project.name, action: 'updated' });
              }
              // else: files are identical, skip
            } else {
              // New file from VPS - create it locally
              const localDir = dirname(localPath);
              if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
              writeFileSync(localPath, vpsContent);
              console.log(`   🆕 ${relFullPath} - NOVO (${vpsContent.length} bytes)`);
              newFiles++;
              syncedFiles.push({ file: relFullPath, project: project.name, action: 'created' });
            }
          } catch (e) {
            console.log(`   ❌ ${relFullPath} - erro: ${e.message}`);
            errorFiles++;
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA SINCRONIZAÇÃO');
    console.log('='.repeat(60));
    console.log(`   Total de arquivos verificados: ${totalFiles}`);
    console.log(`   🔄 Arquivos atualizados (diferentes): ${diffFiles}`);
    console.log(`   🆕 Arquivos novos criados: ${newFiles}`);
    console.log(`   ❌ Erros: ${errorFiles}`);
    console.log(`   ✅ Arquivos idênticos: ${totalFiles - diffFiles - newFiles - errorFiles}`);

    if (syncedFiles.length > 0) {
      console.log('\n📋 Detalhes dos arquivos sincronizados:');
      for (const f of syncedFiles) {
        const icon = f.action === 'created' ? '🆕' : '🔄';
        console.log(`   ${icon} [${f.project}] ${f.file}`);
      }
    } else {
      console.log('\n✅ Nenhum arquivo precisou ser sincronizado - projetos já estão idênticos!');
    }

    sftp.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    conn.end();
    process.exit(0);
  }
}

main();
