import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';

// Set FFmpeg paths (Render-safe)
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

export const analyzeSensitivity = async (video) => {
  return new Promise((resolve, reject) => {
    const framesDir = path.join(process.cwd(), 'temp-frames');
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    const framePattern = path.join(framesDir, `${video._id}-%03d.png`);

    console.log(`[${new Date().toLocaleTimeString()}] ⚙️ Starting sensitivity analysis for ${video._id}`);

    // ✅ Optimized FFmpeg settings for Render
    ffmpeg(video.path)
      .inputOptions(['-t 3']) // Analyze only first 3 seconds (lightweight)
      .outputOptions([
        '-vf fps=0.25,scale=640:-1', // lower FPS + smaller resolution
        '-q:v 5' // lower quality (less memory usage)
      ])
      .output(framePattern)
      .on('start', cmd => console.log(`▶️ FFmpeg started: ${cmd}`))
      .on('stderr', line => console.log('FFmpeg stderr:', line))
      .on('end', async () => {
        try {
          const frames = fs.readdirSync(framesDir)
            .filter(f => f.startsWith(`${video._id}-`))
            .map(f => path.join(framesDir, f));

          console.log(`✅ Extracted ${frames.length} frames for analysis`);

          const result = await mockAIAnalysis(frames);

          // Cleanup
          for (const f of frames) {
            try { fs.unlinkSync(f); } catch {}
          }

          resolve(result);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', err => {
        console.error('❌ FFmpeg error during analysis:', err.message);
        reject(new Error(`Video analysis failed: ${err.message}`));
      })
      .run();
  });
};

// 🧠 Mock AI analysis (you can plug in real ML later)
const mockAIAnalysis = async (frames) => {
  await new Promise(res => setTimeout(res, Math.min(frames.length * 200, 2000)));

  let flagged = [];
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

// 🧩 Simulated frame analysis
const analyzeFrame = async (framePath, index) => {
  await new Promise(res => setTimeout(res, 50 + Math.random() * 100));
  const random = Math.random();
  if (random < 0.1) {
    const reasons = [
      'Violence detected', 'Adult content', 'Disturbing imagery', 'Hate symbols'
    ];
    return {
      flagged: true,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      confidence: 0.8 + Math.random() * 0.1,
      frameIndex: index
    };
  }
  return { flagged: false, confidence: 0.85 + Math.random() * 0.1, frameIndex: index };
};
