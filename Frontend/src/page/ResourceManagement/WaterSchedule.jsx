import { useNavigate } from "react-router-dom";
import ResourceTabs from "./ResourceTabs";
import FieldsTable from "./FieldsTable";

export default function WaterSchedule() {
  const navigate = useNavigate();

  return (
    <div className="p-5 md:p-8 h-full flex flex-col box-border">
      <button onClick={() => navigate("/resource-management")} className="mb-3 cursor-pointer border border-gray-300 bg-white rounded-md px-3.5 py-1.5 w-fit text-sm hover:bg-gray-50 transition-colors">
        ← Back
      </button>
      <h2 className="m-0 mb-4 text-xl font-bold text-gray-900 tracking-tight">Water Schedule</h2>
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        Reflects irrigation water issuance (Yala/Maha) per field, used as a hard constraint by the scheduler.
      </p>

      <ResourceTabs active="Water Schedule" />

      <FieldsTable emphasis="water" />
    </div>
  );
}
