import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, CloudRain, RefreshCw, X } from "lucide-react";
import { listWeatherLogs, setManualWeather, refreshWeather } from "../../api/resources";
import { getErrorMessage } from "../../api/client";
import ResourceTabs from "./ResourceTabs";
import { buildMonthCells, toISODate, formatFullDate } from "./calendarUtils";

export default function WeatherConditions() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [draftRainy, setDraftRainy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listWeatherLogs()
      .then(setLogs)
      .catch((err) => setError(getErrorMessage(err, "Could not load weather data.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      await refreshWeather();
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not refresh from OpenWeatherMap."));
    } finally {
      setRefreshing(false);
    }
  };

  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + monthOffset, 1);
  const monthLabel = baseDate.toLocaleString("default", { month: "long", year: "numeric" });
  const cells = buildMonthCells(baseDate);

  const logByDate = {};
  logs.forEach((l) => { logByDate[l.date] = l; });

  const openDay = (cell) => {
    const info = logByDate[toISODate(cell.date)];
    setSelectedDay(cell.date);
    setDraftRainy(Boolean(info?.is_rainy));
  };

  const closeModal = () => setSelectedDay(null);

  const saveDay = async () => {
    setSaving(true);
    setError("");
    try {
      await setManualWeather(toISODate(selectedDay), draftRainy);
      closeModal();
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not save weather for this day."));
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="m-0 text-xl font-bold text-gray-900 tracking-tight">FMRC Weather</h2>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 text-sm font-semibold text-[#006B33] border border-[#006B33] rounded-md px-3 py-1.5 hover:bg-green-50 disabled:opacity-60">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Syncing..." : "Sync OpenWeatherMap"}
          </button>
        </div>

        <ResourceTabs active="Weather Conditions" />

        {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 font-medium">{error}</div>}

        <div className="border border-gray-200 rounded-xl p-4 md:p-5 bg-white flex-1 flex flex-col min-h-0 shadow-sm">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <button onClick={() => setMonthOffset((m) => m - 1)} className="cursor-pointer border border-gray-300 rounded-md px-2.5 py-1 bg-white hover:bg-gray-50">◀</button>
            <h3 className="m-0 text-lg font-bold text-gray-800">{monthLabel}</h3>
            <div className="flex flex-col gap-1 text-sm text-gray-600 font-medium">
              <div className="flex items-center gap-1.5"><CloudRain size={16} className="text-blue-500 fill-blue-300" /> Rainy Days</div>
              <div className="flex items-center gap-1.5"><Sun size={16} className="text-yellow-500 fill-yellow-400" /> Clear Days</div>
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
              const info = cell.currentMonth ? logByDate[toISODate(cell.date)] : null;
              let cellClasses = "flex flex-col items-center justify-center rounded-lg font-medium text-base gap-0.5 transition-colors ";
              if (!cell.currentMonth) cellClasses += "bg-white text-gray-300";
              else cellClasses += "cursor-pointer text-gray-800 bg-white hover:bg-green-50";

              return (
                <div key={i} onClick={() => cell.currentMonth && openDay(cell)} title={info ? `${info.date}: ${info.is_rainy ? 'Rainy' : 'Clear'} (${info.marked_by})` : ""} className={cellClasses}>
                  {info && (info.is_rainy ? <CloudRain size={16} className="text-blue-500 fill-blue-300" /> : <Sun size={16} className="text-yellow-500 fill-yellow-400" />)}
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

            <p className="text-sm text-gray-600 mb-2 font-medium">Weather Condition:</p>
            <div className="flex gap-2.5 mb-4">
              <button onClick={() => setDraftRainy(false)} className={`flex-1 py-2.5 rounded-lg font-semibold flex flex-col items-center gap-1 text-sm transition-colors ${!draftRainy ? "border-2 border-yellow-500 bg-yellow-50 text-yellow-700" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                <Sun size={18} /> Clear
              </button>
              <button onClick={() => setDraftRainy(true)} className={`flex-1 py-2.5 rounded-lg font-semibold flex flex-col items-center gap-1 text-sm transition-colors ${draftRainy ? "border-2 border-blue-600 bg-blue-50 text-blue-700" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                <CloudRain size={18} /> Rainy (&gt;5mm)
              </button>
            </div>

            <button onClick={saveDay} disabled={saving} className="w-full p-2.5 rounded-lg border-none bg-[#4CAF50] hover:bg-[#43a047] text-white font-semibold cursor-pointer text-sm transition-colors shadow-sm disabled:opacity-60">
              {saving ? "Saving..." : "Save Details"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
