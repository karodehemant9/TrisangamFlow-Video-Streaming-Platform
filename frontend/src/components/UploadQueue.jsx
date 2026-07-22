import { useState, useRef } from 'react';
import { UploadCloud, Trash2 } from 'lucide-react';
import UploadItem from './UploadItem';
import { useUpload } from '../hooks/useUpload';

export default function UploadQueue() {
    const { jobs, addFiles, updateJobStatus, updateJobMetadata, attachFileToJob, removeJob, clearCompleted } = useUpload();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Drag and drop handlers
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) addFiles(e.dataTransfer.files);
    };
    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) addFiles(e.target.files);
        e.target.value = '';
    };

    const activeUploads = jobs.filter(j => !['done', 'failed'].includes(j.status)).length;
    const completedUploads = jobs.filter(j => j.status === 'done').length;

    return (
        <div className="upload-queue">
            {/* Drop zone */}
            <div
                className={`upload-dropzone ${isDragging ? 'drag-over' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="upload-dropzone-content">
                    <div className="upload-dropzone-icon">
                        <UploadCloud size={32} />
                    </div>
                    <h3>Drop video files here</h3>
                    <p>Or click to browse • Multiple files supported</p>
                    <div className="upload-dropzone-formats">
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
                    multiple
                    onChange={handleFileChange}
                />
            </div>

            {/* Queue header */}
            {jobs.length > 0 && (
                <div className="upload-queue-header">
                    <div className="upload-queue-stats">
                        <span>{activeUploads} active</span>
                        <span className="upload-queue-stats-dot">•</span>
                        <span>{completedUploads} completed</span>
                        <span className="upload-queue-stats-dot">•</span>
                        <span>{jobs.length} total</span>
                    </div>
                    {completedUploads > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={clearCompleted}>
                            <Trash2 size={14} /> Clear completed
                        </button>
                    )}
                </div>
            )}

            {/* Job list */}
            <div className="upload-queue-list">
                {jobs.map(job => (
                    <UploadItem
                        key={job.id}
                        job={job}
                        onRemove={removeJob}
                        onStatusChange={updateJobStatus}
                        onMetadataUpdate={updateJobMetadata}
                        onAttachFile={attachFileToJob}
                    />
                ))}
            </div>

            {jobs.length === 0 && (
                <div className="upload-queue-empty">
                    <p>No uploads in queue. Drag files above to get started!</p>
                </div>
            )}
        </div>
    );
}
