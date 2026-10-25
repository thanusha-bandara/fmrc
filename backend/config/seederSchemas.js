// Structured form schemas for Manual / Hand-Push Roller Seeder:
//  1. SEEDER_LAB_SEED_ONLY     - Lab Test for Seed-Only Roller Seeder (FMRC/MS/03/2026 sections 5.1 & 5.2)
//  2. SEEDER_LAB_FERTILIZER    - Lab Test for Roller Seeder with Fertilizer (Manual Seeder with fertilizer lab test.pdf + FMRC/MS/01/2026 sections 5, 6, 12, 13)
//  3. SEEDER_FIELD             - Performance Test Data Sheet 02 (Seeding Application)
//  4. SEEDER_FERTILIZER_FIELD  - Performance Test for Fertilizer / Combined Seed & Fertilizer Application

const FERTILIZER_ROWS = [];
["Urea", "TSP", "Nilketa", "Dam keta", "Yaramila"].forEach((fert) => {
    const fertKey = fert.toLowerCase().replace(/\s+/g, "_");
    for (let pos = 1; pos <= 6; pos++) {
        FERTILIZER_ROWS.push({
            key: `${fertKey}_pos_${pos}`,
            label: `${fert} - Position ${pos}`
        });
    }
});

export const SEEDER_SCHEMAS = [
    {
        schema_key: "SEEDER_LAB_SEED_ONLY",
        label: "Seeder (Seed Only) - Lab Test",
        formula_set: "SEEDER_LAB_SEED_ONLY",
        sections: [
            {
                key: "manufacturer_specs",
                type: "fields",
                label: "5.1 Verification of Manufacturer's Specifications",
                fields: [
                    { key: "model_mfg", label: "Model (Manufacturer)" },
                    { key: "model_ver", label: "Model (Verification)" },
                    { key: "brand_mfg", label: "Brand (Manufacturer)" },
                    { key: "brand_ver", label: "Brand (Verification)" },
                    { key: "product_name_mfg", label: "Product Name (Manufacturer)" },
                    { key: "product_name_ver", label: "Product Name (Verification)" },
                    { key: "mouth_numbers_mfg", label: "Mouth Numbers (Manufacturer)" },
                    { key: "mouth_numbers_ver", label: "Mouth Numbers (Verification)" },
                    { key: "spacing_mfg", label: "Spacing (Manufacturer)" },
                    { key: "spacing_ver", label: "Spacing (Verification)" },
                    { key: "suitable_seeds_mfg", label: "Suitable Seeds / Functions (Manufacturer)" },
                    { key: "suitable_seeds_ver", label: "Suitable Seeds / Functions (Verification)" },
                    { key: "hole_seeding_rate_mfg", label: "Hole Seeding Rate (Manufacturer)" },
                    { key: "hole_seeding_rate_ver", label: "Hole Seeding Rate (Verification)" },
                    { key: "capacity_mfg", label: "Capacity (Manufacturer)" },
                    { key: "capacity_ver", label: "Capacity (Verification)" },
                    { key: "gw_nw_mfg", label: "G.W. / N.W. (Manufacturer)" },
                    { key: "gw_nw_ver", label: "G.W. / N.W. (Verification)" },
                    { key: "packing_mfg", label: "Packing (Manufacturer)" },
                    { key: "packing_ver", label: "Packing (Verification)" }
                ]
            },
            {
                key: "dimensions",
                type: "fields",
                label: "5.2 Dimensions",
                fields: [
                    { key: "total_length_mm", label: "Total Length (mm)" },
                    { key: "total_width_mm", label: "Total Width (mm)" },
                    { key: "total_height_mm", label: "Total Height (mm)" }
                ]
            },
            {
                key: "metering_mechanism",
                type: "fields",
                label: "Metering Mechanism",
                fields: [
                    { key: "type_of_metering_device", label: "Type of Metering Device" },
                    { key: "number_of_rollers", label: "Number of Rollers for Seed Selector" }
                ]
            },
            {
                key: "power_source",
                type: "fields",
                label: "Source of Power for Driving",
                fields: [
                    { key: "metering_mechanism", label: "Metering Mechanism" },
                    { key: "furrow_opening_mechanism", label: "Furrow / Hill Opening Mechanism" },
                    { key: "furrow_covering_mechanism", label: "Furrow / Soil Covering Mechanism" }
                ]
            },
            {
                key: "material_of_construction",
                type: "fields",
                label: "Material of Construction",
                fields: [
                    { key: "seed_hopper", label: "Seed Hopper" },
                    { key: "metering_device", label: "Metering Device" },
                    { key: "handle", label: "Handle" },
                    { key: "handle_grip", label: "Handle Grip" },
                    { key: "injector", label: "Injector" },
                    { key: "handle_grip_comfortable_part", label: "Handle Grip Comfortable Part" }
                ]
            }
        ]
    },
    {
        schema_key: "SEEDER_LAB_FERTILIZER",
        label: "Manual Roller Seeder with Fertilizer - Lab Test",
        formula_set: "SEEDER_LAB_FERTILIZER",
        sections: [
            {
                key: "manufacturer_specs",
                type: "fields",
                label: "Verifications of Manufacturer's Specifications",
                fields: [
                    { key: "model_mfg", label: "Model (Manufacturer)" },
                    { key: "model_ver", label: "Model (Verification)" },
                    { key: "brand_mfg", label: "Brand (Manufacturer)" },
                    { key: "brand_ver", label: "Brand (Verification)" },
                    { key: "functions_mfg", label: "Functions (Manufacturer)" },
                    { key: "functions_ver", label: "Functions (Verification)" },
                    { key: "suitable_seeds_mfg", label: "Suitable Seeds / Functions (Manufacturer)" },
                    { key: "suitable_seeds_ver", label: "Suitable Seeds / Functions (Verification)" },
                    { key: "hole_seeding_rate_mfg", label: "Hole Seeding Rate (Manufacturer)" },
                    { key: "hole_seeding_rate_ver", label: "Hole Seeding Rate (Verification)" },
                    { key: "seeding_depth_mfg", label: "Seeding Depth (Manufacturer)" },
                    { key: "seeding_depth_ver", label: "Seeding Depth (Verification)" },
                    { key: "work_efficiency_mfg", label: "Work Efficiency (Manufacturer)" },
                    { key: "work_efficiency_ver", label: "Work Efficiency (Verification)" },
                    { key: "seeds_box_mfg", label: "Seeds Box (Manufacturer)" },
                    { key: "seeds_box_ver", label: "Seeds Box (Verification)" },
                    { key: "space_seed_to_seed_mfg", label: "Space (Seed to Seed) (Manufacturer)" },
                    { key: "space_seed_to_seed_ver", label: "Space (Seed to Seed) (Verification)" },
                    { key: "spike_number_mfg", label: "Spike Number (Manufacturer)" },
                    { key: "spike_number_ver", label: "Spike Number (Verification)" }
                ]
            },
            {
                key: "dimensions",
                type: "fields",
                label: "Dimensions & Weight",
                fields: [
                    { key: "length_mm", label: "Length (mm)" },
                    { key: "width_mm", label: "Width (mm)" },
                    { key: "height_mm", label: "Height (mm)" },
                    { key: "weight_of_machine_kg", label: "Weight of Machine / Net Weight (kg)" },
                    { key: "hopper_capacity_seed_kg", label: "Hopper Capacity (Seed) (kg)" },
                    { key: "hopper_capacity_fertilizer_kg", label: "Hopper Capacity (Fertilizer) (kg)" }
                ]
            },
            {
                key: "metering_mechanism",
                type: "fields",
                label: "Metering Mechanism",
                fields: [
                    { key: "type_of_metering_device", label: "Type of Metering Device" },
                    { key: "number_of_rollers", label: "Number of Different Rollers" },
                    { key: "roller_clearance_mm", label: "Seed Metering Roller Clearance (mm)" }
                ]
            },
            {
                key: "rollers_table",
                type: "table",
                label: "Roller Specifications (01 - 12)",
                rows: Array.from({ length: 12 }, (_, i) => ({
                    key: `r${String(i + 1).padStart(2, "0")}`,
                    label: `Roller ${String(i + 1).padStart(2, "0")}`
                })),
                columns: [
                    { key: "roller_number", label: "Roller Number" },
                    { key: "size_of_hole", label: "Size of Hole" },
                    { key: "no_of_hole", label: "No. of Hole" },
                    { key: "crop", label: "Crop" },
                    { key: "variety", label: "Variety" },
                    { key: "seeds_per_release", label: "No. of Seed per Release" }
                ]
            },
            {
                key: "fertilizer_unit",
                type: "fields",
                label: "Fertilizer Unit",
                fields: [
                    { key: "hopper_capacity", label: "Hopper Capacity (e.g. 9.925 Kg Urea)" },
                    { key: "fertilizing_depth_spacing", label: "Fertilizing Depth Spacing (mm)" },
                    { key: "spacing_cm", label: "Spacing (cm)" },
                    { key: "spike_numbers", label: "Spike Numbers" }
                ]
            },
            {
                key: "power_source",
                type: "fields",
                label: "Source of Power for Driving & Marker",
                fields: [
                    { key: "metering_mechanism", label: "Metering Mechanism" },
                    { key: "furrow_opening_mechanism", label: "Furrow / Hill Opening Mechanism" },
                    { key: "furrow_closing_mechanism", label: "Furrow / Hill Closing Mechanism" },
                    { key: "marker_available", label: "Marker (Available or Not)" },
                    { key: "min_length_marker", label: "Minimum Length of Marker" },
                    { key: "max_length_marker", label: "Maximum Length of Marker" },
                    { key: "actuating_force_kgf", label: "Actuating Force (kgf)" }
                ]
            },
            {
                key: "material_of_construction",
                type: "fields",
                label: "Material of Construction",
                fields: [
                    { key: "hopper_seed", label: "Hopper (Seed)" },
                    { key: "hopper_fertilizer", label: "Hopper (Fertilizer)" },
                    { key: "metering_device", label: "Metering Device" },
                    { key: "handle", label: "Handle" },
                    { key: "handle_grip", label: "Handle Grip" },
                    { key: "injector", label: "Injector" },
                    { key: "foot_or_grip_part", label: "Handle Grip Comfortable Part / Foot of Seeder" }
                ]
            },
            {
                key: "fertilizer_calibration",
                type: "table",
                label: "Fertilizer Release Quantity Calibration (g/hill)",
                rows: FERTILIZER_ROWS,
                columns: [
                    { key: "t1", label: "Test 1" },
                    { key: "t2", label: "Test 2" },
                    { key: "t3", label: "Test 3" },
                    { key: "t4", label: "Test 4" },
                    { key: "t5", label: "Test 5" },
                    { key: "average", label: "Average (g/hill)", auto: true }
                ]
            },
            {
                key: "comments_section",
                type: "fields",
                label: "Report Comments",
                fields: [
                    { key: "comments_note", label: "Comments on Fertilizer & Seed Suitability", multiline: true }
                ]
            }
        ]
    },
    {
        schema_key: "SEEDER_FIELD",
        label: "Seeder Performance Test (Data Sheet 02 - Seeding)",
        formula_set: "SEEDER_FIELD",
        sections: [
            {
                key: "field_condition",
                type: "fields",
                label: "01. Condition of Field",
                fields: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Location" },
                    { key: "shape_of_field", label: "Shape of Field" },
                    { key: "length_m", label: "Length of Field (m)" },
                    { key: "width_m", label: "Width of Field (m)" },
                    { key: "area_m2", label: "Area of Field (m²)" },
                    { key: "soil_type", label: "Type and Condition of Soil" },
                    { key: "land_preparation", label: "Method of Land Preparation" }
                ]
            },
            {
                key: "soil_moisture_table",
                type: "table",
                label: "Soil Moisture Meter Reading",
                rows: [
                    { key: "wet_weight_g", label: "Weight of Wet (g)" },
                    { key: "dry_weight_g", label: "Weight of Dry (g)" },
                    { key: "moisture_percent", label: "Soil Moisture (%)" }
                ],
                columns: [
                    { key: "sample1", label: "Sample 1" },
                    { key: "sample2", label: "Sample 2" },
                    { key: "sample3", label: "Sample 3" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "performance_conditions",
                type: "fields",
                label: "02. Performance Conditions",
                fields: [
                    { key: "roller_number", label: "Roller Number" },
                    { key: "hole_size_mm", label: "Hole Size (mm)" }
                ]
            },
            {
                key: "seed_condition",
                type: "fields",
                label: "03. Condition of Seed",
                fields: [
                    { key: "seed_name", label: "Name of the Seeds" },
                    { key: "variety", label: "Variety" },
                    { key: "length_mm", label: "Seed Length (mm)" },
                    { key: "width_mm", label: "Seed Width (mm)" },
                    { key: "thickness_mm", label: "Seed Thickness (mm)" },
                    { key: "size_l_w_t_mm", label: "Size of Seed L x W x T (mm)", auto: true },
                    { key: "weight_1000_grains_g", label: "Weight of 1000 Grains (g)" },
                    { key: "germination_rate_percent", label: "Germination Rate (%)" }
                ]
            },
            {
                key: "operation_condition",
                type: "table",
                label: "04. Condition of Operation",
                rows: [
                    { key: "row_spacing_cm", label: "Row Spacing (cm)" },
                    { key: "plant_spacing_cm", label: "Plant Spacing (cm)" },
                    { key: "depth_of_seeding_mm", label: "Depth of Seeding (mm)" },
                    { key: "amount_of_soil_cover", label: "Amount of Soil Cover" },
                    { key: "plants_per_hill", label: "No. of Plant per Hills" },
                    { key: "missing_hills_20", label: "No. of Missing Hills (20 hills)" },
                    { key: "seeds_without_cover_20", label: "No. of Seed without Soil Cover (20 hills)" }
                ],
                columns: [
                    { key: "r1", label: "01" },
                    { key: "r2", label: "02" },
                    { key: "r3", label: "03" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "field_performance",
                type: "fields",
                label: "05. Field Performance",
                fields: [
                    { key: "actual_operating_time_s", label: "1. Actual Operating Time (s)" },
                    { key: "actual_area_covered_m2", label: "2. Actual Area Covered (m²)" },
                    { key: "effective_working_width_mm", label: "3. Effective Working Width (mm)" },
                    { key: "distance_m", label: "4. Traveling Speed - Distance (m)" },
                    { key: "weight_of_used_seed_kg", label: "5. Weight of Used Seed (kg)" },
                    { key: "seed_requirement_kg_acre", label: "Seed Requirement (kg/acre)" },
                    { key: "operating_speed_m_s", label: "Operating Speed (m/s)" },
                    { key: "field_capacity_ha_hr", label: "Field Capacity (ha/hr)" },
                    { key: "field_capacity_acre_day", label: "Field Capacity (acre/day)" }
                ]
            },
            {
                key: "traveling_speed_seeder",
                type: "table",
                label: "4. Traveling Speed Data",
                rows: [
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "time1_sec", label: "Time 1 (Sec.)" },
                    { key: "time2_sec", label: "Time 2 (Sec.)" },
                    { key: "time3_sec", label: "Time 3 (Sec.)" },
                    { key: "ave_sec", label: "Ave. (Sec.)", auto: true },
                    { key: "speed_m_s", label: "Speed (m/s)", auto: true }
                ]
            },
            {
                key: "after_germination",
                type: "table",
                label: "6. After Germination Data",
                rows: [
                    { key: "row_spacing_cm", label: "Row Spacing (cm)" },
                    { key: "plant_spacing_cm", label: "Plant Spacing (cm)" },
                    { key: "plants_per_hill", label: "No. of Plant per Hills" },
                    { key: "missing_hills_20", label: "No. of Missing Hills (20 hills)" }
                ],
                columns: [
                    { key: "r1", label: "01" },
                    { key: "r2", label: "02" },
                    { key: "r3", label: "03" },
                    { key: "average", label: "Average", auto: true }
                ]
            }
        ]
    },
    {
        schema_key: "SEEDER_FERTILIZER_FIELD",
        label: "Seeder Performance Test (Fertilizer / Combined Application)",
        formula_set: "SEEDER_FERTILIZER_FIELD",
        sections: [
            {
                key: "field_condition",
                type: "fields",
                label: "01. Test & Field Condition",
                fields: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Location" },
                    { key: "shape_of_field", label: "Shape of Test Field" },
                    { key: "land_preparation", label: "Method of Land Preparation" },
                    { key: "soil_type", label: "Soil Type" },
                    { key: "soil_moisture_percent", label: "Soil Moisture (%)" }
                ]
            },
            {
                key: "crop_seed_condition",
                type: "fields",
                label: "02. Condition of Crop / Seed",
                fields: [
                    { key: "variety", label: "Variety" },
                    { key: "age_of_crop_days", label: "Age of Crop (days - for Fertilizer Only)" },
                    { key: "height_of_crop_mm", label: "Height of Crop (mm - for Fertilizer Only)" },
                    { key: "size_l_w_t_mm", label: "Size of Seed L x W x T (mm - for Combined)" },
                    { key: "weight_1000_grains_g", label: "Weight of 1000 Grains (g - for Combined)" },
                    { key: "germination_rate_percent", label: "Rate of Germination (% - for Combined)" }
                ]
            },
            {
                key: "fertilizer_condition",
                type: "fields",
                label: "03. Condition of Fertilizer",
                fields: [
                    { key: "fertilizer_name", label: "Name of the Fertilizer" },
                    { key: "fertilizer_type", label: "Type of the Fertilizer (e.g. Granular)" },
                    { key: "granule_shape", label: "Shape of the Fertilizer Granules (e.g. Oval)" }
                ]
            },
            {
                key: "observations",
                type: "fields",
                label: "04. Observations",
                fields: [
                    { key: "row_spacing_cm", label: "Row Spacing (cm)" },
                    { key: "plant_or_fertilizing_spacing_cm", label: "Plant / Fertilizing Spacing (cm)" },
                    { key: "seed_depth_mm", label: "Injecting Depth - Seed (mm)" },
                    { key: "fertilizer_depth_mm", label: "Injecting / Fertilizing Depth - Fertilizer (mm)" },
                    { key: "selector_position_seed", label: "Position of Selector - Seed" },
                    { key: "selector_position_fertilizer", label: "Position of Selector - Fertilizer" },
                    { key: "plants_per_hill", label: "No. of Plants per Hill" },
                    { key: "fertilizer_per_hill_g", label: "Amount of Fertilizer per Hill (g)" },
                    { key: "missed_hills_20", label: "Missed Hills (In 20 hills)" }
                ]
            },
            {
                key: "performance_results",
                type: "fields",
                label: "05. Machine Performance Results",
                fields: [
                    { key: "seed_requirement_kg_ha", label: "Seed Requirement (kg/ha)" },
                    { key: "fertilizer_requirement_kg_ha", label: "Fertilizer Requirement (kg/ha)" },
                    { key: "operating_speed_m_s", label: "Operating Speed (m/s)" },
                    { key: "field_capacity_ha_hr", label: "Field Capacity (ha/hr)" },
                    { key: "field_capacity_acre_day", label: "Field Capacity (acre/day)" }
                ]
            }
        ]
    }
];
