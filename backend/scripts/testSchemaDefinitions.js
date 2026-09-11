// Seed-only authoring source for the 5 structured test form schemas (LAB/SPEED/HIGHLAND/
// LOWLAND/TRANSPORT). This file is imported ONLY by seed_test_schemas.js -- the running
// server never reads it directly. To change a data sheet's field layout: edit this file,
// then `npm run seed:test-schemas` to push the change into Test_Form_Schemas. No backend
// code change or redeploy is needed for a pure layout/label change.
//
// form_data for a test using one of these schemas is a FLAT object keyed by composite
// dotted keys: "<sectionKey>.<fieldKey>" for a "fields" section, or
// "<sectionKey>.<rowKey>.<colKey>" for a "table" section. `auto: true` on a field/row/column
// marks a value as computed client-side -- see Frontend/src/page/tests/testFormCalculations.js,
// which is keyed by the same `formula_set` value each schema is seeded with (== its `key`
// here) and must stay in sync with these dotted keys.

const f = (key, label, opts = {}) => ({ key, label, ...opts });

const fieldsSection = (key, label, fields) => ({ type: "fields", key, label, fields });
const tableSection = (key, label, rows, columns) => ({ type: "table", key, label, rows, columns });

// ---- Shared sub-schemas (used by both HIGHLAND and LOWLAND) --------------------------------

const usedImplementDataTable = tableSection(
    "used_implement_data",
    "Used Implement Data",
    [f("working_width", "Working Width"), f("working_depth", "Working Depth")],
    [f("reading1", "1 (mm)"), f("reading2", "2 (mm)"), f("reading3", "3 (mm)"), f("ave_mm", "Ave. (mm)", { auto: true })]
);

const travelOperationFields = fieldsSection("travel_operation", "Travel / Operation", [
    f("engine_rpm", "Engine RPM"),
    f("operating_gear", "Operating Gear (High / Low)"),
    f("distance_m", "Distance (m)")
]);

const travelingSpeedDataTable = tableSection(
    "traveling_speed_data",
    "Traveling Speed Data",
    [f("without_load", "Without Load"), f("with_load", "With Load")],
    [
        f("time1_sec", "Time 1 (sec)"),
        f("time2_sec", "Time 2 (sec)"),
        f("time3_sec", "Time 3 (sec)"),
        f("ave_sec", "Ave. (sec)", { auto: true }),
        f("speed_m_s", "Speed (m/s)", { auto: true })
    ]
);

const wheelSlipTurnsFields = fieldsSection("wheel_slip_turns", "Wheel Slip Data", [
    f("turns", "Turns")
]);

const wheelSlipDataTable = tableSection(
    "wheel_slip_data",
    "Wheel Slip Data",
    [f("without_load", "Without Load"), f("with_load", "With Load")],
    [
        f("distance1_m", "Distance 1 (m)"),
        f("distance2_m", "Distance 2 (m)"),
        f("distance3_m", "Distance 3 (m)"),
        f("ave_m", "Ave. (m)", { auto: true })
    ]
);

const wheelSlipResultFields = fieldsSection("wheel_slip_result", "Wheel Slip", [
    f("wheel_slip_percent", "Wheel Slip (%)", { auto: true })
]);

const operationalFuelTestFields = fieldsSection("operational_fuel_test", "Operational Data (Fuel Test)", [
    f("start_time", "Start Time"),
    f("end_time", "End Time"),
    f("total_area_m2", "Total Area (m²)"),
    f("fuel_liters", "Fuel (Liters)"),
    f("fuel_ml", "Fuel (ml)"),
    f("productive_time_min", "Productive Time (min)"),
    f("productive_time_sec", "Productive Time (sec)"),
    f("lost_time_min", "Time Lost (min)"),
    f("lost_time_sec", "Time Lost (sec)"),
    f("total_time_sec", "Total Time (sec)", { auto: true }),
    f("sketch_notes", "Sketch / Notes", { multiline: true })
]);

