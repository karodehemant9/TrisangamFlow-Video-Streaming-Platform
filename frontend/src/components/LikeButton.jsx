import { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LikeButton({ videoId }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLikes() {
            try {
                // If user is logged in, this will also return if they liked it
                const response = await api.get(`/interactions/${videoId}/likes`);
                setLikes(response.data.data.count);
                setIsLiked(response.data.data.isLiked);
            } catch (err) {
                console.error("Failed to fetch like status", err);
            } finally {
                setLoading(false);
            }
        }
        
        if (videoId) {
            fetchLikes();
        }
    }, [videoId, user]);

    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Optimistic UI update
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikes(prev => newIsLiked ? prev + 1 : prev - 1);

        try {
            await api.post(`/interactions/${videoId}/like`);
        } catch (err) {
            console.error("Failed to toggle like", err);
            // Revert on failure
            setIsLiked(!newIsLiked);
            setLikes(prev => !newIsLiked ? prev + 1 : prev - 1);
        }
    };

    if (loading) return <div style={{ width: 80, height: 36, background: 'var(--surface)', borderRadius: '18px' }} />;

    return (
        <button 
            className={`btn ${isLiked ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '18px', padding: '0.5rem 1rem' }}
            onClick={handleLike}
        >
            <ThumbsUp size={18} fill={isLiked ? 'currentColor' : 'none'} />
            <span style={{ fontWeight: 600 }}>{likes}</span>
        </button>
    );
}
