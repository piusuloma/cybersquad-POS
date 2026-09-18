import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { StickyNote } from 'lucide-react';
import { useState } from 'react';

export function AddNoteModal({ open, onClose, disputeId }) {
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('general');

  const handleAddNote = () => {
    alert(`Note added to dispute ${disputeId}`);
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            Add Internal Note
          </DialogTitle>
          <DialogDescription>
            Add a private note to dispute {disputeId} (visible only to admins)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Note</SelectItem>
                <SelectItem value="investigation">Investigation Finding</SelectItem>
                <SelectItem value="action">Action Taken</SelectItem>
                <SelectItem value="followup">Follow-up Required</SelectItem>
                <SelectItem value="resolution">Resolution Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              placeholder="Enter your note here..."
              className="min-h-[200px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This note is internal and will not be visible to customers or technicians.
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Recent Notes</h4>
            <div className="space-y-2 text-sm">
              <div className="border-l-2 border-purple-600 pl-3">
                <p className="font-medium">Michael Chen - 5 hours ago</p>
                <p className="text-muted-foreground">Contacted both parties to gather more information. Awaiting customer's response with photos.</p>
              </div>
              <div className="border-l-2 border-gray-300 pl-3">
                <p className="font-medium">Sarah Johnson - 8 hours ago</p>
                <p className="text-muted-foreground">Dispute assigned to Michael for investigation.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAddNote} disabled={!note.trim()}>
            Add Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
