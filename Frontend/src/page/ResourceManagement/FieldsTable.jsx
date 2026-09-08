import { useState, useEffect } from "react";
import { Plus, X, MapPin, Droplets, Sprout, Tractor, CheckCircle2, XCircle } from "lucide-react";
import { listFields, addField, updateField } from "../../api/resources";
import { getErrorMessage } from "../../api/client";

export default function FieldsTable({ emphasis }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ field_name: "", season: "Off-Season" });

  const load = () => {
    setLoading(true);
    listFields()
      .then(setFields)
      .catch((err) => setError(getErrorMessage(err, "Could not load fields.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (field, key) => {
    setError("");
    try {
      await updateField(field.field_id, { [key]: !field[key] });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the field."));
    }
  };

  const changeSeason = async (field, season) => {
    setError("");
    try {
      await updateField(field.field_id, { season });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the field."));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.field_name) return;
    setSaving(true);
    setError("");
    try {
      await addField(form);
      setShowModal(false);
      setForm({ field_name: "", season: "Off-Season" });
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not add field."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-transparent">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Field Resources</h3>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#006B33] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition shadow-sm">
          <Plus size={18} /> Add New Field
        </button>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium shadow-sm">{error}</div>}

      {loading ? (
        <div className="p-10 text-center text-gray-400 font-semibold bg-white rounded-2xl border border-gray-100 shadow-sm">Loading fields...</div>
      ) : fields.length === 0 ? (
        <div className="p-10 text-center text-gray-400 font-semibold bg-white rounded-2xl border border-gray-100 shadow-sm">No fields registered yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((f) => (
            <div key={f.field_id} className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md border transition-all duration-300 p-6 flex flex-col ${emphasis === 'water' && f.water_available ? 'border-blue-200 bg-blue-50/10' : emphasis === 'availability' && f.is_available ? 'border-green-200 bg-green-50/10' : 'border-gray-100'}`}>
              
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                    <MapPin className={f.is_available ? "text-[#006B33]" : "text-gray-400"} size={20} /> 
                    {f.field_name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Sprout size={14} className="text-gray-500" />
                    <select 
                      value={f.season} 
                      onChange={(e) => changeSeason(f, e.target.value)} 
                      className="text-xs font-semibold text-gray-600 bg-transparent outline-none cursor-pointer hover:text-[#006B33]"
                    >
                      <option value="Yala">Yala Season</option>
                      <option value="Maha">Maha Season</option>
                      <option value="Off-Season">Off-Season</option>
                    </select>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${f.is_available ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {f.is_available ? 'Active' : 'Closed'}
                </div>
              </div>

              <div className="space-y-4 mt-auto">
                <div className={`flex justify-between items-center p-3 rounded-xl border ${emphasis === 'availability' ? 'border-[#006B33] bg-[#006B33]/5 ring-1 ring-[#006B33]/20' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    {f.is_available ? <CheckCircle2 size={18} className="text-[#006B33]" /> : <XCircle size={18} className="text-gray-400" />}
                    Field Access
                  </span>
                  <Switch active={Boolean(f.is_available)} onClick={() => toggle(f, "is_available")} color="bg-[#006B33]" />
                </div>

                <div className={`flex justify-between items-center p-3 rounded-xl border ${emphasis === 'water' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Droplets size={18} className={f.water_available ? "text-blue-500" : "text-gray-400"} />
                    Water Supply
                  </span>
                  <Switch active={Boolean(f.water_available)} onClick={() => toggle(f, "water_available")} color="bg-blue-500" />
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Tractor size={18} className={f.is_land_preparation_period ? "text-amber-500" : "text-gray-400"} />
                    Land Prep
                  </span>
                  <Switch active={Boolean(f.is_land_preparation_period)} onClick={() => toggle(f, "is_land_preparation_period")} color="bg-amber-500" />
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><MapPin className="text-[#006B33]" /> Add New Field</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Field Name *</label>
                <input required value={form.field_name} onChange={(e) => setForm({ ...form, field_name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 transition-all" placeholder="e.g. Test Field A" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Current Season</label>
                <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#006B33] focus:ring-2 focus:ring-[#006B33]/20 transition-all">
                  <option value="Yala">Yala Season</option>
                  <option value="Maha">Maha Season</option>
                  <option value="Off-Season">Off-Season</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-[#006B33] text-white py-3 mt-2 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-60 transition-colors shadow-md">
                {saving ? "Registering..." : "Register Field"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({ active, onClick, color }) {
  return (
    <div 
      onClick={onClick} 
      className={`w-11 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors duration-300 ${active ? color : 'bg-gray-200'}`}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  );
}
