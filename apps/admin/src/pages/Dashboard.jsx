import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Calendar, Users, Scissors, TrendingUp, Clock, CheckCircle } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Calendar} label="Today's Bookings" value={stats?.todayBookings} color="bg-blue-500" />
        <StatCard icon={Clock} label="Pending Bookings" value={stats?.pendingBookings} color="bg-orange-500" />
        <StatCard icon={TrendingUp} label="Month Bookings" value={stats?.monthBookings} color="bg-purple-500" />
        <StatCard icon={Users} label="Total Customers" value={stats?.totalCustomers} color="bg-green-500" />
        <StatCard icon={Scissors} label="Active Groomers" value={stats?.totalGroomers} color="bg-pink-500" />
        <StatCard
          icon={CheckCircle}
          label="Month Revenue"
          value={stats?.monthRevenue ? `₹${Number(stats.monthRevenue).toLocaleString('en-IN')}` : '₹0'}
          color="bg-emerald-500"
        />
      </div>
    </div>
  );
}
