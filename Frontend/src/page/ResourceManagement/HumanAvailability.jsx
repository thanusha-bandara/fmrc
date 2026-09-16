import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { listStaffAvailability, setStaffAvailability, listHolidays } from "../../api/resources";
import { listUsers } from "../../api/users";
import { listLabours, listLabourAvailability, setLabourAvailability, createLabour } from "../../api/labours";
import { getErrorMessage } from "../../api/client";
import ResourceTabs from "./ResourceTabs";
import { buildMonthCells, toISODate, formatFullDate } from "./calendarUtils";

export default function HumanAvailability() {
  const navigate = useNavigate();
  const isAdmin = (localStorage.getItem('userRole') || 'TA') === 'ADMIN';

  const [personType, setPersonType] = useState("TA"); // "TA" | "Labour"
  const [monthOffset, setMonthOffset] = useState(0);
  const [records, setRecords] = useState([]);
  const [people, setPeople] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [draftPersonId, setDraftPersonId] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState('TA'); // 'TA' or 'Labour'
  const [labours, setLabours] = useState([]);
  const [labourRecords, setLabourRecords] = useState([]);
  const [newLabourName, setNewLabourName] = useState("");
  const [showAddLabourModal, setShowAddLabourModal] = useState(false);
  const [holidays, setHolidays] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      listStaffAvailability(), 
      listUsers("Technical_Assistant"),
      listLabours().catch(() => []),
      listLabourAvailability().catch(() => []),
      listHolidays().catch(() => [])
    ])
      .then(([recordData, taData, labourData, labourAvData, holidayData]) => {
        setRecords(recordData);
        setTas(taData);
        setLabours(labourData);
        setLabourRecords(labourAvData);
        setHolidays(holidayData);
        
        // Reset draft user based on active view mode if it's currently empty or invalid
        if (viewMode === 'TA' && taData.length > 0) setDraftUserId(String(taData[0].user_id));
        else if (viewMode === 'Labour' && labourData.length > 0) setDraftUserId(String(labourData[0].labour_id));
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load availability data.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [personType]);
  useEffect(() => { listHolidays().then(setHolidays).catch(() => {}); }, []);

  // Whenever viewMode changes, reset the draftUserId to the first available in that list
  useEffect(() => {
    if (viewMode === 'TA' && tas.length > 0) setDraftUserId(String(tas[0].user_id));
    else if (viewMode === 'Labour' && labours.length > 0) setDraftUserId(String(labours[0].labour_id));
    else setDraftUserId("");
  }, [viewMode, tas, labours]);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1);
  const monthLabel = baseDate.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = buildMonthCells(baseDate);

  const currentRecords = Array.isArray(viewMode === 'TA' ? records : labourRecords) ? (viewMode === 'TA' ? records : labourRecords) : [];
  const leavesByDate = {};
  currentRecords.forEach((r) => {
    try {
      if (r && r.date) {
        const dateStr = new Date(r.date).toISOString().split("T")[0];
        if (!leavesByDate[dateStr]) leavesByDate[dateStr] = [];
        if (r.is_on_leave) leavesByDate[dateStr].push(r);
      }
    } catch(e) {}
  });
  
  const holidaysByDate = {};
  if (Array.isArray(holidays)) {
    holidays.forEach((h) => {
      try {
        if (h && h.date) {
          const dateStr = new Date(h.date).toISOString().split("T")[0];
          holidaysByDate[dateStr] = h;
        }
      } catch(e) {}
    });
  }

  const holidayByDate = {};
  holidays.forEach((h) => { holidayByDate[h.date] = h; });

  const todayKey = toISODate(new Date());
  const todaysLeaves = leavesByDate[todayKey] || [];
  
  const safeTas = Array.isArray(tas) ? tas : [];
  const safeLabours = Array.isArray(labours) ? labours : [];
  const currentTotal = viewMode === 'TA' ? safeTas.length : safeLabours.length;

  const selectedISO = selectedDay ? toISODate(selectedDay) : null;
  const selectedDayLeaves = selectedISO ? (leavesByDate[selectedISO] || []) : [];
  const selectedDayHoliday = selectedISO ? holidayByDate[selectedISO] : null;

  const openDay = (cell) => {
    setSelectedDay(cell.date);
    setDraftReason("");
  };

  const closeModal = () => setSelectedDay(null);

  const saveDay = async (isOnLeave) => {
    if (!draftPersonId) return;
    setSaving(true);
    setError("");
    try {
      if (viewMode === 'TA') {
        await setStaffAvailability({ userId: Number(draftUserId), date: toISODate(selectedDay), isOnLeave, reason: draftReason });
      } else {
        await setLabourAvailability({ labourId: Number(draftUserId), date: toISODate(selectedDay), isOnLeave, reason: draftReason });
      }
      closeModal();
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update availability."));
    } finally {
      setSaving(false);
    }
  };

  const handleAddLabour = async (e) => {
    e.preventDefault();
    if (!newLabourName.trim()) return;
    try {
      await createLabour(newLabourName.trim());
      setNewLabourName("");
      setShowAddLabourModal(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add labour."));
    }
  };

  return (
    <>
      <div className="p-5 md:p-8 h-full flex flex-col overflow-auto box-border bg-gray-50/30">
        <div className="flex items-center gap-4 mb-4">
          <ResourceTabs active="Human Availability" />
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setViewMode('TA')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors border ${viewMode === 'TA' ? 'bg-[#006A4E] text-white border-[#006A4E]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            Technical Assistants
          </button>
          <button onClick={() => setViewMode('Labour')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors border ${viewMode === 'Labour' ? 'bg-[#006A4E] text-white border-[#006A4E]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            Labourers
          </button>
          {viewMode === 'Labour' && (
            <button onClick={() => setShowAddLabourModal(true)} className="ml-auto bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm">
              + Add Labourer
            </button>
          )}
        </div>

        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">{error}</div>}

        <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
          <div className="flex-1 bg-[#F5FCF8] rounded-xl p-5 shadow-sm border border-[#E2F2E9]">
            <p className="m-0 mb-2 text-sm text-gray-600 font-medium">{viewMode === 'TA' ? 'Technical Assistants' : 'Labourers'}</p>
            <p className="m-0 font-bold text-xl text-gray-900">{currentTotal - todaysLeaves.length} / {currentTotal} Available Today</p>
          </div>
          <div className="flex-[1.4] bg-[#F5FCF8] rounded-xl p-5 shadow-sm border border-[#E2F2E9]">
            <p className="m-0 mb-3 text-sm text-gray-700 font-semibold">Today's Leave Details:</p>
            {todaysLeaves.length === 0 ? (
              <p className="m-0 text-sm text-gray-500">No one is on leave today.</p>
            ) : todaysLeaves.map((l) => (
              <p key={l.availability_id} className="m-0 mb-1.5 text-sm text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-sm bg-yellow-400"></span> {l.full_name} {l.reason ? `(${l.reason})` : ''}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 shrink-0">
          {/* Calendar Section */}
          <div className="flex-[2] border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setViewMode((m) => m)} className="invisible">◀</button> {/* spacer */}
              <div className="flex items-center gap-4 w-full justify-between">
                <button onClick={() => setMonthOffset((m) => m - 1)} className="cursor-pointer border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-600">◀</button>
                <h3 className="m-0 text-xl font-bold text-gray-800">{monthLabel}</h3>
                <button onClick={() => setMonthOffset((m) => m + 1)} className="cursor-pointer border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-600">▶</button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs font-medium text-gray-600">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600"></span> Holiday</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400"></span> On Leave</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-blue-500 bg-white"></span> Today</div>
            </div>

            <div className="grid grid-cols-7 text-center text-gray-500 mb-3 text-sm font-semibold">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 100px)` }}>
              {loading ? (
                <div className="col-span-7 flex items-center justify-center text-gray-400">Loading...</div>
              ) : cells.map((cell, i) => {
                const cellDateStr = cell.currentMonth && cell.date ? toISODate(cell.date) : null;
                const leaves = cell.currentMonth && cellDateStr ? (leavesByDate[cellDateStr] || []) : [];
                const holiday = cell.currentMonth && cellDateStr ? holidaysByDate[cellDateStr] : null;
                const isToday = cellDateStr === todayKey;
                
                // Styling
                let cellClasses = "flex flex-col items-start justify-start rounded-lg p-2 transition-colors border ";
                if (!cell.currentMonth) {
                  cellClasses += "bg-white text-gray-300 border-transparent";
                } else if (holiday) {
                  cellClasses += "bg-red-600 text-white border-red-700 cursor-pointer shadow-sm"; 
                } else {
                  cellClasses += "bg-white text-gray-800 border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer";
                }
                
                // Highlight today
                if (isToday) {
                  cellClasses += " border-2 !border-blue-500";
                }

                return (
                  <div key={i} onClick={() => cell.currentMonth && openDay(cell)} className={cellClasses}>
                    <span className={`font-bold text-sm mb-1 ${!cell.currentMonth ? 'text-gray-300' : holiday ? 'text-white' : 'text-gray-900'}`}>{cell.day}</span>
                    
                    {holiday && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium truncate w-full mb-0.5 bg-white/20 text-white">
                        {holiday.reason || 'Holiday'}
                      </span>
                    )}

                    {!holiday && leaves.slice(0, 3).map((l) => (
                      <span key={l.availability_id} className="px-1.5 py-0.5 rounded text-xs font-medium truncate w-full mb-0.5 bg-yellow-100 text-yellow-800">
                        {l.full_name}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roster Section */}
          <div className="flex-1 border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col">
            <h3 className="m-0 text-base font-bold text-gray-900 mb-4">{viewMode === 'TA' ? 'TA Roster' : 'Labour Roster'}</h3>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2">
              {(viewMode === 'TA' ? safeTas : safeLabours).map((person) => (
                <div key={person.user_id || person.labour_id} className="flex flex-col">
                  <span className="font-semibold text-sm text-gray-900">{person.full_name || person.name}</span>
                  <span className="text-xs text-gray-500">{person.phone || 'No phone number'}</span>
                </div>
              ))}
              {(viewMode === 'TA' ? safeTas.length : safeLabours.length) === 0 && (
                <p className="text-sm text-gray-500">No records found.</p>
              )}
            </div>
          </div>

          {isLabour && (
            <div className="border border-gray-200 rounded-xl p-4 md:p-5 bg-white shrink-0 shadow-sm lg:flex-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="m-0 text-sm font-bold text-gray-800">Labour Roster</h3>
                {isAdmin && (
                  <button onClick={() => setShowRosterModal(true)} className="flex items-center gap-1.5 bg-[#006B33] text-white px-2.5 py-1.5 rounded-md text-xs font-medium hover:bg-green-700">
                    <UserPlus size={14} /> Add
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-auto">
                {loading ? (
                  <p className="text-xs text-gray-400">Loading...</p>
                ) : people.length === 0 ? (
                  <p className="text-xs text-gray-400">No labourers added yet.</p>
                ) : people.map((l) => (
                  <div key={l.labour_id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 text-sm">
                    <div className="min-w-0">
                      <p className={`m-0 font-medium truncate ${l.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{l.full_name}</p>
                      {l.phone && <p className="m-0 text-xs text-gray-400">{l.phone}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleLabourActive(l)} title={l.is_active ? 'Deactivate' : 'Reactivate'} className="text-amber-600 hover:text-amber-800">
                          <Ban size={15} />
                        </button>
                        <button onClick={() => handleDeleteLabour(l)} title="Delete" className="text-red-600 hover:text-red-800">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedDay && (
        <div onClick={closeModal} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[380px] shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-green-50 text-green-800 px-3.5 py-2 rounded-lg font-semibold text-sm border border-green-100">{formatFullDate(selectedDay)}</div>
              <button onClick={closeModal} className="bg-transparent border-none cursor-pointer hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>

            <p className="text-sm text-gray-600 mb-1.5 font-medium">{viewMode === 'TA' ? 'Technical Assistant:' : 'Labour:'}</p>
            <select value={draftUserId} onChange={(e) => setDraftUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">
              {viewMode === 'TA' 
                ? safeTas.map((t) => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)
                : safeLabours.map((l) => <option key={l.labour_id} value={l.labour_id}>{l.name}</option>)
              }
            </select>

            <p className="text-sm text-gray-600 mb-1.5 font-medium">Reason (if on leave):</p>
            <input value={draftReason} onChange={(e) => setDraftReason(e.target.value)} placeholder="e.g. Casual Leave"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" />

            <div className="flex gap-2.5">
              <button onClick={() => saveDay(true)} disabled={saving} className="flex-1 p-2.5 rounded-lg font-semibold text-sm border-2 border-red-600 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60">
                Mark On Leave
              </button>
              <button onClick={() => saveDay(false)} disabled={saving} className="flex-1 p-2.5 rounded-lg font-semibold text-sm border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60">
                Mark Available
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddLabourModal && (
        <div onClick={() => setShowAddLabourModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[380px] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="m-0 text-lg font-bold text-gray-900">Add New Labour</h3>
              <button onClick={() => setShowAddLabourModal(false)} className="bg-transparent border-none cursor-pointer hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>

            <form onSubmit={handleAddLabour}>
              <p className="text-sm text-gray-600 mb-1.5 font-medium">Labour Name:</p>
              <input 
                value={newLabourName} 
                onChange={(e) => setNewLabourName(e.target.value)} 
                placeholder="e.g. Sunil Perera"
                autoFocus
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm mb-5 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" 
              />

              <div className="flex gap-2.5">
                <button type="button" onClick={() => setShowAddLabourModal(false)} className="flex-1 p-2.5 rounded-lg font-semibold text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!newLabourName.trim()} className="flex-1 p-2.5 rounded-lg font-semibold text-sm border border-transparent bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
