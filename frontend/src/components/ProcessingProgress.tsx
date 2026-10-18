'use client';
import { Loader2 } from 'lucide-react';

export function ProcessingProgress() {
  return (
    <div className="w-full max-w-md mx-auto text-center space-y-8 py-12">
      <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
        <Loader2 className="w-8 h-8 text-primary animate-pulse" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Processing Your Leads</h3>
        <p className="text-muted-foreground text-sm">
          Our AI is analyzing headers, detecting patterns, and mapping your data to the GrowEasy CRM schema. This may take a moment.
        </p>
      </div>
      
      <div className="space-y-3 text-left bg-muted/30 p-6 rounded-lg border">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="font-medium">Uploading & Parsing CSV</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="font-medium">Normalizing Data Structure</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="font-medium">AI Semantic Field Mapping</span>
        </div>
      </div>
    </div>
  );
}
