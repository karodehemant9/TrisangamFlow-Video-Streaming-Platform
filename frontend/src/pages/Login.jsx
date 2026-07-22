import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
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
                    <h1>Welcome Back</h1>
                    <p>Continue building your video empire. Log in to manage your content and monitor your stream performance.</p>
                </div>
            </div>
            
            <div className="auth-form-side">
                <div className="auth-form-container">
                    <h2>Sign In</h2>
                    <span className="text-muted">Enter your details to access your account</span>
                    
                    {error && <div className="auth-error">{error}</div>}
                    
                    <form className="auth-form" onSubmit={handleSubmit}>
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
                            {loading ? <div className="spinner"></div> : 'Sign In'}
                        </button>
                    </form>
                    
                    <div className="auth-switch">
                        Don't have an account? <Link to="/register">Create one now</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
