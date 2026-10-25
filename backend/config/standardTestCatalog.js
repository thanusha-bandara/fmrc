// Registry of standard test catalogs, keyed by machine type: which tests get created, their
// scheduling flags, and which form schema (by schema_key, resolved against Test_Form_Schemas
// at insert time -- see models/testRecord.js#bulkCreateStandardTestRecords) each one uses.
// This is business/scheduling logic, not form layout, so it stays in code -- the actual
// field/table definitions live in the database (see scripts/testSchemaDefinitions.js +
// Test_Form_Schemas). Adding another machine type means adding another entry here + its
// schema definition(s) -- no other architectural change needed.

// group_key identifies which implement-replicate group a test belongs to -- copied onto
// Test_Records at creation (see models/testRecord.js#bulkCreateStandardTestRecords) so the
// Mechanical Engineer's "use this test in the final report" tick (see reviewTest) can find
// and clear its sibling replicates reliably, without parsing test_name strings.
const implementGroupKey = (category, implement) =>
    `${category}_${implement.toUpperCase().replace(/\s+/g, "_")}`;

const highlandImplementTests = (implement) =>
    [1, 2, 3].map((n) => ({
        test_name: `Highland Field Test - ${implement} (Test ${n})`,
        schema_key: "HIGHLAND",
        is_field_test: true,
        requires_water: true,
        required_season: "Ploughing",
        group_key: implementGroupKey("HIGHLAND", implement)
    }));

const lowlandImplementTests = (implement) =>
    [1, 2, 3].map((n) => ({
        test_name: `Lowland Field Test - ${implement} (Test ${n})`,
        schema_key: "LOWLAND",
        is_field_test: true,
        requires_water: true,
        required_season: "Ploughing",
        group_key: implementGroupKey("LOWLAND", implement)
    }));

