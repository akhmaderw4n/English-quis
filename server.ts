import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const STORE_FILE = path.join(DATA_DIR, 'quiz_store.json');

interface ServerStore {
  submissions: Record<string, any>;
  deletedSubmissionIds: Record<string, string>;
  settings: Record<string, any>;
  violations: Record<string, any>;
  updatedAt: string;
}

function createDefaultStore(): ServerStore {
  return {
    submissions: {},
    deletedSubmissionIds: {},
    settings: {},
    violations: {},
    updatedAt: new Date().toISOString(),
  };
}

function loadStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          submissions: parsed.submissions || {},
          deletedSubmissionIds: parsed.deletedSubmissionIds || {},
          settings: parsed.settings || {},
          violations: parsed.violations || {},
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Warning loading server store:', err);
  }
  return createDefaultStore();
}

let store: ServerStore = loadStore();

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    store.updatedAt = new Date().toISOString();
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err) {
    console.warn('Warning saving server store:', err);
  }
}

function normalizeNameKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/^\d{1,3}[\.\,\;\-\)\s\t]+/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeClassKey(cls: string): string {
  const raw = String(cls || '')
    .trim()
    .toUpperCase()
    .replace(/^KELAS[\s\-_:\.]*/i, '');
  const compact = raw.replace(/[\s\-_\.]/g, '');
  const match7 = compact.match(/^7([A-H])$/);
  if (match7) return `7${match7[1]}`;
  const matchRoman = compact.match(/^VII([A-H])$/);
  if (matchRoman) return `7${matchRoman[1]}`;
  return compact || '7A';
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Get full synchronized state
  app.get('/api/sync', (_req, res) => {
    const activeSubmissions = Object.values(store.submissions).filter(
      (s: any) => s && s.id && !store.deletedSubmissionIds[s.id]
    );
    activeSubmissions.sort(
      (a: any, b: any) =>
        new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );

    const activeViolations = Object.values(store.violations);
    activeViolations.sort(
      (a: any, b: any) =>
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );

    res.json({
      submissions: activeSubmissions,
      deletedSubmissionIds: Object.keys(store.deletedSubmissionIds),
      settings: store.settings,
      violations: activeViolations,
      updatedAt: store.updatedAt,
    });
  });

  // 2. Save single or batch submissions
  app.post('/api/sync/submissions', (req, res) => {
    const list = Array.isArray(req.body?.submissions)
      ? req.body.submissions
      : req.body?.submission
      ? [req.body.submission]
      : [];

    list.forEach((sub: any) => {
      if (!sub || !sub.id) return;
      const safeId = String(sub.id);
      store.submissions[safeId] = {
        ...sub,
        id: safeId,
        studentClass: normalizeClassKey(sub.studentClass),
      };
      delete store.deletedSubmissionIds[safeId];
    });

    saveStore();
    res.json({ ok: true, count: list.length });
  });

  // 3. Delete single or clear all submissions
  app.post('/api/sync/submissions/delete', (req, res) => {
    const { ids, clearAll } = req.body || {};
    const nowIso = new Date().toISOString();

    if (clearAll) {
      Object.keys(store.submissions).forEach((id) => {
        store.deletedSubmissionIds[id] = nowIso;
      });
      store.submissions = {};
    } else if (Array.isArray(ids)) {
      ids.forEach((id: string) => {
        if (!id) return;
        delete store.submissions[id];
        store.deletedSubmissionIds[id] = nowIso;
      });
    }

    saveStore();
    res.json({ ok: true });
  });

  // 4. Save or delete shared settings (studentRestrictions, questionBank, procedureText, dashboardBackground, app)
  app.post('/api/sync/settings', (req, res) => {
    const { docId, data, deleteDoc: shouldDelete } = req.body || {};
    if (!docId || typeof docId !== 'string') {
      res.status(400).json({ error: 'Invalid docId' });
      return;
    }

    if (shouldDelete) {
      delete store.settings[docId];
    } else if (data && typeof data === 'object') {
      store.settings[docId] = {
        ...(store.settings[docId] || {}),
        ...data,
        updatedAt: new Date().toISOString(),
      };
    }

    saveStore();
    res.json({ ok: true });
  });

  // 5. Violations management
  app.post('/api/sync/violations', (req, res) => {
    const { violation, updateStatus, deleteId, clearAll } = req.body || {};
    if (clearAll) {
      store.violations = {};
    } else if (deleteId) {
      delete store.violations[String(deleteId)];
    } else if (updateStatus && updateStatus.id) {
      const id = String(updateStatus.id);
      if (store.violations[id]) {
        store.violations[id] = {
          ...store.violations[id],
          status: updateStatus.status,
          ...(updateStatus.unlockedAt ? { unlockedAt: updateStatus.unlockedAt } : {}),
        };
      }
    } else if (violation && violation.id) {
      store.violations[String(violation.id)] = violation;
    }

    saveStore();
    res.json({ ok: true });
  });

  // 6. Non-destructive merge from client localStorage on startup (recovers any client-cached Class 7G data)
  app.post('/api/sync/merge-client', (req, res) => {
    const { submissions: clientSubs, studentRestrictions: clientRestrictions, settings: clientSettings } = req.body || {};
    let changed = false;

    if (Array.isArray(clientSubs)) {
      clientSubs.forEach((sub: any) => {
        if (!sub || !sub.id) return;
        const id = String(sub.id);
        if (store.deletedSubmissionIds[id]) return;
        if (!store.submissions[id]) {
          store.submissions[id] = {
            ...sub,
            id,
            studentClass: normalizeClassKey(sub.studentClass),
          };
          changed = true;
        }
      });
    }

    if (clientRestrictions && typeof clientRestrictions === 'object') {
      const existingSetting = store.settings['studentRestrictions'];
      let serverConfig: any = null;
      if (existingSetting && existingSetting.restrictionsJson) {
        try {
          serverConfig = JSON.parse(existingSetting.restrictionsJson);
        } catch {}
      }

      if (!serverConfig) {
        store.settings['studentRestrictions'] = {
          restrictionsJson: JSON.stringify(clientRestrictions),
          updatedAt: new Date().toISOString(),
        };
        changed = true;
      } else {
        // Merge registeredStudents from client into server if client has additional students (e.g., Class 7G)
        const serverRoster: any[] = Array.isArray(serverConfig.registeredStudents)
          ? serverConfig.registeredStudents
          : [];
        const clientRoster: any[] = Array.isArray(clientRestrictions.registeredStudents)
          ? clientRestrictions.registeredStudents
          : [];

        const map = new Map<string, any>();
        serverRoster.forEach((r) => {
          if (!r || !r.name) return;
          const key = `${normalizeClassKey(r.studentClass)}__${normalizeNameKey(r.name)}`;
          map.set(key, { ...r, studentClass: normalizeClassKey(r.studentClass) });
        });

        let rosterAdded = false;
        clientRoster.forEach((r) => {
          if (!r || !r.name) return;
          const key = `${normalizeClassKey(r.studentClass)}__${normalizeNameKey(r.name)}`;
          if (!map.has(key)) {
            map.set(key, { ...r, studentClass: normalizeClassKey(r.studentClass) });
            rosterAdded = true;
          }
        });

        // If client config is newer, also adopt scalar settings
        const clientTime = clientRestrictions.updatedAt ? new Date(clientRestrictions.updatedAt).getTime() : 0;
        const serverTime = serverConfig.updatedAt ? new Date(serverConfig.updatedAt).getTime() : 0;

        if (rosterAdded || clientTime > serverTime) {
          const mergedConfig = {
            ...(clientTime > serverTime ? { ...serverConfig, ...clientRestrictions } : { ...clientRestrictions, ...serverConfig }),
            registeredStudents: Array.from(map.values()),
            updatedAt: new Date().toISOString(),
          };
          store.settings['studentRestrictions'] = {
            restrictionsJson: JSON.stringify(mergedConfig),
            updatedAt: new Date().toISOString(),
          };
          changed = true;
        }
      }
    }

    if (clientSettings && typeof clientSettings === 'object') {
      Object.entries(clientSettings).forEach(([docId, val]) => {
        if (docId !== 'studentRestrictions' && val && !store.settings[docId]) {
          store.settings[docId] = val;
          changed = true;
        }
      });
    }

    if (changed) {
      saveStore();
    }

    res.json({ ok: true, changed });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