const workingEfficiencyFields = fieldsSection("working_efficiency", "Working Efficiency & Fuel Analysis", [
    f("working_width_m", "Working Width (m)"),
    f("traveling_speed_m_s", "Traveling Speed (m/s)"),
    f("operational_area_m2", "Operational Area (m²)"),
    f("used_time_minutes", "Used Time (Minutes)"),
    f("used_fuel_liters", "Used Fuel (Liters)"),
    f("theoretical_time_min", "Theoretical Time (Min)", { auto: true }),
    f("field_efficiency_percent", "Field Efficiency (%)", { auto: true }),
    f("field_capacity_ha_hr", "Field Capacity (ha/hr)", { auto: true }),
    f("field_capacity_acre_day", "Field Capacity (Acre/day)", { auto: true }),
    f("fuel_consumption_l_hr", "Fuel Consumption (l/hr)", { auto: true }),
    f("fuel_consumption_l_ha", "Fuel Consumption (l/ha)", { auto: true })
]);

const sharedFieldTestSections = [
    usedImplementDataTable,
    travelOperationFields,
    travelingSpeedDataTable,
    wheelSlipTurnsFields,
    wheelSlipDataTable,
    wheelSlipResultFields,
    operationalFuelTestFields,
    workingEfficiencyFields
];

// Shared beyond HIGHLAND -- also reused by HARVESTER_FIELD (same station1/2/3/average shape).
const soilShearStrengthTable = tableSection(
    "soil_shear_strength",
    "Soil Shear Strength",
    [f("gauge_reading_lb_ft", "Gauge Reading (Lb.ft)"), f("gauge_reading_kg_m", "Gauge Reading (kg.m)")],
    [f("station1", "Station 1"), f("station2", "Station 2"), f("station3", "Station 3"), f("average", "Average", { auto: true })]
);

const soilMeterReadingTable = tableSection(
    "soil_meter_reading",
    "Soil Meter Reading",
    [f("soil_meter_reading", "Soil Meter Reading")],
    [f("station1", "Station 1"), f("station2", "Station 2"), f("station3", "Station 3"), f("average", "Average", { auto: true })]
);

// ---- LAB -------------------------------------------------------------------------------------

