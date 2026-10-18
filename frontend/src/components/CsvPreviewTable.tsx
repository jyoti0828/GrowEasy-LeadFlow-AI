'use client';
import { PreviewData } from '@/components/ImportStepper';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CsvPreviewTableProps {
  data: PreviewData;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CsvPreviewTable({ data, onConfirm, onCancel }: CsvPreviewTableProps) {
  const { file, headers, records } = data;
  const previewLimit = 10;
  const previewRecords = records.slice(0, previewLimit);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* File Info Card */}
      <div className="bg-muted/40 border rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h4 className="font-medium text-sm">{file.name}</h4>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>{records.length} records</span>
              <span>•</span>
              <span>{headers.length} columns</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">Your file is being previewed locally.</p>
          <p>AI processing starts only after you confirm the import. No data has been sent to our servers yet.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 border rounded-lg overflow-hidden bg-card">
        <div className="p-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground flex justify-between">
          <span>Previewing {previewRecords.length} of {records.length} records</span>
          <span>Original column names preserved</span>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="min-w-max">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-r bg-muted/30 w-12 text-center">#</th>
                  {headers.map((header, i) => (
                    <th key={i} className="px-4 py-3 font-medium whitespace-nowrap border-b border-r max-w-[200px] truncate" title={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRecords.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 border-r text-muted-foreground text-xs text-center bg-muted/10">
                      {rowIndex + 1}
                    </td>
                    {headers.map((header, colIndex) => {
                      const val = row[header] as string | undefined;
                      const isEmpty = val === null || val === undefined || val === '';
                      return (
                        <td key={colIndex} className="px-4 py-2 border-r max-w-[200px] truncate" title={val}>
                          {isEmpty ? <span className="text-muted-foreground/40 italic text-xs">Empty</span> : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} className="gap-2">
          <CheckCircle2 size={16} />
          Confirm Import
        </Button>
      </div>
    </div>
  );
}
