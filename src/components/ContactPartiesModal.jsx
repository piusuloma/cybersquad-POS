import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Mail, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';

export function ContactPartiesModal({ open, onClose, dispute }) {
  const [contactCustomer, setContactCustomer] = useState(true);
  const [contactTechnician, setContactTechnician] = useState(true);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const recipients = [];
    if (contactCustomer) recipients.push(dispute.customer);
    if (contactTechnician) recipients.push(dispute.technician);
    
    alert(`Message sent to ${recipients.join(' and ')}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contact Parties</DialogTitle>
          <DialogDescription>
            Send a message to the involved parties for dispute {dispute.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Recipients</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox
                  id="customer"
                  checked={contactCustomer}
                  onCheckedChange={(checked) => setContactCustomer(checked === true)}
                />
                <Label htmlFor="customer" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">{dispute.customer} (Customer)</p>
                    <p className="text-sm text-muted-foreground">customer@example.com</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <Checkbox
                  id="technician"
                  checked={contactTechnician}
                  onCheckedChange={(checked) => setContactTechnician(checked === true)}
                />
                <Label htmlFor="technician" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">{dispute.technician} (Technician)</p>
                    <p className="text-sm text-muted-foreground">technician@example.com</p>
                  </div>
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contact Method</Label>
            <Select defaultValue="email">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    SMS
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Email & SMS
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message here..."
              className="min-h-[200px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This message will be sent to the selected recipients regarding the dispute.
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-900">
              <strong>Note:</strong> All communication will be logged in the dispute timeline for future reference.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSend}
            disabled={(!contactCustomer && !contactTechnician) || !message.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
