import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';

// ✅ Configure FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Analyze a video's “sensitivity”.
 * Works with both local files and Cloudinary URLs.
 */
export const analyzeSensitivity = async (video) => {
  return new Promise((resolve, reject) => {
    const isRemote = video.path.startsWith('http');
    const framesDir = path.join(process.cwd(), 'temp-frames');

    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    const framePattern = path.join(framesDir, `${video._id}-%03d.png`);

    // 🎞️ Faster FFmpeg extraction:
    //   • first 6 seconds only
    //   • 1 frame every 2 seconds (fps=0.5)
    ffmpeg(video.path)
      .inputOptions(['-t', '6'])
      .outputOptions(['-vf', 'fps=0.5', '-q:v', '2'])
      .output(framePattern)
      .on('start', cmd => console.log(`▶️ FFmpeg started: ${cmd}`))
      .on('progress', p => process.stdout.write(`⏳ ${p.frames} frames extracted\r`))
      .on('end', async () => {
        try {
          const frames = fs.readdirSync(framesDir)
            .filter(f => f.startsWith(`${video._id}-`))
            .map(f => path.join(framesDir, f));

          console.log(`\n✅ Extracted ${frames.length} frames for ${video._id}`);

          const analysisResult = await mockAIAnalysis(frames);

          // 🧹 Clean up temporary frames
          for (const f of frames) {
            try { fs.unlinkSync(f); } catch { /* ignore */ }
          }

          resolve(analysisResult);
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

/**
 * 🧠 Mock “AI” frame-by-frame sensitivity check
 *   (Simulates real ML behaviour but runs fast)
 */
const mockAIAnalysis = async (frames) => {
  // Simulate ~1 second total delay, regardless of frame count
  await new Promise(r => setTimeout(r, 1000));

  const flagged = [];
  let safeScore = 0;

  for (let i = 0; i < frames.length; i++) {
    const result = await analyzeFrame(frames[i], i);
    if (result.flagged) flagged.push(result);
    else safeScore += result.confidence;
  }

  const avgSafe = safeScore / Math.max(frames.length - flagged.length, 1);
  const flagThreshold = 0.15; // 15 % frames flagged → “flagged” video

  if (flagged.length / frames.length > flagThreshold) {
    return {
      status: 'flagged',
      reason: flagged[0]?.reason || 'Sensitive content detected',
      confidence: Math.max(...flagged.map(f => f.confidence)),
      details: {
        flaggedFrames: flagged.length,
        totalFrames: frames.length,
        flagPercentage: ((flagged.length / frames.length) * 100).toFixed(1)
      }
    };
  }

  return {
    status: 'safe',
    reason: '',
    confidence: avgSafe,
    details: {
      flaggedFrames: flagged.length,
      totalFrames: frames.length,
      safePercentage: (((frames.length - flagged.length) / frames.length) * 100).toFixed(1)
    }
  };
};

/**
 * 🔍 Simulated frame inspection
 */
const analyzeFrame = async (framePath, index) => {
  await new Promise(r => setTimeout(r, 60 + Math.random() * 100)); // small delay
  const rnd = Math.random();
  const timeBias = index / 10;

  if (rnd < 0.1 + timeBias * 0.1) {
    const reasons = [
      'Violence detected',
      'Inappropriate gesture',
      'Adult content',
      'Hate symbol',
      'Explicit language',
      'Disturbing imagery'
    ];
    return {
      flagged: true,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      confidence: 0.75 + Math.random() * 0.2,
      frameIndex: index
    };
  }
  return {
    flagged: false,
    confidence: 0.85 + Math.random() * 0.1,
    frameIndex: index
  };
};