// Section order here is exactly the order the official report's "VERIFICATIONS OF
// MANUFACTURER'S SPECIFICATIONS" table renders in (see
// backend/services/officialTractorReportService.js, which walks these sections directly) --
// matches the real FMRC paper/Word template page-for-page. `actuating_forces` is the one
// exception: it's authored here (for the TA's data-entry form) but the report renders it as
// its own "05. Actuating Forces" section instead of inside this table, so the report skips it
// when walking these sections.
const LAB = {
    key: "LAB",
    label: "Lab Test - Dimensions & Specifications",
    sections: [
        fieldsSection("engine", "Engine", [
            f("brand_model", "Name of brand with model"),
            f("country_of_origin", "Country of origin"),
            f("no_of_cylinders", "No of Cylinders"),
            f("fuel_system", "Fuel system"),
            f("fuel_filters", "Fuel filters"),
            f("max_gross_power_rpm", "Maximum gross engine power (rpm) (Ps as per BS AU 141a)"),
            f("displacement_cc", "Displacement (cc)"),
            f("rated_speed_rpm", "Rated speed (rpm)"),
            f("bore_mm", "Bore (mm)"),
            f("stroke_mm", "Stroke (mm)"),
            f("max_gross_torque", "Max. Gross engine torque (rpm) (kgm)"),
            f("air_cleaner_system", "Air cleaner system"),
            f("exhaust", "Exhaust"),
            f("cooling_system", "Engine cooling system"),
            f("throttle_control", "Throttle control"),
            f("oil_change_interval", "Engine oil change interval"),
            f("aspiration", "Aspiration")
        ]),
        fieldsSection("clutch", "Clutch", [
            f("type", "Type"),
            f("diameter", "Diameter"),
            f("method_operation", "Method operation")
        ]),
        fieldsSection("transmission", "Transmission", [
            f("transmission_type", "Transmission type"),
            f("no_of_speed", "No. of speed"),
            f("shifting", "Shifting")
        ]),
        fieldsSection("rear_axle", "Rear axle & final drive", [
            f("type", "Type"),
            f("std_track", "Rear axle STD track"),
            f("weights", "Weights"),
            f("differential_lock", "Differential lock")
        ]),
        fieldsSection("steering", "Steering", [
            f("type", "Type"),
            f("steering_wheel_dia", "Dia of steering wheel")
        ]),
        fieldsSection("front_axle", "Front axle", [
            f("type", "Type"),
            f("std_track", "Front axle STD track"),
            f("weights", "Weights")
        ]),
        fieldsSection("brakes", "Brakes", [
            f("type", "Type"),
            f("method_operation", "Method of operation"),
            f("parking_brake_type", "Parking brake type"),
            f("parking_brake_method", "Method of operation")
        ]),
        fieldsSection("hydraulic_system", "Hydraulic System", [
            f("type", "Type"),
            f("pump_type", "Pump type"),
            f("control", "Control"),
            f("pump_capacity", "Pump capacity (lpm @rpm)"),
            f("lifting_capacity_horizontal", "Lifting capacity in horizontal position (kgf)"),
            f("lifting_capacity_range", "Lifting capacity throughout range (kgf)"),
            f("external_tapping_points", "External tapping points"),
            f("lower_link_type", "Lower link type")
        ]),
        fieldsSection("power_take_off", "Power take off", [
            f("pto_type_operation", "PTO type and Operation"),
            f("pto_speed_erpm", "PTO speed @ Erpm (rpm)"),
            f("shaft_diameter_mm", "Shaft diameter (mm)"),
            f("mspto_erpm", "MSPTO Erpm"),
            f("pto_power_ps", "PTO power (Ps)"),
            f("reduction_ratio_mm", "Reduction ratio (mm)"),
            f("no_of_splines", "No of splines")
        ]),
        fieldsSection("electric_starter_motor", "(A) Starter motor", [
            f("make", "Make"),
            f("type", "Type"),
            f("voltage_v", "Voltage (V)"),
            f("power_kw", "Power (KW)")
        ]),
        fieldsSection("electric_alternator", "(B) Alternator", [
            f("make", "Make"),
            f("type", "Type"),
            f("regulated_voltage_v", "Regulated voltage (V)"),
            f("rated_output_amps", "Rated Output (Amps)")
        ]),
        fieldsSection("electric_lights", "(C) Lights", [
            f("head_lamp", "Head lamp"),
            f("work_lamp", "Work lamp"),
            f("front_lamp", "Front lamp"),
            f("rear_lamp", "Rear lamp")
        ]),
        fieldsSection("electric_relay", "(D) Relay", [
            f("switches", "Switches"),
            f("instrument_warning_lights", "Instrument and warning lights")
        ]),
        fieldsSection("wheels_tyres", "Wheels and tyres", [
            f("front_tyre", "Front tyre"),
            f("rear_tyre", "Rear tyre")
        ]),
        fieldsSection("seat", "Seat", [
            f("type", "Type")
        ]),
        fieldsSection("sheet_metal", "Sheet metal", [
            f("hood", "hood"),
            f("fender", "Fender")
        ]),
        fieldsSection("fill_up_data", "Fill up data", [
            f("fuel_tank_l", "Fuel tank (liters)"),
            f("engine_lub_oil_l", "Engine lub oil (sump + lub oil filter) (liters)"),
            f("radiator_cooling_l", "Radiator & cooling system (liters)"),
            f("transmission_hydraulic_l", "Transmission & hydraulic system (liters)"),
            f("steering_system_l", "Steering system (liters)"),
            f("air_cleaner_l", "Air cleaner (liters)"),
            f("fuel_injector_pump_cam_box", "Fuel injector pump CAM box")
        ]),
        fieldsSection("dimensions", "Dimensions", [
            f("length_mm", "Overall length (lower link in hor. position) (mm)"),
            f("width_mm", "Overall width (mm)"),
            f("height_mm", "Overall height (mm)"),
            f("wheel_base_mm", "Wheel base (mm)"),
            f("ground_clearance_mm", "Min ground clearance (mm)"),
            f("wheel_track_front_mm", "Wheel Track Front (mm)"),
            f("wheel_track_rear_mm", "Wheel Track Rear (mm)"),
            f("total_weight_kg", "Total Weight (Kg)"),
            f("tyres_front_ply", "Tyres Front (Ply)"),
            f("tyres_rear_ply", "Tyres Rear (Ply)")
        ]),
        // Not part of the Verification table -- rendered as its own "05. Actuating Forces"
        // section of the report (see officialTractorReportService.js).
        fieldsSection("actuating_forces", "Actuating Forces (Kgf)", [
            f("accel_hand_kgf", "Accelerator - Hand"),
            f("accel_foot_kgf", "Accelerator - Foot"),
            f("brake_kgf", "Brake"),
            f("clutch_kgf", "Clutch"),
            f("hyd_draft_kgf", "Hydraulic Lever - Draft"),
            f("hyd_position_kgf", "Hydraulic Lever - Position"),
            f("steering_kgf", "Steering"),
            f("gear_main_kgf", "Gear - Main"),
            f("gear_hilow_kgf", "Gear - Hi/Low"),
            f("gear_forward_kgf", "Gear - Forward"),
            f("gear_reverse_kgf", "Gear - Reverse")
        ])
    ]
};

