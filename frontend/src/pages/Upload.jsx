import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, FileVideo, X, CheckCircle, PauseCircle, PlayCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Header from '../components/Header';

export default function Upload() {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // Upload state tracking
    const [uploadId, setUploadId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [chunkStatus, setChunkStatus] = useState([]); // 'pending', 'uploading', 'completed', 'failed'
    const [stats, setStats] = useState({ uploadedParts: 0, totalParts: 0, speed: '0 MB/s', timeRemaining: 'Calculating...' });

    // Transcoding state tracking
    const [videoId, setVideoId] = useState(null);
    const [transcodingProgress, setTranscodingProgress] = useState(0);
    const [transcodingStatus, setTranscodingStatus] = useState('');
    const [transcodingComplete, setTranscodingComplete] = useState(false);

    const fileInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    // Check localStorage for resumable upload when file is selected
    useEffect(() => {
        if (file) {
            const cachedUploadId = localStorage.getItem(`yt_upload_${file.name}_${file.size}`);
            if (cachedUploadId) {
                // We have a cached upload, let's just set the state so the user sees 'Resume Upload'
                setUploadId(cachedUploadId);
                setIsPaused(true);
                setUploading(false);
                setError('An incomplete upload was found for this file. You can resume it.');
            } else {
                setUploadId(null);
                setIsPaused(false);
            }
        }
    }, [file]);

    // Polling for transcoding progress
    useEffect(() => {
        let timeoutId;
        let isActive = true;

        const pollStatus = async () => {
            if (!isActive || !uploadComplete || !videoId || transcodingComplete || error) return;
            
            try {
                const res = await api.get(`/videos/${videoId}/status`);
                const data = res.data.data;
                if (data) {
                    setTranscodingStatus(data.jobStatus || data.status);
                    setTranscodingProgress(data.progress || 0);

                    if (data.jobStatus === 'COMPLETED' || data.status === 'PROCESSED') {
                        setTranscodingComplete(true);
                        setIsPaused(false);
                        return; // Stop polling
                    }
                    if (data.jobStatus === 'FAILED' || data.status === 'FAILED') {
                        setError('Transcoding failed: ' + (data.errorMessage || 'Unknown error'));
                        setIsPaused(false);
                        return; // Stop polling
                    }
                }
            } catch (err) {
                console.error('Polling error', err);
            }

            // Schedule the next poll only AFTER the previous one finishes
            if (isActive) {
                timeoutId = setTimeout(pollStatus, 3000);
            }
        };

        if (uploadComplete && videoId && !transcodingComplete && !error) {
            pollStatus();
        }

        return () => {
            isActive = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [uploadComplete, videoId, transcodingComplete, error]);


    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = (selectedFile) => {
        const isVideoType = selectedFile.type.startsWith('video/');
        const isMkvExtension = selectedFile.name.toLowerCase().endsWith('.mkv');
        
        if (!isVideoType && !isMkvExtension) {
            setError('Please select a valid video file.');
            return;
        }
        
        const finalType = selectedFile.type || (isMkvExtension ? 'video/x-matroska' : 'video/mp4');
        const fileWithCorrectType = selectedFile.type ? selectedFile : new File([selectedFile], selectedFile.name, { type: finalType });
        
        if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
            setError('File exceeds the maximum limit of 5GB.');
            return;
        }

        setFile(fileWithCorrectType);
        setTitle(fileWithCorrectType.name.split('.').slice(0, -1).join('.'));
        setError('');
        setUploadComplete(false);
        setProgress(0);
        setChunkStatus([]);
        setStats({ uploadedParts: 0, totalParts: 0, speed: '0 MB/s', timeRemaining: 'Calculating...' });
        setVideoId(null);
        setTranscodingProgress(0);
        setTranscodingStatus('');
        setTranscodingComplete(false);
    };

    const clearFile = () => {
        if (uploading) return;
        setFile(null);
        setTitle('');
        setDescription('');
        setProgress(0);
        setChunkStatus([]);
        setUploadId(null);
        setIsPaused(false);
        setUploadComplete(false);
    };

    const executeUpload = async (currentUploadId) => {
        if (!file) return;

        setUploading(true);
        setIsPaused(false);
        setError('');
        abortControllerRef.current = new AbortController();

        try {
            let uId = currentUploadId;
            let pUrls = [];
            let tParts = 0;
            let cSize = 0;
            let existingUploadedParts = [];

            if (!uId) {
                // 1. Initiate upload
                const initResponse = await api.post('/uploads/initiate', {
                    fileName: file.name,
                    mimeType: file.type || 'video/mp4',
                    totalSize: file.size
                });
                const data = initResponse.data.data;
                uId = data.uploadId;
                pUrls = data.presignedUrls;
                tParts = data.totalParts;
                cSize = data.chunkSize;
                
                setUploadId(uId);
                localStorage.setItem(`yt_upload_${file.name}_${file.size}`, uId);
            } else {
                // Resume upload - get fresh URLs and status
                const statusRes = await api.get(`/uploads/${uId}/status`);
                const data = statusRes.data.data;
                if (data.status !== 'INITIATED') throw new Error('Upload is no longer active.');
                
                pUrls = data.presignedUrls || [];
                tParts = data.totalParts;
                cSize = data.chunkSize;
                existingUploadedParts = data.uploadedParts || [];

                // If backend didn't return URLs, it means we forgot to update the backend service
                if (pUrls.length === 0) {
                    throw new Error("Unable to fetch resume URLs. Please restart upload.");
                }
            }

            setStats(prev => ({ ...prev, totalParts: tParts, uploadedParts: existingUploadedParts.length }));
            
            // Rebuild chunk status array
            setChunkStatus(() => {
                const arr = new Array(tParts).fill('pending');
                existingUploadedParts.forEach(p => { arr[p.partNumber - 1] = 'completed'; });
                return arr;
            });

            const uploadedParts = [...existingUploadedParts];
            const startTime = Date.now();
            let totalUploadedBytes = existingUploadedParts.length * cSize;

            // 2. Upload chunks with retry and pause support
            for (let i = 0; i < tParts; i++) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error('Upload paused');
                }

                const partNum = i + 1;
                // Skip if already uploaded
                if (existingUploadedParts.find(p => p.partNumber === partNum)) {
                    // Update overall progress base
                    const percentage = Math.round(((i + 1) * cSize * 100) / file.size);
                    setProgress(Math.min(percentage, 100));
                    continue;
                }

                const { url } = pUrls.find(p => p.partNumber === partNum) || {};
                if (!url) throw new Error('Missing presigned URL for part ' + partNum);
                
                const start = i * cSize;
                const end = Math.min(start + cSize, file.size);
                const chunk = file.slice(start, end);

                setChunkStatus(prev => {
                    const newStatus = [...prev];
                    newStatus[i] = 'uploading';
                    return newStatus;
                });

                // Retry loop for the chunk
                let etag = null;
                let retries = 3;
                while (retries > 0 && !etag) {
                    try {
                        if (abortControllerRef.current?.signal.aborted) throw new Error('Upload paused');
                        
                        const response = await axios.put(url, chunk, {
                            headers: { 'Content-Type': file.type || 'video/mp4' },
                            signal: abortControllerRef.current.signal,
                            onUploadProgress: (progressEvent) => {
                                const currentChunkProgress = progressEvent.loaded;
                                const totalProgress = totalUploadedBytes + currentChunkProgress;
                                const percentage = Math.round((totalProgress * 100) / file.size);
                                setProgress(Math.min(percentage, 100));
                            }
                        });
                        etag = response.headers.etag || response.headers.ETag;
                    } catch (err) {
                        if (axios.isCancel(err) || err.message === 'Upload paused') throw err;
                        retries--;
                        if (retries === 0) throw err;
                        // wait 1s before retry to recover from network hiccup
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                if (!etag) throw new Error(`Missing ETag for part ${partNum}`);

                const parsedEtag = etag.replace(/"/g, '');
                uploadedParts.push({ partNumber: partNum, etag: parsedEtag });
                totalUploadedBytes += chunk.size;
                
                // Update stats
                const elapsedSeconds = Math.max(0.1, (Date.now() - startTime) / 1000);
                const bytesInThisSession = totalUploadedBytes - (existingUploadedParts.length * cSize);
                const speedBps = bytesInThisSession / elapsedSeconds;
                const remainingBytes = file.size - totalUploadedBytes;
                const remainingSeconds = remainingBytes / speedBps;
                
                setStats({
                    uploadedParts: uploadedParts.length,
                    totalParts: tParts,
                    speed: `${formatBytes(speedBps)}/s`,
                    timeRemaining: remainingSeconds > 60 
                        ? `${Math.round(remainingSeconds / 60)}m ${Math.round(remainingSeconds % 60)}s` 
                        : `${Math.round(remainingSeconds)}s`
                });

                setChunkStatus(prev => {
                    const newStatus = [...prev];
                    newStatus[i] = 'completed';
                    return newStatus;
                });
            }

            // 3. Complete Upload
            const completeRes = await api.post('/uploads/complete', {
                uploadId: uId,
                parts: uploadedParts,
                title: title || file.name,
                description
            });

            localStorage.removeItem(`yt_upload_${file.name}_${file.size}`);
            setUploadComplete(true);
            setProgress(100);
            
            if (completeRes.data.data && completeRes.data.data.videoId) {
                setVideoId(completeRes.data.data.videoId);
            }
            
        } catch (err) {
            console.error("Upload error:", err);
            if (axios.isCancel(err) || err.message === 'Upload paused') {
                setError('Upload paused.');
                setIsPaused(true);
                setChunkStatus(prev => prev.map(s => s === 'uploading' ? 'pending' : s));
            } else {
                setError(err.message || 'An error occurred during upload. You can resume when network is restored.');
                setIsPaused(true); // Allow resuming on failure
                setChunkStatus(prev => prev.map(s => s === 'uploading' ? 'failed' : s));
            }
        } finally {
            setUploading(false);
            abortControllerRef.current = null;
        }
    };

    const startUpload = () => executeUpload(null);
    const resumeUpload = () => executeUpload(uploadId);

    const pauseUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setUploading(false);
            setIsPaused(true);
        }
    };

    return (
        <div className="upload-page">
            <Header />
            
            <main className="upload-main">
                <div className="container">
                    {!uploadComplete ? (
                        <>
                            <h1 className="upload-title">Upload Video</h1>
                            <p className="upload-subtitle">Deliver your content securely with multi-part chunking and auto-resume.</p>

                            {!file ? (
                                <div 
                                    className={`dropzone ${isDragging ? 'drag-over' : ''}`}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="dropzone-content">
                                        <div className="dropzone-icon">
                                            <UploadCloud />
                                        </div>
                                        <h3>Drag & drop video here</h3>
                                        <p>Or click to browse your files</p>
                                        <div className="dropzone-formats">
                                            <span>MP4</span>
                                            <span>WEBM</span>
                                            <span>MKV</span>
                                            <span>MOV</span>
                                        </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        className="dropzone-input" 
                                        ref={fileInputRef} 
                                        accept="video/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            ) : (
                                <div className="upload-dashboard">
                                    <div className="upload-file-info">
                                        <div className="upload-file-icon">
                                            <FileVideo />
                                        </div>
                                        <div className="upload-file-details">
                                            <div className="upload-file-name">{file.name}</div>
                                            <div className="upload-file-meta">
                                                {formatBytes(file.size)} • {file.type || 'video/mp4'}
                                            </div>
                                        </div>
                                        {!uploading && (
                                            <button className="upload-file-remove" onClick={clearFile} title="Remove file">
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>

                                    {error && <div className="auth-error">{error}</div>}

                                    <div className="metadata-section">
                                        <h4>Video Details</h4>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="title">Title (Optional)</label>
                                            <input 
                                                type="text" 
                                                id="title"
                                                className="form-input" 
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                disabled={uploading}
                                                placeholder="My Awesome Video"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="description">Description (Optional)</label>
                                            <textarea 
                                                id="description"
                                                className="form-input" 
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                disabled={uploading}
                                                placeholder="Tell viewers about your video..."
                                            />
                                        </div>
                                    </div>

                                    {uploading || progress > 0 || isPaused ? (
                                        <>
                                            <div className="progress-section">
                                                <div className="progress-header">
                                                    <div className="progress-status">
                                                        <div className={`progress-status-dot ${progress === 100 ? 'completed' : isPaused ? 'failed' : ''}`}></div>
                                                        {progress === 100 ? 'Upload Completed' : isPaused ? 'Paused' : 'Uploading...'}
                                                    </div>
                                                    <div className="progress-percentage">{progress}%</div>
                                                </div>
                                                <div className="progress-bar-track">
                                                    <div className={`progress-bar-fill ${progress === 100 ? 'completed' : isPaused ? 'paused' : ''}`} style={{ width: `${progress}%` }}></div>
                                                </div>
                                                
                                                <div className="progress-stats">
                                                    <div className="progress-stat">
                                                        <span className="progress-stat-label">Speed</span>
                                                        <span className="progress-stat-value">{isPaused ? '0 MB/s' : stats.speed}</span>
                                                    </div>
                                                    <div className="progress-stat">
                                                        <span className="progress-stat-label">Time left</span>
                                                        <span className="progress-stat-value">{isPaused ? '--' : stats.timeRemaining}</span>
                                                    </div>
                                                    <div className="progress-stat">
                                                        <span className="progress-stat-label">Chunks</span>
                                                        <span className="progress-stat-value">{stats.uploadedParts} / {stats.totalParts}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {chunkStatus.length > 0 && (
                                                <div className="chunk-section">
                                                    <h4>Chunk Status Grid</h4>
                                                    <div className="chunk-grid">
                                                        {chunkStatus.map((status, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                className={`chunk-cell ${status}`}
                                                                title={`Part ${idx + 1}: ${status}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : null}

                                    <div className="upload-actions">
                                        {uploading ? (
                                            <button className="btn btn-secondary" onClick={pauseUpload}>
                                                <PauseCircle size={18} style={{ marginRight: '8px' }} />
                                                Pause Upload
                                            </button>
                                        ) : isPaused ? (
                                            <>
                                                <button className="btn btn-ghost" onClick={clearFile}>Cancel</button>
                                                <button className="btn btn-primary" onClick={resumeUpload}>
                                                    <PlayCircle size={18} style={{ marginRight: '8px' }} />
                                                    Resume Upload
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn btn-ghost" onClick={clearFile}>Clear</button>
                                                <button className="btn btn-primary" onClick={startUpload}>Start Upload</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="upload-success">
                            {!transcodingComplete ? (
                                <>
                                    <div className="success-icon" style={{ color: '#3498db', animation: 'spin 2s linear infinite' }}>
                                        <Loader2 size={64} />
                                    </div>
                                    <h2>Processing Video...</h2>
                                    <p>Your video has been uploaded successfully and is now being converted for streaming.</p>
                                    
                                    <div className="progress-section" style={{ marginTop: '2rem', textAlign: 'left' }}>
                                        <div className="progress-header">
                                            <div className="progress-status">
                                                <div className="progress-status-dot"></div>
                                                Transcoding Status: <strong>{transcodingStatus || 'PENDING'}</strong>
                                            </div>
                                            <div className="progress-percentage">{transcodingProgress}%</div>
                                        </div>
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-fill" style={{ width: `${transcodingProgress}%`, backgroundColor: '#3498db' }}></div>
                                        </div>
                                    </div>
                                </>
                            ) : error ? (
                                <>
                                    <div className="success-icon" style={{ color: '#e74c3c' }}>
                                        <X size={64} />
                                    </div>
                                    <h2>Processing Failed</h2>
                                    <p className="auth-error" style={{ marginBottom: '1.5rem' }}>{error}</p>
                                    <button className="btn btn-primary" onClick={clearFile}>Try Another Video</button>
                                </>
                            ) : (
                                <>
                                    <div className="success-icon">
                                        <CheckCircle size={64} />
                                    </div>
                                    <h2>All Done!</h2>
                                    <p>Your video "{title}" has been successfully transcoded and is ready to watch.</p>
                                    <div className="upload-actions" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                                        <button className="btn btn-ghost" onClick={clearFile}>Upload Another</button>
                                        <Link to={`/video/${videoId}`} className="btn btn-primary">Watch Video</Link>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
