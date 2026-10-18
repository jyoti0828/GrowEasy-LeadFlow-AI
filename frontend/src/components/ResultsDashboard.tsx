'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, CheckCircle, XCircle, FileSpreadsheet, Activity } from 'lucide-react';
import Papa from 'papaparse';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export interface CrmRecord {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: string;
  crm_note?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
  [key: string]: unknown;
}

export interface SkippedRecord {
  rowNumber: number;
  reason: string;
  [key: string]: unknown;
}

export interface MappingInsight {
  sourceColumn: string;
  targetField: string;
  confidence: string;
  mappingMethod: string;
  explanation: string;
}

interface ResultsDashboardProps {
  data: {
    success: boolean;
    summary: {
      totalRows: number;
      totalImported: number;
      totalSkipped: number;
      successRate: number;
      sourceColumnsDetected: number;
      crmFieldsMapped: number;
    };
    dataQuality: {
      score: number;
      label: string;
      observations: string[];
    };
    records: CrmRecord[];
    skippedRecords: SkippedRecord[];
    mappingInsights: MappingInsight[];
    duplicateInsights: {
      possibleDuplicateCount: number;
      groups: { emails?: string[]; phones?: string[]; records: CrmRecord[] }[];
    };
    processing: {
      totalBatches: number;
      successfulBatches: number;
      failedBatches: number;
    };
  };
  onImportAnother: () => void;
}

