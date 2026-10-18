'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileType, AlertCircle } from 'lucide-react';

interface CsvDropzoneProps {
  onFileSelect: (file: File) => void;
}

export function CsvDropzone({ onFileSelect }: CsvDropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      setError('Please upload a valid CSV file.');
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('File exceeds the 10MB maximum limit.');
        return;
      }
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <UploadCloud size={32} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isDragActive ? 'Drop your CSV here' : 'Drag & drop your CSV file'}
        </h3>
        <p className="text-muted-foreground mb-6">
          or click to browse your files
        </p>
        
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
            <FileType size={14} />
            <span>CSV files only</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
            <span>Max 10 MB</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
