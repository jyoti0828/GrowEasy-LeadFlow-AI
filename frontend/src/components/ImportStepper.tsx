'use client';
import { useState, useCallback } from 'react';
import { CsvDropzone } from '@/components/CsvDropzone';
import { CsvPreviewTable } from '@/components/CsvPreviewTable';
import { ProcessingProgress } from '@/components/ProcessingProgress';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { Check } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

export type Step = 'UPLOAD' | 'PREVIEW' | 'PROCESSING' | 'RESULTS';

export interface PreviewData {
  file: File;
  headers: string[];
  records: Record<string, unknown>[];
}

const steps = [
  { id: 'UPLOAD', label: 'Upload' },
  { id: 'PREVIEW', label: 'Preview' },
  { id: 'PROCESSING', label: 'AI Mapping' },
  { id: 'RESULTS', label: 'Results' }
];

export function ImportStepper() {
  const [currentStep, setCurrentStep] = useState<Step>('UPLOAD');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [resultsData, setResultsData] = useState<unknown | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (results.errors.length > 0 && results.errors.some(e => e.type === 'Delimiter')) {
          toast.error('Invalid CSV format');
          return;
        }
        if (!results.meta.fields || results.meta.fields.length === 0) {
          toast.error('CSV file has no headers');
          return;
        }
        if (results.data.length === 0) {
          toast.error('CSV file contains no records');
          return;
        }
        
        setPreviewData({
          file,
          headers: results.meta.fields,
          records: results.data as Record<string, unknown>[]
        });
        setCurrentStep('PREVIEW');
      },
      error: () => {
        toast.error('Failed to parse CSV file locally');
      }
    });
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!previewData?.file) return;
    if (currentStep === 'PROCESSING') return; // Prevent double-submit
    
    setCurrentStep('PROCESSING');
    
    const formData = new FormData();
    formData.append('file', previewData.file);

    try {
      // In a real production app we'd use NEXT_PUBLIC_API_BASE_URL
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const data = await response.json();
      setResultsData(data);
      setCurrentStep('RESULTS');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'An error occurred during import');
      } else {
        toast.error('An error occurred during import');
      }
      setCurrentStep('PREVIEW'); // Let them try again or cancel
    }
  }, [previewData, currentStep]);

  const handleCancel = useCallback(() => {
    setPreviewData(null);
    setCurrentStep('UPLOAD');
  }, []);

  const handleImportAnother = useCallback(() => {
    setPreviewData(null);
    setResultsData(null);
    setCurrentStep('UPLOAD');
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Stepper Header */}
      <div className="border-b px-6 py-4 bg-muted/30">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((step, index) => {
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
            const isCurrent = step.id === currentStep;
            
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors
                    ${isCompleted ? 'bg-accent border-accent text-accent-foreground' : 
                      isCurrent ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}>
                    {isCompleted ? <Check size={16} /> : (index + 1)}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block flex-1 h-0.5 mx-2 md:mx-4 ${isCompleted ? 'bg-accent' : 'bg-muted-foreground/20'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden p-6 flex flex-col">
        {currentStep === 'UPLOAD' && (
          <div className="flex-1 flex items-center justify-center">
            <CsvDropzone onFileSelect={handleFileUpload} />
          </div>
        )}
        
        {currentStep === 'PREVIEW' && previewData && (
          <CsvPreviewTable 
            data={previewData} 
            onConfirm={handleConfirmImport} 
            onCancel={handleCancel} 
          />
        )}

        {currentStep === 'PROCESSING' && (
          <div className="flex-1 flex items-center justify-center">
            <ProcessingProgress />
          </div>
        )}

        {currentStep === 'RESULTS' && resultsData !== null && (
          <ResultsDashboard 
            data={resultsData as Parameters<typeof ResultsDashboard>[0]['data']} 
            onImportAnother={handleImportAnother} 
          />
        )}
      </div>
    </div>
  );
}

