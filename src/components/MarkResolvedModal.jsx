import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';


export function MarkResolvedModal({ open, onClose, disputeId }) {
  const [resolution, setResolution] = useState('');
  const [outcome, setOutcome] = useState('favor-customer');

  const handleMarkResolved = () => {
    alert(`Dispute ${disputeId} marked as resolved`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Mark Dispute as Resolved
          </DialogTitle>
          <DialogDescription>
            Provide resolution details for dispute {disputeId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Resolution Outcome</Label>
            <RadioGroup value={outcome} onValueChange={setOutcome}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="favor-customer" id="favor-customer" />
                <Label htmlFor="favor-customer" className="flex-1 cursor-pointer">
                  <p className="font-medium">In Favor of Customer</p>
                  <p className="text-sm text-muted-foreground">Customer's complaint was valid</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="favor-technician" id="favor-technician" />
                <Label htmlFor="favor-technician" className="flex-1 cursor-pointer">
                  <p className="font-medium">In Favor of Technician</p>
                  <p className="text-sm text-muted-foreground">Technician's work met standards</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="mutual" id="mutual" />
                <Label htmlFor="mutual" className="flex-1 cursor-pointer">
                  <p className="font-medium">Mutual Agreement</p>
                  <p className="text-sm text-muted-foreground">Both parties reached an agreement</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="no-fault" id="no-fault" />
                <Label htmlFor="no-fault" className="flex-1 cursor-pointer">
                  <p className="font-medium">No Fault / Misunderstanding</p>
                  <p className="text-sm text-muted-foreground">Issue was a miscommunication</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Resolution Summary</Label>
            <Textarea
              placeholder="Describe how the dispute was resolved..."
              className="min-h-[150px]"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This summary will be visible to both parties and stored in the dispute record.
            </p>
          </div>

          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <h4 className="text-sm font-medium text-success mb-2">Actions Taken</h4>
            <div className="space-y-1 text-sm text-success-700">
              <p>• Both parties will be notified of the resolution</p>
              <p>• The dispute will be moved to resolved status</p>
              <p>• Resolution details will be logged in the system</p>
              <p>• Parties can view the outcome in their dashboards</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMarkResolved} disabled={!resolution.trim()}>
            Mark as Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
