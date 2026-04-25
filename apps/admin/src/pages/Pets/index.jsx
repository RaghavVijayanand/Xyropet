import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { format } from 'date-fns';

export default function Pets() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/pets?page=${page}&limit=20`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Pet Profiles</h2>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Pet', 'Owner', 'Breed', 'Area', 'Last Groomed', 'Frequency'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.pets?.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-xs">
                              {p.name[0]}
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{p.customer?.name || '—'}</div>
                        <div className="text-xs text-gray-500">{p.customer?.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.breed}</td>
                      <td className="px-4 py-3 text-gray-600">{p.area?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.lastGroomedAt ? format(new Date(p.lastGroomedAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.groomingFrequency ? `${p.groomingFrequency} days` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>{data?.total || 0} pets</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Prev</button>
                <span className="px-3 py-1">{page}</span>
                <button disabled={(data?.total || 0) <= page * 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
