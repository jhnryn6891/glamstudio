import React, { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_contact: '',
    event_date: '',
    start_time: '',
    head_count: 1,
    location_address: ''
  });

  const [responseMessage, setResponseMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponseMessage(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          head_count: parseInt(formData.head_count)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Booking failed');
      
      setResponseMessage({ type: 'success', data });
    } catch (err) {
      setResponseMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">💄 Mobile Makeup Booking</h2>
        <p className="text-gray-600 mb-6">Schedule your glam session. Automatic travel & prep buffer calculated instantly!</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="client_name" required value={formData.client_name} onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-pink-500 focus:border-pink-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact (Email / Phone)</label>
            <input type="text" name="client_contact" required value={formData.client_contact} onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-pink-500 focus:border-pink-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Date</label>
              <input type="date" name="event_date" required value={formData.event_date} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-pink-500 focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input type="time" name="start_time" required value={formData.start_time} onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-pink-500 focus:border-pink-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Head Count (People to service)</label>
            <input type="number" name="head_count" min="1" required value={formData.head_count} onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-pink-500 focus:border-pink-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Event Location / Address</label>
            <input type="text" name="location_address" required value={formData.location_address} onChange={handleChange}
              placeholder="e.g., Makati City, Metro Manila"
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-pink-500 focus:border-pink-500" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-pink-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-pink-700 transition duration-200">
            {loading ? 'Processing...' : 'Book Makeup Session'}
          </button>
        </form>

        {responseMessage && responseMessage.type === 'success' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
            <h3 className="font-bold">Booking Confirmed!</h3>
            <p>Client: {responseMessage.data.client}</p>
            <p>Reserved Duration: <b>{responseMessage.data.calculated_duration_minutes} minutes</b> (Includes travel buffer)</p>
            <p>Location: {responseMessage.data.location}</p>
          </div>
        )}

        {responseMessage && responseMessage.type === 'error' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            <p>Error: {responseMessage.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;