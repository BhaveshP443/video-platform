import mongoose from 'mongoose';
import Video from './src/models/Video.js';

async function checkVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const videos = await Video.find({ tenantId: 'demo-tenant' });
    console.log('Demo videos in database:');
    videos.forEach(video => {
      console.log(`- ${video.title}: ${video.sensitivityStatus} (${video.sensitivityAnalysis?.details?.flagPercentage || 0}% flagged)`);
    });
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkVideos();
