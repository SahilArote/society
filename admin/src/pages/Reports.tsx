import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Shield, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { mockMonthlyReports, mockVisitorTrend } from '../data/mockData';

import StatCard, { CircularGauge } from '../components/StatCard';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill || p.stroke || p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'capitalize' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {typeof p.value === 'number' && p.value > 100 ? `₹${p.value}K` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const purposeData = [
  { name: 'Delivery', value: 42, color: 'var(--amber)' },
  { name: 'Guest',    value: 38, color: 'var(--accent-light)' },
  { name: 'Service',  value: 12, color: 'var(--sky)' },
  { name: 'Cab',      value: 8,  color: 'var(--green)' },
];

export default function Reports() {
  const totalV    = mockMonthlyReports.reduce((s, r) => s + r.totalVisitors, 0);
  const totalC    = mockMonthlyReports.reduce((s, r) => s + r.maintenanceCollected, 0);
  const totalI    = mockMonthlyReports.reduce((s, r) => s + r.incidents, 0);
  const avgApprv  = Math.round(mockMonthlyReports.reduce((s, r) => s + (r.approvedEntries / r.totalVisitors) * 100, 0) / mockMonthlyReports.length);

  const monthlyData = mockMonthlyReports.map(r => ({
    month: r.month,
    collected: Math.round(r.maintenanceCollected / 1000),
    pending:   Math.round(r.maintenancePending / 1000),
    approved:  r.approvedEntries,
    denied:    r.deniedEntries,
  }));

  const weeklyData = mockVisitorTrend.map(d => ({
    day: d.day, total: d.guest + d.delivery + d.maintenance + d.cab,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <StatCard
          icon={Users}
          label="Total Visitors"
          value={totalV}
          pill={{ text: '+14% vs H1', color: 'var(--accent-light)', bg: 'var(--accent-bg)' }}
          sub="Avg 41 visitor entries / month"
          accentColor="var(--accent-light)"
          bgColor="var(--accent-bg)"
          delay={0}
        />

        <StatCard
          icon={TrendingUp}
          label="6mo Collection"
          value={`₹${Math.round(totalC/1000)}K`}
          pill={{ text: '81% Collected', color: 'var(--green)', bg: 'var(--green-bg)' }}
          sub="₹2.8L collected · ₹0.7L pending"
          accentColor="var(--green)"
          bgColor="var(--green-bg)"
          delay={0.06}
        />

        <StatCard
          icon={Shield}
          label="Approval Rate"
          value={`${avgApprv}%`}
          pill={{ text: 'Gate Throughput', color: 'var(--sky)', bg: 'var(--sky-bg)' }}
          sub="Fast-track clearance (<30s)"
          accentColor="var(--sky)"
          bgColor="var(--sky-bg)"
          delay={0.12}
        />

        <StatCard
          icon={BarChart3}
          label="Security Incidents"
          value={totalI}
          pill={{ text: '100% Safe', color: 'var(--green)', bg: 'var(--green-bg)' }}
          sub="Zero perimeter breaches reported"
          accentColor="var(--amber)"
          bgColor="var(--amber-bg)"
          delay={0.18}
        />
      </div>

      {/* Row 2: Monthly visitor bar + purpose pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Monthly Visitor Volume</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Approved vs Denied entries per month</p>
            </div>
            <button id="export-visitor-report-btn" className="btn-success">
              <Download size={12} /> Export
            </button>
          </div>
          <div style={{ padding: '16px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={monthlyData} barSize={14} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-bg)', radius: 4 }} />
                <Bar dataKey="approved" name="Approved" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="denied"   name="Denied"   fill="var(--red)"   radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="card card-p" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Visitor Purpose</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Distribution by entry type</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={purposeData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                dataKey="value" paddingAngle={3} strokeWidth={0}>
                {purposeData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {purposeData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Row 3: Maintenance + Weekly */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Maintenance Collection</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Collected vs Pending (₹K)</p>
            </div>
            <button id="export-billing-btn" className="btn-success"><Download size={12} /> Export</button>
          </div>
          <div style={{ padding: '16px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gCollect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--green)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--red)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="var(--green)" strokeWidth={2} fill="url(#gCollect)" />
                <Area type="monotone" dataKey="pending"   name="Pending"   stroke="var(--red)"   strokeWidth={2} fill="url(#gPending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
          <div className="card-ph">
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>This Week — Daily Visitors</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total visitors per day (last 7 days)</p>
          </div>
          <div style={{ padding: '16px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={weeklyData}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="total" name="Visitors" stroke="var(--accent)" strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Monthly Table */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="card-ph" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Summary Report</p>
          <button id="export-monthly-pdf-btn" className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
            <Download size={13} /> Export PDF
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th><th>Total Visitors</th><th>Approved</th><th>Denied</th>
                <th>Collected (₹)</th><th>Pending (₹)</th><th>Incidents</th>
              </tr>
            </thead>
            <tbody>
              {mockMonthlyReports.map(r => (
                <tr key={r.month}>
                  <td><span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{r.month}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.totalVisitors}</td>
                  <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>{r.approvedEntries}</span></td>
                  <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>{r.deniedEntries}</span></td>
                  <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>₹{r.maintenanceCollected.toLocaleString()}</span></td>
                  <td><span style={{ fontSize: 12, color: r.maintenancePending > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>₹{r.maintenancePending.toLocaleString()}</span></td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.incidents > 0 ? 'var(--red)' : 'var(--green)' }}>
                      {r.incidents > 0 ? `⚠ ${r.incidents}` : '✓ 0'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
