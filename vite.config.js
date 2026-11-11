import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { registerTelemetryAndMultiplayerRoutes } from './server/telemetry_orchestrator.js';

export default defineConfig({
  // Versão das texturas em /src/assets: muda a cada build para o cache do navegador não segurar
  // sprite antigo depois do deploy (src/assetVersion.js).
  define: {
    __ASSET_VERSION__: JSON.stringify(Date.now().toString(36))
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        preview: path.resolve(__dirname, 'preview.html')
      }
    }
  },
  plugins: [
    {
      name: 'bleach-generators-api',
      configureServer(server) {
        // Registra serviços de telemetria e orquestração multiplayer
        registerTelemetryAndMultiplayerRoutes(server);

        // Servir arquivos de staging estaticamente
        server.middlewares.use('/geradores/staging', (req, res, next) => {
          const filePath = path.resolve(__dirname, 'geradores/staging', req.url.replace(/^\//, ''));
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
            if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
            return fs.createReadStream(filePath).pipe(res);
          }
          next();
        });

        // 1. Listar personagens em staging
        server.middlewares.use('/api/staging/list', (req, res) => {
          const stagingDir = path.resolve(__dirname, 'geradores/staging');
          if (!fs.existsSync(stagingDir)) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ characters: [] }));
          }

          const entries = fs.readdirSync(stagingDir, { withFileTypes: true });
          const characters = [];

          for (const ent of entries) {
            if (ent.isDirectory()) {
              const manifestPath = path.join(stagingDir, ent.name, 'manifest.json');
              if (fs.existsSync(manifestPath)) {
                try {
                  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                  characters.push(manifest);
                } catch (e) {
                  console.error('Error reading manifest:', manifestPath, e);
                }
              }
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ characters }));
        });

        // 2. Reprocessar sprite com novos parâmetros
        server.middlewares.use('/api/staging/process', (req, res) => {
          if (req.method !== 'POST') return res.end();

          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const scriptPath = path.resolve(__dirname, 'geradores/sprite_processor.py');
              const py = '/Users/wjunior/.pyenv/versions/3.12.3/bin/python3';

              const args = [
                scriptPath,
                '--input', data.input,
                '--name', data.name,
                '--category', data.category || 'characters',
                '--tolerance', String(data.tolerance || 120),
                '--target-size', String(data.targetSize || 128)
              ];
              if (data.type) args.push('--type', data.type);

              execFile(py, args, (err, stdout, stderr) => {
                if (err) {
                  res.statusCode = 500;
                  return res.end(JSON.stringify({ error: stderr || err.message }));
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, stdout }));
              });
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });

        // 3. Aprovar e mover para src/assets e atualizar src/characters.js
        server.middlewares.use('/api/staging/approve', (req, res) => {
          if (req.method !== 'POST') return res.end();

          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const { name, category = 'characters' } = JSON.parse(body);
              const stagingDir = path.resolve(__dirname, 'geradores/staging', name);
              const targetDir = path.resolve(__dirname, 'src/assets', category, name);

              if (!fs.existsSync(stagingDir)) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: `Personagem ${name} não encontrado em staging.` }));
              }

              // Copiar arquivos para src/assets
              fs.mkdirSync(targetDir, { recursive: true });
              const files = fs.readdirSync(stagingDir);
              for (const f of files) {
                fs.copyFileSync(path.join(stagingDir, f), path.join(targetDir, f));
              }

              // Atualizar src/characters.js
              updateCharactersRegistry();

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, targetDir }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });
      }
    }
  ]
});

// Helper para sincronizar src/characters.js com os assets aprovados
function updateCharactersRegistry() {
  const charactersDir = path.resolve(__dirname, 'src/assets/characters');
  const monstersDir = path.resolve(__dirname, 'src/assets/monsters');

  const chars = {};
  if (fs.existsSync(charactersDir)) {
    for (const id of fs.readdirSync(charactersDir)) {
      const manifestPath = path.join(charactersDir, id, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          chars[id] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch (_) {}
      }
    }
  }

  const monsters = {};
  if (fs.existsSync(monstersDir)) {
    for (const id of fs.readdirSync(monstersDir)) {
      const manifestPath = path.join(monstersDir, id, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          monsters[id] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch (_) {}
      }
    }
  }

  const code = `// =======================================================================
// BLEACH: SOUL SURVIVOR - REGISTRO OFICIAL DE ASSETS E PERSONAGENS
// =======================================================================
// Este arquivo é atualizado automaticamente pelo gerador de sprites
// sempre que um novo personagem ou monstro é APROVADO via 360 Preview Studio.
// =======================================================================

export const PLAYABLE_CHARACTERS = ${JSON.stringify(chars, null, 2)};

export const MONSTERS_REGISTRY = ${JSON.stringify(monsters, null, 2)};
`;

  fs.writeFileSync(path.resolve(__dirname, 'src/characters.js'), code, 'utf-8');
  console.log('✅ src/characters.js sincronizado com sucesso.');
}
