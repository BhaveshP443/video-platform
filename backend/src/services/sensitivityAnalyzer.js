import ffmpeg from 'fluent-ffmpeg';
import ffmpegStaticImport from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';

// ✅ Detect correct ESM export for ffmpeg-static
const ffmpegStatic =
  typeof ffmpegStaticImport === 'object'
    ? ffmpegStaticImport.default
    : ffmpegStaticImport;

// ✅ Configure ffmpeg paths (works on Railway)
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// 🧠 Helper log utility
const log = (...args) => console.log(`[${new Date().toLocaleTimeString()}]`, ...args);

/**
 * 🔍 Analyze a video for sensitive content (mock AI + ffmpeg frame extraction)
 * @param {Object} video - Video document from MongoDB
 * @returns {Promise<Object>} analysis result
 */
export const analyzeSensitivity = async (video) => {
  return new Promise((resolve, reject) => {
    const framesDir = path.join(process.cwd(), 'temp-frames');
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    // ✅ Use local downloaded file instead of Cloudinary URL
    const localPath = video.path.startsWith('http')
      ? path.join(process.cwd(), 'temp', `${video._id}.mp4`)
      : video.path;

    if (!fs.existsSync(localPath)) {
      const msg = `Local video file missing for analysis: ${localPath}`;
      log('❌', msg);
      return reject(new Error(msg));
    }

    const framePattern = path.join(framesDir, `${video._id}-%03d.png`);

    log(`⚙️ Starting sensitivity analysis for ${video._id}`);
    log('🎥 Using local file:', localPath);

    // ✅ Optimize ffmpeg for lightweight frame extraction
    ffmpeg(localPath)
      .inputOptions(['-t 2']) // only first 2 seconds
      .outputOptions([
        '-vf', 'fps=0.1,scale=320:-1', // very few low-res frames
        '-q:v', '10', // lower quality = less memory
        '-hide_banner'
      ])
      .output(framePattern)
      .on('start', cmd => log('▶️ FFmpeg started:', cmd))
      .on('stderr', line => line.includes('frame=') && log('⏳ FFmpeg:', line))
      .on('end', async () => {
        try {
          const frames = fs.readdirSync(framesDir)
            .filter(f => f.startsWith(`${video._id}-`))
            .map(f => path.join(framesDir, f));

          log(`✅ Extracted ${frames.length} frames for analysis`);

          // Simulated lightweight "AI" analysis
          const result = await mockAIAnalysis(frames);

          // Cleanup frames
          for (const f of frames) {
            try { fs.unlinkSync(f); } catch {}
          }

          log(`🧩 Analysis complete: ${result.status.toUpperCase()}`);
          resolve(result);
        } catch (err) {
          log('❌ Post-analysis error:', err.message);
          reject(err);
        }
      })
      .on('error', err => {
        log('❌ FFmpeg error during analysis:', err.message);
        reject(new Error(`Video analysis failed: ${err.message}`));
      })
      .run();
  });
};

/**
 * 🧠 Mock AI analysis
 * Simulates checking extracted frames for sensitive content
 */
const mockAIAnalysis = async (frames) => {
  await new Promise(res => setTimeout(res, Math.min(frames.length * 100, 2000)));

  const flagged = [];
  let safeScore = 0;

  for (let i = 0; i < frames.length; i++) {
    const analysis = await analyzeFrame(frames[i], i);
    if (analysis.flagged) flagged.push(analysis);
    else safeScore += analysis.confidence;
  }

  const avgSafe = safeScore / Math.max(frames.length - flagged.length, 1);
  const flagRatio = flagged.length / Math.max(frames.length, 1);

  if (flagRatio > 0.15) {
    return {
      status: 'flagged',
      reason: flagged[0]?.reason || 'Sensitive content detected',
      confidence: Math.max(...flagged.map(f => f.confidence)),
      details: { flaggedFrames: flagged.length, totalFrames: frames.length }
    };
  }

  return {
    status: 'safe',
    reason: '',
    confidence: avgSafe,
    details: { flaggedFrames: flagged.length, totalFrames: frames.length }
  };
};

/**
 * 🧩 Simulate analysis of a single frame
 */
const analyzeFrame = async (framePath, index) => {
  await new Promise(res => setTimeout(res, 50 + Math.random() * 100));
  const random = Math.random();
  if (random < 0.1) {
    const reasons = [
      'Violence detected',
      'Adult content',
      'Disturbing imagery',
      'Hate symbols'
    ];
    return {
      flagged: true,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      confidence: 0.8 + Math.random() * 0.1,
      frameIndex: index
    };
  }
  return {
    flagged: false,
    confidence: 0.85 + Math.random() * 0.1,
    frameIndex: index
  };
};
