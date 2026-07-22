import { Home, UploadCloud } from 'lucide-react';

const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
];

export default function TabBar({ activeTab, onTabChange, uploadCount = 0 }) {
    return (
        <nav className="tab-bar">
            <div className="tab-bar-inner">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                        {tab.id === 'upload' && uploadCount > 0 && (
                            <span className="tab-badge">{uploadCount}</span>
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
}
