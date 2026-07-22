import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(username, email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-brand">
                <div className="auth-brand-content">
                    <div className="auth-brand-logo">
                        <Play size={32} fill="white" />
                    </div>
                    <h1>Join TrisangamFlow</h1>
                    <p>Start your streaming journey today. Upload, stream, and manage your content with production-grade reliability.</p>
                </div>
            </div>
            
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <h2>Create Account</h2>
                    <span className="text-muted">Sign up to start uploading videos</span>
                    
                    {error && <div className="auth-error">{error}</div>}
                    
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input 
                                type="text" 
                                id="username"
                                className="form-input" 
                                placeholder="johndoe"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email Address</label>
                            <input 
                                type="email" 
                                id="email"
                                className="form-input" 
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input 
                                type="password" 
                                id="password"
                                className="form-input" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? <div className="spinner"></div> : 'Create Account'}
                        </button>
                    </form>
                    
                    <div className="auth-switch">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
