import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Video from '../models/Video.js';
import { authenticate } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import { upload } from '../middleware/upload.js';
import { processVideo } from '../services/videoProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Upload video
// router.post('/upload', authenticate, checkRole('editor', 'admin'), upload.single('video'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: 'No video file provided' });
//     }

//     const { title, description } = req.body;

//     if (!title) {
//       // Clean up uploaded file
//       fs.unlinkSync(req.file.path);
//       return res.status(400).json({ message: 'Title is required' });
//     }

//     const video = new Video({
//       title,
//       description: description || '',
//       filename: req.file.filename,
//       originalName: req.file.originalname,
//       path: req.file.path,
//       size: req.file.size,
//       mimeType: req.file.mimetype,
//       userId: req.user._id,
//       tenantId: req.user.tenantId,
//       status: 'processing'
//     });

//     await video.save();

//     // Start processing in background
//     processVideo(video._id, req.user._id.toString());

//     res.status(201).json({
//       message: 'Video uploaded successfully',
//       video: {
//         id: video._id,
//         title: video.title,
//         status: video.status,
//         sensitivityStatus: video.sensitivityStatus
//       }
//     });
//   } catch (error) {
//     console.error('Upload error:', error);
    
//     // Clean up file if it was uploaded
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
    
//     res.status(500).json({ message: 'Error uploading video', error: error.message });
//   }
// });

router.post('/upload', authenticate, checkRole('editor', 'admin'), upload.single('video'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const video = new Video({
      title,
      description: description || '',
      cloudinaryId: req.file.filename, // optional reference ID
      path: req.file.path,             // ✅ Cloudinary URL
      mimeType: req.file.mimetype,
      size: req.file.size || 0,
      userId: req.user._id,
      tenantId: req.user.tenantId,
      status: 'processing',
    });

    await video.save();

    processVideo(video._id, req.user._id.toString());

    res.status(201).json({
      message: 'Video uploaded successfully',
      video,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading video', error: error.message });
  }
});


// Get all videos for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, sensitivityStatus } = req.query;
    
    const query = {
      userId: req.user._id,
      tenantId: req.user.tenantId
    };

    if (status) query.status = status;
    if (sensitivityStatus) query.sensitivityStatus = sensitivityStatus;

    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .select('-path');

    res.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos', error: error.message });
  }
});

// Get single video
router.get('/:id', authenticate, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user._id,
      tenantId: req.user.tenantId
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json({ video });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ message: 'Error fetching video', error: error.message });
  }
});

// Stream video with range request support


// router.get('/:id/stream', authenticate, async (req, res) => {
//   try {
//     const video = await Video.findOne({
//       _id: req.params.id,
//       userId: req.user._id,
//       tenantId: req.user.tenantId
//     });

//     if (!video) {
//       return res.status(404).json({ message: 'Video not found' });
//     }

//     if (video.status !== 'completed') {
//       return res.status(400).json({ message: 'Video is still processing' });
//     }

//     const videoPath = video.path;
//     if (!fs.existsSync(videoPath)) {
//       return res.status(404).json({ message: 'Video file missing on server' });
//     }

//     const stat = fs.statSync(videoPath);
//     const fileSize = stat.size;
//     const range = req.headers.range;

//     console.log('🎬 Stream request', { range });

//     if (range) {
//       const parts = range.replace(/bytes=/, '').split('-');
//       const start = parseInt(parts[0], 10);
//       const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

//       if (start >= fileSize || end >= fileSize) {
//         res.status(416).send('Requested range not satisfiable');
//         return;
//       }

//       const chunksize = end - start + 1;
//       const file = fs.createReadStream(videoPath, { start, end });

//       const head = {
//         'Content-Range': `bytes ${start}-${end}/${fileSize}`,
//         'Accept-Ranges': 'bytes',
//         'Content-Length': chunksize,
//         'Content-Type': video.mimeType || 'video/mp4'
//       };

//       res.writeHead(206, head);
//       file.pipe(res);
//       file.on('error', err => {
//         console.error('❌ Stream file error:', err);
//         res.end();
//       });
//     } else {
//       console.log('📡 No range header — sending full file');
//       res.writeHead(200, {
//         'Content-Length': fileSize,
//         'Content-Type': video.mimeType || 'video/mp4'
//       });
//       fs.createReadStream(videoPath).pipe(res);
//     }
//   } catch (err) {
//     console.error('❌ Stream route error:', err);
//     res.status(500).json({ message: 'Internal server error', error: err.message });
//   }
// });

import fetch from 'node-fetch'; // if not installed → npm install node-fetch

router.get('/:id/stream', authenticate, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user._id,
      tenantId: req.user.tenantId
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.status !== 'completed') {
      return res.status(400).json({ message: 'Video is still processing' });
    }

    // ✅ Cloudinary video (remote URL)
    if (video.path.startsWith('http')) {
      console.log('🌐 Streaming video from Cloudinary...');
      const response = await fetch(video.path);

      if (!response.ok) {
        return res.status(404).json({ message: 'Unable to fetch video from Cloudinary' });
      }

      // forward headers so browser knows it's a video
      res.setHeader('Content-Type', video.mimeType || 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');

      // pipe Cloudinary stream to client
      response.body.pipe(res);
      return;
    }

    // ✅ Local file (legacy mode)
    const videoPath = video.path;
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Local video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mimeType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType,
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ message: 'Error streaming video', error: error.message });
  }
});


// Delete video
router.delete('/:id', authenticate, checkRole('editor', 'admin'), async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.id,
      userId: req.user._id,
      tenantId: req.user.tenantId
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(video.path)) {
      fs.unlinkSync(video.path);
    }

    // Delete from database
    await Video.deleteOne({ _id: video._id });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Error deleting video', error: error.message });
  }
});

export default router;