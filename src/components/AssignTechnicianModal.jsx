import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Search, MapPin, Star } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

const availableTechnicians = [
  { id: 1, name: 'TOM', expertise: 'Phone', rating: 4.8, jobs: 156, distance: '2.3 km', status: 'available' },
  { id: 2, name: 'TOM', expertise: 'Phone', rating: 4.6, jobs: 89, distance: '4.1 km', status: 'available' },
  { id: 3, name: 'TOM', expertise: 'Phone', rating: 4.5, jobs: 67, distance: '5.8 km', status: 'available' },
  // { id: 4, name: 'TOM', expertise: 'Phone', rating: 4.7, jobs: 123, distance: '3.5 km', status: 'available' },
];

export function AssignTechnicianModal({ open, onOpenChange, job }) {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!job) return null;

  const filteredTechnicians = availableTechnicians.filter(tech =>
    tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tech.expertise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleAssign = () => {
    if (selectedTechnician) {
      console.log('Assigning technician:', selectedTechnician, 'to job:', job.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Assign Technician to Job #{job.id}</DialogTitle>
          <DialogDescription>
            Select an available technician to assign to this job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search technicians..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <RadioGroup value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <div className="space-y-3">
                {filteredTechnicians.map((tech) => (
                  <div
                    key={tech.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTechnician === tech.id.toString()
                        ? 'border-purple-600 bg-purple-50'
                        : 'hover:border-purple-300'
                    }`}
                    onClick={() => setSelectedTechnician(tech.id.toString())}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value={tech.id.toString()} id={`tech-${tech.id}`} />
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-800 text-white">
                          {getInitials(tech.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Label htmlFor={`tech-${tech.id}`} className="font-semibold cursor-pointer">
                              {tech.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">{tech.expertise} Specialist</p>
                          </div>
                          <Badge className="bg-success text-white">
                            {tech.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-warning text-warning" />
                            <span className="font-medium">{tech.rating}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {tech.jobs} jobs
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{tech.distance}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </ScrollArea>

          {selectedTechnician && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-900">
                The selected technician will be notified immediately and can accept or decline the job.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleAssign}
              disabled={!selectedTechnician}
            >
              Assign Technician
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