// ---- SPEED -----------------------------------------------------------------------------------

const SPEED_GEAR_ROWS = [
    "F-L1", "F-L2", "F-L3", "F-L4",
    "F-M1", "F-M2", "F-M3", "F-M4",
    "F-H1", "F-H2", "F-H3", "F-H4",
    "R-L1", "R-L2", "R-L3", "R-L4",
    "R-M1", "R-M2", "R-M3", "R-M4",
    "R-H1", "R-H2", "R-H3", "R-H4"
].map((gear) => f(gear, gear));

const SPEED = {
    key: "SPEED",
    label: "Speed Test",
    sections: [
        fieldsSection("general", "Speed Test", [
            f("distance_m", "Distance (m)"),
            f("engine_rpm", "Engine RPM")
        ]),
        tableSection("speed_table", "Speed Test - Gear Readings", SPEED_GEAR_ROWS, [
            f("time1_sec", "Time 1 (sec)"),
            f("time2_sec", "Time 2 (sec)"),
            f("time3_sec", "Time 3 (sec)"),
            f("ave_sec", "Ave. (sec)", { auto: true }),
            f("speed_km_hr", "Speed (km/hr)", { auto: true })
        ]),
        tableSection(
            "turning_radius",
            "Turning Radius",
            [f("without_brake", "Without Brake"), f("with_brake", "With Brake")],
            [
                f("with_4wd_r", "With 4WD - R"),
                f("with_4wd_l", "With 4WD - L"),
                f("without_4wd_r", "Without 4WD - R"),
                f("without_4wd_l", "Without 4WD - L")
            ]
        ),
        fieldsSection("mspto_reference", "MSPTO Speed Test", [
            f("mspto_reference_engine_rpm", "Reference Engine RPM")
        ]),
        tableSection("mspto_speed_table", "MSPTO Speed Test - Gear Readings", SPEED_GEAR_ROWS, [
            f("reading_rpm", "PTO Speed (rpm)")
        ])
    ]
};

// ---- HIGHLAND --------------------------------------------------------------------------------

