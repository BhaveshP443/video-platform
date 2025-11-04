import React, { useState, useEffect } from "react";
import { videoAPI } from "../../services/api";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import VideoCard from "./VideoCard";
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sensitivityFilter, setSensitivityFilter] = useState("all");
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== "all") params.status = filter;
      if (sensitivityFilter !== "all")
        params.sensitivityStatus = sensitivityFilter;

      const response = await videoAPI.getAll(params);
      setVideos(response.data.videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [filter, sensitivityFilter]);

  useEffect(() => {
    if (socket && user) {
      // Listen for video progress updates
      socket.on(`video-progress-${user.id}`, (data) => {
        setVideos((prev) =>
          prev.map((video) =>
            video._id === data.videoId
              ? { ...video, processingProgress: data.progress }
              : video
          )
        );
      });

      // Listen for video completion
      socket.on(`video-complete-${user.id}`, (data) => {
        setVideos((prev) =>
          prev.map((video) =>
            video._id === data.videoId
              ? {
                  ...video,
                  status: data.status,
                  sensitivityStatus: data.sensitivityStatus,
                  flagReason: data.flagReason,
                  processingProgress: 100,
                }
              : video
          )
        );
      });

      // Listen for video failure
      socket.on(`video-failed-${user.id}`, (data) => {
        setVideos((prev) =>
          prev.map((video) =>
            video._id === data.videoId
              ? { ...video, status: "failed", processingProgress: 0 }
              : video
          )
        );
      });

      return () => {
        socket.off(`video-progress-${user.id}`);
        socket.off(`video-complete-${user.id}`);
        socket.off(`video-failed-${user.id}`);
      };
    }
  }, [socket, user]);

  const handleDelete = async (videoId) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        await videoAPI.delete(videoId);
        setVideos((prev) => prev.filter((v) => v._id !== videoId));
      } catch (error) {
        console.error("Error deleting video:", error);
        alert("Failed to delete video");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Video Dashboard
        </h1>
        <p className="text-gray-600">Manage and monitor your video content</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Status
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Videos</option>
              <option value="uploading">Uploading</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sensitivity Status
            </label>
            <select
              value={sensitivityFilter}
              onChange={(e) => setSensitivityFilter(e.target.value)}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Content</option>
              <option value="safe">Safe Content</option>
              <option value="flagged">Flagged Content</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📹</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No videos found
          </h3>
          <p className="text-gray-600 mb-6">
            Upload your first video to get started
          </p>
          {(user?.role === "editor" || user?.role === "admin") && (
            <Link
              to="/upload"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Upload Video
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video._id}
              video={video}
              onDelete={handleDelete}
              userRole={user?.role}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