export function ResultsDashboard({ data, onImportAnother }: ResultsDashboardProps) {
  const { summary, dataQuality, records, skippedRecords, mappingInsights, duplicateInsights } = data;

  const downloadCsv = () => {
    if (!records || records.length === 0) return;
    
    // Ensure strict column order for the final CSV
    const crmFields = [
      'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
      'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 
      'crm_note', 'data_source', 'possession_time', 'description'
    ];

    // Map records to ensure only these fields exist, in this order
    const orderedRecords = records.map((record: CrmRecord) => {
      const ordered: Record<string, string> = {};
      crmFields.forEach(field => {
        // Simple sanitization against formula injection
        let val = (record[field] as string) || '';
        if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
          val = `'${val}`;
        }
        ordered[field] = val;
      });
      return ordered;
    });

    const csvStr = Papa.unparse(orderedRecords);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `groweasy_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const getScoreColor = (label: string) => {
    switch(label) {
      case 'Excellent': return 'text-accent';
      case 'Good': return 'text-accent/80';
      case 'Needs Review': return 'text-amber-500';
      case 'Poor': return 'text-destructive';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6">
      
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <FileSpreadsheet size={16} />
              <span>Total Uploaded</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalRows}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <CheckCircle size={16} className="text-accent" />
              <span>Successfully Imported</span>
            </div>
            <div className="text-2xl font-bold text-accent">{summary.totalImported}</div>
            <div className="text-xs text-muted-foreground mt-1">{summary.successRate}% success rate</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <XCircle size={16} className="text-destructive" />
              <span>Skipped Records</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{summary.totalSkipped}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <Activity size={16} />
              <span>Data Quality</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(dataQuality.label)}`}>
              {dataQuality.score} <span className="text-sm font-normal">/ 100</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{dataQuality.label}</div>
          </CardContent>
        </Card>
      </div>

      {(duplicateInsights?.possibleDuplicateCount ?? 0) > 0 && (
        <div role="alert" className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-lg border border-amber-200 dark:border-amber-900 flex justify-between items-center">
          <div>
            <p className="font-medium">Duplicate Warning</p>
            <p className="text-sm">{duplicateInsights.possibleDuplicateCount} potential duplicate contacts were detected based on matching email or mobile number.</p>
          </div>
        </div>
      )}

      {/* Tabs Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-card border rounded-lg overflow-hidden">
        <Tabs defaultValue="parsed" className="flex-1 flex flex-col">
          <div className="border-b px-4 py-2 bg-muted/20 flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="parsed">Parsed Records ({records.length})</TabsTrigger>
              <TabsTrigger value="skipped">Skipped ({skippedRecords.length})</TabsTrigger>
              <TabsTrigger value="insights">Mapping Insights</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onImportAnother}>
                <RefreshCw size={14} className="mr-2" />
                Import Another
              </Button>
              <Button
                size="sm"
                onClick={downloadCsv}
                disabled={records.length === 0}
                aria-label={records.length === 0 ? 'Download CRM CSV (no records to download)' : 'Download CRM CSV'}
                title={records.length === 0 ? 'No successfully imported records available for download' : 'Download CRM CSV'}
              >
                <Download size={14} className="mr-2" />
                Download CRM CSV
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <TabsContent value="parsed" className="m-0 p-0 outline-none">
              <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 h-full">
                <div className="min-w-max p-4">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/30">
                      <tr>
                        {['Name', 'Email', 'Mobile', 'Company', 'Status', 'Data Source', 'Note'].map(h => (
                          <th key={h} className="px-4 py-3 font-medium border-b">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 100).map((r: CrmRecord, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{r.name || '-'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.email || '-'}</td>
                          <td className="px-4 py-2">{r.mobile_without_country_code ? `${r.country_code || ''} ${r.mobile_without_country_code}` : '-'}</td>
                          <td className="px-4 py-2">{r.company || '-'}</td>
                          <td className="px-4 py-2">
                            {r.crm_status ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                {r.crm_status}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2">
                            {r.data_source && <Badge variant="outline" className="font-normal">{r.data_source}</Badge>}
                          </td>
                          <td className="px-4 py-2 max-w-[200px] truncate" title={r.crm_note}>{r.crm_note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {records.length > 100 && (
                    <div className="p-4 text-center text-sm text-muted-foreground italic">
                      Showing first 100 records. Download CSV to see all.
                    </div>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="skipped" className="m-0 p-0 outline-none">
              <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 h-full">
                <div className="min-w-max p-4">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 font-medium border-b w-16 text-center">Row</th>
                        <th className="px-4 py-3 font-medium border-b w-1/3">Skip Reason</th>
                        <th className="px-4 py-3 font-medium border-b">Original Data Snapshot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skippedRecords.map((r: SkippedRecord, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/30 text-muted-foreground">
                          <td className="px-4 py-2 text-center border-r bg-muted/10">{r.rowNumber}</td>
                          <td className="px-4 py-2 text-destructive font-medium border-r">{r.reason}</td>
                          <td className="px-4 py-2 text-xs truncate max-w-lg font-mono">
                            {JSON.stringify(r.originalRecord)}
                          </td>
                        </tr>
                      ))}
                      {skippedRecords.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                            No records were skipped.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="m-0 p-0 outline-none">
              <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 h-full">
                <div className="p-6">
                  <div className="mb-6 space-y-2">
                    <h3 className="font-medium text-lg">AI Mapping Insights</h3>
                    <p className="text-sm text-muted-foreground">See how the system intelligently mapped your original columns to the GrowEasy CRM format.</p>
                  </div>
                  
                  <div className="grid gap-4">
                    {mappingInsights.map((insight: MappingInsight, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
                        <div className="w-1/3 space-y-1">
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Source Column</div>
                          <div className="font-medium">{insight.sourceColumn}</div>
                        </div>
                        <div className="w-1/3 space-y-1">
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Mapped To</div>
                          <div className="font-medium text-primary flex items-center gap-2">
                            {insight.targetField}
                            <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                              {insight.confidence}
                            </Badge>
                          </div>
                        </div>
                        <div className="w-1/3 space-y-1">
                          <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Reasoning</div>
                          <div className="text-sm text-muted-foreground">{insight.explanation}</div>
                        </div>
                        
                        <div className="w-1/3 space-y-2">
                          <Badge variant={insight.confidence === 'high' ? 'default' : insight.confidence === 'medium' ? 'secondary' : 'outline'}
                            className={insight.confidence === 'high' ? 'bg-accent hover:bg-accent/80' : ''}>
                            {insight.confidence} confidence
                          </Badge>
                          <p className="text-xs text-muted-foreground">{insight.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
