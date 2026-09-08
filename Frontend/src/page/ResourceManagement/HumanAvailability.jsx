import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { listStaffAvailability, setStaffAvailability } from "../../api/resources";
import { listUsers } from "../../api/users";
import { getErrorMessage } from "../../api/client";
import ResourceTabs from "./ResourceTabs";
import { buildMonthCells, toISODate, formatFullDate } from "./calendarUtils";

export default function HumanAvailability() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [records, setRecords] = useState([]);
  const [tas, setTas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([listStaffAvailability(), listUsers("Technical_Assistant")])
      .then(([recordData, taData]) => {
        setRecords(recordData);
        setTas(taData);
        if (taData.length > 0) setDraftUserId(String(taData[0].user_id));
      })
      .catch((err) => setError(getErrorMessage(err, "Could not load availability data.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1);
  const monthLabel = baseDate.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = buildMonthCells(baseDate);

  const leavesByDate = {};
  records.forEach((r) => {
    const dateStr = new Date(r.date).toISOString().split("T")[0];
    if (!leavesByDate[dateStr]) leavesByDate[dateStr] = [];
    if (r.is_on_leave) leavesByDate[dateStr].push(r);
  });

  const today = new Date();
  const todayKey = toISODate(today);
  const todaysLeaves = leavesByDate[todayKey] || [];

  const openDay = (cell) => {
    setSelectedDay(cell.date);
    setDraftReason("");
  };

  const closeModal = () => setSelectedDay(null);

  const saveDay = async (isOnLeave) => {
    if (!draftUserId) return;
    setSaving(true);
    setError("");
    try {
      await setStaffAvailability({ userId: Number(draftUserId), date: toISODate(selectedDay), isOnLeave, reason: draftReason });
      closeModal();
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update availability."));
    } finally {
      setSaving(false);
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

        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 font-medium">{error}</div>}

        <div className="flex flex-col md:flex-row gap-4 mb-4 shrink-0">
          <div className="flex-1 bg-green-50 rounded-xl p-4 md:p-5 shadow-sm border border-green-100">
            <p className="m-0 mb-1 text-sm text-gray-600 font-medium">Technical Assistants</p>
            <p className="m-0 mb-1 font-bold text-lg text-gray-900">{tas.length - todaysLeaves.length} / {tas.length} Available Today</p>
            {todaysLeaves.length > 0 && (
              <p className="m-0 text-xs font-semibold text-red-600 bg-red-100/50 w-fit px-2 py-0.5 rounded-full">{todaysLeaves.length} On Leave Today</p>
            )}
          </div>
          <div className="flex-[1.4] bg-green-50 rounded-xl p-4 md:p-5 shadow-sm border border-green-100">
            <p className="m-0 mb-2 text-sm text-gray-700 font-semibold">Today's Leave Details:</p>
            {todaysLeaves.length === 0 ? (
              <p className="m-0 text-xs text-gray-500">No one is on leave today.</p>
            ) : todaysLeaves.map((l) => (
              <p key={l.availability_id} className="m-0 mb-1 text-xs text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> {l.full_name} {l.reason ? `(${l.reason})` : ''}
              </p>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 md:p-5 bg-white shrink-0 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setMonthOffset((m) => m - 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">◀</button>
            <h3 className="m-0 text-lg font-bold text-gray-800">{monthLabel}</h3>
            <button onClick={() => setMonthOffset((m) => m + 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">▶</button>
          </div>

          <div className="grid grid-cols-7 text-center text-gray-500 mb-2 text-sm font-medium">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 90px)` }}>
            {loading ? (
              <div className="col-span-7 flex items-center justify-center text-gray-400">Loading...</div>
            ) : cells.map((cell, i) => {
              const leaves = cell.currentMonth ? (leavesByDate[toISODate(cell.date)] || []) : [];
              let cellClasses = "flex flex-col items-start justify-start rounded-lg p-2 md:p-2.5 text-xs transition-colors border ";
              if (!cell.currentMonth) cellClasses += "bg-white text-gray-300 border-transparent";
              else if (leaves.length > 0) cellClasses += "bg-red-50 text-gray-800 border-red-100 hover:border-red-200 cursor-pointer";
              else cellClasses += "bg-white text-gray-800 border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 cursor-pointer";

              return (
                <div key={i} onClick={() => cell.currentMonth && openDay(cell)} className={cellClasses}>
                  <span className="font-bold text-sm mb-1.5 text-gray-900">{cell.day}</span>
                  {leaves.slice(0, 2).map((l) => (
                    <span key={l.availability_id} className="px-1.5 py-0.5 rounded bg-white/60 text-red-700 font-medium truncate w-full">
                      {l.full_name}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDay && (
        <div onClick={closeModal} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[380px] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-green-50 text-green-800 px-3.5 py-2 rounded-lg font-semibold text-sm border border-green-100">{formatFullDate(selectedDay)}</div>
              <button onClick={closeModal} className="bg-transparent border-none cursor-pointer hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>

            <p className="text-sm text-gray-600 mb-1.5 font-medium">Technical Assistant:</p>
            <select value={draftUserId} onChange={(e) => setDraftUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm mb-4 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">
              {tas.map((t) => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
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
    </>
  );
}
