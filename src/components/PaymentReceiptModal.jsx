import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Download, CheckCircle2 } from 'lucide-react';


export function PaymentReceiptModal({ open, onClose, payment }) {
  const isDeposit = payment.type === 'deposit';
  const isFinal = payment.type === 'final';

  const handleDownload = () => {
    // Mock download functionality
    alert('Receipt downloaded successfully!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>Transaction receipt for {payment.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center py-6 border-b">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium">Payment Successful</h3>
            <Badge variant={isDeposit ? 'secondary' : 'default'} className="mt-2">
              {isDeposit ? 'Initial Deposit' : 'Final Payment'}
            </Badge>
            <p className="text-3xl font-semibold mt-2 text-purple-600">{payment.amount}</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Receipt Number</p>
                <p className="font-medium">{payment.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-medium">{payment.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                <p className="font-medium">{payment.method}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Job Reference</p>
                <p className="font-medium">{payment.job}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Bill To</h4>
              <div className="text-sm">
                <p className="font-medium">{payment.customer}</p>
                <p className="text-muted-foreground">customer@example.com</p>
                <p className="text-muted-foreground">+234 801 234 5678</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              {isDeposit && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Deposit</span>
                    <span>{payment.amount}</span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded text-xs text-purple-900">
                    This deposit secures your booking. The technician will diagnose the issue and provide a quote. 
                    If you proceed with the repair, this amount will be deducted from the total cost.
                  </div>
                </>
              )}
              {isFinal && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Service Cost</span>
                    <span>{payment.amount}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>Initial Deposit (Paid Earlier)</span>
                    <span>-{payment.depositAmount || '$50'}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Balance Charged</span>
                    <span>${(parseFloat(payment.amount.replace('$', '')) - parseFloat((payment.depositAmount || '$50').replace('$', ''))).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="p-3 bg-success/10 rounded text-xs text-success-700">
                    Your repair has been completed successfully. This payment includes the remaining balance after deducting your initial deposit.
                  </div>
                </>
              )}
              {!isFinal && (
                <>
                  <Separator />
                  <div className="flex justify-between font-medium text-base">
                    <span>Total Paid</span>
                    <span className="text-purple-600">{payment.amount}</span>
                  </div>
                </>
              )}
              {isFinal && (
                <div className="flex justify-between font-medium text-base pt-2">
                  <span>Total Paid (Including Deposit)</span>
                  <span className="text-purple-600">{payment.amount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground">
              Thank you for using Cybersquad! This is an official receipt for your payment.
            </p>
            {isDeposit && (
              <p className="text-xs text-muted-foreground mt-2">
                Your technician will contact you shortly to schedule the diagnosis.
              </p>
            )}
            {isFinal && (
              <p className="text-xs text-muted-foreground mt-2">
                We hope you're satisfied with our service. Please rate your experience!
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
