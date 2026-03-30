# 📁 File System Image Storage Setup

## Overview

The caricature generator now stores generated images on the **local file system** instead of browser localStorage. This provides:

- ✅ **Persistent Storage** - Images survive browser restarts and upgrades
- ✅ **Larger Capacity** - No browser storage limits (limited by disk space instead)
- ✅ **Better Performance** - Files are smaller and loaded via URLs
- ✅ **Easy Access** - Images stored in organized folder structure
- ✅ **API-Driven** - RESTful API for managing images

---

## Directory Structure

```
caricature_maker/
├── server.js                    # Express backend for image management
├── generated-images/            # Folder where all images are stored
│   ├── caricature-2026-03-29-120530-normal.png
│   ├── caricature-2026-03-29-120615-first-of-day.png
│   └── ... (up to 20 images)
├── src/
│   ├── App.jsx                  # Updated to use API instead of localStorage
│   ├── SlideshowView.jsx        # Updated to load images from API
│   └── ...
└── package.json                 # Added express and cors dependencies
```

---

## How to Run

### Option 1: Separate Terminals (Recommended)

**Terminal 1 - Start the Image Server:**
```bash
cd /home/robert/lastfinalhope/lastfinalhope/caricature_maker
node server.js
```
Expected output:
```
✅ Image server running on http://localhost:3001
📁 Images stored in: .../caricature_maker/generated-images
```

**Terminal 2 - Start the Frontend Dev Server:**
```bash
cd /home/robert/lastfinalhope/lastfinalhope/caricature_maker
npm run dev
```
Expected output:
```
VITE v8.0.2 ready
➜ Local: http://localhost:5179/
```

### Option 2: Single Terminal (Simultaneous)

```bash
cd /home/robert/lastfinalhope/lastfinalhope/caricature_maker
npm run dev:all
```

This runs both servers in parallel (requires `&` background process support).

---

## API Endpoints

All endpoints use `http://localhost:3001/api/`:

### POST /images
**Save a new caricature image**

Request:
```json
{
  "data": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "voterType": "normal|first-of-day|first-time",
  "timestamp": "2026-03-29T12:05:30.000Z"
}
```

Response:
```json
{
  "success": true,
  "filename": "caricature-2026-03-29-120530-normal.png",
  "url": "/images/caricature-2026-03-29-120530-normal.png",
  "voterType": "normal",
  "timestamp": "2026-03-29T12:05:30.000Z"
}
```

### GET /images
**List all saved images (last 20)**

Response:
```json
[
  {
    "filename": "caricature-2026-03-29-120530-normal.png",
    "url": "/images/caricature-2026-03-29-120530-normal.png",
    "voterType": "normal",
    "timestamp": "2026-03-29T12:05:30.000Z",
    "size": 45321
  },
  ...
]
```

### DELETE /images/:filename
**Delete a specific image**

Example: `DELETE /images/caricature-2026-03-29-120530-normal.png`

Response:
```json
{
  "success": true,
  "message": "Image deleted"
}
```

### DELETE /images
**Clear all images**

Response:
```json
{
  "success": true,
  "deleted": 15,
  "message": "Deleted 15 images"
}
```

### GET /api/health
**Health check endpoint**

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-29T12:05:30.000Z"
}
```

---

## Image Naming Convention

Images are automatically named with this format:
```
caricature-YYYY-MM-DD-HHMMSS-VOTERTYPE.png
```

Example:
- `caricature-2026-03-29-120530-normal.png`
- `caricature-2026-03-29-121045-first-of-day.png`
- `caricature-2026-03-29-121200-first-time.png`

This ensures:
- Chronological ordering
- Voter type identification
- No filename conflicts

---

## How It Works

### Saving Flow
1. User generates a caricature
2. Frontend calls `POST /api/images` with base64 image data
3. Server receives request and writes PNG file to `generated-images/` folder
4. Server responds with filename and file URL
5. Frontend reloads gallery to update list

### Loading Flow
1. App starts and calls `GET /api/images`
2. Server scans `generated-images/` folder and returns last 20 images
3. Frontend populates slideshow with image metadata
4. When user views slideshow, images load from file URLs: `http://localhost:3001/images/filename.png`

---

## Storage Limit

- **Max saved images**: 20 (oldest images are removed)
- **Local disk storage**: Limited by available disk space
- **Single image size**: Typically 30-80KB per PNG

---

## Environment Variables

Currently uses hardcoded values. To make configurable, create a `.env` file:

```env
VITE_API_URL=http://localhost:3001
VITE_MAX_IMAGES=20
NODE_PORT=3001
```

Then update server.js and App.jsx to use these values.

---

## Troubleshooting

### Server won't start
```
Error: Cannot find module 'express'
```
**Solution**: Run `npm install`

### Images not saving
```
Error saving image: EACCES: permission denied
```
**Solution**: Check folder permissions: `chmod 755 generated-images/`

### CORS errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: Server already has CORS enabled. Check both servers are running.

### Ports already in use
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution**: Kill existing process: `lsof -ti:3001 | xargs kill -9`

---

## Production Deployment

For production, consider:

1. Using a persistent database instead of file system
2. Implementing proper user authentication
3. Adding file size validation and image compression
4. Setting up automated cleanup of old images
5. Using a CDN or cloud storage (AWS S3, Google Cloud Storage, etc.)
6. Implementing proper error handling and logging

---

## File Sizes

Typical file sizes per image:
- **High quality PNG**: 40-80 KB
- **JPEG (80% quality)**: 20-40 KB
- **WebP (80% quality)**: 15-30 KB

**20 images storage estimate**: 600 KB - 1.6 MB

---

## Feature Summary

| Feature | Browser localStorage | File System |
|---------|----------------------|-------------|
| Persistence | ❌ Cleared with cache | ✅ Permanent |
| Capacity | 5-10 MB limit | Unlimited (disk space) |
| Performance | Medium (base64 strings) | ✅ Fast (URLs) |
| Accessibility | Single browser/device | ✅ All devices |
| Organization | Not organized | ✅ Timestamped files |
| Backup | ❌ Not easy | ✅ Copy folder |
| API Access | ❌ No | ✅ Yes |

---

## Next Steps

✨ Future improvements:
- [ ] Add image compression on save
- [ ] Implement pagination for 20+ images
- [ ] Add image tagging/filtering
- [ ] Batch export (ZIP download)
- [ ] Image metadata (EXIF data)
- [ ] Cloud storage integration
- [ ] User accounts and multi-device sync
