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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { AlertTriangle, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { useState } from "react";

export function ResolveSLAModal({ open, onClose, dispute }) {
  const [outcome, setOutcome] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [resolution, setResolution] = useState("");

  const handleResolve = () => {
    if (!outcome) {
      alert("Please select a resolution outcome");
      return;
    }

    if (!resolution.trim()) {
      alert("Please provide resolution notes");
      return;
    }

    if (outcome === "technician-penalty" && !penaltyAmount) {
      alert("Please specify penalty amount");
      return;
    }

    if (outcome === "goodwill-credit" && !creditAmount) {
      alert("Please specify credit amount");
      return;
    }

    let summary = `Dispute ${dispute.id} resolved\n\nOutcome: ${outcome}\nResolution: ${resolution}\n`;

    if (outcome === "technician-penalty") {
      summary += `Penalty Amount: $${penaltyAmount}\nTechnician payout adjusted: ${dispute.payoutHeld} - $${penaltyAmount}\n`;
    } else if (outcome === "goodwill-credit") {
      summary += `Goodwill Credit: $${creditAmount}\nCustomer account credited\n`;
    }

    summary +=
      "\nNotifications sent to:\n- Customer\n- Technician\n- Finance team\n\nAudit log updated.";

    alert(summary);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setOutcome("");
    setPenaltyAmount("");
    setCreditAmount("");
    setResolution("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resolve Dispute</DialogTitle>
          <DialogDescription>
            Final resolution for {dispute.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispute ID:</span>
              <span className="font-medium">{dispute.disputeId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{dispute.customer}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Technician:</span>
              <span className="font-medium">{dispute.technician}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payout Held:</span>
              <span className="font-medium">{dispute.payoutHeld}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Resolution Outcome *</Label>
            <RadioGroup value={outcome} onValueChange={setOutcome}>
              <div className="space-y-3">
                {/* Technician Penalty */}
                <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-purple-200 transition-colors">
                  <RadioGroupItem
                    value="technician-penalty"
                    id="penalty"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="penalty"
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span>Technician Penalty</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deduct penalty from technician payout. Customer complaint
                      validated.
                    </p>

                    {outcome === "technician-penalty" && (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="penaltyAmount">Penalty Amount *</Label>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <Input
                            id="penaltyAmount"
                            type="number"
                            placeholder="0.00"
                            value={penaltyAmount}
                            onChange={(e) => setPenaltyAmount(e.target.value)}
                            className="max-w-xs"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Max: {dispute.payoutHeld}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goodwill Credit */}
                <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-purple-200 transition-colors">
                  <RadioGroupItem
                    value="goodwill-credit"
                    id="credit"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="credit"
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <span>Job Adjustment / Goodwill Credit</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Provide customer credit for inconvenience. No penalty to
                      technician.
                    </p>

                    {outcome === "goodwill-credit" && (
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="creditAmount">Credit Amount *</Label>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <Input
                            id="creditAmount"
                            type="number"
                            placeholder="0.00"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(e.target.value)}
                            className="max-w-xs"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Typical goodwill amount: $20 - $50
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispute Rejected */}
                <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-purple-200 transition-colors">
                  <RadioGroupItem
                    value="dispute-rejected"
                    id="rejected"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="rejected"
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <XCircle className="w-5 h-5 text-gray-600" />
                      <span>Dispute Rejected</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Customer complaint not validated. Technician payout
                      proceeds normally.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution Notes *</Label>
            <Textarea
              id="resolution"
              placeholder="Provide detailed explanation of the resolution decision, evidence reviewed, and reasoning..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This will be shared with both parties and stored in the audit log
            </p>
          </div>

          {outcome && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <h4>Resolution Summary</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outcome:</span>
                  <span className="font-medium">
                    {outcome === "technician-penalty" && "Technician Penalty"}
                    {outcome === "goodwill-credit" && "Goodwill Credit"}
                    {outcome === "dispute-rejected" && "Dispute Rejected"}
                  </span>
                </div>

                {outcome === "technician-penalty" && penaltyAmount && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Penalty Amount:
                      </span>
                      <span className="font-medium text-red-600">
                        ${penaltyAmount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Technician Receives:
                      </span>
                      <span className="font-medium">
                        $
                        {(
                          parseFloat(dispute.payoutHeld.replace("$", "")) -
                          parseFloat(penaltyAmount || "0")
                        ).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {outcome === "goodwill-credit" && creditAmount && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Customer Credit:
                      </span>
                      <span className="font-medium text-blue-600">
                        ${creditAmount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Technician Payout:
                      </span>
                      <span className="font-medium">
                        {dispute.payoutHeld} (Full)
                      </span>
                    </div>
                  </>
                )}

                {outcome === "dispute-rejected" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Technician Payout:
                    </span>
                    <span className="font-medium">
                      {dispute.payoutHeld} (Full)
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-xs font-medium mb-1">Automated Actions:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ Customer notification sent</li>
                  <li>✓ Technician notification sent</li>
                  <li>✓ Finance team alerted for payout processing</li>
                  <li>✓ Dispute marked as resolved in system</li>
                  <li>✓ Resolution logged in audit trail</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!outcome || !resolution.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Resolve Dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
