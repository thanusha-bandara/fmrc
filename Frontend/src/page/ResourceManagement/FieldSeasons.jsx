import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Calendar, Trash2 } from "lucide-react";
import { listFarmSeasons, setFarmSeason, deleteFarmSeason } from "../../api/resources";
import { getErrorMessage } from "../../api/client";
import ResourceTabs from "./ResourceTabs";
import { canEditResources } from "./calendarUtils";

export default function FieldSeasons() {
  const navigate = useNavigate();
  const canEdit = canEditResources();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    seasonType: "Ploughing",
    startDate: "",
    endDate: ""
  });

  const load = () => {
    setLoading(true);
    listFarmSeasons()
      .then(setSeasons)
      .catch((err) => setError(getErrorMessage(err, "Could not load farm seasons.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return;
    setSaving(true);
    setError("");
    try {
      await setFarmSeason(form);
      setShowModal(false);
      setForm({ seasonType: "Ploughing", startDate: "", endDate: "" });
      load();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Season added successfully', showConfirmButton: false, timer: 3000 });
    } catch (err) {
      setError(getErrorMessage(err, "Could not add season."));
    } finally {
      setSaving(false);
    }
  };

  const removeSeason = async (id) => {
    const result = await Swal.fire({ title: 'Are you sure?', text: 'Remove this season?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#006B33', cancelButtonColor: '#d33', confirmButtonText: 'Yes, remove it!' });
    if (!result.isConfirmed) return;
    setError("");
    try {
      await deleteFarmSeason(id);
      load();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Season removed successfully', showConfirmButton: false, timer: 3000 });
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove season."));
    }
  };

  return (
    <div className="p-5 md:p-8 h-full flex flex-col box-border overflow-auto bg-gray-50/30">
      <button onClick={() => navigate("/resource-management")} className="mb-3 cursor-pointer border border-gray-300 bg-white rounded-md px-3.5 py-1.5 w-fit text-sm hover:bg-gray-50 transition-colors">
        ← Back
      </button>
      <h2 className="m-0 mb-4 text-xl font-bold text-gray-900 tracking-tight">Current Season Configuration</h2>
      <ResourceTabs active="Current Season" />

      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Field Seasons</h3>
          <p className="text-sm text-gray-500 m-0">Define the global ploughing and harvesting periods.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#006B33] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition shadow-sm cursor-pointer">
            <Plus size={18} /> Add Season Period
          </button>
        )}
      </div>

      {!canEdit && <p className="mb-6 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">View only — only Technical Assistants can change seasons.</p>}

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium shadow-sm">{error}</div>}

      {loading ? (
        <div className="p-10 text-center text-gray-400 font-semibold bg-white rounded-2xl border border-gray-100 shadow-sm">Loading seasons...</div>
      ) : seasons.length === 0 ? (
        <div className="p-10 text-center text-gray-400 font-semibold bg-white rounded-2xl border border-gray-100 shadow-sm">No seasons configured yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seasons.map((s) => (
            <div key={s.id} className="relative bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 transition-all duration-300 p-6 flex flex-col">
              
              <div className="flex justify-between items-start mb-5">
                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <Calendar className={s.season_type === "Harvesting" ? "text-green-600" : "text-amber-500"} size={20} /> 
                  {s.season_type} Season
                </h3>
                {canEdit && (
                  <button onClick={() => removeSeason(s.id)} className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors bg-transparent border-none">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-4 mt-auto">
                <div className="flex justify-between items-center p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-600">Start Date</span>
                  <span className="text-sm font-bold text-gray-900">{new Date(s.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-600">End Date</span>
                  <span className="text-sm font-bold text-gray-900">{new Date(s.end_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer"><X size={20} /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Calendar className="text-[#006B33]" /> Add Season Period</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Season Type *</label>
                <select required value={form.seasonType} onChange={(e) => setForm({ ...form, seasonType: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 transition-all bg-white">
                  <option value="Ploughing">Ploughing Season</option>
                  <option value="Harvesting">Harvesting Season</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 transition-all" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 transition-all" />
              </div>

              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-3 mt-2 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-60 transition-colors shadow-md cursor-pointer">
                {saving ? "Saving..." : "Save Season"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