const HIGHLAND = {
    key: "HIGHLAND",
    label: "Highland Field Test",
    sections: [
        fieldsSection("site_soil", "Site & Soil", [
            f("test_date", "Date"),
            f("location", "Location"),
            f("implement_model", "Implement Model"),
            f("implement_used_with", "Implement Used With", { defaultValue: "Pneumatic Tyres" }),
            f("soil_type", "Soil Type"),
            f("weed_density_1", "Weed Density 1 (per m²)"),
            f("weed_density_2", "Weed Density 2 (per m²)"),
            f("weed_density_3", "Weed Density 3 (per m²)"),
            f("weed_height_1", "Weed Height 1 (mm)"),
            f("weed_height_2", "Weed Height 2 (mm)"),
            f("weed_height_3", "Weed Height 3 (mm)"),
            f("last_crop", "Last Crop"),
            f("soil_moisture_percent", "Soil Moisture (% Saturated)")
        ]),
        soilShearStrengthTable,
        soilMeterReadingTable,
        ...sharedFieldTestSections
    ]
};

// ---- LOWLAND ---------------------------------------------------------------------------------

const PENETRATION_DEPTH_COLUMNS = Array.from({ length: 9 }, (_, i) => f(`depth_${i + 1}`, `${i + 1}"`));

const LOWLAND = {
    key: "LOWLAND",
    label: "Lowland Field Test",
    sections: [
        fieldsSection("site_soil", "Site & Soil", [
            f("test_date", "Date"),
            f("location", "Location"),
            f("soil_type", "Soil Type"),
            f("standing_water_level_mm", "Standing Water Level (mm)"),
            f("weed_density_1", "Weed Density 1 (per m²)"),
            f("weed_density_2", "Weed Density 2 (per m²)"),
            f("weed_density_3", "Weed Density 3 (per m²)"),
            f("weed_height_1", "Weed Height 1 (mm)"),
            f("weed_height_2", "Weed Height 2 (mm)"),
            f("weed_height_3", "Weed Height 3 (mm)"),
            f("last_crop", "Last Crop"),
            f("stubble_height_mm", "Stubble Height (mm)"),
            f("soil_moisture_percent", "Soil Moisture (% Saturated)"),
            f("implement_used_with", "Implement Used With", { defaultValue: "Cage wheel" })
        ]),
        tableSection(
            "penetration_resistance",
            "Penetration Resistance (LB) - Penetrometer Readings",
            [
                f("force1", "Force 1"),
                f("force2", "Force 2"),
                f("force3", "Force 3"),
                f("average", "Average", { auto: true })
            ],
            PENETRATION_DEPTH_COLUMNS
        ),
        tableSection(
            "moisture_meter_reading",
            "Moisture Meter Reading",
            [f("soil_moisture", "Soil Moisture")],
            [f("station1", "Station 1"), f("station2", "Station 2"), f("station3", "Station 3"), f("average", "Average", { auto: true })]
        ),
        ...sharedFieldTestSections
    ]
};

// ---- TRANSPORT -------------------------------------------------------------------------------

const TRANSPORT = {
    key: "TRANSPORT",
    label: "Transport Test",
    sections: [
        fieldsSection("trip_details", "Trip Details", [
            f("loaded_trailer_ft3", "Loaded Trailer (Ft³)"),
            f("load_weight_kg", "Weight of the Load (Kg, without trailer)"),
            f("start_time", "Starting Time"),
            f("stop_time", "Stopping Time"),
            f("odometer_start_km", "Milometer Reading - Starting (km)"),
            f("odometer_stop_km", "Milometer Reading - Stopping (km)"),
            f("used_fuel_ml", "Used Fuel (ml)")
        ]),
        fieldsSection("computed_results", "Computed Results", [
            f("time_minutes", "Time (Minutes)", { auto: true }),
            f("traveling_distance_km", "Traveling Distance (km)", { auto: true }),
            f("traveling_speed_km_hr", "Traveling Speed (km/hr)", { auto: true }),
            f("fuel_consumption_l_hr", "Fuel Consumption (l/hr)", { auto: true }),
            f("fuel_consumption_l_km", "Fuel Consumption (l/km)", { auto: true }),
            f("fuel_consumption_km_l", "Fuel Consumption (km/l)", { auto: true })
        ])
    ]
};

