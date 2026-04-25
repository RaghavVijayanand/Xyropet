import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/reminders')
      .then(setReminders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bell size={20} className="text-primary-600" />
        <h2 className="text-xl font-bold text-gray-800">Scheduled Reminders</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : reminders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No pending reminders</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Pet', 'Owner', 'Type', 'Scheduled For', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reminders.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.pet?.name}</td>
                  <td className="px-4 py-3">
                    <div>{r.pet?.customer?.name || '—'}</div>
                    <div className="text-xs text-gray-500">{r.pet?.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{r.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(r.sendAt), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.sent ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {r.sent ? 'Sent' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
