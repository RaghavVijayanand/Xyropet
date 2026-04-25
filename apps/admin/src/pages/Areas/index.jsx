import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Plus } from 'lucide-react';

export default function Areas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', city: '' });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/areas').then(setAreas).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post('/areas', form);
      setAreas(a => [created, ...a]);
      setShowForm(false);
      setForm({ name: '', city: '' });
    } catch (err) {
      alert(err?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(area) {
    const updated = await api.patch(`/areas/${area.id}`, { active: !area.active });
    setAreas(as => as.map(a => a.id === area.id ? updated : a));
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Service Areas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
        >
          <Plus size={16} /> Add Area
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <form onSubmit={handleCreate} className="flex gap-3 flex-wrap">
            <input
              placeholder="Area name (e.g. Koramangala)"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'City', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {areas.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.city}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(a)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    {a.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
