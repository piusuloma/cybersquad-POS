import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

export function PauseSLAModal({ open, onClose, dispute }) {
  const [reason, setReason] = useState("");

  const handlePause = () => {
    if (!reason.trim()) {
      alert("Please provide a justification for pausing the SLA");
      return;
    }

    alert(
      `SLA paused for ${dispute.id}\nReason: ${reason}\n\nThis action has been logged in the audit trail.`,
    );
    onClose();
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pause SLA Timeline</DialogTitle>
          <DialogDescription>
            Temporarily pause the SLA timer for {dispute.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900">
                Pause SLA with Caution
              </p>
              <p className="text-yellow-700 mt-1">
                Pausing the SLA should only be done in exceptional
                circumstances. All pause actions are logged and require
                justification.
              </p>
            </div>
          </div>

          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispute ID:</span>
              <span className="font-medium">{dispute.disputeId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Stage:</span>
              <span className="font-medium">{dispute.stage}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Justification (Required) *</Label>
            <Textarea
              id="reason"
              placeholder="Provide detailed reason for pausing SLA (e.g., awaiting external verification, legal review required, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This justification will be logged in the audit trail and visible
              to compliance reviewers.
            </p>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
            <p className="font-medium mb-1">Audit Trail Entry:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Action: SLA Paused</li>
              <li>• Performed by: Current Admin</li>
              <li>• Timestamp: {new Date().toLocaleString()}</li>
              <li>• Reason: {reason || "(Not provided yet)"}</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePause} disabled={!reason.trim()}>
            Pause SLA Timer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
