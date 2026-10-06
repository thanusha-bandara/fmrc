import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { RefreshCw } from 'lucide-react';
import { getSchedules, generateSchedule } from '../api/schedule';
import { getErrorMessage } from '../api/client';

const localizer = momentLocalizer(moment);
const role = () => localStorage.getItem('userRole') || 'TA';

const SchedulePage = () => {
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const canGenerate = role() === 'ADMIN';

  const load = () => {
    setLoading(true);
    getSchedules()
      .then((schedules) => {
        setEvents(schedules.map((s) => {
          const date = new Date(s.scheduled_date);
          const start = new Date(date); start.setHours(8, 0, 0);
          const end = new Date(date); end.setHours(17, 0, 0);
          return {
            title: `${s.machine_name} - ${s.test_name}${s.field_name ? ` @ ${s.field_name}` : ''}`,
            start, end,
            resource: s
          };
        }));
      })
      .catch((err) => setError(getErrorMessage(err, 'Could not load the schedule.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await generateSchedule();
        await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Schedule Generated Successfully', showConfirmButton: false, timer: 2000 });
        setTimeout(() => { load(); }, 500);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not generate the schedule.'));
    } finally {
      setGenerating(false);
    }
  };

  const minTime = new Date();
  minTime.setHours(8, 0, 0);

  const maxTime = new Date();
  maxTime.setHours(18, 0, 0);

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Testing Schedule</h2>
          {canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-[#006B33] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating...' : 'Generate Schedule'}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 font-medium">{error}</div>
        )}

        <div style={{ height: '550px' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400">Loading schedule...</div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"

              view={currentView}
              onView={(newView) => setCurrentView(newView)}

              date={currentDate}
              onNavigate={(newDate) => setCurrentDate(newDate)}

              min={minTime}
              max={maxTime}
              views={['month', 'week', 'day']}
              onSelectEvent={(event) => setSelectedEvent(event.resource)}
              eventPropGetter={(event) => {
                // Determine color based on field vs lab test
                let backgroundColor = event.resource.is_field_test ? '#006B33' : '#F59E0B'; // Green for Field, Yellow/Amber for Lab
                
                // Override if completed
                if (event.resource.status === 'Completed') {
                  backgroundColor = '#6B7280'; // Gray for Completed tests
                }
                
                return {
                  style: {
                    backgroundColor,
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    display: 'block',
                    fontWeight: '600',
                    fontSize: '12px',
                    padding: '2px 6px'
                  }
                };
              }}
            />
          )}
        </div>
      </div>

      {selectedEvent && (
        <div onClick={() => setSelectedEvent(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedEvent.machine_name}</h3>
            <p className="text-sm font-semibold text-[#006B33] mb-6">{selectedEvent.test_name}</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500 font-medium">Assigned To</span>
                <span className="text-sm font-bold text-gray-900">{selectedEvent.assigned_ta_name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500 font-medium">Scheduled Date</span>
                <span className="text-sm font-bold text-gray-900">{new Date(selectedEvent.scheduled_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-sm text-gray-500 font-medium">Time Slot</span>
                <span className="text-sm font-bold text-gray-900">{selectedEvent.time_slot || 'Morning'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">Status</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {selectedEvent.status}
                </span>
              </div>
            </div>
            
            <button onClick={() => setSelectedEvent(null)} className="w-full mt-8 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;