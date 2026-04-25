import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { format } from 'date-fns';
import { Eye, RefreshCw } from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  ON_THE_WAY: 'bg-purple-100 text-purple-700',
  STARTED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Bookings() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: '', page: 1 });
  const [loading, setLoading] = useState(false);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: filters.page, limit: 20 });
      if (filters.status) params.set('status', filters.status);
      const result = await api.get(`/bookings?${params}`);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBookings(); }, [filters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Bookings</h2>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {['PENDING','CONFIRMED','ON_THE_WAY','STARTED','COMPLETED','CANCELLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Booking #', 'Customer', 'Pet', 'Service', 'Slot', 'Status', 'Payment', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.bookings?.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.bookingNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{b.customer?.name || b.customer?.phone}</div>
                        <div className="text-xs text-gray-500">{b.customer?.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{b.pet?.name}</div>
                        <div className="text-xs text-gray-500">{b.pet?.breed}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.service?.name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {b.scheduledAt ? format(new Date(b.scheduledAt), 'dd MMM • hh:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${b.paymentStatus === 'PAID' ? 'text-green-600' : 'text-orange-500'}`}>
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/bookings/${b.id}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>{data?.total || 0} total bookings</span>
              <div className="flex gap-2">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-3 py-1">{filters.page}</span>
                <button
                  disabled={data?.total <= filters.page * 20}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
