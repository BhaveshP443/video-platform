import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../../services/api';

const VideoPlayer = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await videoAPI.getById(id);
        setVideo(response.data.video);
      } catch (error) {
        console.error('Error fetching video:', error);
        setError(error.response?.data?.message || 'Error loading video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Video not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (video.status !== 'completed') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          This video is still being processed. Please check back later.
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const streamUrl = videoAPI.getStreamUrl(video._id);
  const token = localStorage.getItem('token');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
      >
        ← Back to Dashboard
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Video Player */}
        <div className="bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            controlsList="nodownload"
            src={`${streamUrl}?token=${token}`}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video Info */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>
          
          {video.sensitivityStatus === 'flagged' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold text-red-900">Content Warning</div>
                <div className="text-sm text-red-700">{video.flagReason}</div>
              </div>
            </div>
          )}

          {video.description && (
            <p className="text-gray-700 mb-4">{video.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium text-gray-900">{video.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sensitivity</div>
              <div className="font-medium text-gray-900 capitalize">{video.sensitivityStatus}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Size</div>
              <div className="font-medium text-gray-900">{formatFileSize(video.size)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Uploaded</div>
              <div className="font-medium text-gray-900">{formatDate(video.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;