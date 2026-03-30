import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3001;

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image storage directory
const imagesDir = path.join(__dirname, 'generated-images');

// Create images directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Serve generated images as static files
app.use('/images', express.static(imagesDir));

// POST - Save a new generated image
app.post('/api/images', (req, res) => {
  try {
    const { data, voterType, timestamp } = req.body;

    if (!data || !voterType) {
      return res.status(400).json({ error: 'Missing required fields: data, voterType' });
    }

    // Generate filename with timestamp
    const date = new Date(timestamp);
    const dateString = date.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeString = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const filename = `caricature-${dateString}-${timeString}-${voterType}.png`;

    // Extract base64 data
    const base64Data = data.replace(/^data:image\/png;base64,/, '');
    const filepath = path.join(imagesDir, filename);

    // Write file to disk
    fs.writeFileSync(filepath, base64Data, 'base64');

    res.json({
      success: true,
      filename,
      url: `/images/${filename}`,
      voterType,
      timestamp
    });
  } catch (err) {
    console.error('Error saving image:', err);
    res.status(500).json({ error: 'Failed to save image', details: err.message });
  }
});

// GET - List all saved images
app.get('/api/images', (req, res) => {
  try {
    const files = fs.readdirSync(imagesDir);

    const images = files
      .filter(file => file.endsWith('.png'))
      .sort()
      .reverse()
      .slice(0, 20) // Keep only last 20
      .map(filename => {
        const filepath = path.join(imagesDir, filename);
        const stat = fs.statSync(filepath);
        
        // Extract voter type from filename
        let voterType = 'normal';
        if (filename.includes('-first-of-day')) voterType = 'first-of-day';
        else if (filename.includes('-first-time')) voterType = 'first-time';

        return {
          filename,
          url: `/images/${filename}`,
          voterType,
          timestamp: stat.mtime.toISOString(),
          size: stat.size
        };
      });

    res.json(images);
  } catch (err) {
    console.error('Error listing images:', err);
    res.status(500).json({ error: 'Failed to list images', details: err.message });
  }
});

// DELETE - Delete a specific image
app.delete('/api/images/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(imagesDir, filename);

    // Security check - prevent directory traversal
    if (!filepath.startsWith(imagesDir)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image', details: err.message });
  }
});

// DELETE - Clear all images
app.delete('/api/images', (req, res) => {
  try {
    const files = fs.readdirSync(imagesDir);
    let deleted = 0;

    files.forEach(file => {
      if (file.endsWith('.png')) {
        const filepath = path.join(imagesDir, file);
        fs.unlinkSync(filepath);
        deleted++;
      }
    });

    res.json({ success: true, deleted, message: `Deleted ${deleted} images` });
  } catch (err) {
    console.error('Error clearing images:', err);
    res.status(500).json({ error: 'Failed to clear images', details: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n✅ Image server running on http://localhost:${PORT}`);
  console.log(`📁 Images stored in: ${imagesDir}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`   POST   /api/images           - Save a new image`);
  console.log(`   GET    /api/images           - List all saved images`);
  console.log(`   DELETE /api/images/:filename - Delete specific image`);
  console.log(`   DELETE /api/images           - Clear all images`);
  console.log(`   GET    /api/health           - Health check\n`);
});
