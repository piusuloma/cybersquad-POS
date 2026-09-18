import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Download, FileText, TrendingUp, Users, Briefcase, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const jobVolumeByCategory = [
  { category: 'Electrical', jobs: 145 },
  { category: 'Plumbing', jobs: 112 },
  { category: 'HVAC', jobs: 98 },
  { category: 'Carpentry', jobs: 76 },
  { category: 'Painting', jobs: 54 },
];

const technicianPerformance = [
  { name: 'John Smith', acceptanceRate: 92, avgRating: 4.8, jobs: 156 },
  { name: 'Mike Chen', acceptanceRate: 88, avgRating: 4.6, jobs: 89 },
  { name: 'Emma Davis', acceptanceRate: 85, avgRating: 4.2, jobs: 45 },
  { name: 'Sarah Williams', acceptanceRate: 78, avgRating: 4.5, jobs: 32 },
];

const paymentTrends = [
  { month: 'Jan', deposits: 24500, refunds: 1200, payouts: 18200 },
  { month: 'Feb', deposits: 28100, refunds: 980, payouts: 21400 },
  { month: 'Mar', deposits: 32400, refunds: 1450, payouts: 24800 },
  { month: 'Apr', deposits: 35600, refunds: 1100, payouts: 27200 },
  { month: 'May', deposits: 38200, refunds: 890, payouts: 29500 },
  { month: 'Jun', deposits: 42100, refunds: 1340, payouts: 32800 },
];

const disputeRatios = [
  { name: 'Resolved', value: 156, color: '#10b981' },
  { name: 'In Review', value: 23, color: '#f59e0b' },
  { name: 'Pending', value: 12, color: '#ef4444' },
];

const revenueData = [
  { month: 'Jan', revenue: 12400, commission: 1860 },
  { month: 'Feb', revenue: 15600, commission: 2340 },
  { month: 'Mar', revenue: 18200, commission: 2730 },
  { month: 'Apr', revenue: 22100, commission: 3315 },
  { month: 'May', revenue: 25800, commission: 3870 },
  { month: 'Jun', revenue: 28500, commission: 4275 },
];

export function ReportsAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="text-muted-foreground">Operational insights and KPIs</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">485</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">1,247</div>
            <p className="text-xs text-muted-foreground mt-1">Customers & Technicians</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">$152,780</div>
            <p className="text-xs text-muted-foreground mt-1">Last 6 months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">+24%</div>
            <p className="text-xs text-muted-foreground mt-1">Month over month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Job Volume by Category</CardTitle>
                <CardDescription>Distribution across service types</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobVolumeByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Trends</CardTitle>
                <CardDescription>Deposits, refunds, and payouts over time</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paymentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="deposits" stroke="#10b981" strokeWidth={2} name="Deposits" />
                <Line type="monotone" dataKey="refunds" stroke="#ef4444" strokeWidth={2} name="Refunds" />
                <Line type="monotone" dataKey="payouts" stroke="#3b82f6" strokeWidth={2} name="Payouts" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Platform Revenue Overview</CardTitle>
                <CardDescription>Revenue vs Commission earned</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Total Revenue" />
                <Bar dataKey="commission" fill="#10b981" radius={[8, 8, 0, 0]} name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Dispute Status</CardTitle>
                <CardDescription>Current dispute distribution</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={disputeRatios}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {disputeRatios.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Generate and download detailed reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="text-sm">Job Volume Report</div>
                <div className="text-xs text-muted-foreground">All job statistics</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="text-sm">Technician Performance</div>
                <div className="text-xs text-muted-foreground">Ratings & metrics</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="text-sm">Financial Summary</div>
                <div className="text-xs text-muted-foreground">Revenue & payouts</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3">
              <FileText className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="text-sm">User Activity</div>
                <div className="text-xs text-muted-foreground">Engagement data</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}