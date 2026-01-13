import { useState } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ImportPlanModal = ({ onClose, onSuccess }) => {
  const { importPlanData } = usePlan();
  const [planName, setPlanName] = useState('');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setImportData(content);
        
        const parsed = JSON.parse(content);
        if (parsed.name && !planName) {
          setPlanName(parsed.name);
        }
      } catch (err) {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!importData.trim()) {
      setError('Please provide plan data to import');
      return;
    }

    if (!planName.trim()) {
      setError('Plan name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsedData = JSON.parse(importData);
      await importPlanData(parsedData, planName.trim());
      onSuccess?.();
    } catch (err) {
      if (err.name === 'SyntaxError') {
        setError('Invalid JSON format. Please check your plan data.');
      } else {
        setError(err.message || 'Failed to import plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="planName">Plan Name *</Label>
            <Input
              id="planName"
              type="text"
              placeholder="Enter a name for the imported plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fileUpload">Upload Plan File</Label>
            <Input
              id="fileUpload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="border-dashed cursor-pointer"
            />
            <p className="text-muted-foreground text-sm">Select a JSON file exported from MitPlan (supports all versions)</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="importData">Or Paste Plan Data</Label>
            <Textarea
              id="importData"
              placeholder="Paste your plan JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="font-mono min-h-[200px]"
            />
            <p className="text-muted-foreground text-sm">Paste the JSON data from an exported plan (supports all versions)</p>
          </div>

          {error && (
            <div className="text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Importing...' : 'Import Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPlanModal;
