import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { UploadProvider, useUpload } from './hooks/useUpload';
import api from './api/client';
import Login from './pages/Login';
import Register from './pages/Register';
import Stream from './pages/Stream';
import Header from './components/Header';
import TabBar from './components/TabBar';
import VideoGrid from './components/VideoGrid';
import UploadQueue from './components/UploadQueue';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    
    return children;
}

function HomeFeed() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchFeed() {
            try {
                const response = await api.get('/videos');
                setVideos(response.data.data);
            } catch (err) {
                console.error("Failed to fetch feed", err);
                setError('Failed to load videos. Please try again later.');
            } finally {
                setLoading(false);
            }
        }
        
        fetchFeed();
    }, []);

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Recommended for you</h1>
            
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p className="text-muted">Loading your feed...</p>
                </div>
            ) : error ? (
                <div className="auth-error">{error}</div>
            ) : (
                <VideoGrid 
                    videos={videos} 
                    emptyMessage="No videos available right now. Be the first to upload!" 
                    onVideoRenamed={(id, title) => setVideos(videos.map(v => v.id === id ? { ...v, title } : v))}
                    onVideoDeleted={(id) => setVideos(videos.filter(v => v.id !== id))}
                />
            )}
        </div>
    );
}

function MainLayout() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const uploadContext = user ? useUpload() : null;

    return (
        <div className="app-layout">
            <Header />
            {user && (
                <TabBar
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    uploadCount={uploadContext?.activeCount || 0}
                />
            )}
            <main className="container main-content">
                <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
                    <HomeFeed />
                </div>
                {user && (
                    <div style={{ display: activeTab === 'upload' ? 'block' : 'none' }}>
                        <UploadQueue />
                    </div>
                )}
            </main>
        </div>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/watch/:videoId" element={<Stream />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <UploadProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </UploadProvider>
        </AuthProvider>
    );
}

export default App;
