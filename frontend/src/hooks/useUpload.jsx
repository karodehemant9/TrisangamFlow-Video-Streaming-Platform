import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UploadContext = createContext(null);
const STORAGE_KEY = 'trisangamflow_upload_queue';
const MAX_CONCURRENT = 2;

function recalcAutoStart(jobList) {
    const activeCount = jobList.filter(j => j.status === 'uploading').length;
    let slotsAvailable = MAX_CONCURRENT - activeCount;

    return jobList.map(j => {
        if (j.status === 'pending' && slotsAvailable > 0 && !j.autoStart) {
            slotsAvailable--;
            return { ...j, autoStart: true };
        }
        return j;
    });
}

export function UploadProvider({ children }) {
    const [jobs, setJobs] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        const savedStr = localStorage.getItem(STORAGE_KEY);
        if (savedStr) {
            try {
                const savedJobs = JSON.parse(savedStr);
                // Jobs restored from storage lose their 'File' object.
                // If they were actively uploading or pending, mark them as paused.
                const restoredJobs = savedJobs.map(job => {
                    if (['pending', 'uploading'].includes(job.status)) {
                        return { ...job, status: 'paused', autoStart: false };
                    }
                    return { ...job, autoStart: false };
                });
                setJobs(restoredJobs);
            } catch (err) {
                console.error("Failed to parse upload queue from storage", err);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to localStorage whenever jobs change (excluding the non-serializable File object)
    useEffect(() => {
        if (!isInitialized) return;
        
        const serializableJobs = jobs.map(job => {
            const { file, ...rest } = job; // strip out File object
            return {
                ...rest,
                // We keep a dummy reference of file metadata to render the UI
                fileMeta: file ? { name: file.name, size: file.size, type: file.type } : job.fileMeta
            };
        });
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableJobs));
    }, [jobs, isInitialized]);

    const addFiles = useCallback((fileList) => {
        const newJobs = [];
        for (const file of fileList) {
            const isVideoType = file.type.startsWith('video/');
            const isMkvExtension = file.name.toLowerCase().endsWith('.mkv');
            
            if (!isVideoType && !isMkvExtension) continue;
            if (file.size > 5 * 1024 * 1024 * 1024) continue;

            const finalType = file.type || (isMkvExtension ? 'video/x-matroska' : 'video/mp4');
            const fileWithType = file.type ? file : new File([file], file.name, { type: finalType });

            newJobs.push({
                id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file: fileWithType,
                fileMeta: { name: fileWithType.name, size: fileWithType.size, type: fileWithType.type },
                title: fileWithType.name.split('.').slice(0, -1).join('.'),
                status: 'pending',
                autoStart: false,
                uploadId: null,
                videoId: null
            });
        }

        if (newJobs.length === 0) return;

        setJobs(prev => recalcAutoStart([...prev, ...newJobs]));
    }, []);

    const updateJobStatus = useCallback((jobId, newStatus) => {
        setJobs(prev => {
            const updated = prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j);
            if (['done', 'failed', 'transcoding', 'paused'].includes(newStatus)) {
                return recalcAutoStart(updated);
            }
            return updated;
        });
    }, []);

    const updateJobMetadata = useCallback((jobId, metadata) => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...metadata } : j));
    }, []);

    const attachFileToJob = useCallback((jobId, file) => {
        setJobs(prev => prev.map(j => {
            if (j.id === jobId) {
                return { ...j, file };
            }
            return j;
        }));
    }, []);

    const removeJob = useCallback((jobId) => {
        setJobs(prev => recalcAutoStart(prev.filter(j => j.id !== jobId)));
    }, []);

    const clearCompleted = useCallback(() => {
        setJobs(prev => prev.filter(j => j.status !== 'done' && j.status !== 'failed'));
    }, []);

    const activeCount = jobs.filter(j => !['done', 'failed', 'transcoding'].includes(j.status)).length;

    return (
        <UploadContext.Provider value={{
            jobs,
            addFiles,
            updateJobStatus,
            updateJobMetadata,
            attachFileToJob,
            removeJob,
            clearCompleted,
            activeCount,
        }}>
            {children}
        </UploadContext.Provider>
    );
}

export function useUpload() {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
}
