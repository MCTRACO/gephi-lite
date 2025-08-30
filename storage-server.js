const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const STORAGE_DIR = path.join(__dirname, 'global-settings');

// Enable CORS for all origins (adjust as needed)
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for graph datasets

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch (error) {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

// Get settings for a specific key
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const filePath = path.join(STORAGE_DIR, `${key}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      res.json({ success: true, data: JSON.parse(data) });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({ success: true, data: null });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save settings for a specific key
app.post('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { data } = req.body;
    const filePath = path.join(STORAGE_DIR, `${key}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const files = await fs.readdir(STORAGE_DIR);
    const settings = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const key = file.replace('.json', '');
        const filePath = path.join(STORAGE_DIR, file);
        const data = await fs.readFile(filePath, 'utf8');
        settings[key] = JSON.parse(data);
      }
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error getting all settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset all settings
app.delete('/api/settings', async (req, res) => {
  try {
    const files = await fs.readdir(STORAGE_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(STORAGE_DIR, file));
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  await ensureStorageDir();
  app.listen(PORT, () => {
    console.log(`Settings storage server running on port ${PORT}`);
    console.log(`Storage directory: ${STORAGE_DIR}`);
  });
}

startServer().catch(console.error);
