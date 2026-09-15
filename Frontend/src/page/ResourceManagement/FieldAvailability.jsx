import { useNavigate } from "react-router-dom";
import ResourceTabs from "./ResourceTabs";
import FieldCalendar from "./FieldCalendar";

export default function FieldAvailability() {
  const navigate = useNavigate();

  return (
    <div className="p-5 md:p-8 h-full flex flex-col box-border bg-gray-50/30 overflow-auto">
      <button onClick={() => navigate("/resource-management")} className="mb-3 cursor-pointer border border-gray-300 bg-white rounded-md px-3.5 py-1.5 w-fit text-sm hover:bg-gray-50 transition-colors">
        ← Back
      </button>
      <h2 className="m-0 mb-4 text-xl font-bold text-gray-900 tracking-tight">FMRC Field Availability</h2>

      <ResourceTabs active="Field Availability" />

      <FieldCalendar emphasis="availability" />
    </div>
  );
}
