import { ImportStepper } from '@/components/ImportStepper';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex-1 flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Import Leads</h1>
        <p className="text-muted-foreground text-lg">Turn any CSV into CRM-ready leads with intelligent AI mapping.</p>
      </div>
      
      <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <ImportStepper />
      </div>
    </div>
  );
}
