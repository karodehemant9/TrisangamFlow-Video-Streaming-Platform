import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Settings, Maximize, Play, Pause, Volume2, VolumeX, Check } from 'lucide-react';
import './VideoPlayer.css';

export default function VideoPlayer({ streamUrl }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [hlsInstance, setHlsInstance] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
    const [showSettings, setShowSettings] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamUrl) return;

        let hls = null;

        if (Hls.isSupported()) {
            hls = new Hls({
                capLevelToPlayerSize: false,
                autoLevelCapping: -1
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const availableQualities = data.levels.map((level, index) => ({
                    index,
                    bitrate: level.bitrate,
                    width: level.width,
                    height: level.height,
                    name: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`
                }));
                // Sort by height descending
                availableQualities.sort((a, b) => (b.height || 0) - (a.height || 0));

                setQualities([{ index: -1, name: 'Auto' }, ...availableQualities]);
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                // If we are in Auto mode, we might want to display what auto chose, but keeping it simple
            });

            setHlsInstance(hls);

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            video.src = streamUrl;
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [streamUrl]);

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const toggleMute = () => {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleQualityChange = (levelIndex) => {
        if (hlsInstance) {
            hlsInstance.currentLevel = levelIndex;
            setCurrentQuality(levelIndex);
            setShowSettings(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        if (videoRef.current && duration > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = clickPos * duration;
        }
    };

    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const h = Math.floor(timeInSeconds / 3600);
        const m = Math.floor((timeInSeconds % 3600) / 60);
        const s = Math.floor(timeInSeconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-player-container" ref={containerRef}>
            <video
                ref={videoRef}
                className="video-player"
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            />

            <div className="video-controls-overlay">
                <div className="video-progress-container" onClick={handleSeek}>
                    <div className="video-progress-bg"></div>
                    <div className="video-progress-bar" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                        <div className="video-progress-knob"></div>
                    </div>
                </div>

                <div className="video-controls">
                    <div className="controls-left">
                        <button className="control-btn" onClick={togglePlay}>
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <button className="control-btn" onClick={toggleMute}>
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <div className="time-indicator">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>

                    <div className="controls-right">
                        {qualities.length > 0 && (
                            <div className="quality-selector">
                                {qualities.map(q => (
                                    <button
                                        key={q.index}
                                        className={`quality-btn ${currentQuality === q.index ? 'active' : ''}`}
                                        onClick={() => handleQualityChange(q.index)}
                                    >
                                        {q.name}
                                        {q.height >= 720 && <span className="hd-badge">HD</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button className="control-btn" onClick={toggleFullscreen}>
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
