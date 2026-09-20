// One-off migration: seeds the 2027 Sri Lanka public holiday calendar.
// NOTE: as of when this was written, the Government Printing Department had not
// yet gazetted the official 2027 calendar (it's normally released a few months
// before the year starts). These dates are the widely-published projection
// (poya days are astronomically fixed; Id-Ul-Fitr/Id-Ul-Alha depend on moon
// sighting and can shift by a day). Re-check and correct once the official
// list is out, the same way addGovHolidays2026.js was for 2026.
// Run with: node scripts/addGovHolidays2027.js
import db from "../config/db.js";

const GOV_HOLIDAYS_2027 = [
  ["2027-01-15", "Tamil Thai Pongal Day"],
  ["2027-01-22", "Duruthu Full Moon Poya Day"],
  ["2027-02-04", "National Day (Independence Day)"],
  ["2027-02-20", "Navam Full Moon Poya Day"],
  ["2027-03-06", "Mahasivarathri Day"],
  ["2027-03-10", "Id-Ul-Fitr"],
  ["2027-03-21", "Madin Full Moon Poya Day"],
  ["2027-03-26", "Good Friday"],
  ["2027-04-13", "Day Prior to Sinhala & Tamil New Year"],
  ["2027-04-14", "Sinhala & Tamil New Year Day"],
  ["2027-04-20", "Bak Full Moon Poya Day"],
  ["2027-05-01", "May Day"],
  ["2027-05-17", "Id-Ul-Alha (Hajj Festival)"],
  ["2027-05-20", "Vesak Full Moon Poya Day"],
  ["2027-05-21", "Day Following Vesak Full Moon Poya Day"],
  ["2027-06-18", "Poson Full Moon Poya Day"],
  ["2027-07-18", "Esala Full Moon Poya Day"],
  ["2027-08-15", "Milad-un-Nabi"],
  ["2027-08-16", "Nikini Full Moon Poya Day"],
  ["2027-09-15", "Binara Full Moon Poya Day"],
  ["2027-10-15", "Vap Full Moon Poya Day"],
  ["2027-10-28", "Deepavali Festival Day"],
  ["2027-11-13", "Il Full Moon Poya Day"],
  ["2027-12-13", "Unduvap Full Moon Poya Day"],
  ["2027-12-25", "Christmas Day"],
];

const run = async () => {
  // is_holiday starts FALSE (shown blue) -- an admin confirms a specific date
  // as an FMRC day off (red) from the calendar UI, same as the 2026 seed.
  for (const [date, reason] of GOV_HOLIDAYS_2027) {
    await db.query(
      `INSERT INTO FMRC_Calendar (date, reason, is_holiday, holiday_type)
       VALUES (?, ?, FALSE, 'Government')
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), holiday_type = 'Government'`,
      [date, reason]
    );
  }
  console.log(`Seeded ${GOV_HOLIDAYS_2027.length} government holidays for 2027.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
