import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { listHolidays, markHoliday, removeHoliday, unmarkHoliday } from "../../api/resources";
import { getErrorMessage } from "../../api/client";
import ResourceTabs from "./ResourceTabs";
import { buildMonthCells, toISODate, formatFullDate, canEditResources } from "./calendarUtils";

export default function FMRCCalendar() {
  const navigate = useNavigate();
  const canEdit = canEditResources();
  const [monthOffset, setMonthOffset] = useState(0);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [draftHoliday, setDraftHoliday] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listHolidays()
      .then(setHolidays)
      .catch((err) => setError(getErrorMessage(err, "Could not load the calendar.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1);
  const monthLabel = baseDate.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = buildMonthCells(baseDate);

  const holidayByDate = {};
  holidays.forEach((h) => { holidayByDate[h.date] = h; });

  const openDay = (cell) => {
    const iso = toISODate(cell.date);
    const info = holidayByDate[iso];
    setSelectedDay(cell.date);
    setDraftHoliday(Boolean(info?.is_holiday));
    setDraftNote(info?.reason || "");
  };

  const closeModal = () => setSelectedDay(null);

  const saveDay = async () => {
    const iso = toISODate(selectedDay);
    const existing = holidayByDate[iso];
    setSaving(true);
    setError("");
    try {
      if (draftHoliday) {
        await markHoliday(iso, draftNote || "Special Non-Working Day");
      } else if (existing?.is_holiday) {
        // A Government holiday stays on the calendar (and blue) even once FMRC
        // opts to treat it as a working day -- only FMRC's own entries get deleted.
        if (existing.holiday_type === "Government") {
          await unmarkHoliday(existing.calendar_id);
        } else {
          await removeHoliday(existing.calendar_id);
        }
      }
      closeModal();
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this day."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="p-5 md:p-8 h-full flex flex-col box-border">
        <button onClick={() => navigate("/resource-management")} className="mb-3 cursor-pointer border border-gray-300 bg-white rounded-md px-3.5 py-1.5 w-fit text-sm hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <h2 className="m-0 mb-4 text-xl font-bold text-gray-900 tracking-tight">FMRC Calendar</h2>

        <ResourceTabs active="FMRC Calendar" />

        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 font-medium">{error}</div>}

        <div className="border border-gray-200 rounded-xl p-4 md:p-5 bg-white flex-1 flex flex-col min-h-0 shadow-sm">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <button onClick={() => setMonthOffset((m) => m - 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">◀</button>
            <h3 className="m-0 text-lg font-bold text-gray-800">{monthLabel}</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-red-600 inline-block rounded-sm"></span>
                <span className="text-sm text-gray-600 font-medium">FMRC Holidays</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-blue-600 inline-block rounded-sm"></span>
                <span className="text-sm text-gray-600 font-medium">Government Holidays</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-white inline-block rounded-sm ring-2 ring-emerald-500"></span>
                <span className="text-sm text-gray-600 font-medium">Today</span>
              </div>
            </div>
            <button onClick={() => setMonthOffset((m) => m + 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">▶</button>
          </div>

          <div className="grid grid-cols-7 text-center text-gray-500 mb-2 text-sm font-medium shrink-0">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}>
            {loading ? (
              <div className="col-span-7 flex items-center justify-center text-gray-400">Loading...</div>
            ) : cells.map((cell, i) => {
              const info = cell.currentMonth ? holidayByDate[toISODate(cell.date)] : null;
              const isToday = cell.currentMonth && toISODate(cell.date) === toISODate(new Date());
              let cellClasses = "flex items-center justify-center rounded-lg font-medium text-base ";
              if (!cell.currentMonth) cellClasses += "bg-white text-gray-300";
              else if (info?.holiday_type === "Government" && info?.is_holiday) cellClasses += "bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-sm";
              else if (info?.is_holiday) cellClasses += "bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-colors shadow-sm";
              else if (info?.holiday_type === "Government") cellClasses += "bg-blue-50 text-blue-800 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors";
              else cellClasses += "bg-white text-gray-800 cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200";
              if (isToday) cellClasses += " ring-2 ring-offset-1 ring-emerald-500";

              return (
                <div key={i} onClick={() => cell.currentMonth && openDay(cell)} title={info?.reason || ""} className={cellClasses}>
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDay && (
        <div onClick={closeModal} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-[360px] shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-green-50 text-green-800 px-3.5 py-2 rounded-lg font-semibold text-sm border border-green-100">{formatFullDate(selectedDay)}</div>
              <button onClick={closeModal} className="bg-transparent border-none cursor-pointer hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>

            {!canEdit && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">View only — only Technical Assistants can change the calendar.</p>}

            <p className="text-sm text-gray-600 mb-2 font-medium">Set day status:</p>
            <div className="flex gap-2.5 mb-4">
              <button disabled={!canEdit} onClick={() => setDraftHoliday(true)} className={`flex-1 p-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${draftHoliday ? "border-2 border-red-600 bg-red-50 text-red-700" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"} ${canEdit ? "cursor-pointer" : ""}`}>Holiday</button>
              <button disabled={!canEdit} onClick={() => setDraftHoliday(false)} className={`flex-1 p-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${!draftHoliday ? "border-2 border-green-600 bg-green-50 text-green-700" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"} ${canEdit ? "cursor-pointer" : ""}`}>Not Holiday</button>
            </div>

            <p className="text-sm text-gray-600 mb-1.5 font-medium">Reason:</p>
            <textarea disabled={!canEdit} value={draftNote} onChange={(e) => setDraftNote(e.target.value)} placeholder="e.g. Poya Day Holiday" rows={3}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-sans resize-none box-border mb-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow disabled:bg-gray-50 disabled:text-gray-500" />

            {canEdit && (
              <button onClick={saveDay} disabled={saving} className="w-full p-2.5 rounded-lg border-none bg-[#4CAF50] hover:bg-[#43a047] text-white font-semibold cursor-pointer text-sm transition-colors shadow-sm disabled:opacity-60">
                {saving ? "Saving..." : "Save Details"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
