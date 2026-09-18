import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Filter, Download, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const auditLogs = [
  { id: 1, admin: 'Sarah Johnson', action: 'Approved technician verification', target: 'Tech ID: 1234', ip: '192.168.1.1', status: 'success', timestamp: '2 minutes ago' },
  { id: 2, admin: 'Michael Chen', action: 'Updated commission rate', target: 'Category: Electrical', ip: '192.168.1.45', status: 'success', timestamp: '15 minutes ago' },
  { id: 3, admin: 'Emma Wilson', action: 'Processed payout', target: 'Payout ID: PYT-5678', ip: '192.168.1.23', status: 'success', timestamp: '1 hour ago' },
  { id: 4, admin: 'Sarah Johnson', action: 'Suspended user account', target: 'User ID: 8901', ip: '192.168.1.1', status: 'success', timestamp: '2 hours ago' },
  { id: 5, admin: 'Unknown', action: 'Failed login attempt', target: 'Admin login', ip: '203.0.113.42', status: 'failed', timestamp: '3 hours ago' },
  { id: 6, admin: 'Michael Chen', action: 'Resolved dispute', target: 'Dispute ID: DSP-001', ip: '192.168.1.45', status: 'success', timestamp: '5 hours ago' },
  { id: 7, admin: 'Emma Wilson', action: 'Exported payment report', target: 'Financial reports', ip: '192.168.1.23', status: 'success', timestamp: '6 hours ago' },
  { id: 8, admin: 'Unknown', action: 'Unauthorized access attempt', target: 'System settings', ip: '198.51.100.88', status: 'blocked', timestamp: '8 hours ago' },
];

export function SecurityAuditLogs() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1>Security & Audit Logs</h1>
        <p className="text-muted-foreground">Track all admin actions and system access</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Successful Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">1,247</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Failed Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Requires review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Blocked Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">5</div>
            <p className="text-xs text-muted-foreground mt-1">Unauthorized attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">3</div>
            <p className="text-xs text-muted-foreground mt-1">Currently logged in</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Comprehensive log of all administrative actions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-8 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="success">Success Only</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                  <SelectItem value="blocked">Blocked Only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.admin}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.target}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{log.ip}</TableCell>
                  <TableCell>
                    <Badge variant={
                      log.status === 'success' ? 'default' :
                      log.status === 'failed' ? 'destructive' :
                      'destructive'
                    }>
                      {log.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {log.status === 'failed' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {log.status === 'blocked' && <XCircle className="w-3 h-3 mr-1" />}
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Admin Sessions</CardTitle>
          <CardDescription>Currently logged in administrators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Sarah Johnson', role: 'Super Admin', ip: '192.168.1.1', device: 'Chrome on Windows', duration: '2 hours 15 mins' },
              { name: 'Michael Chen', role: 'Support', ip: '192.168.1.45', device: 'Safari on macOS', duration: '45 mins' },
              { name: 'Emma Wilson', role: 'Finance', ip: '192.168.1.23', device: 'Firefox on Windows', duration: '1 hour 30 mins' },
            ].map((session, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{session.name}</h4>
                    <Badge variant="outline">{session.role}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-muted-foreground">IP: {session.ip}</p>
                    <p className="text-xs text-muted-foreground">{session.device}</p>
                    <p className="text-xs text-muted-foreground">Active: {session.duration}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-destructive">
                  Terminate
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-900">Two-Factor Authentication Enabled</h4>
                <p className="text-xs text-green-700 mt-1">All admin accounts are protected with 2FA</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-orange-900">Review Failed Login Attempts</h4>
                <p className="text-xs text-orange-700 mt-1">12 failed login attempts detected in the last 24 hours</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Regular Security Audits</h4>
                <p className="text-xs text-blue-700 mt-1">Last audit performed 15 days ago. Next audit due in 15 days.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}