'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/ui/FileUpload';

export default function TestUploadPage() {
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'test-uploads');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadResult(result);
      setError(null);
      
      return { url: result.image.url, id: result.image.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Cloudinary Upload Test
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Image Upload</h2>
          
          <FileUpload
            onUpload={handleUpload}
            accept="image/*"
            maxSize={5}
            folder="test-uploads"
          />
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">Error: {error}</p>
            </div>
          )}
          
          {uploadResult && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">Upload Successful!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>URL:</strong> {uploadResult.image.url}</p>
                <p><strong>Size:</strong> {uploadResult.image.size} bytes</p>
                <p><strong>Format:</strong> {uploadResult.image.format}</p>
                <p><strong>Dimensions:</strong> {uploadResult.image.width} x {uploadResult.image.height}</p>
              </div>
              
              <div className="mt-4">
                <img 
                  src={uploadResult.image.url} 
                  alt="Uploaded image" 
                  className="max-w-full h-auto rounded border"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
