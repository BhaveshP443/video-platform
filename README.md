
# 🎬 PulseAI Video Platform

A full-stack MERN application that allows users to upload, analyze, and manage videos with automated **sensitivity detection** using **AI-driven mock analysis**.  
The platform supports **role-based authentication**, **real-time video processing progress**, and **Cloudinary integration** for media storage.

---

## 🚀 **Live Demo**

🎥 Watch the demo on **Loom**: [(https://www.loom.com/share/e4bbe68f6a5b469496f8c425b8651094)]

🌐 Frontend (Netlify): [https://pulseaivideo.netlify.app](https://pulseaivideo.netlify.app)  
🖥️ Backend (Railway): [https://video-platform-production-6745.up.railway.app](https://video-platform-production-6745.up.railway.app)

---

## 🧩 **Key Features**

✅ **User Roles:** Admin, Editor, and Viewer with distinct permissions  
✅ **Secure Auth:** JWT-based login & registration  
✅ **Video Uploads:** Cloudinary integration for remote storage  
✅ **FFmpeg Processing:** Automated thumbnail extraction & metadata analysis  
✅ **AI Sensitivity Check:** Simulated frame-based flagging of sensitive content  
✅ **Real-time Status:** Socket.io-powered live progress updates  
✅ **Responsive UI:** Built with React + TailwindCSS  
✅ **Deployment:** Frontend on Netlify, Backend on Railway

---

## ⚙️ **Tech Stack**

| Layer | Technologies |
|-------|---------------|
| **Frontend** | React, Vite, TailwindCSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas |
| **Storage** | Cloudinary |
| **Realtime** | Socket.io |
| **Video Tools** | FFmpeg, Fluent-FFmpeg |
| **Deployment** | Railway (Backend), Netlify (Frontend) |

---

## 🧠 **System Overview**

1. **Upload:** Editor/Admin uploads video → stored on Cloudinary.  
2. **Process:** Backend downloads it temporarily → extracts metadata & thumbnail via FFmpeg.  
3. **Analyze:** Each frame is analyzed (mock AI) for sensitive content.  
4. **Realtime Feedback:** Users see live progress via Socket.io.  
5. **Result:** Marked as Safe or Flagged with reasons and confidence score.

---

## 🧩 **Environment Setup**

### 1️⃣ Clone the Repo
```bash
git clone https://github.com/BhaveshP443/video-platform.git
cd video-platform
````

### 2️⃣ Setup Backend

```bash
cd backend
npm install
npm run dev
```

Create a `.env` file in `/backend`:

```env
PORT=5000
MONGO_URI=your_mongo_connection
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret
FRONTEND_URL=https://pulseaivideo.netlify.app
```

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `.env` in `/frontend`:

```env
VITE_API_URL=https://video-platform-production-6745.up.railway.app
VITE_SOCKET_URL=https://video-platform-production-6745.up.railway.app
```

---

## 📦 **Deployment**

* **Backend** → Deployed on [Railway.app](https://railway.app)
* **Frontend** → Deployed on [Netlify](https://www.netlify.com)
  with a `netlify.toml` file to enable SPA routing:

  ```toml
  [build]
    base = "frontend"
    publish = "frontend/dist"
    command = "npm run build"

  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```



