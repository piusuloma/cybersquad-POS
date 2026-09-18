import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { UserCheck, Briefcase } from 'lucide-react';
import { useState } from 'react';


const supportAdmins = [
  { id: 1, name: 'Michael Chen', email: 'michael@cybersquad.com', activeDisputes: 5, role: 'Support Admin' },
  { id: 2, name: 'Emma Wilson', email: 'emma@cybersquad.com', activeDisputes: 3, role: 'Support Admin' },
  { id: 3, name: 'Sarah Johnson', email: 'sarah@cybersquad.com', activeDisputes: 7, role: 'Senior Support' },
  { id: 4, name: 'David Martinez', email: 'david@cybersquad.com', activeDisputes: 4, role: 'Support Admin' },
];

export function AssignHandlerModal({ open, onClose, disputeId }) {
  const [selectedAdmin, setSelectedAdmin] = useState('');

  const handleAssign = () => {
    const admin = supportAdmins.find(a => a.id.toString() === selectedAdmin);
    if (admin) {
      alert(`Dispute ${disputeId} assigned to ${admin.name}`);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Handler</DialogTitle>
          <DialogDescription>
            Select a support admin to handle dispute {disputeId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={selectedAdmin} onValueChange={setSelectedAdmin}>
            {supportAdmins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value={admin.id.toString()} id={`admin-${admin.id}`} className="mt-1" />
                <Label
                  htmlFor={`admin-${admin.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <p className="font-medium">{admin.name}</p>
                        <Badge variant="outline">{admin.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {admin.activeDisputes} active
                      </span>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedAdmin}>
            Assign Handler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
