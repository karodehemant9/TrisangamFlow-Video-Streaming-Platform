import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import api from '../api/client';
import Header from '../components/Header';
import VideoPlayer from '../components/VideoPlayer';
import LikeButton from '../components/LikeButton';
import Comments from '../components/Comments';

export default function Stream() {
    const { videoId } = useParams();
    const [videoData, setVideoData] = useState(null);
    const [streamUrl, setStreamUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchStream() {
            try {
                setLoading(true);
                const response = await api.get(`/videos/${videoId}/stream`);
                setStreamUrl(response.data.data.streamUrl);
                
                // Fetch the full metadata for the video (including title, description, views, author)
                const metaResponse = await api.get(`/videos/${videoId}`);
                setVideoData(metaResponse.data.data);
                
                // Record view
                try {
                    const viewRes = await api.post(`/interactions/${videoId}/view`);
                    // Only increment if the backend successfully recorded a brand new view for this user
                    if (viewRes.data?.recorded) {
                        setVideoData(prev => ({
                            ...prev,
                            view_count: (prev.view_count || 0) + 1
                        }));
                    }
                } catch (viewErr) {
                    console.error("Failed to record view", viewErr);
                }
                
                setError('');
            } catch (err) {
                console.error("Failed to fetch stream URL", err);
                setError(err.response?.data?.message || 'Failed to load video stream');
            } finally {
                setLoading(false);
            }
        }
        
        if (videoId) {
            fetchStream();
        }
    }, [videoId]);

    return (
        <div className="stream-page">
            <Header />
            
            <main className="container" style={{ padding: '2rem 1rem', maxWidth: '1200px' }}>
                <Link to="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem', display: 'inline-flex', padding: 0 }}>
                    <ChevronLeft size={16} /> Back
                </Link>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p className="text-muted">Loading video stream...</p>
                    </div>
                ) : error ? (
                    <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                ) : (
                    <div className="video-watch-container">
                        <VideoPlayer streamUrl={streamUrl} />
                        
                        <div className="video-metadata" style={{ marginTop: '1.5rem' }}>
                            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{videoData?.title}</h1>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: 'var(--accent)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem'
                                    }}>
                                        {videoData?.username ? videoData.username[0].toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{videoData?.username}</div>
                                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                            {videoData?.view_count || 0} views • {new Date(videoData?.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="video-actions">
                                    <LikeButton videoId={videoId} />
                                </div>
                            </div>
                            
                            {videoData?.description && (
                                <div style={{ 
                                    marginTop: '1.5rem', 
                                    padding: '1rem', 
                                    background: 'var(--surface-hover)', 
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.95rem',
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {videoData.description}
                                </div>
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0' }} />
                        
                        <Comments videoId={videoId} />
                    </div>
                )}
            </main>
        </div>
    );
}
