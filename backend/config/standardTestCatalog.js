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
        required_season: "Harvesting"
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

export const CATALOGS = { FOUR_WHEEL_TRACTOR, COMBINE_HARVESTER };

export const CATALOG_LABELS = {
    FOUR_WHEEL_TRACTOR: "4-Wheel Tractor (19 tests)",
    COMBINE_HARVESTER: "Combine Harvester (19 tests)"
};