// ---- HARVESTER_LAB ----------------------------------------------------------------------------

const HARVESTER_LAB = {
    key: "HARVESTER_LAB",
    label: "Combine Harvester Lab Test - Dimensions & Specifications",
    sections: [
        fieldsSection("dimensions", "Overall Dimensions", [
            f("length_mm", "Length (mm)"),
            f("width_mm", "Width (mm)"),
            f("height_mm", "Height (mm)"),
            f("machine_weight_kg", "Machine Weight (kg)")
        ]),
        fieldsSection("engine", "Engine", [
            f("model_number", "Model Number"),
            f("type", "Type"),
            f("fuel", "Fuel"),
            f("fuel_tank_capacity_l", "Fuel Tank Capacity (l)"),
            f("starting_system", "Starting System"),
            f("battery", "Battery"),
            f("cylinders", "No. of Cylinder"),
            f("cooling_type", "Cooling Type"),
            f("cooling_water_capacity_l", "Cooling Water Capacity (l)")
        ]),
        fieldsSection("traveling_section", "Traveling Section - Track", [
            f("track_width_x_ground_contact_length", "Width x Ground Contact Length"),
            f("mode_of_speed_regulation", "Mode of Speed Regulation"),
            f("shift_gear", "Shift Gear"),
            f("min_ground_clearance_mm", "Minimum Ground Clearance (mm)"),
            f("number_of_speeds", "Number of Speeds")
        ]),
        fieldsSection("header", "Header", [
            f("gap_front_crop_divider_mm", "Gap at Front End of Crop Divider (mm)"),
            f("type_of_harvesting_device", "Type of Harvesting Device"),
            f("cutter_blade_width", "Cutter Blade Width"),
            f("header_reel_diameter_width_mm", "Reel Diameter x Width (mm)")
        ]),
        fieldsSection("reaper_section", "Reaper Section", [
            f("crop_pull_stand_system", "Crop Pull and Stand System"),
            f("reaper_reel_diameter_width_mm", "Reel Diameter x Width (mm)"),
            f("reel_up_down_control", "Reel Up/Down Control"),
            f("reaping_width_mm", "Reaping Width (mm)"),
            f("blade_width_mm", "Blade Width (mm)"),
            f("vertical_reel_height_adjustment", "Vertical Reel Height Adjustment"),
            f("horizontal_reel_adjustment", "Horizontal Reel Adjustment")
        ]),
        fieldsSection("thresher_section", "Thresher Section", [
            f("type", "Type"),
            f("threshing_drum_diameter_width_mm", "Threshing Drum - Diameter x Width (mm)"),
            f("rotation_speed_rpm", "Rotation Speed (rpm)"),
            f("reprocessing_system", "Reprocessing System"),
            f("sieves_size_mm", "Sieves Size (mm)"),
            f("mode_of_secondary_reduction", "Mode of Secondary Reduction"),
            f("concave_screen_area_mm", "Concave Screen Area (mm)")
        ]),
        fieldsSection("grain_outlet", "Grain Outlet", [
            f("grain_processing_method", "Grain Processing Method"),
            f("grain_tank_capacity_l", "Grain Tank Capacity (l)")
        ]),
        fieldsSection("unloader", "Unloader", [
            f("discharging_system", "Discharging System"),
            f("up_down_system", "Up/Down System"),
            f("discharging_height_mm", "Discharging Height (mm)"),
            f("discharging_length_mm", "Discharging Length (mm)")
        ]),
        fieldsSection("other_components", "Other Components", [
            f("canopy", "Canopy"),
            f("alarm_device", "Alarm Device")
        ])
    ]
};

