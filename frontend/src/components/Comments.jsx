import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function Comments({ videoId }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function fetchComments() {
            try {
                const response = await api.get(`/interactions/${videoId}/comments`);
                setComments(response.data.data);
            } catch (err) {
                console.error("Failed to fetch comments", err);
            } finally {
                setLoading(false);
            }
        }
        
        if (videoId) {
            fetchComments();
        }
    }, [videoId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!newComment.trim()) return;
        
        try {
            setSubmitting(true);
            const response = await api.post(`/interactions/${videoId}/comment`, {
                content: newComment
            });
            
            // Add to top of list
            setComments([{
                id: response.data.data.id,
                content: response.data.data.content,
                created_at: response.data.data.created_at,
                user_id: user.id,
                username: user.username || 'You'
            }, ...comments]);
            
            setNewComment('');
        } catch (err) {
            console.error("Failed to post comment", err);
            alert("Failed to post comment. Please try again.");
        } finally {
            setSubmitting(false);
        }
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
        <div className="comments-section" style={{ marginTop: '2rem', padding: '1rem 0' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                {comments.length} Comments
            </h3>

            {user ? (
                <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        {user.username ? user.username[0].toUpperCase() : 'U'}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                        <textarea
                            className="form-input"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{ minHeight: '60px', padding: '0.75rem', background: 'var(--surface)', border: 'none', borderBottom: '1px solid var(--border)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button 
                                type="submit" 
                                className="btn btn-primary btn-sm"
                                disabled={submitting || !newComment.trim()}
                                style={{ borderRadius: '18px' }}
                            >
                                {submitting ? 'Posting...' : 'Comment'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <p className="text-muted" style={{ marginBottom: '0.5rem' }}>Log in to join the conversation.</p>
                    <a href="/login" className="btn btn-secondary btn-sm">Log in</a>
                </div>
            )}

            {loading ? (
                <div className="spinner" style={{ margin: '0 auto' }}></div>
            ) : (
                <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {comments.map(comment => (
                        <div key={comment.id} className="comment-item" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'var(--surface-hover)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                fontWeight: 'bold',
                                flexShrink: 0
                            }}>
                                {comment.username[0].toUpperCase()}
                            </div>
                            <div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>@{comment.username}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{timeAgo(comment.created_at)}</span>
                                </div>
                                <p style={{ fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
