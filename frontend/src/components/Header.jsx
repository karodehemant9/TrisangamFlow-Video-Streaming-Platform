import { Link } from 'react-router-dom';
import { Play, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
    const { user, logout } = useAuth();

    return (
        <header className="header">
            <div className="header-inner">
                <Link to="/" className="header-logo">
                    <div className="header-logo-icon">
                        <Play size={18} fill="white" />
                    </div>
                    TrisangamFlow
                </Link>

                <div className="header-nav">
                    {user ? (
                        <>
                            <div className="header-user">
                                <div className="header-avatar">
                                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                </div>
                                {user.username}
                                <button 
                                    onClick={logout} 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ padding: '0.25rem' }}
                                    title="Logout"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
