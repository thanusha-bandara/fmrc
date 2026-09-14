import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, UserPlus, Ban, Trash2 } from "lucide-react";
import { listStaffAvailability, setStaffAvailability, listLabourAvailability, setLabourAvailability, listHolidays } from "../../api/resources";
import { listUsers } from "../../api/users";
import { listLabours, addLabour, updateLabour, deleteLabour } from "../../api/labours";
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

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterForm, setRosterForm] = useState({ full_name: "", phone: "" });
  const [rosterSaving, setRosterSaving] = useState(false);

  const isLabour = personType === "Labour";
  const personIdKey = isLabour ? "labour_id" : "user_id";
  const activePeople = isLabour ? people.filter((p) => p.is_active) : people;

  const load = () => {
    setLoading(true);
    const dataPromise = isLabour
      ? Promise.all([listLabourAvailability(), listLabours()])
      : Promise.all([listStaffAvailability(), listUsers("Technical_Assistant")]);

    dataPromise
      .then(([recordData, peopleData]) => {
        setRecords(recordData);
        setPeople(peopleData);
        const active = isLabour ? peopleData.filter((p) => p.is_active) : peopleData;
        if (active.length > 0) setDraftPersonId(String(active[0][personIdKey]));
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load availability data.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [personType]);
  useEffect(() => { listHolidays().then(setHolidays).catch(() => {}); }, []);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1);
  const monthLabel = baseDate.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = buildMonthCells(baseDate);

  // Backend now returns `date` as a plain YYYY-MM-DD string (DATE_FORMAT'd), so it can
  // be used directly as the lookup key — no Date-object round trip that could shift it
  // by a day depending on the server's timezone.
  const leavesByDate = {};
  records.forEach((r) => {
    if (!leavesByDate[r.date]) leavesByDate[r.date] = [];
    if (r.is_on_leave) leavesByDate[r.date].push(r);
  });

  const holidayByDate = {};
  holidays.forEach((h) => { holidayByDate[h.date] = h; });

  const todayKey = toISODate(new Date());
  const todaysLeaves = leavesByDate[todayKey] || [];

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
      if (isLabour) {
        await setLabourAvailability({ labourId: Number(draftPersonId), date: toISODate(selectedDay), isOnLeave, reason: draftReason });
      } else {
        await setStaffAvailability({ userId: Number(draftPersonId), date: toISODate(selectedDay), isOnLeave, reason: draftReason });
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
    if (!rosterForm.full_name) return;
    setRosterSaving(true);
    setError("");
    try {
      await addLabour(rosterForm);
      setShowRosterModal(false);
      setRosterForm({ full_name: "", phone: "" });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add labourer."));
    } finally {
      setRosterSaving(false);
    }
  };

  const handleToggleLabourActive = async (labour) => {
    try {
      await updateLabour(labour.labour_id, { is_active: !labour.is_active });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update labourer."));
    }
  };

  const handleDeleteLabour = async (labour) => {
    if (!window.confirm(`Remove "${labour.full_name}" from the roster? This cannot be undone.`)) return;
    try {
      await deleteLabour(labour.labour_id);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove labourer."));
    }
  };

  return (
    <>
      <div className="p-5 md:p-8 h-full flex flex-col overflow-auto box-border">
        <button onClick={() => navigate("/resource-management")} className="mb-3 cursor-pointer border border-gray-300 bg-white rounded-md px-3.5 py-1.5 w-fit text-sm hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <h2 className="m-0 mb-4 text-xl font-bold text-gray-900 tracking-tight">Human Availability</h2>

        <ResourceTabs active="Human Availability" />

        <div className="flex gap-2 mb-4 shrink-0">
          <button onClick={() => setPersonType("TA")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${personType === "TA" ? "bg-[#006B33] text-white border-[#006B33]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            Technical Assistants
          </button>
          <button onClick={() => setPersonType("Labour")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${personType === "Labour" ? "bg-[#006B33] text-white border-[#006B33]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
            Labourers
          </button>
        </div>

        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 font-medium">{error}</div>}

        <div className="flex flex-col md:flex-row gap-4 mb-4 shrink-0">
          <div className="flex-1 bg-green-50 rounded-xl p-4 md:p-5 shadow-sm border border-green-100">
            <p className="m-0 mb-1 text-sm text-gray-600 font-medium">{isLabour ? "Labourers" : "Technical Assistants"}</p>
            <p className="m-0 mb-1 font-bold text-lg text-gray-900">{activePeople.length - todaysLeaves.length} / {activePeople.length} Available Today</p>
            {todaysLeaves.length > 0 && (
              <p className="m-0 text-xs font-semibold text-yellow-700 bg-yellow-100 w-fit px-2 py-0.5 rounded-full">{todaysLeaves.length} On Leave Today</p>
            )}
          </div>
          <div className="flex-[1.4] bg-green-50 rounded-xl p-4 md:p-5 shadow-sm border border-green-100">
            <p className="m-0 mb-2 text-sm text-gray-700 font-semibold">Today's Leave Details:</p>
            {todaysLeaves.length === 0 ? (
              <p className="m-0 text-xs text-gray-500">No one is on leave today.</p>
            ) : todaysLeaves.map((l) => (
              <p key={l.availability_id} className="m-0 mb-1 text-xs text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> {l.full_name} {l.reason ? `(${l.reason})` : ''}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="border border-gray-200 rounded-xl p-4 md:p-5 bg-white shrink-0 shadow-sm lg:flex-[2]">
            <div className="flex justify-between items-center mb-3">
              <button onClick={() => setMonthOffset((m) => m - 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">◀</button>
              <h3 className="m-0 text-lg font-bold text-gray-800">{monthLabel}</h3>
              <button onClick={() => setMonthOffset((m) => m + 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">▶</button>
            </div>

            <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-600 inline-block"></span> Holiday</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-300 inline-block"></span> On Leave</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border-2 border-blue-500 inline-block"></span> Today</span>
            </div>

            <div className="grid grid-cols-7 text-center text-gray-500 mb-2 text-sm font-medium">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1.5" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 90px)` }}>
              {loading ? (
                <div className="col-span-7 flex items-center justify-center text-gray-400">Loading...</div>
              ) : cells.map((cell, i) => {
                const cellISO = cell.currentMonth ? toISODate(cell.date) : null;
                const leaves = cellISO ? (leavesByDate[cellISO] || []) : [];
                const holiday = cellISO ? holidayByDate[cellISO] : null;
                const isToday = cellISO === todayKey;

                let cellClasses = "flex flex-col items-start justify-start rounded-lg p-2 md:p-2.5 text-xs transition-colors border ";
                if (!cell.currentMonth) cellClasses += "bg-white text-gray-300 border-transparent";
                else if (holiday) cellClasses += "bg-red-600 text-white border-red-600 hover:bg-red-700 cursor-pointer";
                else if (leaves.length > 0) cellClasses += "bg-yellow-100 text-gray-800 border-yellow-300 hover:border-yellow-400 cursor-pointer";
                else cellClasses += "bg-white text-gray-800 border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 cursor-pointer";
                if (isToday) cellClasses += " ring-2 ring-blue-500";

                return (
                  <div key={i} onClick={() => cell.currentMonth && openDay(cell)} className={cellClasses} title={holiday?.reason || ""}>
                    <span className="font-bold text-sm mb-1.5">{cell.day}</span>
                    {holiday ? (
                      <span className="px-1.5 py-0.5 rounded bg-white/20 font-medium truncate w-full">{holiday.reason}</span>
                    ) : (
                      leaves.slice(0, 2).map((l) => (
                        <span key={l.availability_id} className="px-1.5 py-0.5 rounded bg-white/60 text-yellow-800 font-medium truncate w-full">
                          {l.full_name}
                        </span>
                      ))
                    )}
                    {!holiday && leaves.length > 2 && (
                      <span className="px-1.5 text-yellow-800 font-semibold">+{leaves.length - 2} more</span>
                    )}
                  </div>
                );
              })}
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

            {selectedDayHoliday && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
                Holiday: {selectedDayHoliday.reason}
              </div>
            )}

            <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2.5">
              <p className="m-0 mb-1.5 text-sm font-semibold text-yellow-800">
                On Leave This Day {selectedDayLeaves.length > 0 ? `(${selectedDayLeaves.length})` : ""}
              </p>
              {selectedDayLeaves.length === 0 ? (
                <p className="m-0 text-xs text-yellow-700/70">No one is on leave this day.</p>
              ) : (
                <ul className="m-0 pl-4 space-y-0.5">
                  {selectedDayLeaves.map((l) => (
                    <li key={l.availability_id} className="text-xs text-yellow-900">
                      {l.full_name} {l.reason ? `(${l.reason})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-1.5 font-medium">{isLabour ? "Labourer:" : "Technical Assistant:"}</p>
            <select value={draftPersonId} onChange={(e) => setDraftPersonId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">
              {activePeople.map((p) => <option key={p[personIdKey]} value={p[personIdKey]}>{p.full_name}</option>)}
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

      {showRosterModal && (
        <div onClick={() => setShowRosterModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl relative">
            <button onClick={() => setShowRosterModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Labourer</h3>
            <form onSubmit={handleAddLabour} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                <input required value={rosterForm.full_name} onChange={(e) => setRosterForm({ ...rosterForm, full_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input value={rosterForm.phone} onChange={(e) => setRosterForm({ ...rosterForm, phone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20" />
              </div>
              <button type="submit" disabled={rosterSaving} className="w-full bg-[#006B33] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-60">
                {rosterSaving ? 'Adding...' : 'Add Labourer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
