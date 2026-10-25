// Structured form schemas for the 3 4W Implements:
//  1. Disc Plough:   DISC_PLOUGH_LAB, DISC_PLOUGH_FIELD
//  2. Rotary Tiller: ROTARY_LAB, ROTARY_HIGHLAND, ROTARY_LOWLAND
//  3. Shredder:      SHREDDER_LAB, SHREDDER_FIELD

export const IMPLEMENT_SCHEMAS = [
    // ========================================================================================
    // 1. DISC PLOUGH
    // ========================================================================================
    {
        schema_key: "DISC_PLOUGH_LAB",
        label: "Specification for 4 Wheel Tractor Attach Disc Plough (Data Sheet 01)",
        formula_set: "DISC_PLOUGH_LAB",
        sections: [
            {
                key: "manufacturer_specs",
                type: "fields",
                label: "Manufacturer's Specifications & Verification",
                fields: [
                    { key: "brand_mfg", label: "Brand (Manufacture)" },
                    { key: "brand_ver", label: "Brand (Verification)" },
                    { key: "model_mfg", label: "Model (Manufacture)" },
                    { key: "model_ver", label: "Model (Verification)" },
                    { key: "serial_no", label: "Serial No" },
                    { key: "test_date", label: "Date" },
                    { key: "type", label: "Type" },
                    { key: "num_discs_mfg", label: "Number of Disc (Manufacture)" },
                    { key: "num_discs_ver", label: "Number of Disc (Verification)" },
                    { key: "total_width_mfg", label: "Total Width (mm) (Manufacture)" },
                    { key: "total_width_ver", label: "Total Width (mm) (Verification)" },
                    { key: "total_length_mfg", label: "Total Length (mm) (Manufacture)" },
                    { key: "total_length_ver", label: "Total Length (mm) (Verification)" },
                    { key: "total_height_mfg", label: "Total Height (mm) (Manufacture)" },
                    { key: "total_height_ver", label: "Total Height (mm) (Verification)" },
                    { key: "working_depth_mfg", label: "Working Depth (mm) (Manufacture)" },
                    { key: "working_depth_ver", label: "Working Depth (mm) (Verification)" },
                    { key: "space_between_bodies_mfg", label: "Space Between Bodies (mm) (Manufacture)" },
                    { key: "space_between_bodies_ver", label: "Space Between Bodies (mm) (Verification)" },
                    { key: "disc_diameter_mfg", label: "Diameter of Disc (mm) (Manufacture)" },
                    { key: "disc_diameter_ver", label: "Diameter of Disc (mm) (Verification)" },
                    { key: "required_hp_mfg", label: "Required Hp (Manufacture)" },
                    { key: "required_hp_ver", label: "Required Hp (Verification)" },
                    { key: "total_weight_mfg", label: "Total / Net Weight (kg) (Manufacture)" },
                    { key: "total_weight_ver", label: "Total / Net Weight (kg) (Verification)" },
                    { key: "weight_per_disc_kg", label: "Weight per Disc (kg)" }
                ]
            },
            {
                key: "disc_details",
                type: "fields",
                label: "3) Disc Plough & Other Specifications",
                fields: [
                    { key: "category", label: "Category - 3 Point Linkage (e.g. I, II)" },
                    { key: "main_frame_dim", label: "Main Frame Dimension L x W (mm)" },
                    { key: "main_frame_material", label: "Main Frame Material" },
                    { key: "disc_type", label: "Disc Type (Plain or Notched)" },
                    { key: "disc_thickness_mm", label: "Disc Thickness (mm)" },
                    { key: "concavity_mm", label: "Concavity* (mm)" },
                    { key: "hardness_hrc", label: "Hardness (HRC)" },
                    { key: "disc_spacing_mm", label: "Disc Spacing (mm)" },
                    { key: "side_angle_deg", label: "Side Angle (°)" },
                    { key: "tilt_angle_deg", label: "Tilt Angle (°)" },
                    { key: "scraper_length_width_mm", label: "Scraper Length x Width (mm)" },
                    { key: "scraper_thickness_mm", label: "Scraper Thickness (mm)" },
                    { key: "rear_wheel_diameter_mm", label: "Rear Furrow Wheel Diameter (mm)" },
                    { key: "rear_wheel_thickness_mm", label: "Rear Furrow Wheel Thickness (mm)" },
                    { key: "source_of_power", label: "Source of Power" },
                    { key: "body_construction", label: "4) Body Construction" },
                    { key: "nuts_and_bolts", label: "6) Nuts & Bolts" }
                ]
            }
        ]
    },
    {
        schema_key: "DISC_PLOUGH_FIELD",
        label: "Disc Plough - Field Performance Test",
        formula_set: "DISC_PLOUGH_FIELD",
        sections: [
            {
                key: "tractor_and_site",
                type: "fields",
                label: "Used Tractor & Condition of Field",
                fields: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Location / Place" },
                    { key: "used_tractor", label: "Used Tractor / Coupled Tractor Model" },
                    { key: "tractor_power_hp", label: "Tractor Power (hp)" },
                    { key: "shape_of_field", label: "Shape of Field" },
                    { key: "condition_of_grass", label: "Condition of Grass (low, medium or high)" },
                    { key: "last_crop", label: "Last Crop Planted" },
                    { key: "soil_type", label: "Soil Type" },
                    { key: "soil_hardness_kg_cm2", label: "Soil Hardness (kg/cm²)" }
                ]
            },
            {
                key: "weed_data",
                type: "fields",
                label: "Weed Density & Weed Height",
                fields: [
                    { key: "weed_density_1", label: "Weed Density 1 (per m²)" },
                    { key: "weed_density_2", label: "Weed Density 2 (per m²)" },
                    { key: "weed_density_3", label: "Weed Density 3 (per m²)" },
                    { key: "weed_density_avg", label: "Weed Density Average (per m²)", auto: true },
                    { key: "weed_height_1", label: "Weed Height 1 (mm)" },
                    { key: "weed_height_2", label: "Weed Height 2 (mm)" },
                    { key: "weed_height_3", label: "Weed Height 3 (mm)" },
                    { key: "weed_height_avg", label: "Weed Height Average (mm)", auto: true }
                ]
            },
            {
                key: "soil_shear_strength",
                type: "table",
                label: "Soil Shear Strength",
                rows: [
                    { key: "gauge_reading_lb_ft", label: "Gauge Reading (Lb. ft)" },
                    { key: "gauge_reading_kg_m", label: "Gauge Reading (kg. m)" }
                ],
                columns: [
                    { key: "station1", label: "Station 1" },
                    { key: "station2", label: "Station 2" },
                    { key: "station3", label: "Station 3" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "soil_meter_reading",
                type: "table",
                label: "Soil Moisture (%)",
                rows: [
                    { key: "soil_meter_reading", label: "Soil meter reading" }
                ],
                columns: [
                    { key: "station1", label: "1" },
                    { key: "station2", label: "2" },
                    { key: "station3", label: "3" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "draft_measurement",
                type: "fields",
                label: "Draft Measurement",
                fields: [
                    { key: "draft_without_load_kn", label: "Draft without load (kN)" },
                    { key: "draft_with_load_kn", label: "Draft with load (kN)" },
                    { key: "difference_kn", label: "Difference (kN)", auto: true }
                ]
            },
            {
                key: "travel_operation",
                type: "fields",
                label: "Tractor Gearshift Setting",
                fields: [
                    { key: "type_of_field_operation", label: "Type of Field Operation" },
                    { key: "operating_gear", label: "Operating Gear (e.g. L 4th)" },
                    { key: "engine_rpm", label: "Engine rpm" },
                    { key: "distance_m", label: "Distance (m)" },
                    { key: "turns", label: "Wheel Slip Turns" }
                ]
            },
            {
                key: "traveling_speed_data",
                type: "table",
                label: "Traveling Speed Data",
                rows: [
                    { key: "without_load", label: "Without load" },
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "time1_sec", label: "Time 1 Sec." },
                    { key: "time2_sec", label: "Time 2 Sec." },
                    { key: "time3_sec", label: "Time 3 Sec." },
                    { key: "ave_sec", label: "Ave. Sec.", auto: true },
                    { key: "speed_m_s", label: "Speed m/s", auto: true }
                ]
            },
            {
                key: "wheel_slip_data",
                type: "table",
                label: "Wheel Slip Data",
                rows: [
                    { key: "without_load", label: "Without load" },
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "distance1_m", label: "Distance 1 m" },
                    { key: "distance2_m", label: "Distance 2 m" },
                    { key: "distance3_m", label: "Distance 3 m" },
                    { key: "ave_m", label: "Ave. m", auto: true }
                ]
            },
            {
                key: "wheel_slip_result",
                type: "fields",
                label: "Wheel Slip Result",
                fields: [
                    { key: "wheel_slip_percent", label: "Wheel Slip (%)", auto: true }
                ]
            },
            {
                key: "used_implement_data",
                type: "table",
                label: "Implement Data",
                rows: [
                    { key: "working_width", label: "Width of tillage (mm)" },
                    { key: "working_depth", label: "Depth of tillage (mm)" }
                ],
                columns: [
                    { key: "reading1", label: "1 (mm)" },
                    { key: "reading2", label: "2 (mm)" },
                    { key: "reading3", label: "3 (mm)" },
                    { key: "ave_mm", label: "Ave. (mm)", auto: true }
                ]
            },
            {
                key: "operational_fuel_test",
                type: "fields",
                label: "Operational Data (Fuel Test)",
                fields: [
                    { key: "productive_time_min", label: "Productive Time (min)" },
                    { key: "productive_time_sec", label: "Productive Time (sec)" },
                    { key: "lost_time_min", label: "Time Lost (min)" },
                    { key: "lost_time_sec", label: "Time Lost (sec)" },
                    { key: "total_time_sec", label: "Total Time (sec)", auto: true },
                    { key: "fuel_liters", label: "Fuel (Liters)" },
                    { key: "fuel_ml", label: "Fuel (ml)" },
                    { key: "total_area_m2", label: "Total Area (m²)" }
                ]
            },
            {
                key: "working_efficiency",
                type: "fields",
                label: "Performance Summary",
                fields: [
                    { key: "working_width_m", label: "Working Width (m)" },
                    { key: "traveling_speed_m_s", label: "Traveling Speed (m/s)" },
                    { key: "operational_area_m2", label: "Operational Area (m²)" },
                    { key: "used_time_minutes", label: "Used Time (Minutes)" },
                    { key: "used_fuel_liters", label: "Used Fuel (Liters)" },
                    { key: "field_capacity_ha_hr", label: "Field Capacity (ha/hr)", auto: true },
                    { key: "field_capacity_acre_day", label: "Field Capacity (Acres/Day)", auto: true },
                    { key: "fuel_consumption_l_hr", label: "Fuel Consumption (l/hr)", auto: true },
                    { key: "fuel_consumption_l_ha", label: "Fuel Consumption (l/ha)", auto: true }
                ]
            }
        ]
    },

    // ========================================================================================
    // 2. ROTARY TILLER
    // ========================================================================================
    {
        schema_key: "ROTARY_LAB",
        label: "Rotary Tiller - Verification of Specifications (Lab Test)",
        formula_set: "ROTARY_LAB",
        sections: [
            {
                key: "manufacturer_specs",
                type: "fields",
                label: "Verification of Manufacturer Specifications",
                fields: [
                    { key: "model_mfg", label: "Model (Manufacture)" },
                    { key: "model_ver", label: "Model (Verification)" },
                    { key: "series_mfg", label: "Series (Manufacture)" },
                    { key: "series_ver", label: "Series (Verification)" },
                    { key: "size_mfg", label: "Size (Manufacture)" },
                    { key: "size_ver", label: "Size (Verification)" },
                    { key: "overall_width_mfg", label: "Overall Width (Manufacture)" },
                    { key: "overall_width_ver", label: "Overall Width (Verification)" },
                    { key: "tilling_width_mfg", label: "Tilling Width (Manufacture)" },
                    { key: "tilling_width_ver", label: "Tilling Width (Verification)" },
                    { key: "tractor_power_mfg", label: "Tractor Power (Manufacture)" },
                    { key: "tractor_power_ver", label: "Tractor Power (Verification)" },
                    { key: "hitch_type_mfg", label: "3 Point Hitch Type (Manufacture)" },
                    { key: "hitch_type_ver", label: "3 Point Hitch Type (Verification)" },
                    { key: "num_blades_mfg", label: "No. of Blades (Manufacture)" },
                    { key: "num_blades_ver", label: "No. of Blades (Verification)" },
                    { key: "primary_transmission_mfg", label: "Primary Transmission (Manufacture)" },
                    { key: "primary_transmission_ver", label: "Primary Transmission (Verification)" },
                    { key: "transmission_type_mfg", label: "Transmission Type (Manufacture)" },
                    { key: "transmission_type_ver", label: "Transmission Type (Verification)" },
                    { key: "max_working_depth_mfg", label: "Max. Working Depth (Manufacture)" },
                    { key: "max_working_depth_ver", label: "Max. Working Depth (Verification)" },
                    { key: "safety_device_mfg", label: "Drive Line Safety Device (Manufacture)" },
                    { key: "safety_device_ver", label: "Drive Line Safety Device (Verification)" },
                    { key: "gear_speeds_mfg", label: "Gear Speeds (Manufacture)" },
                    { key: "gear_speeds_ver", label: "Gear Speeds (Verification)" },
                    { key: "rotor_rpm_mfg", label: "Rotor RPM (PTO) (Manufacture)" },
                    { key: "rotor_rpm_ver", label: "Rotor RPM (PTO) (Verification)" },
                    { key: "weight_mfg", label: "Weight (Manufacture)" },
                    { key: "weight_ver", label: "Weight (Verification)" }
                ]
            },
            {
                key: "other_specs",
                type: "fields",
                label: "Verification of Other Specification",
                fields: [
                    { key: "overall_dim_lxwxh", label: "Overall Dimension L x W x H (mm)" },
                    { key: "category", label: "Category" },
                    { key: "num_splines", label: "No. of Splines" },
                    { key: "driveline_safety_device", label: "Driveline Safety Device" },
                    { key: "skid_adjustment_option", label: "Skid Adjustment Option" },
                    { key: "slide_transmission_system", label: "Slide Transmission System" },
                    { key: "rotor_tube_diameter", label: "Rotor Tube Diameter" },
                    { key: "num_flanges", label: "No. of Flanges" },
                    { key: "gauge_of_sheet", label: "Gauge of sheet" },
                    { key: "blade_dim_lxw", label: "Blade - Dimension (L x W)" },
                    { key: "blade_thickness", label: "Blade - Thickness" },
                    { key: "blade_weight", label: "Blade - Weight" },
                    { key: "blades_per_flange", label: "Blade - No of Blades per Flange" },
                    { key: "blade_spacing", label: "Blade - Spacing" },
                    { key: "hardness_cutting_edge", label: "Hardness - Near the Cutting Edge (HRC)" },
                    { key: "hardness_fixing_area", label: "Hardness - Near the Fixing Area (HRC)" },
                    { key: "pinion_oil_capacity", label: "Oil Capacity - Pinion Oil Capacity" },
                    { key: "side_transmission_oil", label: "Oil Capacity - Side transmission Case" }
                ]
            }
        ]
    },
    {
        schema_key: "ROTARY_LOWLAND",
        label: "Rotary Tiller - Lowland Field Performance Test",
        formula_set: "LOWLAND",
        sections: [
            {
                key: "site_soil",
                type: "fields",
                label: "Site & Soil Data (Lowland)",
                fields: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Place / Location" },
                    { key: "coupled_tractor_model", label: "Coupled Tractor Model" },
                    { key: "tractor_power_hp", label: "Tractor Power (hp)" },
                    { key: "field_shape", label: "Field Shape" },
                    { key: "soil_type", label: "Type Of Soil" },
                    { key: "last_crop", label: "Last Crop" },
                    { key: "standing_water_level_mm", label: "Standing Water Level (mm)" },
                    { key: "stubble_height_mm", label: "Stubble Height (mm)" },
                    { key: "weed_density_1", label: "Weed Density 1 (per m²)" },
                    { key: "weed_density_2", label: "Weed Density 2 (per m²)" },
                    { key: "weed_density_3", label: "Weed Density 3 (per m²)" },
                    { key: "weed_height_1", label: "Weed Height 1 (mm)" },
                    { key: "weed_height_2", label: "Weed Height 2 (mm)" },
                    { key: "weed_height_3", label: "Weed Height 3 (mm)" },
                    { key: "soil_moisture_percent", label: "Soil Moisture (%)" },
                    { key: "method_of_field_operation", label: "Method of Field Operation" }
                ]
            },
            {
                key: "penetration_resistance",
                type: "table",
                label: "Penetration Resistance (LB) (Penetrometer Readings)",
                rows: [
                    { key: "force1", label: "Force 1" },
                    { key: "force2", label: "Force 2" },
                    { key: "force3", label: "Force 3" },
                    { key: "average", label: "Ave", auto: true }
                ],
                columns: Array.from({ length: 9 }, (_, i) => ({
                    key: `depth_${i + 1}`,
                    label: `${i + 1}`
                }))
            },
            {
                key: "moisture_meter_reading",
                type: "table",
                label: "Moisture Meter Reading",
                rows: [
                    { key: "soil_moisture", label: "Soil Moisture" }
                ],
                columns: [
                    { key: "station1", label: "Station 1" },
                    { key: "station2", label: "Station 2" },
                    { key: "station3", label: "Station 3" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "used_implement_data",
                type: "table",
                label: "Used Implement Data",
                rows: [
                    { key: "working_width", label: "Working width (mm)" },
                    { key: "working_depth", label: "Working depth (mm)" }
                ],
                columns: [
                    { key: "reading1", label: "1 (mm)" },
                    { key: "reading2", label: "2 (mm)" },
                    { key: "reading3", label: "3 (mm)" },
                    { key: "ave_mm", label: "Ave. (mm)", auto: true }
                ]
            },
            {
                key: "travel_operation",
                type: "fields",
                label: "Engine & Gear Setting",
                fields: [
                    { key: "engine_rpm", label: "Engine rpm" },
                    { key: "operating_gear", label: "Operating Gear" },
                    { key: "distance_m", label: "Distance (m)" }
                ]
            },
            {
                key: "traveling_speed_data",
                type: "table",
                label: "Traveling Speed Data",
                rows: [
                    { key: "without_load", label: "Without load" },
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "time1_sec", label: "Time 1 Sec." },
                    { key: "time2_sec", label: "Time 2 Sec." },
                    { key: "time3_sec", label: "Time 3 Sec." },
                    { key: "ave_sec", label: "Ave. Sec.", auto: true },
                    { key: "speed_m_s", label: "Speed m/s", auto: true }
                ]
            },
            {
                key: "wheel_slip_data",
                type: "table",
                label: "Wheel Slip Data",
                rows: [
                    { key: "without_load", label: "Without load" },
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "distance1_m", label: "Distance 1 m" },
                    { key: "distance2_m", label: "Distance 2 m" },
                    { key: "distance3_m", label: "Distance 3 m" },
                    { key: "ave_m", label: "Ave. m", auto: true }
                ]
            },
            {
                key: "wheel_slip_result",
                type: "fields",
                label: "Wheel Slip",
                fields: [
                    { key: "wheel_slip_percent", label: "Wheel Slip (%)", auto: true }
                ]
            },
            {
                key: "operational_fuel_test",
                type: "fields",
                label: "Operational Data (Fuel Test)",
                fields: [
                    { key: "productive_time_min", label: "Productive Time (min)" },
                    { key: "productive_time_sec", label: "Productive Time (sec)" },
                    { key: "lost_time_min", label: "Time Lost (min)" },
                    { key: "lost_time_sec", label: "Time Lost (sec)" },
                    { key: "total_time_sec", label: "Total Time (sec)", auto: true },
                    { key: "fuel_liters", label: "Fuel (Liters)" },
                    { key: "fuel_ml", label: "Fuel (ml)" },
                    { key: "total_area_m2", label: "Total Area (m²)" }
                ]
            },
            {
                key: "working_efficiency",
                type: "fields",
                label: "Working Efficiency",
                fields: [
                    { key: "working_width_m", label: "Working Width (m)" },
                    { key: "traveling_speed_m_s", label: "Traveling Speed (m/s)" },
                    { key: "operational_area_m2", label: "Operational Area (m²)" },
                    { key: "used_time_minutes", label: "Used Time (Minutes)" },
                    { key: "used_fuel_liters", label: "Used Fuel (Liters)" },
                    { key: "theoretical_time_min", label: "Theoretical Time (Min)", auto: true },
                    { key: "field_efficiency_percent", label: "Field Efficiency (%)", auto: true },
                    { key: "field_capacity_ha_hr", label: "Field Capacity (ha/hr)", auto: true },
                    { key: "field_capacity_acre_day", label: "Field Capacity (Acre/day)", auto: true },
                    { key: "fuel_consumption_l_hr", label: "Fuel Consumption (l/hr)", auto: true },
                    { key: "fuel_consumption_l_ha", label: "Fuel Consumption (l/ha)", auto: true }
                ]
            }
        ]
    },
    {
        schema_key: "ROTARY_HIGHLAND",
        label: "Rotary Tiller - Highland Field Performance Test",
        formula_set: "HIGHLAND",
        sections: [
            {
                key: "site_soil",
                type: "fields",
                label: "Site & Soil Data (Highland)",
                fields: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Place / Location" },
                    { key: "land_condition", label: "Land Condition (e.g. Normal land / After Plough with Disc Plough)" },
                    { key: "coupled_tractor_model", label: "Coupled Tractor Model" },
                    { key: "tractor_power_hp", label: "Tractor Power (hp)" },
                    { key: "field_shape", label: "Field Shape" },
                    { key: "soil_type", label: "Type Of Soil" },
                    { key: "last_crop", label: "Last Crop" },
                    { key: "weed_density_1", label: "Weed Density 1 (per m²)" },
                    { key: "weed_density_2", label: "Weed Density 2 (per m²)" },
                    { key: "weed_density_3", label: "Weed Density 3 (per m²)" },
                    { key: "weed_height_1", label: "Weed Height 1 (mm)" },
                    { key: "weed_height_2", label: "Weed Height 2 (mm)" },
                    { key: "weed_height_3", label: "Weed Height 3 (mm)" },
                    { key: "soil_moisture_percent", label: "Soil Moisture (%)" },
                    { key: "method_of_field_operation", label: "Method of Field Operation" },
                    { key: "condition_after_operation", label: "Condition After Operation (e.g. Fine particles)" }
                ]
            },
            {
                key: "soil_shear_strength",
                type: "table",
                label: "Soil Shear Strength",
                rows: [
                    { key: "gauge_reading_lb_ft", label: "Gauge Reading (Lb. ft)" },
                    { key: "gauge_reading_kg_m", label: "Gauge Reading (kg. m)" }
                ],
                columns: [
                    { key: "station1", label: "Station 1" },
                    { key: "station2", label: "Station 2" },
                    { key: "station3", label: "Station 3" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "soil_meter_reading",
                type: "table",
                label: "Soil Meter Reading",
                rows: [
                    { key: "soil_meter_reading", label: "Soil Meter Reading" }
                ],
                columns: [
                    { key: "station1", label: "Station 1" },
                    { key: "station2", label: "Station 2" },
                    { key: "station3", label: "Station 3" },
                    { key: "average", label: "Average", auto: true }
                ]
            },
            {
                key: "used_implement_data",
                type: "table",
                label: "Used Implement Data",
                rows: [
                    { key: "working_width", label: "Working width (mm)" },
                    { key: "working_depth", label: "Working depth (mm)" }
                ],
                columns: [
                    { key: "reading1", label: "1 (mm)" },
                    { key: "reading2", label: "2 (mm)" },
                    { key: "reading3", label: "3 (mm)" },
                    { key: "ave_mm", label: "Ave. (mm)", auto: true }
                ]
            },
            {
                key: "travel_operation",
                type: "fields",
                label: "Engine & Gear Setting",
                fields: [
                    { key: "engine_rpm", label: "Engine rpm" },
                    { key: "operating_gear", label: "Operating Gear" },
                    { key: "distance_m", label: "Distance (m)" }
                ]
            },
            {
                key: "traveling_speed_data",
                type: "table",
                label: "Traveling Speed Data",
                rows: [
                    { key: "without_load", label: "Without load" },
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "time1_sec", label: "Time 1 Sec." },
                    { key: "time2_sec", label: "Time 2 Sec." },
                    { key: "time3_sec", label: "Time 3 Sec." },
                    { key: "ave_sec", label: "Ave. Sec.", auto: true },
                    { key: "speed_m_s", label: "Speed m/s", auto: true }
                ]
            },
            {
                key: "wheel_slip_data",
                type: "table",
                label: "Wheel Slip Data",
                rows: [
                    { key: "without_load", label: "Without load" },
                    { key: "with_load", label: "With Load" }
                ],
                columns: [
                    { key: "distance1_m", label: "Distance 1 m" },
                    { key: "distance2_m", label: "Distance 2 m" },
                    { key: "distance3_m", label: "Distance 3 m" },
                    { key: "ave_m", label: "Ave. m", auto: true }
                ]
            },
            {
                key: "wheel_slip_result",
                type: "fields",
                label: "Wheel Slip",
                fields: [
                    { key: "wheel_slip_percent", label: "Wheel Slip (%)", auto: true }
                ]
            },
            {
                key: "operational_fuel_test",
                type: "fields",
                label: "Operational Data (Fuel Test)",
                fields: [
                    { key: "productive_time_min", label: "Productive Time (min)" },
                    { key: "productive_time_sec", label: "Productive Time (sec)" },
                    { key: "lost_time_min", label: "Time Lost (min)" },
                    { key: "lost_time_sec", label: "Time Lost (sec)" },
                    { key: "total_time_sec", label: "Total Time (sec)", auto: true },
                    { key: "fuel_liters", label: "Fuel (Liters)" },
                    { key: "fuel_ml", label: "Fuel (ml)" },
                    { key: "total_area_m2", label: "Total Area (m²)" }
                ]
            },
            {
                key: "working_efficiency",
                type: "fields",
                label: "Working Efficiency",
                fields: [
                    { key: "working_width_m", label: "Working Width (m)" },
                    { key: "traveling_speed_m_s", label: "Traveling Speed (m/s)" },
                    { key: "operational_area_m2", label: "Operational Area (m²)" },
                    { key: "used_time_minutes", label: "Used Time (Minutes)" },
                    { key: "used_fuel_liters", label: "Used Fuel (Liters)" },
                    { key: "theoretical_time_min", label: "Theoretical Time (Min)", auto: true },
                    { key: "field_efficiency_percent", label: "Field Efficiency (%)", auto: true },
                    { key: "field_capacity_ha_hr", label: "Field Capacity (ha/hr)", auto: true },
                    { key: "field_capacity_acre_day", label: "Field Capacity (Acre/day)", auto: true },
                    { key: "fuel_consumption_l_hr", label: "Fuel Consumption (l/hr)", auto: true },
                    { key: "fuel_consumption_l_ha", label: "Fuel Consumption (l/ha)", auto: true }
                ]
            }
        ]
    },

    // ========================================================================================
    // 3. SHREDDER
    // ========================================================================================
    {
        schema_key: "SHREDDER_LAB",
        label: "Shredder - Verification of Specifications (Lab Test)",
        formula_set: "SHREDDER_LAB",
        sections: [
            {
                key: "overall_and_frame",
                type: "fields",
                label: "Overall Dimension & Frame",
                fields: [
                    { key: "overall_lxwxh", label: "Overall Dimension L x W x H" },
                    { key: "weight", label: "Weight" },
                    { key: "frame_lxwxh", label: "Frame - Overall dimension (L x W x H)" },
                    { key: "frame_material", label: "Frame - Material" }
                ]
            },
            {
                key: "cutting_unit",
                type: "fields",
                label: "Cutting Unit",
                fields: [
                    { key: "knife_supporting_unit", label: "Knife Supporting Unit (D x T)" },
                    { key: "knife_mounting_method", label: "Knife mounting method" },
                    { key: "flat_knife_dim", label: "Flat Knife Dimension (L x W x T)" },
                    { key: "weight_of_blade", label: "Weight of Blade" },
                    { key: "num_blades", label: "No. of Blade" },
                    { key: "side_cover", label: "Side cover" },
                    { key: "top_cover", label: "Top cover" }
                ]
            },
            {
                key: "feeding_unit",
                type: "fields",
                label: "Feeding Unit",
                fields: [
                    { key: "feeding_chute_txlxw", label: "Feeding Chute (T x L x W)" },
                    { key: "feeding_hole_lxh", label: "Feeding Hole (L x H)" },
                    { key: "feeding_chute_lxwxt", label: "Feeding chute (L x W x T)" }
                ]
            },
            {
                key: "power_transmission",
                type: "fields",
                label: "Power Transmission",
                fields: [
                    { key: "type", label: "Type" },
                    { key: "belt_size", label: "Belt size" },
                    { key: "num_belts", label: "Number of belts" },
                    { key: "driven_shaft_dia", label: "Driven shaft diameter" },
                    { key: "driven_pulley_dia", label: "Driven pulley diameter" },
                    { key: "drive_shaft_dia", label: "Drive shaft diameter" },
                    { key: "drive_pulley_dia", label: "Drive pulley diameter" },
                    { key: "pulley_cover", label: "Pulley cover" }
                ]
            },
            {
                key: "outlets",
                type: "fields",
                label: "Outlets (Top & Bottom Position)",
                fields: [
                    { key: "top_outlet_material", label: "Outlet (Top position) - Material" },
                    { key: "top_outlet_dim", label: "Outlet (Top position) - Dimension (L x W x T)" },
                    { key: "bottom_outlet_material", label: "Outlet 02 (Bottom position) - Material" },
                    { key: "bottom_outlet_dim", label: "Outlet 02 (Bottom position) - Dimension (L x W x T)" }
                ]
            }
        ]
    },
    {
        schema_key: "SHREDDER_FIELD",
        label: "Shredder - Performance Test Data Sheet",
        formula_set: "SHREDDER_FIELD",
        sections: [
            {
                key: "test_conditions",
                type: "fields",
                label: "Test Conditions & Machine Details",
                fields: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Location" },
                    { key: "used_tractor", label: "Used Tractor / Power source" },
                    { key: "tractor_power", label: "Tractor Power" },
                    { key: "pto_rpm_without_load", label: "PTO RPM / MOTOR RPM (Without load)" },
                    { key: "pto_rpm_with_load", label: "PTO RPM / MOTOR RPM (With load)" },
                    { key: "cutter_rpm_without_load", label: "Cutter / Machine RPM (Without load)" },
                    { key: "cutter_rpm_with_load", label: "Cutter / Machine RPM (With load)" },
                    { key: "used_fuel_ml", label: "Used Fuel (ml)" },
                    { key: "start_time", label: "Start Time" },
                    { key: "end_time", label: "End Time" },
                    { key: "total_time_min", label: "Total Time (Min)" },
                    { key: "sound_level_db", label: "Sound Level (dB)" }
                ]
            },
            {
                key: "fodder_details",
                type: "fields",
                label: "Used Green Material (Fodder)",
                fields: [
                    { key: "fodder_type", label: "Type of Fodder (e.g. Gliricidia, Banana, Sasbenia)" },
                    { key: "fodder_weight_kg", label: "Fodder Weight / Quantity of Material (kg)" },
                    { key: "time_to_chopping_min", label: "Time to Chopping (Min)" },
                    { key: "num_workers", label: "Number of Workers Used" },
                    { key: "length_1_mm", label: "Length 1 (mm)" },
                    { key: "length_2_mm", label: "Length 2 (mm)" },
                    { key: "length_3_mm", label: "Length 3 (mm)" },
                    { key: "length_4_mm", label: "Length 4 (mm)" },
                    { key: "length_avg_mm", label: "Fodder Length Average (mm)", auto: true },
                    { key: "stem_dia_1_mm", label: "Stem Diameter 1 (mm)" },
                    { key: "stem_dia_2_mm", label: "Stem Diameter 2 (mm)" },
                    { key: "stem_dia_3_mm", label: "Stem Diameter 3 (mm)" },
                    { key: "stem_dia_4_mm", label: "Stem Diameter 4 (mm)" },
                    { key: "stem_dia_avg_mm", label: "Fodder Diameter Average (mm)", auto: true }
                ]
            },
            {
                key: "output_and_capacity",
                type: "fields",
                label: "Thrown Output Area, Capacity & Particle Size",
                fields: [
                    { key: "thrown_length_max_m", label: "Thrown Output Area - Length (Max) (m)" },
                    { key: "thrown_width_max_m", label: "Thrown Output Area - Width (Max) (m)" },
                    { key: "capacity_kg_min", label: "Capacity (kg/min)", auto: true },
                    { key: "capacity_kg_hr", label: "Capacity (kg/hr)", auto: true },
                    { key: "fuel_consumption_l_hr", label: "Fuel Consumption (l/hr)" },
                    { key: "particle_above_5cm", label: "Particle size (per 500g) - Above 5cm (%)" },
                    { key: "particle_below_5cm", label: "Particle size (per 500g) - Below 5cm (%)" }
                ]
            }
        ]
    },

    // ========================================================================================
    // 4. BRUSH CUTTER
    // ========================================================================================
    {
        schema_key: "BRUSH_CUTTER_LAB",
        label: "Brush Cutter Lab Test (Data Sheet 01 & 02 - Specifications & Attachments)",
        formula_set: "BRUSH_CUTTER_LAB",
        sections: [
            {
                key: "manufacturer_specs",
                type: "fields",
                label: "5.1 Verification of Manufacturer Specification",
                fields: [
                    { key: "model_mfg", label: "Model (Manufacturer)" },
                    { key: "model_ver", label: "Model (Verification)" },
                    { key: "engine_type_mfg", label: "Engine Type (Manufacturer)" },
                    { key: "engine_type_ver", label: "Engine Type (Verification)" },
                    { key: "displacement_mfg", label: "Displacement (Manufacturer)" },
                    { key: "displacement_ver", label: "Displacement (Verification)" },
                    { key: "carburettor_mfg", label: "Carburettor (Manufacturer)" },
                    { key: "carburettor_ver", label: "Carburettor (Verification)" },
                    { key: "starting_method_mfg", label: "Starting Method (Manufacturer)" },
                    { key: "starting_method_ver", label: "Starting Method (Verification)" },
                    { key: "fuel_tank_mfg", label: "Fuel Tank Capacity (Manufacturer)" },
                    { key: "fuel_tank_ver", label: "Fuel Tank Capacity (Verification)" },
                    { key: "net_weight_mfg", label: "Net weight (Manufacturer)" },
                    { key: "net_weight_ver", label: "Net weight (Verification)" }
                ]
            },
            {
                key: "other_specs",
                type: "fields",
                label: "5.2 Engine, Transmission, Dimension & Material of Construction (Data Sheet 01)",
                fields: [
                    { key: "idle_speed_rpm", label: "Engine - Idle Speed (rpm)" },
                    { key: "max_load_speed_rpm", label: "Engine - Max Load Speed (rpm)" },
                    { key: "spark_plug", label: "Engine - Spark Plug" },
                    { key: "cooling_system", label: "Engine - Cooling System" },
                    { key: "air_filter_type", label: "Engine - Air filter type" },
                    { key: "engine_mounting_method", label: "Engine - Engine Mounting Method" },
                    { key: "power_transmission_method", label: "Transmission - Power Transmission Method" },
                    { key: "overall_dim_lxwxh", label: "Dimension - Overall Dimension (L x W x H)" },
                    { key: "flexible_drive_length", label: "Dimension - Length of Flexible Drive" },
                    { key: "shaft_arm_mm", label: "Dimension - Shaft Arm (mm)" },
                    { key: "grip_length_mm", label: "Dimension - Grip Length (mm)" },
                    { key: "strap_lxwxt", label: "Dimension - Strap (L x W x T)" },
                    { key: "comfortable_part_lxwxt", label: "Dimension - Comfortable part (L x W x T)" },
                    { key: "material_straps", label: "Material of Construction - Straps" },
                    { key: "material_hand_grip", label: "Material of Construction - Hand Grip" },
                    { key: "material_handle", label: "Material of Construction - Handle" },
                    { key: "material_frame", label: "Material of Construction - Frame" },
                    { key: "material_safety_guard", label: "Material of Construction - Safety Guard" }
                ]
            },
            {
                key: "attachments_specs",
                type: "fields",
                label: "Data Sheet 02 - Cutting Devices & Attachments Specifications",
                fields: [
                    { key: "nylon_disc_dia", label: "Nylon Cutter - Disc Diameter" },
                    { key: "nylon_thickness", label: "Nylon Cutter - Thickness" },
                    { key: "two_teeth_dim", label: "Two Teeth Blade - Dimension (L x W x T)" },
                    { key: "two_teeth_hardness", label: "Two Teeth Blade - Hardness" },
                    { key: "teeth_disc_dia", label: "Teeth Disc - Diameter" },
                    { key: "teeth_disc_thickness", label: "Teeth Disc - Thickness" },
                    { key: "teeth_disc_hardness", label: "Teeth Disc - Hardness" },
                    { key: "teeth_disc_num_teeth", label: "Teeth Disc - No. of Teeth" },
                    { key: "weeder_dim", label: "Weeder - Dimension (L x W)" },
                    { key: "weeder_weight", label: "Weeder - Weight" },
                    { key: "weeder_blade_dim", label: "Weeder - Blade dimension (L x W x T)" },
                    { key: "weeder_hardness", label: "Weeder - Hardness" },
                    { key: "weeder_num_blade", label: "Weeder - No. of Blade" },
                    { key: "sweeper_dim", label: "Sweeper - Dimension (L x W)" },
                    { key: "sweeper_weight", label: "Sweeper - Weight" },
                    { key: "sweeper_blade_dim", label: "Sweeper - Blade dimension (L x W x T)" },
                    { key: "sweeper_hardness", label: "Sweeper - Hardness" },
                    { key: "sweeper_num_blade", label: "Sweeper - No. of Blade" },
                    { key: "tiller_dim", label: "Tiller - Dimension (L x W)" },
                    { key: "tiller_weight", label: "Tiller - Weight" },
                    { key: "tiller_blade_dim", label: "Tiller - Blade dimension (L x W x T)" },
                    { key: "tiller_hardness", label: "Tiller - Hardness" },
                    { key: "tiller_num_blade", label: "Tiller - No. of Blade" },
                    { key: "chainsaw_dim", label: "Chain Saw - Dimension (L x W x T)" },
                    { key: "chainsaw_num_teeth", label: "Chain Saw - No. of Teeth" },
                    { key: "chainsaw_dry_weight", label: "Chain Saw - Dry Weight" },
                    { key: "chainsaw_weight_with_oil", label: "Chain Saw - Weight with oil" },
                    { key: "chainsaw_oil_capacity", label: "Chain Saw - Lubricant oil Capacity" },
                    { key: "paddy_dim", label: "Paddy Harvester - Dimension (L x W x H)" },
                    { key: "paddy_blade_dim", label: "Paddy Harvester - Blade dimension (D x T)" },
                    { key: "paddy_weight", label: "Paddy Harvester - Weight" },
                    { key: "paddy_hardness", label: "Paddy Harvester - Hardness" },
                    { key: "paddy_num_teeth", label: "Paddy Harvester - No. of Teeth" },
                    { key: "trimmer_dim", label: "Hedge Trimmer - Dimension (L x W x T)" },
                    { key: "trimmer_cutting_length", label: "Hedge Trimmer - Cutting Length" },
                    { key: "trimmer_hardness", label: "Hedge Trimmer - Hardness" },
                    { key: "trimmer_weight", label: "Hedge Trimmer - Weight" },
                    { key: "pump_dim", label: "Pump Unit - Dimension (L x W x H)" },
                    { key: "pump_weight", label: "Pump Unit - Weight" },
                    { key: "pump_discharge_dia", label: "Pump Unit - Discharge port diameter" },
                    { key: "pump_suction_dia", label: "Pump Unit - Suction Port diameter" },
                    { key: "pump_impeller_type", label: "Pump Unit - Impeller Type" },
                    { key: "pump_impeller_weight", label: "Pump Unit - Impeller weight" },
                    { key: "pump_impeller_dim", label: "Pump Unit - Impeller dimension (D x L x T)" },
                    { key: "pump_num_vanes", label: "Pump Unit - No of impeller vanes" }
                ]
            }
        ]
    },
    {
        schema_key: "BRUSH_CUTTER_FIELD",
        label: "Brush Cutter Performance Test (Data Sheet 03)",
        formula_set: "BRUSH_CUTTER_FIELD",
        sections: [
            {
                key: "device_info",
                type: "fields",
                label: "Cutting Device / Attachment",
                fields: [
                    { key: "cutting_device", label: "Cutting Device / Attachment Name" }
                ]
            },
            {
                key: "runs_table",
                type: "table",
                label: "Performance Test Runs (Test 1, Test 2, Test 3)",
                rows: [
                    { key: "test_date", label: "Date" },
                    { key: "location", label: "Location" },
                    { key: "variety_or_method", label: "Variety / Planting Method (if applicable)" },
                    { key: "type_of_grass_or_crop", label: "Type of Grass / Crop / Plant" },
                    { key: "row_spacing_mm", label: "Row Spacing (mm) (if applicable)" },
                    { key: "soil_type", label: "Type of Soil (if applicable)" },
                    { key: "soil_moisture_percent", label: "Average Soil Moisture (%) (if applicable)" },
                    { key: "max_cutting_height_mm", label: "Maximum Cutting Height / Length of Crop (mm)" },
                    { key: "stem_dia_min", label: "Stem Diameter / Angle Min" },
                    { key: "stem_dia_max", label: "Stem Diameter / Angle Max" },
                    { key: "stem_dia_avg", label: "Stem Diameter / Angle Average" },
                    { key: "grass_height_min", label: "Height of Grass / Weed Height Min (mm)" },
                    { key: "grass_height_max", label: "Height of Grass / Weed Height Max (mm)" },
                    { key: "grass_height_avg", label: "Height of Grass / Weed Height Average (mm)" },
                    { key: "weed_density_min", label: "Weed / Paddy Density Min (per/m²)" },
                    { key: "weed_density_max", label: "Weed / Paddy Density Max (per/m²)" },
                    { key: "weed_density_avg", label: "Weed / Paddy Density Average (per/m²)" },
                    { key: "cutting_height_mm", label: "Cutting Height (mm)" },
                    { key: "start_time", label: "Start Time" },
                    { key: "end_time", label: "End Time" },
                    { key: "used_fuel_ml", label: "Used Fuel (ml)" },
                    { key: "total_time_min", label: "Total Time (min)" },
                    { key: "total_area_m2", label: "Total Area (m²)" },
                    { key: "working_speed_ms", label: "Working Speed (m/s) / Cuts per hour" },
                    { key: "fuel_consumption_l_hr", label: "Fuel Consumption (l/hr)" },
                    { key: "field_capacity_ha_hr", label: "Field Capacity (ha/hr or m²/hr)" },
                    { key: "field_capacity_acres_day", label: "Field Capacity (acres/day or m²/day)" },
                    { key: "sound_level_db", label: "Sound Level at Operator's Ear Level (dB)" }
                ],
                columns: [
                    { key: "run1", label: "Test 01" },
                    { key: "run2", label: "Test 02" },
                    { key: "run3", label: "Test 03" }
                ]
            }
        ]
    },
    {
        schema_key: "BRUSH_CUTTER_PUMP_FIELD",
        label: "Brush Cutter - Pump Unit Performance Test",
        formula_set: "BRUSH_CUTTER_PUMP_FIELD",
        sections: [
            {
                key: "pump_conditions",
                type: "fields",
                label: "Test Condition - Pump Unit",
                fields: [
                    { key: "location", label: "Location" },
                    { key: "suction_head_m", label: "Suction Head (m)" },
                    { key: "engine_rpm", label: "Engine rpm" },
                    { key: "fuel_consumption_l_hr", label: "Fuel Consumption (l/hr)" },
                    { key: "test_date", label: "Date" },
                    { key: "max_total_head_m", label: "Maximum total head (m)" },
                    { key: "max_flow_rate_note", label: "Maximum Flow Rate & Working Pressure" }
                ]
            },
            {
                key: "flow_rate_table",
                type: "table",
                label: "Total Head vs Flow Rate",
                rows: [
                    { key: "head_3", label: "Total Head 3" },
                    { key: "head_4", label: "Total Head 4" },
                    { key: "head_6", label: "Total Head 6" },
                    { key: "head_8", label: "Total Head 8" },
                    { key: "head_10", label: "Total Head 10" }
                ],
                columns: [
                    { key: "l_min", label: "l/min" },
                    { key: "gal_hr", label: "gal/hr" },
                    { key: "m3_hr", label: "m³/hr" }
                ]
            }
        ]
    }
];
