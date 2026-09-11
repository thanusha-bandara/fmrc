// Auto-calculates derived/computed fields for the structured catalog forms, from the raw
// readings a Technical Assistant types in. Pure frontend logic -- reportService.js on the
// backend only ever prints already-stored values, it never re-derives anything.
//
// IMPORTANT: every dotted key referenced here must exactly match the section/field/row/column
// keys defined in backend/scripts/testSchemaDefinitions.js. If those keys ever change, this
// file must be updated in lockstep or the affected computed fields will silently stop updating.

const toNumber = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isBlank = (v) => v === undefined || v === null || v === '';

const avg = (values) => {
  const valid = values.filter((v) => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const fmt = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '' : String(Math.round(x * 100) / 100));

const parseHHMM = (str) => {
  if (!str) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
};

// Simple "N readings -> average" fields section (mutates `out` in place). Covers the many
// single-row multi-reading sections (Paddy Density, Cutting Height, Weight of Straw, etc.)
// that all share the same reading1..N -> average shape regardless of unit/count.
function calcAverageField(out, sectionKey, readingKeys, avgKey = 'average') {
  const values = readingKeys.map((k) => toNumber(out[`${sectionKey}.${k}`]));
  out[`${sectionKey}.${avgKey}`] = fmt(avg(values));
}

// Shared helper for the many "N columns -> average" tables (Soil Shear Strength, Soil Meter
// Reading, Crop Planting Details, Seed Wastage all share this row x [readings..., average]
// shape, just with different row/column key names).
function calcStationAverageTable(formData, sectionKey, rowKeys, columnKeys = ['station1', 'station2', 'station3'], avgKey = 'average') {
  const out = { ...formData };
  rowKeys.forEach((row) => {
    const values = columnKeys.map((col) => toNumber(out[`${sectionKey}.${row}.${col}`]));
    out[`${sectionKey}.${row}.${avgKey}`] = fmt(avg(values));
  });
  return out;
}

// Operational Data (Fuel Test) -> total_time_sec. Identical section shape/formula on both the
// tractor (Highland/Lowland) and Combine Harvester field sheets.
function calcFuelTestTotalTime(out) {
  const pMin = toNumber(out['operational_fuel_test.productive_time_min']);
  const pSec = toNumber(out['operational_fuel_test.productive_time_sec']);
  const lMin = toNumber(out['operational_fuel_test.lost_time_min']);
  const lSec = toNumber(out['operational_fuel_test.lost_time_sec']);
  const totalTimeSec = [pMin, pSec, lMin, lSec].some((v) => v !== null)
    ? (pMin || 0) * 60 + (pSec || 0) + ((lMin || 0) * 60 + (lSec || 0))
    : null;
  out['operational_fuel_test.total_time_sec'] = fmt(totalTimeSec);
}

// Working Efficiency & Fuel Analysis -- identical section/formulas on the tractor and Combine
// Harvester field sheets. `defaultSpeedMs` is the caller's already-computed "traveling speed"
// value used to smart-default working_efficiency.traveling_speed_m_s the first time (only
// when the user hasn't entered/overridden their own value).
function calcWorkingEfficiency(out, defaultSpeedMs) {
  const fuelLiters = toNumber(out['operational_fuel_test.fuel_liters']);
  const fuelMl = toNumber(out['operational_fuel_test.fuel_ml']);
  const totalAreaM2 = toNumber(out['operational_fuel_test.total_area_m2']);

  if (isBlank(out['working_efficiency.traveling_speed_m_s']) && defaultSpeedMs !== null && defaultSpeedMs !== undefined) {
    out['working_efficiency.traveling_speed_m_s'] = fmt(defaultSpeedMs);
  }
  if (isBlank(out['working_efficiency.operational_area_m2']) && totalAreaM2 !== null) {
    out['working_efficiency.operational_area_m2'] = fmt(totalAreaM2);
  }
  if (isBlank(out['working_efficiency.used_fuel_liters']) && (fuelLiters !== null || fuelMl !== null)) {
    out['working_efficiency.used_fuel_liters'] = fmt((fuelLiters || 0) + (fuelMl || 0) / 1000);
  }

  const widthM = toNumber(out['working_efficiency.working_width_m']);
  const speedMs = toNumber(out['working_efficiency.traveling_speed_m_s']);
  const areaM2 = toNumber(out['working_efficiency.operational_area_m2']);
  const usedTimeMin = toNumber(out['working_efficiency.used_time_minutes']);
  const usedFuelL = toNumber(out['working_efficiency.used_fuel_liters']);

  const theoreticalTimeMin = widthM && speedMs && areaM2 !== null
    ? areaM2 / (widthM * speedMs * 60)
    : null;
  out['working_efficiency.theoretical_time_min'] = fmt(theoreticalTimeMin);

  const fieldEfficiencyPercent = theoreticalTimeMin !== null && usedTimeMin
    ? (theoreticalTimeMin / usedTimeMin) * 100
    : null;
  out['working_efficiency.field_efficiency_percent'] = fmt(fieldEfficiencyPercent);

  const fieldCapacityHaHr = areaM2 !== null && usedTimeMin
    ? (areaM2 * 60) / (usedTimeMin * 10000)
    : null;
  out['working_efficiency.field_capacity_ha_hr'] = fmt(fieldCapacityHaHr);

  const fieldCapacityAcreDay = fieldCapacityHaHr !== null ? fieldCapacityHaHr * 8 * 2.471 : null;
  out['working_efficiency.field_capacity_acre_day'] = fmt(fieldCapacityAcreDay);

  const fuelConsumptionLHr = usedFuelL !== null && usedTimeMin
    ? (usedFuelL * 60) / usedTimeMin
    : null;
  out['working_efficiency.fuel_consumption_l_hr'] = fmt(fuelConsumptionLHr);

  const fuelConsumptionLHa = usedFuelL !== null && areaM2
    ? (usedFuelL * 10000) / areaM2
    : null;
  out['working_efficiency.fuel_consumption_l_ha'] = fmt(fuelConsumptionLHa);
}

// ---- SPEED -------------------------------------------------------------------------------

const SPEED_GEAR_ROWS = [
  'F-L1', 'F-L2', 'F-L3', 'F-L4',
  'F-M1', 'F-M2', 'F-M3', 'F-M4',
  'F-H1', 'F-H2', 'F-H3', 'F-H4',
  'R-L1', 'R-L2', 'R-L3', 'R-L4',
  'R-M1', 'R-M2', 'R-M3', 'R-M4',
  'R-H1', 'R-H2', 'R-H3', 'R-H4'
];

function calcSpeed(formData) {
  const out = { ...formData };
  const distance = toNumber(out['general.distance_m']);

  SPEED_GEAR_ROWS.forEach((gear) => {
    const t1 = toNumber(out[`speed_table.${gear}.time1_sec`]);
    const t2 = toNumber(out[`speed_table.${gear}.time2_sec`]);
    const t3 = toNumber(out[`speed_table.${gear}.time3_sec`]);
    const aveSec = avg([t1, t2, t3]);
    out[`speed_table.${gear}.ave_sec`] = fmt(aveSec);

    const speed = distance !== null && aveSec ? (distance / aveSec) * 3.6 : null;
    out[`speed_table.${gear}.speed_km_hr`] = fmt(speed);
  });

  return out;
}

// ---- Shared HIGHLAND/LOWLAND sections -----------------------------------------------------

function calcSharedFieldTestSections(formData) {
  const out = { ...formData };

  // Used Implement Data
  ['working_width', 'working_depth'].forEach((row) => {
    const r1 = toNumber(out[`used_implement_data.${row}.reading1`]);
    const r2 = toNumber(out[`used_implement_data.${row}.reading2`]);
    const r3 = toNumber(out[`used_implement_data.${row}.reading3`]);
    out[`used_implement_data.${row}.ave_mm`] = fmt(avg([r1, r2, r3]));
  });

  // Traveling Speed Data
  const distance = toNumber(out['travel_operation.distance_m']);
  let withLoadSpeed = null;
  ['without_load', 'with_load'].forEach((row) => {
    const t1 = toNumber(out[`traveling_speed_data.${row}.time1_sec`]);
    const t2 = toNumber(out[`traveling_speed_data.${row}.time2_sec`]);
    const t3 = toNumber(out[`traveling_speed_data.${row}.time3_sec`]);
    const aveSec = avg([t1, t2, t3]);
    out[`traveling_speed_data.${row}.ave_sec`] = fmt(aveSec);

    const speed = distance !== null && aveSec ? distance / aveSec : null;
    out[`traveling_speed_data.${row}.speed_m_s`] = fmt(speed);
    if (row === 'with_load') withLoadSpeed = speed;
  });

  // Wheel Slip Data + wheel_slip_percent
  let noLoadAveM = null;
  let withLoadAveM = null;
  ['without_load', 'with_load'].forEach((row) => {
    const d1 = toNumber(out[`wheel_slip_data.${row}.distance1_m`]);
    const d2 = toNumber(out[`wheel_slip_data.${row}.distance2_m`]);
    const d3 = toNumber(out[`wheel_slip_data.${row}.distance3_m`]);
    const aveM = avg([d1, d2, d3]);
    out[`wheel_slip_data.${row}.ave_m`] = fmt(aveM);
    if (row === 'without_load') noLoadAveM = aveM;
    else withLoadAveM = aveM;
  });
  const slip = noLoadAveM !== null && noLoadAveM !== 0 && withLoadAveM !== null
    ? ((noLoadAveM - withLoadAveM) / noLoadAveM) * 100
    : null;
  out['wheel_slip_result.wheel_slip_percent'] = fmt(slip);

  calcFuelTestTotalTime(out);
  calcWorkingEfficiency(out, withLoadSpeed);

  return out;
}

// Penetration Resistance is transposed relative to the station-average tables: depth is the
// column, force1/force2/force3 are rows, and "average" is an extra row computed per depth
// column -- kept as its own function since it doesn't fit the shared row->columns shape.
function calcPenetrationResistance(formData) {
  const out = { ...formData };
  for (let i = 1; i <= 9; i++) {
    const col = `depth_${i}`;
    const f1 = toNumber(out[`penetration_resistance.force1.${col}`]);
    const f2 = toNumber(out[`penetration_resistance.force2.${col}`]);
    const f3 = toNumber(out[`penetration_resistance.force3.${col}`]);
    out[`penetration_resistance.average.${col}`] = fmt(avg([f1, f2, f3]));
  }
  return out;
}

// ---- TRANSPORT ----------------------------------------------------------------------------

function calcTransport(formData) {
  const out = { ...formData };

  const startMin = parseHHMM(out['trip_details.start_time']);
  const stopMin = parseHHMM(out['trip_details.stop_time']);
  let timeMinutes = null;
  if (startMin !== null && stopMin !== null) {
    timeMinutes = stopMin - startMin;
    if (timeMinutes < 0) timeMinutes += 24 * 60; // guard overnight rollover
  }
  out['computed_results.time_minutes'] = fmt(timeMinutes);

  const odoStart = toNumber(out['trip_details.odometer_start_km']);
  const odoStop = toNumber(out['trip_details.odometer_stop_km']);
  const distanceKm = odoStart !== null && odoStop !== null ? odoStop - odoStart : null;
  out['computed_results.traveling_distance_km'] = fmt(distanceKm);

  const speedKmHr = distanceKm !== null && timeMinutes ? (distanceKm * 60) / timeMinutes : null;
  out['computed_results.traveling_speed_km_hr'] = fmt(speedKmHr);

  const fuelMl = toNumber(out['trip_details.used_fuel_ml']);
  const fuelL = fuelMl !== null ? fuelMl / 1000 : null;

  const fuelConsumptionLHr = fuelL !== null && timeMinutes ? (fuelL * 60) / timeMinutes : null;
  out['computed_results.fuel_consumption_l_hr'] = fmt(fuelConsumptionLHr);

  const fuelConsumptionLKm = fuelL !== null && distanceKm ? fuelL / distanceKm : null;
  out['computed_results.fuel_consumption_l_km'] = fmt(fuelConsumptionLKm);

  const fuelConsumptionKmL = distanceKm !== null && fuelL ? distanceKm / fuelL : null;
  out['computed_results.fuel_consumption_km_l'] = fmt(fuelConsumptionKmL);

  return out;
}

// ---- HARVESTER_FIELD ----------------------------------------------------------------------
// Combines the "Combine Harvester Field Test" and "Combine Harvester Sample Test" paper
// sheets (same field run/sample). The Loss Analysis formulas are a best-effort reading of the
// paper's own printed formula sketch: "Total Paddy weight = Header Loss + Paddy Weight (15m)
// + Separation Loss + Straw Outlet Loss", read here as Separation Loss = the Sieve Outlet
// reading (both the Straw Outlet and Sieve Outlet source tables are titled "(Separation
// Loss)" on the paper, but are two distinct measurements, so both are included as separate
// terms) -- worth a second look against the paper if the numbers look off for real samples.
function calcHarvesterField(formData) {
  let out = { ...formData };

  calcAverageField(out, 'paddy_density', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'crop_length', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'standing_angle', ['reading1', 'reading2', 'reading3']);
  out = calcStationAverageTable(out, 'crop_planting_details', ['row_space', 'hill_space'], ['reading1', 'reading2', 'reading3']);
  out = calcStationAverageTable(out, 'soil_shear_strength', ['gauge_reading_lb_ft', 'gauge_reading_kg_m']);
  out = calcStationAverageTable(out, 'soil_meter_reading', ['soil_meter_reading']);

  const distance = toNumber(out['travel_distance.distance_m']);
  const t1 = toNumber(out['traveling_speed_single.with_operation.time1_sec']);
  const t2 = toNumber(out['traveling_speed_single.with_operation.time2_sec']);
  const t3 = toNumber(out['traveling_speed_single.with_operation.time3_sec']);
  const aveSec = avg([t1, t2, t3]);
  out['traveling_speed_single.with_operation.ave_sec'] = fmt(aveSec);
  const speedMs = distance !== null && aveSec ? distance / aveSec : null;
  out['traveling_speed_single.with_operation.speed_m_s'] = fmt(speedMs);

  calcAverageField(out, 'tillers_per_bush', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'paddy_weight_15m', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'cutting_height', ['reading1', 'reading2', 'reading3', 'reading4', 'reading5']);
  calcAverageField(out, 'cutting_width', ['reading1', 'reading2', 'reading3', 'reading4', 'reading5']);
  calcAverageField(out, 'seeds_per_earhead', ['unfill_1', 'unfill_2', 'unfill_3'], 'unfill_average');
  calcAverageField(out, 'seeds_per_earhead', ['fill_1', 'fill_2', 'fill_3'], 'fill_average');
  calcAverageField(out, 'force_pull_pod', ['reading1', 'reading2', 'reading3', 'reading4', 'reading5']);
  calcAverageField(out, 'weight_of_straw', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'fill_grain_tank_time', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'unloading_time', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'tank_capacity', ['reading1', 'reading2', 'reading3']);
  calcAverageField(out, 'paddy_moisture', ['reading1', 'reading2', 'reading3']);

  calcFuelTestTotalTime(out);

  out = calcStationAverageTable(out, 'seed_wastage', ['seed_wastage_g'], ['sample1', 'sample2', 'sample3']);

  const paddyWeight15mAvg = toNumber(out['paddy_weight_15m.average']);
  ['sample1', 'sample2', 'sample3'].forEach((sample) => {
    const strawPaddy = toNumber(out[`straw_outlet.${sample}.paddy_weight_kg`]);
    const sievePaddy = toNumber(out[`sieve_outlet.${sample}.paddy_weight_kg`]);
    const headerPaddy = toNumber(out[`header_loss_sample.${sample}.paddy_weight_kg`]);
    const weightOfSample = toNumber(out[`grain_quality.${sample}.weight_of_sample_kg`]);
    const damageWeight = toNumber(out[`grain_quality.${sample}.damage_grain_weight_kg`]);

    const haveAnyPaddyReading = [headerPaddy, paddyWeight15mAvg, sievePaddy, strawPaddy].some((v) => v !== null);
    const totalPaddyWeight = haveAnyPaddyReading
      ? (headerPaddy || 0) + (paddyWeight15mAvg || 0) + (sievePaddy || 0) + (strawPaddy || 0)
      : null;
    out[`loss_analysis.${sample}.total_paddy_weight_kg`] = fmt(totalPaddyWeight);

    const separatingLossPercent = totalPaddyWeight ? ((sievePaddy || 0) / totalPaddyWeight) * 100 : null;
    out[`loss_analysis.${sample}.separating_loss_percent`] = fmt(separatingLossPercent);

    const headerLossPercent = totalPaddyWeight ? ((headerPaddy || 0) / totalPaddyWeight) * 100 : null;
    out[`loss_analysis.${sample}.header_loss_percent`] = fmt(headerLossPercent);

    const damagePercent = weightOfSample ? ((damageWeight || 0) / weightOfSample) * 100 : null;
    out[`loss_analysis.${sample}.damage_percent`] = fmt(damagePercent);

    const haveAnyLossPercent = [separatingLossPercent, headerLossPercent, damagePercent].some((v) => v !== null);
    const totalLossPercent = haveAnyLossPercent
      ? (separatingLossPercent || 0) + (headerLossPercent || 0) + (damagePercent || 0)
      : null;
    out[`loss_analysis.${sample}.total_loss_percent`] = fmt(totalLossPercent);
  });

  calcWorkingEfficiency(out, speedMs);

  return out;
}

// ---- Entry point ---------------------------------------------------------------------------

export function computeDerivedFields(templateKey, formData) {
  switch (templateKey) {
    case 'SPEED':
      return calcSpeed(formData);
    case 'HIGHLAND': {
      let out = calcSharedFieldTestSections(formData);
      out = calcStationAverageTable(out, 'soil_shear_strength', ['gauge_reading_lb_ft', 'gauge_reading_kg_m']);
      out = calcStationAverageTable(out, 'soil_meter_reading', ['soil_meter_reading']);
      return out;
    }
    case 'LOWLAND': {
      let out = calcSharedFieldTestSections(formData);
      out = calcPenetrationResistance(out);
      out = calcStationAverageTable(out, 'moisture_meter_reading', ['soil_moisture']);
      return out;
    }
    case 'TRANSPORT':
      return calcTransport(formData);
    case 'HARVESTER_FIELD':
      return calcHarvesterField(formData);
    case 'LAB':
    case 'HARVESTER_LAB':
    default:
      return { ...formData };
  }
}
