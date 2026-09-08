// Small shared helpers for the month-grid calendars in Resource Management.

export function buildMonthCells(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - daysInMonth - firstDayIndex + 1;
    cells.push({ day: nextDay, currentMonth: false, date: null });
  }
  return cells;
}

export function toISODate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatFullDate(date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit", weekday: "long" });
}
