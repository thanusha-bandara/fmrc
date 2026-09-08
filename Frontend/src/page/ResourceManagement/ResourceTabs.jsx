import { useNavigate } from "react-router-dom";

const TAB_ROUTES = {
  "FMRC Calendar": "/resource-management/fmrc-calendar",
  "Water Schedule": "/resource-management/water-schedule",
  "Weather Conditions": "/resource-management/weather-conditions",
  "Field Availability": "/resource-management/field-availability",
  "Human Availability": "/resource-management/human-availability"
};

export default function ResourceTabs({ active }) {
  const navigate = useNavigate();
  return (
    <div className="flex gap-5 border-b border-gray-300 mb-4 shrink-0 overflow-x-auto">
      {Object.keys(TAB_ROUTES).map((tab) => (
        <span
          key={tab}
          onClick={() => navigate(TAB_ROUTES[tab])}
          className={`pb-2 text-sm cursor-pointer whitespace-nowrap ${
            tab === active
              ? "text-green-700 border-b-2 border-green-700 font-semibold"
              : "text-gray-500 font-normal hover:text-gray-700"
          }`}
        >
          {tab}
        </span>
      ))}
    </div>
  );
}
