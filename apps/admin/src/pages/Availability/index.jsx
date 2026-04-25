import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Availability() {
  const [groomers, setGroomers] = useState([]);
  const [selectedGroomer, setSelectedGroomer] = useState('');
  const [month, setMonth] = useState(new Date());
  const [availability, setAvailability] = useState({ leaves: [], blockedSlots: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/groomers').then(setGroomers).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedGroomer) return;
    setLoading(true);
    api.get(`/groomers/${selectedGroomer}/availability?month=${month.getMonth() + 1}&year=${month.getFullYear()}`)
      .then(setAvailability)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedGroomer, month]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const leaveSet = new Set(availability.leaves.map(l => format(new Date(l.date), 'yyyy-MM-dd')));

  function prevMonth() {
    setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function nextMonth() {
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Groomer Availability</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <select
          value={selectedGroomer}
          onChange={(e) => setSelectedGroomer(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
        >
          <option value="">Select a groomer...</option>
          {groomers.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {selectedGroomer && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
            <h3 className="font-semibold text-gray-700">{format(month, 'MMMM yyyy')}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
              ))}
              {Array(startOfMonth(month).getDay()).fill(null).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isLeave = leaveSet.has(dateStr);
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      isLeave
                        ? 'bg-red-100 text-red-700'
                        : isToday(day)
                        ? 'bg-primary-100 text-primary-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    title={isLeave ? 'On Leave' : ''}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200" />On Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-200" />Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
