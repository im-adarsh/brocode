import express from 'express';
import chokidar from 'chokidar';
import { parseArtifact } from './parse-artifacts.js';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3847;
let brocodePath = null;
let currentArtifacts = {};
let watchers = [];

// Middleware
app.use(express.json());
app.use(express.static('ui'));

// Detect .brocode directory from environment or default
brocodePath = process.env.BROCODE_PATH || process.cwd();

// API: Get current artifacts
app.get('/api/artifacts', (req, res) => {
  res.json(currentArtifacts);
});

// API: Select choice (callback handler)
app.post('/api/select', (req, res) => {
  const { artifact, choice, selectedBy } = req.query;

  if (!artifact || !choice) {
    return res.status(400).json({ error: 'Missing artifact or choice' });
  }

  const runId = path.basename(brocodePath);
  const choiceFile = path.join(brocodePath, 'browser-choice.json');

  const choiceData = {
    artifact,
    choice,
    timestamp: new Date().toISOString(),
    selectedBy: selectedBy || 'user'
  };

  fs.writeFileSync(choiceFile, JSON.stringify(choiceData, null, 2));
  console.log(`[choice] ${artifact} → ${choice} (${choiceFile})`);

  broadcastToClients({
    type: 'choice_recorded',
    artifact,
    choice,
    timestamp: choiceData.timestamp
  });

  res.json({ status: 'recorded', choiceFile });
});

// WebSocket: Broadcast artifact updates
wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  ws.send(JSON.stringify({ type: 'init', artifacts: currentArtifacts }));

  ws.on('close', () => {
    console.log('[ws] Client disconnected');
  });
});

function broadcastToClients(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// File watcher: Monitor .brocode/<id>/ for artifact changes
function startWatcher(brocodePath) {
  const artifactPatterns = [
    path.join(brocodePath, 'product-spec.md'),
    path.join(brocodePath, 'implementation-options.md'),
    path.join(brocodePath, 'engineering-spec.md')
  ];

  const watcher = chokidar.watch(artifactPatterns, {
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300 }
  });

  watcher.on('change', (filePath) => {
    console.log(`[watch] ${path.basename(filePath)} changed`);
    const artifact = parseArtifact(filePath);
    if (artifact) {
      currentArtifacts[artifact.type] = artifact;
      broadcastToClients({
        type: 'artifact_updated',
        artifact: artifact.type,
        data: artifact
      });
    }
  });

  watchers.push(watcher);
}

// Start server
function start() {
  startWatcher(brocodePath);

  server.listen(PORT, () => {
    console.log(`[ready] Browser companion at http://localhost:${PORT}`);
    console.log(`[ready] Watching: ${brocodePath}`);
  });

  process.on('SIGINT', () => {
    console.log('[shutdown] Closing...');
    watchers.forEach(w => w.close());
    wss.close();
    server.close();
    process.exit(0);
  });
}

start();
