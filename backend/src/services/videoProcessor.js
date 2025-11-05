import Video from '../models/Video.js';
import { analyzeSensitivity } from './sensitivityAnalyzer.js';
import { getIO } from '../config/socket.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStaticImport from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// 🧩 Detect actual ffmpeg-static export (ESM-safe)
const ffmpegStatic = typeof ffmpegStaticImport === 'object' ? ffmpegStaticImport.default : ffmpegStaticImport;

// ✅ Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// 🧠 Helper: timestamped logger
const log = (...args) => console.log(`[${new Date().toLocaleTimeString()}]`, ...args);

// ✅ Download Cloudinary video temporarily for FFmpeg
const downloadVideo = async (url, videoId) => {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `${videoId}.mp4`);
  const writer = fs.createWriteStream(tempPath);

  log('🌐 Downloading video stream from Cloudinary...');

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 120000 // 2 min safety
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      log('✅ Video downloaded to', tempPath);
      resolve(tempPath);
    });
    writer.on('error', (err) => {
      log('❌ Download stream error:', err.message);
      reject(err);
    });
  });
};

// 🎥 Get video info via ffprobe
const getVideoInfo = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        log('❌ FFprobe error:', err.message);
        return reject(new Error(`Failed to get video info: ${err.message}`));
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));

      resolve({
        duration: metadata.format.duration,
        width: videoStream.width,
        height: videoStream.height,
        codec: videoStream.codec_name
      });
    });
  });
};

// 🖼️ Thumbnail extraction via ffmpeg
const extractThumbnail = (videoPath, videoId) => {
  return new Promise((resolve, reject) => {
    const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });

    const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);
    log('🎞️ Starting FFmpeg thumbnail extraction:', { input: videoPath, output: thumbnailPath });

    ffmpeg(videoPath)
      .on('start', cmd => log('▶️ FFmpeg started:', cmd))
      .on('progress', p => log(`⏳ FFmpeg progress: frame=${p.frames}`))
      .on('end', () => {
        log(`✅ Thumbnail extracted: ${thumbnailPath}`);
        resolve(thumbnailPath);
      })
      .on('error', err => {
        log('❌ FFmpeg thumbnail error:', err.message);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: thumbnailDir,
        filename: `${videoId}.jpg`,
        timemarks: ['1']
      });
  });
};

// 🧩 Main Processor Function
export const processVideo = async (videoId, userId) => {
  log('🟢 processVideo() called for', { videoId, userId });

  try {
    const video = await Video.findById(videoId);
    if (!video) throw new Error('Video not found');

    const io = getIO();
    const isRemote = video.path.startsWith('http');

    log('📂 Video found:', {
      id: video._id,
      path: video.path,
      source: isRemote ? 'Cloudinary (remote)' : 'Local FS'
    });

    if (!isRemote && !fs.existsSync(video.path)) {
      throw new Error(`Video file not found at ${video.path}`);
    }

    let localPath = video.path;
    if (isRemote) {
      localPath = await downloadVideo(video.path, video._id);
    }

    // Update DB: Start processing
    video.status = 'processing';
    video.processingProgress = 0;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 0, status: 'processing' });

    // Step 1: Extract video metadata
    log('🔍 Getting video metadata...');
    const info = await getVideoInfo(localPath);
    log('✅ Video info:', info);

    video.duration = info.duration;
    video.processingProgress = 20;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 20 });

    // Step 2: Skip compression for now
    log('⚙️ Skipping compression step...');
    video.processingProgress = 40;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 40 });

    // Step 3: Generate thumbnail
    log('🖼️ Extracting thumbnail...');
    await extractThumbnail(localPath, video._id);
    video.processingProgress = 60;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 60 });

    // Step 4: Sensitivity analysis
    log('🧠 Running sensitivity analysis...');
    const result = await analyzeSensitivity(video);
    log('✅ Sensitivity result:', result);

    video.sensitivityStatus = result.status;
    video.flagReason = result.reason || '';
    video.processingProgress = 80;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 80 });

    // Step 5: Mark complete
    video.status = 'completed';
    video.processingProgress = 100;
    await video.save();

    io.emit(`video-complete-${userId}`, {
      videoId,
      status: 'completed',
      sensitivityStatus: video.sensitivityStatus,
      flagReason: video.flagReason,
      duration: video.duration
    });

    // Cleanup
    if (isRemote && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      log('🧹 Deleted temporary file:', localPath);
    }

    log(`✅ Video ${videoId} processed successfully!`);
  } catch (error) {
    log('❌ Error processing video:', error.message);
    console.error(error.stack);

    try {
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        processingProgress: 0
      });
      const io = getIO();
      io.emit(`video-failed-${userId}`, { videoId, message: error.message || 'Processing failed' });
    } catch (updateError) {
      log('⚠️ Failed to update video status:', updateError.message);
    }
  }
};
