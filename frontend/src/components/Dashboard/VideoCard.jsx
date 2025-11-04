import React from 'react';
import { Link } from 'react-router-dom';

const VideoCard = ({ video, onDelete, userRole }) => {
  const getStatusColor = (status) => {
    const colors = {
      uploading: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSensitivityColor = (status) => {
    const colors = {
      safe: 'bg-green-100 text-green-800',
      flagged: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
        <div className="text-white text-6xl">🎬</div>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
          {video.title}
        </h3>
        
        {video.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(video.status)}`}>
            {video.status}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSensitivityColor(video.sensitivityStatus)}`}>
            {video.sensitivityStatus}
          </span>
        </div>

        {video.status === 'processing' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Processing...</span>
              <span>{video.processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${video.processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {video.flagReason && video.sensitivityStatus === 'flagged' && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            ⚠️ {video.flagReason}
          </div>
        )}

        <div className="text-xs text-gray-500 mb-4 space-y-1">
          <div>Size: {formatFileSize(video.size)}</div>
          <div>Uploaded: {formatDate(video.createdAt)}</div>
        </div>

        <div className="flex gap-2">
          {video.status === 'completed' && (
            <Link
              to={`/video/${video._id}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Watch
            </Link>
          )}
          
          {(userRole === 'editor' || userRole === 'admin') && (
            <button
              onClick={() => onDelete(video._id)}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;