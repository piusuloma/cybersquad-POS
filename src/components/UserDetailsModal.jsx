import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  Briefcase, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  AlertTriangle 
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import {useApi} from '../hooks/useApi'


export function UserDetailsModal({ open, onOpenChange, user, userType }) {
  const {api} = useApi()
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [errorCustomer, setErrorCustomer] = useState<string | null>(null);

  if (!user) return null;

  const handleDeactivate = () => {
    // Simulate deactivation
    console.log('Deactivating user:', user.id);
    setShowDeactivateDialog(false);
    onOpenChange(false);
  };

// ✅ Define fetchCustomer outside useEffect
const fetchCustomer = async () => {
  if (!open || userType !== 'customer' || !user?.id) return;
  
  setLoadingCustomer(true);
  try {
    setErrorCustomer(null);
    const res = await api.get('/users/profile/customers/');
    const list = res?.data?.result || [];
    const found = list.find((c) => c.id === user.id) || null;
    setCustomerDetails(found);
  } catch (e) {
    setErrorCustomer('Failed to load customer');
    setCustomerDetails(null);
    console.error('Error fetching customer:', e);
  } finally {
    setLoadingCustomer(false);
  }
};

// ✅ Call in useEffect
useEffect(() => {
  fetchCustomer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, userType, user?.id]);

  const u = (() => {
    if (userType === 'customer' && customerDetails) {
      const name = customerDetails.first_name
        ? `${customerDetails.first_name} ${customerDetails.last_name || ''}`.trim()
        : (customerDetails?.profile?.full_name || '-');
      const email = customerDetails.email || '-';
      const status = customerDetails.is_email_verified ? 'active' : 'pending';
      return {
        ...user,
        name,
        email,
        status,
        jobsPosted: user?.jobsPosted ?? 0,
        totalSpent: user?.totalSpent ?? '₦0',
        rating: user?.rating ?? 0,
        jobs: user?.jobs ?? 0,
      };
    }
    return user;
  })();

  const handleReactivate = () => {
    // Simulate reactivation
    console.log('Reactivating user:', user.id);
    setShowReactivateDialog(false);
    onOpenChange(false);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
      case 'active':
        return 'bg-success text-white';
      case 'pending':
        return 'bg-warning text-white';
      case 'suspended':
      case 'flagged':
        return 'bg-error text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
      case 'active':
        return <CheckCircle className="w-3 h-3" />;
      case 'pending':
        return <AlertTriangle className="w-3 h-3" />;
      case 'suspended':
      case 'flagged':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about this {userType}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-800 text-white">
                  {getInitials(u.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{u.name}</h3>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge className={getStatusColor(u.status)}>
                    {getStatusIcon(u.status)}
                    <span className="ml-1">{u.status}</span>
                  </Badge>
                </div>
                {userType === 'technician' && u.rating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-medium">{u.rating}</span>
                    <span className="text-sm text-muted-foreground">({u.jobs} jobs)</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="font-medium">Contact Information</h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span>+234 8127007078</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span>Lagos, NG</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span>January 15, 2024</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            {userType === 'technician' ? (
              <div className="space-y-3">
                <h4 className="font-medium">Technician Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-xs">Expertise</span>
                    </div>
                    <p className="font-medium">{user.expertise}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-xs">Total Jobs</span>
                    </div>
                    <p className="font-medium">{u.jobs}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Star className="w-4 h-4" />
                      <span className="text-xs">Rating</span>
                    </div>
                    <p className="font-medium">{u.rating > 0 ? u.rating : 'N/A'}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs">Total Earnings</span>
                    </div>
                    <p className="font-medium">₦12,450</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium">Customer Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-xs">Jobs Posted</span>
                    </div>
                    <p className="font-medium">{u.jobsPosted}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs">Total Spent</span>
                    </div>
                    <p className="font-medium">{u.totalSpent}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs">Completed Jobs</span>
                    </div>
                    <p className="font-medium">{Math.floor((u.jobsPosted || 0) * 0.8)}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Star className="w-4 h-4" />
                      <span className="text-xs">Average Rating</span>
                    </div>
                    <p className="font-medium">4.5</p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                View Activity Log
              </Button>
              {user.status === 'suspended' || user.status === 'flagged' ? (
                <Button 
                  variant="default" 
                  className="flex-1 bg-success hover:bg-success-700"
                  onClick={() => setShowReactivateDialog(true)}
                >
                  Reactivate Account
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => setShowDeactivateDialog(true)}
                >
                  Deactivate Account
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {u.name}'s account? This will prevent them from accessing the platform until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate {u.name}'s account? They will regain full access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReactivate}
              className="bg-success text-white hover:bg-success-700"
            >
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
