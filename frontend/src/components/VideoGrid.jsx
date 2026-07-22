import { Link, useNavigate } from 'react-router-dom';
import { Play, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function VideoGrid({ videos, title, emptyMessage, onVideoRenamed, onVideoDeleted }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState(null);
    const [isRenaming, setIsRenaming] = useState(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [videoToDelete, setVideoToDelete] = useState(null);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleMenuClick = (e, videoId) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveMenu(activeMenu === videoId ? null : videoId);
    };

    const handleRenameClick = (e, video) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRenaming(video.id);
        setRenameTitle(video.title);
        setActiveMenu(null);
    };

    const handleDeleteClick = (e, video) => {
        e.preventDefault();
        e.stopPropagation();
        setVideoToDelete(video);
        setActiveMenu(null);
    };

    const handleRenameSubmit = async (e, videoId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.patch(`/videos/${videoId}/rename`, { title: renameTitle });
            if (onVideoRenamed) onVideoRenamed(videoId, renameTitle);
            setIsRenaming(null);
        } catch (err) {
            console.error('Failed to rename video', err);
            alert('Failed to rename video.');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!videoToDelete) return;
        try {
            await api.delete(`/videos/${videoToDelete.id}`);
            if (onVideoDeleted) onVideoDeleted(videoToDelete.id);
            setVideoToDelete(null);
        } catch (err) {
            console.error('Failed to delete video', err);
            alert('Failed to delete video.');
        }
    };
    
    if (!videos || videos.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {emptyMessage || "No videos found."}
            </div>
        );
    }

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const timeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className="video-grid-section">
            {title && <h2 className="grid-title" style={{ marginBottom: '1.5rem' }}>{title}</h2>}
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '2rem' 
            }}>
                {videos.map(video => (
                    <Link to={`/watch/${video.id}`} key={video.id} style={{ textDecoration: 'none' }}>
                        <div className="video-card">
                            <div className="video-thumbnail-container">
                                {video.thumbnail_key ? (
                                    <img 
                                        src={`${import.meta.env.VITE_MINIO_URL}/${video.thumbnail_key}`} 
                                        alt={video.title}
                                        className="video-thumbnail-image"
                                    />
                                ) : (
                                    <Play size={48} opacity={0.2} />
                                )}
                                
                                <div className="video-duration-badge">
                                    {formatDuration(video.duration_seconds || 0)}
                                </div>
                            </div>
                            
                            <div className="video-card-info">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {isRenaming === video.id ? (
                                        <div style={{ marginBottom: '0.5rem' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                            <input 
                                                type="text" 
                                                value={renameTitle} 
                                                onChange={(e) => setRenameTitle(e.target.value)}
                                                className="input"
                                                style={{ padding: '0.25rem 0.5rem', marginBottom: '0.25rem' }}
                                                autoFocus
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={(e) => handleRenameSubmit(e, video.id)}>Save</button>
                                                <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={(e) => { e.preventDefault(); setIsRenaming(null); }}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <h3 className="video-card-title">
                                            {video.title}
                                        </h3>
                                    )}
                                    
                                    <div className="video-card-meta">
                                        <div>{video.username || 'Unknown Author'}</div>
                                        <div>
                                            {video.view_count || 0} views • {timeAgo(video.created_at)}
                                        </div>
                                    </div>
                                </div>
                                
                                {user && (user.id === video.user_id || user.userId === video.user_id) && (
                                    <div style={{ position: 'relative' }}>
                                        <button 
                                            className="control-btn" 
                                            style={{ padding: '4px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                                            onClick={(e) => handleMenuClick(e, video.id)}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                        
                                        {activeMenu === video.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                background: 'var(--surface-light)',
                                                border: '1px solid var(--border-light)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '0.25rem',
                                                zIndex: 10,
                                                minWidth: '120px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                            }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                <button 
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: 'var(--radius-sm)' }}
                                                    onClick={(e) => handleRenameClick(e, video)}
                                                    onMouseEnter={(e) => e.target.style.background = 'var(--surface-hover)'}
                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                >
                                                    <Edit2 size={14} /> Rename
                                                </button>
                                                <button 
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem', background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer', textAlign: 'left', borderRadius: 'var(--radius-sm)' }}
                                                    onClick={(e) => handleDeleteClick(e, video)}
                                                    onMouseEnter={(e) => e.target.style.background = 'rgba(248, 81, 73, 0.1)'}
                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            {videoToDelete && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 1rem' }}>
                        <h3 style={{ marginTop: 0 }}>Delete Video?</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Are you sure you want to delete "<strong>{videoToDelete.title}</strong>"? 
                            This action cannot be undone and will permanently remove the video files.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setVideoToDelete(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: '#f85149', color: 'white' }} onClick={handleDeleteConfirm}>Delete Video</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
