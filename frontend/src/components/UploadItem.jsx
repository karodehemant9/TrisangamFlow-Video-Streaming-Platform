import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FileVideo, X, CheckCircle, PauseCircle, PlayCircle, Loader2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function UploadItem({ job, onRemove, onStatusChange, onMetadataUpdate, onAttachFile }) {
    const { id, file, fileMeta, title: initialTitle, status, uploadId, videoId } = job;
    const fileName = file ? file.name : (fileMeta ? fileMeta.name : 'Unknown');
    const fileSize = file ? file.size : (fileMeta ? fileMeta.size : 0);
    const fileType = file ? file.type : (fileMeta ? fileMeta.type : 'video/mp4');

    const [title, setTitle] = useState(initialTitle || fileName.split('.').slice(0, -1).join('.'));
    
    // UI specific states
    const [progress, setProgress] = useState(0);
    const [chunkStatus, setChunkStatus] = useState([]);
    const [stats, setStats] = useState({ uploadedParts: 0, totalParts: 0, speed: '0 MB/s', timeRemaining: '--' });
    const [error, setError] = useState('');
    const [missingFilePrompt, setMissingFilePrompt] = useState(false);

    // Transcoding state
    const [transcodingProgress, setTranscodingProgress] = useState(0);
    const [transcodingStatus, setTranscodingStatus] = useState('');

    const abortControllerRef = useRef(null);
    const shouldStartRef = useRef(false);
    const fileInputRef = useRef(null);

    // Save title changes back to job
    useEffect(() => {
        onMetadataUpdate(id, { title });
    }, [title, id, onMetadataUpdate]);

    // Auto-start when job.autoStart becomes true
    useEffect(() => {
        if (job.autoStart && status === 'pending' && !shouldStartRef.current) {
            shouldStartRef.current = true;
            executeUpload();
        }
    }, [job.autoStart, status]);

    // Polling for transcoding progress
    useEffect(() => {
        let timeoutId;
        let isActive = true;

        const pollStatus = async () => {
            if (!isActive || status !== 'transcoding' || !videoId) return;
            
            try {
                const res = await api.get(`/videos/${videoId}/status`);
                const data = res.data.data;
                if (data) {
                    setTranscodingStatus(data.jobStatus || data.status);
                    setTranscodingProgress(data.progress || 0);

                    if (data.jobStatus === 'COMPLETED' || data.status === 'PROCESSED') {
                        onStatusChange(id, 'done');
                        return;
                    }
                    if (data.jobStatus === 'FAILED' || data.status === 'FAILED') {
                        setError('Transcoding failed: ' + (data.errorMessage || 'Unknown error'));
                        onStatusChange(id, 'failed');
                        return;
                    }
                }
            } catch (err) {
                console.error('Polling error', err);
            }

            if (isActive) {
                timeoutId = setTimeout(pollStatus, 3000);
            }
        };

        if (status === 'transcoding' && videoId) {
            pollStatus();
        }

        return () => {
            isActive = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [status, videoId, id, onStatusChange]);

    const executeUpload = async () => {
        if (!file) {
            // We can't upload without the file object (happens after page refresh)
            setMissingFilePrompt(true);
            return;
        }

        onStatusChange(id, 'uploading');
        setError('');
        setMissingFilePrompt(false);
        abortControllerRef.current = new AbortController();

        try {
            let uId = uploadId;
            let pUrls = [];
            let tParts = 0;
            let cSize = 0;
            let existingUploadedParts = [];

            if (!uId) {
                const initResponse = await api.post('/uploads/initiate', {
                    fileName: file.name,
                    mimeType: file.type || 'video/mp4',
                    totalSize: file.size
                });
                const data = initResponse.data.data;
                uId = data.uploadId;
                onMetadataUpdate(id, { uploadId: uId });
                
                pUrls = data.presignedUrls;
                tParts = data.totalParts;
                cSize = data.chunkSize;
            } else {
                const statusRes = await api.get(`/uploads/${uId}/status`);
                const data = statusRes.data.data;
                if (data.status !== 'INITIATED') throw new Error('Upload is no longer active.');
                
                pUrls = data.presignedUrls || [];
                tParts = data.totalParts;
                cSize = data.chunkSize;
                existingUploadedParts = data.uploadedParts || [];

                if (pUrls.length === 0) {
                    throw new Error("Unable to fetch resume URLs. Please restart upload.");
                }
            }

            setStats(prev => ({ ...prev, totalParts: tParts, uploadedParts: existingUploadedParts.length }));
            
            setChunkStatus(() => {
                const arr = new Array(tParts).fill('pending');
                existingUploadedParts.forEach(p => { arr[p.partNumber - 1] = 'completed'; });
                return arr;
            });

            const uploadedParts = [...existingUploadedParts];
            const startTime = Date.now();
            
            // For smooth progress tracking during parallel uploads
            let completedBytes = existingUploadedParts.length * cSize;
            const inProgressBytes = {};

            const chunksToUpload = [];
            for (let i = 0; i < tParts; i++) {
                const partNum = i + 1;
                if (!existingUploadedParts.find(p => p.partNumber === partNum)) {
                    chunksToUpload.push({ partNum, i });
                } else {
                    const percentage = Math.round(((i + 1) * cSize * 100) / file.size);
                    setProgress(Math.min(percentage, 100));
                }
            }

            let currentIndex = 0;

            const uploadWorker = async () => {
                while (currentIndex < chunksToUpload.length) {
                    if (abortControllerRef.current?.signal.aborted) throw new Error('Upload paused');
                    
                    const chunkInfo = chunksToUpload[currentIndex++];
                    const { partNum, i } = chunkInfo;
                    
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

                    let etag = null;
                    let retries = 3;
                    while (retries > 0 && !etag) {
                        try {
                            if (abortControllerRef.current?.signal.aborted) throw new Error('Upload paused');
                            
                            const response = await axios.put(url, chunk, {
                                headers: { 'Content-Type': file.type || 'video/mp4' },
                                signal: abortControllerRef.current.signal,
                                onUploadProgress: (progressEvent) => {
                                    inProgressBytes[partNum] = progressEvent.loaded;
                                    let currentActiveBytes = 0;
                                    for (const key in inProgressBytes) {
                                        currentActiveBytes += inProgressBytes[key];
                                    }
                                    const totalProgress = completedBytes + currentActiveBytes;
                                    const percentage = Math.round((totalProgress * 100) / file.size);
                                    setProgress(Math.min(percentage, 100));
                                }
                            });
                            etag = response.headers.etag || response.headers.ETag;
                        } catch (err) {
                            if (axios.isCancel(err) || err.message === 'Upload paused') throw err;
                            retries--;
                            if (retries === 0) throw err;
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }

                    if (!etag) throw new Error(`Missing ETag for part ${partNum}`);

                    const parsedEtag = etag.replace(/"/g, '');
                    uploadedParts.push({ partNumber: partNum, etag: parsedEtag });
                    
                    completedBytes += chunk.size;
                    delete inProgressBytes[partNum];

                    const elapsedSeconds = Math.max(0.1, (Date.now() - startTime) / 1000);
                    const bytesInThisSession = completedBytes - (existingUploadedParts.length * cSize);
                    const speedBps = bytesInThisSession / elapsedSeconds;
                    const remainingBytes = file.size - completedBytes;
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
            };

            const CONCURRENCY_LIMIT = 3;
            const workers = [];
            for (let w = 0; w < Math.min(CONCURRENCY_LIMIT, chunksToUpload.length); w++) {
                workers.push(uploadWorker());
            }

            await Promise.all(workers);

            // Complete Upload
            const completeRes = await api.post('/uploads/complete', {
                uploadId: uId,
                parts: uploadedParts,
                title: title || file.name,
                description: ''
            });

            setProgress(100);
            onMetadataUpdate(id, { uploadId: null });
            
            if (completeRes.data.data && completeRes.data.data.videoId) {
                onMetadataUpdate(id, { videoId: completeRes.data.data.videoId });
                onStatusChange(id, 'transcoding');
            } else {
                onStatusChange(id, 'done');
            }
            
        } catch (err) {
            console.error("Upload error:", err);
            if (axios.isCancel(err) || err.message === 'Upload paused') {
                onStatusChange(id, 'paused');
                setChunkStatus(prev => prev.map(s => s === 'uploading' ? 'pending' : s));
            } else {
                setError(err.message || 'Upload failed. You can retry.');
                onStatusChange(id, 'paused');
                setChunkStatus(prev => prev.map(s => s === 'uploading' ? 'failed' : s));
            }
        } finally {
            abortControllerRef.current = null;
        }
    };

    const pauseUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            onStatusChange(id, 'paused');
        }
    };

    const handleFileReattach = (e) => {
        const selectedFile = e.target.files && e.target.files[0];
        if (!selectedFile) return;
        
        if (selectedFile.name !== fileName || selectedFile.size !== fileSize) {
            setError('File mismatch! Please select the exact same file to resume.');
            return;
        }

        onAttachFile(id, selectedFile);
        setMissingFilePrompt(false);
        setError('');
        // We defer executeUpload until the next render where `file` is populated
        setTimeout(() => {
            onStatusChange(id, 'pending'); // Re-queue it
        }, 100);
    };

    const getStatusBadge = () => {
        const badges = {
            pending:      { label: 'Queued',       className: 'badge-queued' },
            uploading:    { label: 'Uploading',    className: 'badge-uploading' },
            paused:       { label: 'Paused',       className: 'badge-paused' },
            uploaded:     { label: 'Uploaded',     className: 'badge-uploaded' },
            transcoding:  { label: 'Processing',   className: 'badge-processing' },
            done:         { label: 'Complete',     className: 'badge-complete' },
            failed:       { label: 'Failed',       className: 'badge-failed' },
        };
        const b = badges[status] || badges.pending;
        return <span className={`upload-badge ${b.className}`}>{b.label}</span>;
    };

    const showProgressBar = ['uploading', 'paused', 'transcoding'].includes(status) || progress > 0;

    return (
        <div className={`upload-card ${status}`}>
            {/* Header row */}
            <div className="upload-card-header">
                <div className="upload-card-file-icon">
                    {status === 'done' ? <CheckCircle size={24} /> :
                     status === 'transcoding' ? <Loader2 size={24} className="spin" /> :
                     <FileVideo size={24} />}
                </div>
                <div className="upload-card-info">
                    {status === 'pending' || status === 'paused' ? (
                        <input
                            type="text"
                            className="upload-card-title-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Video title"
                        />
                    ) : (
                        <div className="upload-card-title">{title || fileName}</div>
                    )}
                    <div className="upload-card-meta">
                        {formatBytes(fileSize)} • {fileType}
                    </div>
                </div>
                <div className="upload-card-status">
                    {getStatusBadge()}
                </div>
            </div>

            {/* Error */}
            {error && <div className="upload-card-error">{error}</div>}

            {/* Missing file prompt (post-refresh) */}
            {missingFilePrompt && (
                <div className="upload-card-error" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>File connection lost due to page refresh. Please re-select the exact file to resume.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileReattach} style={{ display: 'none' }} />
                    <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>
                        Select "{fileName}"
                    </button>
                </div>
            )}

            {/* Progress bar */}
            {showProgressBar && (
                <div className="upload-card-progress">
                    <div className="progress-bar-track">
                        <div
                            className={`progress-bar-fill ${status === 'paused' ? 'paused' : ''} ${status === 'done' ? 'completed' : ''} ${status === 'transcoding' ? 'transcoding' : ''}`}
                            style={{ width: `${status === 'transcoding' ? transcodingProgress : progress}%` }}
                        />
                    </div>
                    <div className="upload-card-progress-info">
                        {status === 'transcoding' ? (
                            <span>{transcodingStatus || 'PENDING'} — {transcodingProgress}%</span>
                        ) : (
                            <span>{progress}%</span>
                        )}
                        {status === 'uploading' && (
                            <span className="upload-card-speed">
                                {stats.speed} • ETA {stats.timeRemaining} • {stats.uploadedParts}/{stats.totalParts} chunks
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Chunk grid */}
            {chunkStatus.length > 0 && (status === 'uploading' || status === 'paused') && (
                <div className="upload-card-chunks">
                    <div className="chunk-grid">
                        {chunkStatus.map((s, idx) => (
                            <div key={idx} className={`chunk-cell ${s}`} title={`Part ${idx + 1}: ${s}`} />
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="upload-card-actions">
                {status === 'uploading' && (
                    <button className="btn btn-ghost btn-sm" onClick={pauseUpload}>
                        <PauseCircle size={16} /> Pause
                    </button>
                )}
                {status === 'paused' && !missingFilePrompt && (
                    <>
                        <button className="btn btn-primary btn-sm" onClick={executeUpload}>
                            <PlayCircle size={16} /> Resume
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => onRemove(id)}>
                            <X size={16} /> Cancel
                        </button>
                    </>
                )}
                {status === 'pending' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemove(id)}>
                        <X size={16} /> Remove
                    </button>
                )}
                {status === 'done' && videoId && (
                    <Link to={`/watch/${videoId}`} className="btn btn-primary btn-sm">
                        <Eye size={16} /> Watch
                    </Link>
                )}
                {(status === 'done' || status === 'failed') && (
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemove(id)}>
                        <X size={16} /> Remove
                    </button>
                )}
            </div>
        </div>
    );
}
