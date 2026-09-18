import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Bell, CheckCircle, AlertTriangle, Info, DollarSign, Users, Briefcase, Mail, Key, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { Separator } from './ui/separator';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function PaginationBar({
  page,
  pages,
  pageSize,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPageSizeChange,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4 border-t">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrev} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span>{' '}
          <span className="text-muted-foreground">of</span>{' '}
          <span className="font-medium text-foreground">{pages || 1}</span>
        </div>

        <Button variant="outline" size="icon" onClick={onNext} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span className="text-sm text-muted-foreground">Show</span>

        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-[95px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">entries</span>
      </div>
    </div>
  );
}

const getNotificationIcon = (type) => {
  switch (type) {
    case 'alert':
      return { icon: AlertTriangle, color: 'text-error', bgColor: 'bg-error-50' };
    case 'password_reset':
      return { icon: Key, color: 'text-warning', bgColor: 'bg-warning-50' };
    case 'otp':
      return { icon: Mail, color: 'text-cyan-500', bgColor: 'bg-cyan-50' };
    default:
      return { icon: Info, color: 'text-purple-600', bgColor: 'bg-purple-50' };
  }
};

export function NotificationModal({ open, onOpenChange, onUnreadCountChange }) {
  const { api } = useApi();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    count: 0,
    pages: 1,
    page: 1,
    page_size: 10,
    next: null,
    previous: null,
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/notifications/notifications/?page=${page}&page_size=${pageSize}`
      );

      const data = res?.data || {};
      setNotifications(Array.isArray(data.result) ? data.result : []);
      setPagination(data.pagination || {});
    } catch (e) {
      console.error('Error fetching notifications:', e);
      toast.error('Failed to load notifications');
      setNotifications([]);
      setPagination({
        count: 0,
        pages: 1,
        page,
        page_size: pageSize,
        next: null,
        previous: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/notifications/unread_count/');
      const count = res?.data?.result?.unread_count ?? res?.data?.data?.unread_count ?? 0;
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/notifications/${notificationId}/mark_as_read/`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (e) {
      console.error('Error marking notification as read:', e);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    setMarkingRead(true);
    try {
      await api.post('/notifications/notifications/mark_all_as_read/');
      
      toast.success('All notifications marked as read');
      
      // Refresh data
      fetchNotifications();
      fetchUnreadCount();
    } catch (e) {
      console.error('Error marking all as read:', e);
      toast.error('Failed to mark all notifications as read');
    } finally {
      setMarkingRead(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [open, page, pageSize]);

  // Reset pagination when modal opens
  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              <DialogTitle>Notifications</DialogTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={markAllAsRead}
                disabled={markingRead}
              >
                {markingRead ? 'Marking...' : 'Mark all as read'}
              </Button>
            )}
          </div>
          <DialogDescription>
            Stay updated with the latest platform activities
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const { icon: Icon, color, bgColor } = getNotificationIcon(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                      notification.is_read ? 'bg-background' : 'bg-purple-50/50 border-purple-200'
                    }`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium">{notification.subject}</h4>
                        {!notification.is_read && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-600 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.sent_at || notification.created_at)}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {notification.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

                    {!loading && notifications.length > 0 && (
          <>
            <Separator />
            <PaginationBar
              page={pagination.page || page}
              pages={pagination.pages || 1}
              pageSize={pageSize}
              canPrev={!!pagination.previous}
              canNext={!!pagination.next}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => p + 1)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}