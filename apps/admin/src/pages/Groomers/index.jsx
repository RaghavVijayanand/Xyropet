import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Plus, Pencil } from 'lucide-react';

export default function Groomers() {
  const [groomers, setGroomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', areaIds: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/groomers'), api.get('/areas')])
      .then(([g, a]) => { setGroomers(g); setAreas(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post('/groomers', form);
      setGroomers(g => [created, ...g]);
      setShowForm(false);
      setForm({ name: '', phone: '', password: '', areaIds: [] });
    } catch (err) {
      alert(err?.error || 'Failed to create groomer');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(groomer) {
    try {
      const updated = await api.patch(`/groomers/${groomer.id}`, { active: !groomer.active });
      setGroomers(gs => gs.map(g => g.id === groomer.id ? updated : g));
    } catch (err) {
      alert(err?.error || 'Failed to update');
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Groomers</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
        >
          <Plus size={16} />
          Add Groomer
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">New Groomer</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input"
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input"
                  placeholder="+91XXXXXXXXXX"
                  required
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input"
                  required
                />
              </Field>
              <Field label="Areas">
                <select
                  multiple
                  value={form.areaIds}
                  onChange={(e) => setForm(f => ({ ...f, areaIds: Array.from(e.target.selectedOptions, o => o.value) }))}
                  className="input h-24"
                >
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Groomer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Name', 'Phone', 'Areas', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groomers.map(g => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{g.name}</td>
                <td className="px-4 py-3 text-gray-600">{g.phone}</td>
                <td className="px-4 py-3 text-gray-600">{g.areas?.map(a => a.area.name).join(', ') || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${g.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {g.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(g)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {g.active ? 'Deactivate' : 'Activate'}
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