// ---- HARVESTER_FIELD --------------------------------------------------------------------------
// Combines the paper "Combine Harvester Field Test" and "Combine Harvester Sample Test" sheets
// -- both are filled for the same field run/sample on the day of testing.

const harvesterAvgFields = (key, label, count, unit, opts = {}) => {
    const readings = Array.from({ length: count }, (_, i) => f(`reading${i + 1}`, `${i + 1}${unit ? ` (${unit})` : ""}`));
    return fieldsSection(key, label, [...readings, f("average", "Average", { auto: true, ...opts })]);
};

const HARVESTER_FIELD = {
    key: "HARVESTER_FIELD",
    label: "Combine Harvester Field Test",
    sections: [
        fieldsSection("site_details", "Site Details", [
            f("location", "Location"),
            f("soil_type", "Soil Type")
        ]),
        harvesterAvgFields("paddy_density", "Paddy Density", 3, "per m²"),
        harvesterAvgFields("crop_length", "Overall Length of Crop", 3, "cm"),
        harvesterAvgFields("standing_angle", "Standing Angle of Crop", 3, "°"),
        tableSection(
            "crop_planting_details",
            "Crop Planting Details",
            [f("row_space", "Row Space (cm)"), f("hill_space", "Hill Space (cm)")],
            [f("reading1", "1"), f("reading2", "2"), f("reading3", "3"), f("average", "Avg.", { auto: true })]
        ),
        soilShearStrengthTable,
        soilMeterReadingTable,
        fieldsSection("working_condition", "Working Condition", [
            f("operating_gear", "Operating Gear"),
            f("engine_rpm", "Engine RPM")
        ]),
        fieldsSection("travel_distance", "Traveling Speed Data", [
            f("distance_m", "Distance (m)")
        ]),
        tableSection(
            "traveling_speed_single",
            "Traveling Speed - Readings",
            [f("with_operation", "With Operation")],
            [
                f("time1_sec", "Time 1 (sec)"),
                f("time2_sec", "Time 2 (sec)"),
                f("time3_sec", "Time 3 (sec)"),
                f("ave_sec", "Ave. (sec)", { auto: true }),
                f("speed_m_s", "Speed (m/s)", { auto: true })
            ]
        ),
        harvesterAvgFields("tillers_per_bush", "No. of Tillers per Bush", 3),
        harvesterAvgFields("paddy_weight_15m", "Weight of Paddy (15m distance)", 3, "kg"),
        harvesterAvgFields("cutting_height", "Cutting Height", 5, "cm"),
        harvesterAvgFields("cutting_width", "Cutting Width", 5, "cm"),
        fieldsSection("seeds_per_earhead", "Seeds of Earhead", [
            f("unfill_1", "Un-fill Seeds 1"), f("unfill_2", "Un-fill Seeds 2"), f("unfill_3", "Un-fill Seeds 3"),
            f("unfill_average", "Un-fill Average", { auto: true }),
            f("fill_1", "Fill Seeds 1"), f("fill_2", "Fill Seeds 2"), f("fill_3", "Fill Seeds 3"),
            f("fill_average", "Fill Average", { auto: true })
        ]),
        harvesterAvgFields("force_pull_pod", "Force of Pull the Pod", 5),
        fieldsSection("weight_of_straw", "Weight of Straw", [
            f("distance_m", "Distance (m)"),
            f("reading1", "1 (kg)"), f("reading2", "2 (kg)"), f("reading3", "3 (kg)"),
            f("average", "Average", { auto: true })
        ]),
        fieldsSection("fill_grain_tank_time", "Time Required to Fill Grain Tank", [
            f("engine_rpm", "Engine RPM"),
            f("reading1", "1 (min)"), f("reading2", "2 (min)"), f("reading3", "3 (min)"),
            f("average", "Average", { auto: true })
        ]),
        fieldsSection("unloading_time", "Time Required Unloading", [
            f("engine_rpm", "Engine RPM"),
            f("reading1", "1 (min)"), f("reading2", "2 (min)"), f("reading3", "3 (min)"),
            f("average", "Average", { auto: true })
        ]),
        harvesterAvgFields("tank_capacity", "Tank Capacity as Grain Weight", 3, "Kg"),
        harvesterAvgFields("paddy_moisture", "Paddy Moisture (%)", 3),
        fieldsSection("threshing_sound", "Sound of Threshing Drum", [
            f("sound_db", "Sound (dB)")
        ]),
        operationalFuelTestFields,
        tableSection(
            "seed_wastage",
            "Header Losses - Seed Wastage",
            [f("seed_wastage_g", "Seed Wastage (g)")],
            [f("sample1", "Sample 1"), f("sample2", "Sample 2"), f("sample3", "Sample 3"), f("average", "Average", { auto: true })]
        ),
        tableSection(
            "straw_outlet",
            "Straw Outlet (Separation Loss)",
            [f("sample1", "Sample 01"), f("sample2", "Sample 02"), f("sample3", "Sample 03")],
            [f("straw_weight_kg", "Straw Weight (kg)"), f("paddy_weight_kg", "Paddy Weight (kg)")]
        ),
        tableSection(
            "sieve_outlet",
            "Sieve Outlet (Separation Loss)",
            [f("sample1", "Sample 01"), f("sample2", "Sample 02"), f("sample3", "Sample 03")],
            [f("paddy_weight_kg", "Paddy Weight (kg)")]
        ),
        tableSection(
            "header_loss_sample",
            "Header Loss",
            [f("sample1", "Sample 01"), f("sample2", "Sample 02"), f("sample3", "Sample 03")],
            [f("paddy_weight_kg", "Paddy Weight (kg)")]
        ),
        tableSection(
            "grain_quality",
            "Grain Quality",
            [f("sample1", "Sample 01"), f("sample2", "Sample 02"), f("sample3", "Sample 03")],
            [
                f("weight_of_sample_kg", "Weight of Sample (kg)"),
                f("quality_grain_weight_kg", "Quality Grain Weight (kg)"),
                f("unfill_grain_weight_kg", "Un-fill Grain Weight (kg)"),
                f("damage_grain_weight_kg", "Damage Grain Weight (kg)"),
                f("other_kg", "Other (kg)")
            ]
        ),
        tableSection(
            "loss_analysis",
            "Loss Analysis (computed)",
            [f("sample1", "Sample 01"), f("sample2", "Sample 02"), f("sample3", "Sample 03")],
            [
                f("total_paddy_weight_kg", "Total Paddy Weight (kg)", { auto: true }),
                f("separating_loss_percent", "Separating Loss (%)", { auto: true }),
                f("header_loss_percent", "Header Loss (%)", { auto: true }),
                f("damage_percent", "Damage (%)", { auto: true }),
                f("total_loss_percent", "Total Loss (%)", { auto: true })
            ]
        ),
        workingEfficiencyFields
    ]
};

// ---- ENDURANCE ----------------------------------------------------------------------------

const ENDURANCE = {
    key: "ENDURANCE",
    label: "Endurance Test",
    sections: [
        fieldsSection("endurance", "Endurance Test", [
            f("hours_operated", "Hours Operated"),
            f("implements_used", "Implements Used"),
            f("conditions", "Conditions (e.g. Lowland and Highland field)"),
            f("breakdowns_reported", "Breakdowns Reported", { multiline: true }),
            f("conclusion_note", "Conclusion", { multiline: true })
        ])
    ]
};

export const SCHEMA_DEFINITIONS = { LAB, SPEED, HIGHLAND, LOWLAND, TRANSPORT, HARVESTER_LAB, HARVESTER_FIELD, ENDURANCE };
