import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';


export function ViewMediaModal({ open, onOpenChange, job }) {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Job Media - #{job.id}</DialogTitle>
          <DialogDescription>
            Before and after repair photos
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Before Photos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-500 text-orange-700">
                    Before Repair
                  </Badge>
                  <span className="text-sm text-muted-foreground">2 photos</span>
                </div>
                <div className="space-y-3">
                  <div className="border rounded-lg overflow-hidden aspect-video bg-muted">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&h=400&fit=crop"
                      alt="Before repair - Main view"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="border rounded-lg overflow-hidden aspect-video bg-muted">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop"
                      alt="Before repair - Close up"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* After Photos */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    After Repair
                  </Badge>
                  <span className="text-sm text-muted-foreground">2 photos</span>
                </div>
                <div className="space-y-3">
                  <div className="border rounded-lg overflow-hidden aspect-video bg-muted">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1621905252472-178648f9f4d7?w=600&h=400&fit=crop"
                      alt="After repair - Main view"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="border rounded-lg overflow-hidden aspect-video bg-muted">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1581578949510-fa7315c4c350?w=600&h=400&fit=crop"
                      alt="After repair - Close up"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Job Details Summary */}
            <div className="space-y-2">
              <h4 className="font-medium">Job Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2 font-medium">{job.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Technician:</span>
                  <span className="ml-2 font-medium">{job.technician}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="ml-2 font-medium">{job.customer}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="ml-2 font-medium">{job.completed}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
