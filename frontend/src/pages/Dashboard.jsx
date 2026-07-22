import { useState, useEffect } from 'react';
import api from '../api/client';
import Header from '../components/Header';
import VideoGrid from '../components/VideoGrid';
import { Video } from 'lucide-react';

export default function Dashboard() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchMyVideos() {
            try {
                const response = await api.get('/videos/me/my-videos');
                setVideos(response.data.data);
            } catch (err) {
                console.error("Failed to fetch my videos", err);
                setError('Failed to load your videos.');
            } finally {
                setLoading(false);
            }
        }
        
        fetchMyVideos();
    }, []);

    return (
        <div className="dashboard-page">
            <Header />
            
            <main className="container" style={{ padding: '2rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                            background: 'var(--accent-soft)', 
                            color: 'var(--accent)', 
                            padding: '0.5rem', 
                            borderRadius: 'var(--radius-md)' 
                        }}>
                            <Video size={24} />
                        </div>
                        <h1 style={{ margin: 0 }}>My Videos</h1>
                    </div>
                    
                    <a href="/upload" className="btn btn-primary btn-sm">
                        Upload New
                    </a>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p className="text-muted">Loading your videos...</p>
                    </div>
                ) : error ? (
                    <div className="auth-error">{error}</div>
                ) : (
                    <VideoGrid 
                        videos={videos} 
                        emptyMessage="You haven't uploaded any videos yet."
                        onVideoRenamed={(id, title) => setVideos(videos.map(v => v.id === id ? { ...v, title } : v))}
                        onVideoDeleted={(id) => setVideos(videos.filter(v => v.id !== id))}
                    />
                )}
            </main>
        </div>
    );
}
