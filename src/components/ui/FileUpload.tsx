'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface FileUploadProps {
  onUpload: (file: File) => Promise<{ url: string; id: string }>;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  folder?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
  result?: { url: string; id: string };
}

export function FileUpload({
  onUpload,
  accept = 'image/*',
  maxSize = 5,
  multiple = false,
  disabled = false,
  className = '',
  folder = 'voiceover-studios'
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file type
      if (accept && file.type && !file.type.match(accept.replace('*', '.*'))) {
        return false;
      }
      
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to uploading state
    const newUploadingFiles = validFiles.map(file => ({
      file,
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Start uploads
    validFiles.forEach((file, index) => {
      uploadFile(file, uploadingFiles.length + index);
    });
  };

  const uploadFile = async (file: File, index: number) => {
    try {
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 10 } : item
        )
      );

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, progress: 90 } : item
        )
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index 
            ? { 
                ...item, 
                progress: 100, 
                result: { url: result.image.url, id: result.image.id } 
              } 
            : item
        )
      );

      // Call the onUpload callback
      await onUpload(file);

    } catch (error) {
      setUploadingFiles(prev => 
        prev.map((item, i) => 
          i === index 
            ? { 
                ...item, 
                error: error instanceof Error ? error.message : 'Upload failed' 
              } 
            : item
        )
      );
    }
  };

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploadingFiles(prev => 
      prev.filter(item => item.progress < 100 && !item.error)
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={`p-3 rounded-full ${
              disabled ? 'bg-gray-100' : 'bg-gray-100'
            }`}>
              <Upload className={`w-8 h-8 ${
                disabled ? 'text-gray-400' : 'text-gray-600'
              }`} />
            </div>
          </div>

          <div>
            <h3 className={`text-lg font-medium ${
              disabled ? 'text-gray-400' : 'text-text-primary'
            }`}>
              {isDragOver ? 'Drop files here' : 'Upload Images'}
            </h3>
            <p className={`text-sm mt-1 ${
              disabled ? 'text-gray-400' : 'text-text-secondary'
            }`}>
              Drag and drop images here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={`font-medium ${
                  disabled 
                    ? 'text-gray-400' 
                    : 'text-primary-600 hover:text-primary-700'
                }`}
              >
                browse files
              </button>
            </p>
          </div>

          <div className={`text-xs ${
            disabled ? 'text-gray-400' : 'text-text-secondary'
          }`}>
            <p>Supported formats: JPEG, PNG, WebP</p>
            <p>Maximum file size: {maxSize}MB</p>
            {multiple && <p>You can upload multiple files at once</p>}
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text-primary">
              Uploading Files ({uploadingFiles.length})
            </h4>
            {uploadingFiles.some(f => f.progress === 100 || f.error) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCompleted}
              >
                Clear Completed
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {uploadingFile.error ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : uploadingFile.progress === 100 ? (
                    <ImageIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {(uploadingFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {uploadingFile.error ? (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadingFile.error}
                    </p>
                  ) : uploadingFile.progress < 100 ? (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadingFile.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600 mt-1">
                      Upload complete
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeUploadingFile(index)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
