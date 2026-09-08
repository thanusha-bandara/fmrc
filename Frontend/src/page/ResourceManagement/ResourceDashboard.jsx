import { useNavigate } from "react-router-dom";
import { CalendarDays, Droplet, CloudSun, Wheat, Users } from "lucide-react";

const cards = [
  { title: "FMRC Calendar", Icon: CalendarDays, color: "#6C63FF", bg: "#EEEDFF", path: "/resource-management/fmrc-calendar" },
  { title: "Water Schedule", Icon: Droplet, color: "#2196F3", bg: "#E3F2FD", path: "/resource-management/water-schedule" },
  { title: "Weather Conditions", Icon: CloudSun, color: "#FB8C00", bg: "#FFF3E0", path: "/resource-management/weather-conditions" },
  { title: "Field Availability", Icon: Wheat, color: "#4CAF50", bg: "#E8F5E9", path: "/resource-management/field-availability" },
  { title: "Human Availability", Icon: Users, color: "#7B1FA2", bg: "#F3E5F5", path: "/resource-management/human-availability" },
];

export default function ResourceDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-7 md:p-8 w-full">
      <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Resource Management</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.path)}
            className="bg-white border-2 border-[#4CAF50] rounded-2xl p-7 text-left flex flex-col justify-between min-h-[180px] hover:shadow-lg transition-all hover:-translate-y-1 duration-200"
          >
            <p className="font-bold text-lg text-gray-800 m-0">{card.title}</p>
            <div
              className="self-end w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: card.bg }}
            >
              <card.Icon size={32} color={card.color} strokeWidth={1.8} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}