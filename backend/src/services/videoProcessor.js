import Video from '../models/Video.js';
import { analyzeSensitivity } from './sensitivityAnalyzer.js';
import { getIO } from '../config/socket.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// ✅ Set FFmpeg paths (ESM-safe)
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// 🧩 Helper: log timestamped debug messages
const log = (...args) => console.log(`[${new Date().toLocaleTimeString()}]`, ...args);

// ✅ Helper: Download Cloudinary video temporarily for FFmpeg processing
const downloadVideo = async (url, videoId) => {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempPath = path.join(tempDir, `${videoId}.mp4`);
  const writer = fs.createWriteStream(tempPath);
  const response = await axios({ url, method: 'GET', responseType: 'stream' });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(tempPath));
    writer.on('error', reject);
  });
};

// ✅ Main processor
export const processVideo = async (videoId, userId) => {
  log('🟢 processVideo() called for', { videoId, userId });

  try {
    const video = await Video.findById(videoId);
    if (!video) throw new Error('Video not found');

    const io = getIO();
    const isRemote = video.path.startsWith('http');

    log('📂 Video document found:', {
      id: video._id,
      path: video.path,
      location: isRemote ? 'Cloudinary (remote)' : 'Local filesystem'
    });

    // ✅ Skip fs.existsSync() for remote URLs
    if (!isRemote && !fs.existsSync(video.path)) {
      throw new Error(`Video file not found at path: ${video.path}`);
    }

    // If Cloudinary video → download locally for FFmpeg
    let localPath = video.path;
    if (isRemote) {
      log('🌐 Downloading Cloudinary video for processing...');
      localPath = await downloadVideo(video.path, video._id);
      log('✅ Downloaded locally to', localPath);
    }

    // Update DB → Processing start
    video.status = 'processing';
    video.processingProgress = 0;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 0, status: 'processing' });

    // Step 1: FFprobe metadata
    log('🔍 Getting video info...');
    const videoInfo = await getVideoInfo(localPath);
    log('✅ Video info:', videoInfo);

    video.duration = videoInfo.duration;
    video.processingProgress = 20;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 20, status: 'processing' });

    // Step 2: Compression skipped
    log('⚙️ Skipping compression step...');
    video.processingProgress = 40;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 40, status: 'processing' });

    // Step 3: Thumbnail extraction
    log('🖼️ Extracting thumbnail...');
    await extractThumbnail(localPath, video._id);
    log('✅ Thumbnail created');

    video.processingProgress = 60;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 60, status: 'processing' });

    // Step 4: Sensitivity analysis
    log('🧠 Starting sensitivity analysis...');
    const sensitivityResult = await analyzeSensitivity(video);
    log('✅ Sensitivity analysis result:', sensitivityResult);

    video.processingProgress = 80;
    await video.save();
    io.emit(`video-progress-${userId}`, { videoId, progress: 80, status: 'processing' });

    // Step 5: Finalize
    video.status = 'completed';
    video.sensitivityStatus = sensitivityResult.status;
    video.flagReason = sensitivityResult.reason || '';
    video.processingProgress = 100;
    await video.save();

    io.emit(`video-complete-${userId}`, {
      videoId,
      status: 'completed',
      sensitivityStatus: video.sensitivityStatus,
      flagReason: video.flagReason,
      duration: video.duration
    });

    // ✅ Clean up temp file (if downloaded)
    if (isRemote && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      log('🧹 Temporary video file deleted:', localPath);
    }

    log(`✅ Video ${videoId} processed successfully!`);
  } catch (error) {
    log('❌ Error processing video:', error.message);
    try {
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        processingProgress: 0
      });
      const io = getIO();
      io.emit(`video-failed-${userId}`, { videoId, message: 'Video processing failed' });
    } catch (updateError) {
      log('⚠️ Error updating failed video status:', updateError.message);
    }
  }
};

// 🎥 Get video info with FFprobe
const getVideoInfo = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        log('❌ FFprobe error:', err.message);
        reject(new Error(`Failed to get video info: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        duration: metadata.format.duration,
        width: videoStream.width,
        height: videoStream.height,
        codec: videoStream.codec_name
      });
    });
  });
};

// 🖼️ Thumbnail extraction
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
        log('❌ FFmpeg error during thumbnail extraction:', err.message);
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