const FOUR_WHEEL_TRACTOR = [
    { test_name: "Lab Test - Dimensions & Specifications", schema_key: "LAB", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Speed Test", schema_key: "SPEED", is_field_test: false, requires_water: true, required_season: "Any" },
    ...highlandImplementTests("Tine Tiller"),
    ...highlandImplementTests("Rotorvator"),
    ...highlandImplementTests("Disc Plough"),
    ...lowlandImplementTests("Tine Tiller"),
    ...lowlandImplementTests("Rotorvator"),
    { test_name: "Transport Test", schema_key: "TRANSPORT", is_field_test: false, requires_water: true, required_season: "Any" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: true, required_season: "Ploughing" }
];

const harvesterFieldTests = (variety, method) =>
    [1, 2, 3].map((n) => ({
        test_name: `Combine Harvester Field Test - ${variety} - ${method} (Test ${n})`,
        schema_key: "HARVESTER_FIELD",
        is_field_test: true,
        requires_water: true,
        required_season: "Harvesting",
        group_key: implementGroupKey(`HARVESTER_${variety.toUpperCase()}`, method)
    }));

const COMBINE_HARVESTER = [
    { test_name: "Combine Harvester Lab Test - Dimensions & Specifications", schema_key: "HARVESTER_LAB", is_field_test: false, requires_water: false, required_season: "Any" },
    ...harvesterFieldTests("Samba", "Broadcasting"),
    ...harvesterFieldTests("Samba", "Transplanting"),
    ...harvesterFieldTests("Samba", "Parachute"),
    ...harvesterFieldTests("Nadu", "Broadcasting"),
    ...harvesterFieldTests("Nadu", "Transplanting"),
    ...harvesterFieldTests("Nadu", "Parachute")
];

const SEEDER_SEED_ONLY = [
    { test_name: "Seeder Lab Test - Specifications Verification", schema_key: "SEEDER_LAB_SEED_ONLY", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Seeder Performance Test - Maize (Hybrid)", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test - Maize (Local)", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test - Green Gram", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test - Cowpea", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test - Black Gram", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test - Bean", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test - Ground Nut", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: false, required_season: "Ploughing" }
];

const SEEDER_WITH_FERTILIZER = [
    { test_name: "Manual Roller Seeder with Fertilizer - Lab Test", schema_key: "SEEDER_LAB_FERTILIZER", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Seeder Performance Test (Seeding) - Maize", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Seeding) - Cowpea", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Seeding) - Black Gram", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Seeding) - Green Gram", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Seeding) - Bean", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Seeding) - Ground Nut", schema_key: "SEEDER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Fertilizer Application) - Maize", schema_key: "SEEDER_FERTILIZER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Fertilizer Application) - Green Gram", schema_key: "SEEDER_FERTILIZER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Combined Seed & Fertilizer) - Cowpea", schema_key: "SEEDER_FERTILIZER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Seeder Performance Test (Combined Seed & Fertilizer) - Green Gram", schema_key: "SEEDER_FERTILIZER_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: false, required_season: "Ploughing" }
];

const DISC_PLOUGH = [
    { test_name: "Disc Plough Lab Test - Specification Data Sheet 01", schema_key: "DISC_PLOUGH_LAB", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Disc Plough Highland Field Test 01", schema_key: "DISC_PLOUGH_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Disc Plough Highland Field Test 02", schema_key: "DISC_PLOUGH_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Disc Plough Highland Field Test 03", schema_key: "DISC_PLOUGH_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Disc Plough Highland Field Test 04", schema_key: "DISC_PLOUGH_FIELD", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: false, required_season: "Ploughing" }
];

const ROTARY_TILLER = [
    { test_name: "Rotary Tiller Lab Test - Specifications Verification", schema_key: "ROTARY_LAB", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Rotary Tiller Lowland Field Test 01", schema_key: "ROTARY_LOWLAND", is_field_test: true, requires_water: true, required_season: "Ploughing" },
    { test_name: "Rotary Tiller Lowland Field Test 02", schema_key: "ROTARY_LOWLAND", is_field_test: true, requires_water: true, required_season: "Ploughing" },
    { test_name: "Rotary Tiller Highland Field Test (Normal Land) 01", schema_key: "ROTARY_HIGHLAND", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Rotary Tiller Highland Field Test (Normal Land) 02", schema_key: "ROTARY_HIGHLAND", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Rotary Tiller Highland Field Test (After Disc Plough) 01", schema_key: "ROTARY_HIGHLAND", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Rotary Tiller Highland Field Test (After Disc Plough) 02", schema_key: "ROTARY_HIGHLAND", is_field_test: true, requires_water: false, required_season: "Ploughing" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: false, required_season: "Ploughing" }
];

const SHREDDER = [
    { test_name: "Shredder Lab Test - Verification of Specifications", schema_key: "SHREDDER_LAB", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Shredder Performance Test 01 (Gliricidia)", schema_key: "SHREDDER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Shredder Performance Test 02 (Banana)", schema_key: "SHREDDER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Shredder Performance Test 03 (Sasbenia)", schema_key: "SHREDDER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: false, required_season: "Any" }
];

const BRUSH_CUTTER = [
    { test_name: "Brush Cutter Lab Test - Specifications & Attachments (Data Sheet 01 & 02)", schema_key: "BRUSH_CUTTER_LAB", is_field_test: false, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Nylon Cutter", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Two Teeth Blade", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Teeth Disc", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Weeder", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Sweeper", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Tiller", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Chain Saw", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Paddy Harvester", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Trimmer", schema_key: "BRUSH_CUTTER_FIELD", is_field_test: true, requires_water: false, required_season: "Any" },
    { test_name: "Brush Cutter Performance Test - Pump Unit", schema_key: "BRUSH_CUTTER_PUMP_FIELD", is_field_test: true, requires_water: true, required_season: "Any" },
    { test_name: "Endurance Test", schema_key: "ENDURANCE", is_field_test: true, requires_water: false, required_season: "Any" }
];

export const CATALOGS = {
    FOUR_WHEEL_TRACTOR,
    COMBINE_HARVESTER,
    SEEDER_SEED_ONLY,
    SEEDER_WITH_FERTILIZER,
    DISC_PLOUGH,
    ROTARY_TILLER,
    SHREDDER,
    BRUSH_CUTTER
};

export const CATALOG_LABELS = {
    FOUR_WHEEL_TRACTOR: "4-Wheel Tractor (19 tests)",
    COMBINE_HARVESTER: "Combine Harvester (19 tests)",
    SEEDER_SEED_ONLY: "Seeder - Seed Only (9 tests)",
    SEEDER_WITH_FERTILIZER: "Seeder - Seed with Fertilizer (12 tests)",
    DISC_PLOUGH: "4W Implement - Disc Plough (6 tests)",
    ROTARY_TILLER: "4W Implement - Rotary Tiller (8 tests)",
    SHREDDER: "4W Implement - Shredder (5 tests)",
    BRUSH_CUTTER: "Brush Cutter (12 tests)"
};
