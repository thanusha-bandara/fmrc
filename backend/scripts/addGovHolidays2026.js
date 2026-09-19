// One-off migration: adds a holiday_type column to FMRC_Calendar (so we can tell
// government/public holidays apart from FMRC-only non-working days like shramadana)
// and seeds the official 2026 Sri Lanka public holiday calendar.
// Run with: node scripts/addGovHolidays2026.js
import db from "../config/db.js";

const GOV_HOLIDAYS_2026 = [
  ["2026-01-03", "Duruthu Full Moon Poya Day"],
  ["2026-01-15", "Tamil Thai Pongal Day"],
  ["2026-02-01", "Navam Full Moon Poya Day"],
  ["2026-02-04", "National Day (Independence Day)"],
  ["2026-02-15", "Mahasivarathri Day"],
  ["2026-03-02", "Madin Full Moon Poya Day"],
  ["2026-03-21", "Id-Ul-Fitr"],
  ["2026-04-01", "Bak Full Moon Poya Day"],
  ["2026-04-03", "Good Friday"],
  ["2026-04-13", "Day Prior to Sinhala & Tamil New Year"],
  ["2026-04-14", "Sinhala & Tamil New Year Day"],
  ["2026-05-01", "May Day & Vesak Full Moon Poya Day"],
  ["2026-05-02", "Day Following Vesak Full Moon Poya Day"],
  ["2026-05-28", "Id-Ul-Alha (Hajj Festival)"],
  ["2026-05-30", "Adhi Poson Full Moon Poya Day"],
  ["2026-06-29", "Poson Full Moon Poya Day"],
  ["2026-07-29", "Esala Full Moon Poya Day"],
  ["2026-08-26", "Milad-un-Nabi"],
  ["2026-08-27", "Nikini Full Moon Poya Day"],
  ["2026-09-26", "Binara Full Moon Poya Day"],
  ["2026-10-25", "Vap Full Moon Poya Day"],
  ["2026-11-08", "Deepavali Festival Day"],
  ["2026-11-24", "Il Full Moon Poya Day"],
  ["2026-12-23", "Unduvap Full Moon Poya Day"],
  ["2026-12-25", "Christmas Day"],
];

const run = async () => {
  const [cols] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FMRC_Calendar' AND COLUMN_NAME = 'holiday_type'`
  );
  if (cols.length === 0) {
    await db.query(
      `ALTER TABLE FMRC_Calendar
       ADD COLUMN holiday_type ENUM('Government', 'FMRC') NOT NULL DEFAULT 'FMRC' AFTER reason`
    );
    console.log("Added holiday_type column.");
  } else {
    console.log("holiday_type column already exists.");
  }

  // is_holiday starts FALSE (shown blue = "known government holiday, not yet
  // confirmed as an FMRC day off"). An admin flips a specific date to a real
  // FMRC holiday (red) from the calendar UI once they decide FMRC is closed.
  for (const [date, reason] of GOV_HOLIDAYS_2026) {
    await db.query(
      `INSERT INTO FMRC_Calendar (date, reason, is_holiday, holiday_type)
       VALUES (?, ?, FALSE, 'Government')
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), holiday_type = 'Government'`,
      [date, reason]
    );
  }
  console.log(`Seeded ${GOV_HOLIDAYS_2026.length} government holidays for 2026.`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
