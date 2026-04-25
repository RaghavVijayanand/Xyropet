import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { format } from 'date-fns';
import { ArrowLeft, UserCheck } from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  ON_THE_WAY: 'bg-purple-100 text-purple-700',
  STARTED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [groomers, setGroomers] = useState([]);
  const [selectedGroomer, setSelectedGroomer] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/bookings/${id}`), api.get('/groomers')])
      .then(([b, g]) => {
        setBooking(b);
        setGroomers(g);
        setSelectedGroomer(b.groomerId || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function assignGroomer() {
    if (!selectedGroomer) return;
    setAssigning(true);
    try {
      const updated = await api.patch(`/bookings/${id}/assign`, { groomerId: selectedGroomer });
      setBooking(updated);
    } catch (err) {
      alert(err?.error || 'Failed to assign groomer');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!booking) return <div className="p-8 text-center text-red-500">Booking not found</div>;

  return (
    <div className="max-w-3xl">
      <Link to="/bookings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} />
        Back to bookings
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800">#{booking.bookingNumber}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[booking.status]}`}>
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <InfoCard title="Customer">
          <Row label="Name" value={booking.customer?.name || '—'} />
          <Row label="Phone" value={booking.customer?.phone} />
          <Row label="Type" value={booking.customer?.isRepeat ? 'Repeat' : 'New'} />
        </InfoCard>

        <InfoCard title="Pet">
          <Row label="Name" value={booking.pet?.name} />
          <Row label="Breed" value={booking.pet?.breed} />
          {booking.pet?.specialRequirements?.length > 0 && (
            <Row label="Special Req." value={booking.pet.specialRequirements.join(', ')} />
          )}
          {booking.pet?.remarks && <Row label="Remarks" value={booking.pet.remarks} />}
        </InfoCard>

        <InfoCard title="Service & Slot">
          <Row label="Service" value={booking.service?.name} />
          <Row label="Amount" value={`₹${booking.amount}`} />
          <Row label="Slot" value={booking.scheduledAt ? format(new Date(booking.scheduledAt), 'EEE dd MMM yyyy • hh:mm a') : '—'} />
          <Row label="Area" value={booking.area?.name} />
        </InfoCard>

        <InfoCard title="Payment">
          <Row label="Method" value={booking.paymentMethod} />
          <Row label="Status" value={booking.paymentStatus} />
          {booking.razorpayOrderId && <Row label="Order ID" value={booking.razorpayOrderId} />}
        </InfoCard>
      </div>

      {/* Groomer assignment */}
      {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <UserCheck size={18} />
            Assign Groomer
          </h3>
          <div className="flex gap-3">
            <select
              value={selectedGroomer}
              onChange={(e) => setSelectedGroomer(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select groomer...</option>
              {groomers.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.areas?.map(a => a.area.name).join(', ')}</option>
              ))}
            </select>
            <button
              onClick={assignGroomer}
              disabled={!selectedGroomer || assigning}
              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Status History</h3>
        <div className="space-y-2">
          {booking.statusHistory?.map(h => (
            <div key={h.id} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
              <div>
                <span className="font-medium">{h.toStatus}</span>
                {h.notes && <span className="text-gray-500 ml-2">— {h.notes}</span>}
                <div className="text-xs text-gray-400">
                  {format(new Date(h.createdAt), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
