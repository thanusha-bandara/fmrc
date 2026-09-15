import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { listFarmDailyStatus, setFarmDailyStatus } from "../../api/resources";
import { getErrorMessage } from "../../api/client";
import { buildMonthCells, toISODate, formatFullDate } from "./calendarUtils";

export default function FieldCalendar({ emphasis }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedDay, setSelectedDay] = useState(null);
  const [draftFieldAvailable, setDraftFieldAvailable] = useState(true);
  const [draftWaterAvailable, setDraftWaterAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const recs = await listFarmDailyStatus();
      setRecords(recs);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load availability data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1);
  const monthLabel = baseDate.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = buildMonthCells(baseDate);

  const recordsByDate = {};
  records.forEach((r) => {
    if (r && r.date) {
      const dateStr = new Date(r.date).toISOString().split("T")[0];
      recordsByDate[dateStr] = r;
    }
  });

  const today = new Date();
  const todayKey = toISODate(today);

  const openDay = (cell) => {
    setSelectedDay(cell.date);
    const dateStr = toISODate(cell.date);
    const existing = recordsByDate[dateStr];
    
    if (existing) {
      setDraftFieldAvailable(Boolean(existing.is_field_available));
      setDraftWaterAvailable(Boolean(existing.is_water_available));
    } else {
      setDraftFieldAvailable(true);
      setDraftWaterAvailable(true);
    }
  };

  const closeModal = () => setSelectedDay(null);

  const saveDay = async () => {
    if (!selectedDay) return;
    setSaving(true);
    setError("");
    try {
      await setFarmDailyStatus({ 
        date: toISODate(selectedDay), 
        isFieldAvailable: draftFieldAvailable,
        isWaterAvailable: draftWaterAvailable
      });
      closeModal();
      loadRecords();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update daily status."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">{error}</div>}

        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4 w-full justify-between">
              <button onClick={() => setMonthOffset((m) => m - 1)} className="cursor-pointer border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-600">◀</button>
              <h3 className="m-0 text-xl font-bold text-gray-800">{monthLabel}</h3>
              <button onClick={() => setMonthOffset((m) => m + 1)} className="cursor-pointer border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 text-blue-600">▶</button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4 text-xs font-medium text-gray-600">
            {emphasis !== 'water' && <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200"></span> Not Available</div>}
            {emphasis !== 'availability' && <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200"></span> Water Available</div>}
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-green-500 bg-white"></span> Today</div>
          </div>

          <div className="grid grid-cols-7 text-center text-gray-500 mb-3 text-sm font-semibold">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 100px)` }}>
            {loading ? (
              <div className="col-span-7 flex items-center justify-center text-gray-400">Loading...</div>
            ) : cells.map((cell, i) => {
              const cellDateStr = cell.currentMonth && cell.date ? toISODate(cell.date) : null;
              const record = cell.currentMonth && cellDateStr ? recordsByDate[cellDateStr] : null;
              const isToday = cellDateStr === todayKey;
              
              const isAvail = record ? Boolean(record.is_field_available) : true;
              const isWater = record ? Boolean(record.is_water_available) : true;
              
              let cellClasses = "flex flex-col items-start justify-start rounded-lg p-2 transition-colors border ";
              if (!cell.currentMonth) {
                cellClasses += "bg-white text-gray-300 border-transparent";
              } else if (!isAvail && emphasis !== 'water') {
                cellClasses += "bg-red-50 border-red-200 cursor-pointer hover:shadow-sm"; 
              } else if (isWater && emphasis !== 'availability') {
                cellClasses += "bg-blue-50 border-blue-200 cursor-pointer hover:shadow-sm";
              } else {
                cellClasses += "bg-white text-gray-800 border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer";
              }
              
              if (isToday) {
                cellClasses += " border-2 !border-green-500";
              }

              return (
                <div key={i} onClick={() => cell.currentMonth && openDay(cell)} className={cellClasses}>
                  <span className={`font-bold text-sm mb-1 ${!cell.currentMonth ? 'text-gray-300' : 'text-gray-900'}`}>{cell.day}</span>
                  
                  {cell.currentMonth && !isAvail && emphasis !== 'water' && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium truncate w-full mb-0.5 bg-red-100 text-red-800">
                      Not Available
                    </span>
                  )}
                  {cell.currentMonth && isWater && emphasis !== 'availability' && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium truncate w-full mb-0.5 bg-blue-100 text-blue-800">
                      Water Available
                    </span>
                  )}
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

            <div className="space-y-4 mb-6">
              {(emphasis === 'availability' || !emphasis) && (
                <div className="flex justify-between items-center p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="font-bold text-sm text-gray-700">Field Available?</span>
                  <input 
                    type="checkbox" 
                    checked={draftFieldAvailable} 
                    onChange={(e) => setDraftFieldAvailable(e.target.checked)}
                    className="w-5 h-5 accent-green-600 cursor-pointer"
                  />
                </div>
              )}

              {(emphasis === 'water' || !emphasis) && (
                <div className="flex justify-between items-center p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="font-bold text-sm text-gray-700">Water Available?</span>
                  <input 
                    type="checkbox" 
                    checked={draftWaterAvailable} 
                    onChange={(e) => setDraftWaterAvailable(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <button onClick={saveDay} disabled={saving} className="w-full bg-[#006B33] text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-60 transition-colors shadow-md">
              {saving ? "Saving..." : "Save Daily Status"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
