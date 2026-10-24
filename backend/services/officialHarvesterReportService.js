import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { createReport } from "../models/report.js";
import { listTestRecords } from "../models/testRecord.js";
import { getMachineryById } from "../models/machinery.js";
import { getSchemasByIds } from "../models/testFormSchema.js";
import { REPORTS_DIR, formatValue } from "./reportService.js";

// Reproduces the official FMRC "REPORT ON TESTING & EVALUATION OF COMBINE HARVESTER"
// template page-for-page:
//  - Page 1: Double-bordered cover page with document ref number, title, model, and FMRC footer
//  - Page 2: Boxed Remarks (1-8)
//  - Page 3: Title, Background, Manufacturer's Details & Country of Origin, Importer's Contact Details
//  - Pages 4-7: Test Method and Procedure + Verifications of Manufacturer's Specifications (from HARVESTER_LAB)
//  - Pages 8+: Performance Test (Test 01, Test 02, ... for each selected field test replicate:
//    Page A = Test/Crop/Field/Machine Operation Conditions, Page B = Performance Results)
//  - Endurance Test note + Signature page.

const PAGE_WIDTH = 595.28; // A4 pt
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FONT = "Times-Roman";
const FONT_BOLD = "Times-Bold";

const parseFormData = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch { return {}; }
};

const toNum = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const avgNums = (arr) => {
    const valid = arr.map(toNum).filter((v) => v !== null);
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
};

const fmtNum = (v, decimals = 2) => {
    const n = toNum(v);
    return n === null ? "......" : n.toFixed(decimals);
};

const blank = (v) => (v === null || v === undefined || v === "" ? "......" : String(v));

// Converts cm reading to mm if value looks like cm, otherwise prints as-is.
const cmToMmText = (v, thresholdCm = 250) => {
    const n = toNum(v);
    if (n === null) return "......";
    const mm = n > 0 && n < thresholdCm ? Math.round(n * 10) : Math.round(n);
    return `${mm} mm`;
};

const formatTestDate = (test, formData) => {
    if (formData["site_details.test_date"]) return String(formData["site_details.test_date"]);
    const rawDate = test.scheduled_date || test.updated_at || test.created_at;
    if (!rawDate) return "......";
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return String(rawDate);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

// Extracts { variety, method } from test_name like
// "Combine Harvester Field Test - Samba - Broadcasting (Test 1)"
const parseVarietyAndMethod = (testName = "", groupKey = "") => {
    const m = /Field Test\s*-\s*([^-]+?)\s*-\s*([^(]+?)(?:\s*\(Test\s*\d+\))?$/i.exec(testName);
    if (m) {
        return { variety: m[1].trim(), method: m[2].trim() };
    }
    if (groupKey.startsWith("HARVESTER_")) {
        const parts = groupKey.replace(/^HARVESTER_/, "").split("_");
        const variety = parts[0] ? parts[0].charAt(0) + parts[0].slice(1).toLowerCase() : "......";
        const method = parts.slice(1).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") || "......";
        return { variety, method };
    }
    return { variety: "......", method: "......" };
};

const cellTextHeight = (doc, text, width, fontSize, font) => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(text || "", { width: width - 10 });
};

const drawRow = (doc, x, y, colWidths, cells, opts) => {
    const { fontSize, cellPadding, font, boldFont, minHeight = 0, forceHeight } = opts;
    let height = forceHeight || minHeight;
    if (!forceHeight) {
        cells.forEach((cell, i) => {
            const h = cellTextHeight(doc, cell.text, colWidths[i], cell.fontSize || fontSize, cell.bold ? boldFont : font) + cellPadding * 2;
            height = Math.max(height, h);
        });
    }
    let cx = x;
    cells.forEach((cell, i) => {
        doc.rect(cx, y, colWidths[i], height).stroke("#000000");
        doc.font(cell.bold ? boldFont : font).fontSize(cell.fontSize || fontSize).fillColor("#000000");
        doc.text(cell.text || "", cx + cellPadding, y + cellPadding, {
            width: colWidths[i] - cellPadding * 2,
            align: cell.align || "left"
        });
        cx += colWidths[i];
    });
    return height;
};

// Supports:
//  - type: 'header' (table header row, redrawn on page breaks)
//  - type: 'full_header' (single cell spanning entire table width, centered bold)
//  - type: 'group' (single cell spanning entire table width, left bold)
//  - type: 'split_2' (left cell spans 2 sub-rows, middle & right columns have top/bottom sub-rows)
//  - type: 'data' (standard row with cells matching colWidths)
const drawTable = (doc, { x = MARGIN, colWidths, rows, fontSize = 10, cellPadding = 5 }) => {
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const bottom = doc.page.height - MARGIN;
    const headerRow = rows.find((r) => r.type === "header");
    const opts = { fontSize, cellPadding, font: FONT, boldFont: FONT_BOLD };

    let y = doc.y;
    rows.forEach((row) => {
        if (row.type === "group" || row.type === "full_header") {
            const h = cellTextHeight(doc, row.label, totalWidth, fontSize, FONT_BOLD) + cellPadding * 2;
            if (y + h > bottom) {
                doc.addPage();
                y = doc.y;
                if (headerRow) y += drawRow(doc, x, y, colWidths, headerRow.cells, opts);
            }
            doc.rect(x, y, totalWidth, h).stroke("#000000");
            doc.font(FONT_BOLD).fontSize(fontSize).fillColor("#000000").text(
                row.label,
                x + cellPadding,
                y + cellPadding,
                { width: totalWidth - cellPadding * 2, align: row.type === "full_header" ? "center" : "left" }
            );
            y += h;
            return;
        }

        if (row.type === "split_2") {
            const leftW = row.leftWidth || 165;
            const midW = colWidths[0] - leftW;
            const rightW = colWidths[1];
            const subH1 = Math.max(
                cellTextHeight(doc, row.topMid, midW, fontSize, FONT) + cellPadding * 2,
                cellTextHeight(doc, row.topRight, rightW, fontSize, FONT) + cellPadding * 2
            );
            const subH2 = Math.max(
                cellTextHeight(doc, row.bottomMid, midW, fontSize, FONT) + cellPadding * 2,
                cellTextHeight(doc, row.bottomRight, rightW, fontSize, FONT) + cellPadding * 2
            );
            const totalH = subH1 + subH2;
            if (y + totalH > bottom) {
                doc.addPage();
                y = doc.y;
            }
            // Left spanning cell
            doc.rect(x, y, leftW, totalH).stroke("#000000");
            doc.font(FONT).fontSize(fontSize).fillColor("#000000")
                .text(row.leftLabel, x + cellPadding, y + (totalH - fontSize) / 2, { width: leftW - cellPadding * 2 });
            // Top sub-row (middle + right)
            doc.rect(x + leftW, y, midW, subH1).stroke("#000000");
            doc.text(row.topMid, x + leftW + cellPadding, y + cellPadding, { width: midW - cellPadding * 2 });
            doc.rect(x + leftW + midW, y, rightW, subH1).stroke("#000000");
            doc.text(row.topRight, x + leftW + midW + cellPadding, y + cellPadding, { width: rightW - cellPadding * 2 });
            // Bottom sub-row (middle + right)
            doc.rect(x + leftW, y + subH1, midW, subH2).stroke("#000000");
            doc.text(row.bottomMid, x + leftW + cellPadding, y + subH1 + cellPadding, { width: midW - cellPadding * 2 });
            doc.rect(x + leftW + midW, y + subH1, rightW, subH2).stroke("#000000");
            doc.text(row.bottomRight, x + leftW + midW + cellPadding, y + subH1 + cellPadding, { width: rightW - cellPadding * 2 });
            y += totalH;
            return;
        }

        const estHeight = row.forceHeight || Math.max(
            ...row.cells.map((cell, i) => cellTextHeight(doc, cell.text, colWidths[i], cell.fontSize || fontSize, cell.bold ? FONT_BOLD : FONT) + cellPadding * 2)
        );
        if (y + estHeight > bottom) {
            doc.addPage();
            y = doc.y;
            if (headerRow && row !== headerRow) y += drawRow(doc, x, y, colWidths, headerRow.cells, opts);
        }
        const h = drawRow(doc, x, y, colWidths, row.cells, { ...opts, forceHeight: row.forceHeight });
        y += h;
    });

    doc.y = y + 10;
    doc.x = MARGIN;
};

const findGroupTest = (allTests, groupKey) => allTests.find((t) => t.group_key === groupKey && t.include_in_final_report);

export const generateOfficialHarvesterReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const groupKeys = [...new Set(allTests.map((t) => t.group_key).filter(Boolean))];
    const missingGroups = groupKeys.filter((g) => !findGroupTest(allTests, g));
    if (missingGroups.length > 0) {
        throw new Error(
            `No test is marked "include in final report" for: ${missingGroups.join(", ")}. ` +
            `Please select one replicate per group before generating the report.`
        );
    }

    const labTest = allTests.find((t) => schemaKeyOf(t) === "HARVESTER_LAB");
    if (!labTest) {
        throw new Error("Missing required Combine Harvester Lab Test for the final report.");
    }
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");

    const labData = parseFormData(labTest.form_data);
    const enduranceData = enduranceTest ? parseFormData(enduranceTest.form_data) : {};

    const selectedFieldTests = groupKeys
        .map((g) => findGroupTest(allTests, g))
        .filter(Boolean);

    const fileName = `FMRC-Official-Harvester-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/CH/01/${new Date().getFullYear()}`;

    const rightAlignedX = (text, font, size, rightEdge) => {
        doc.font(font).fontSize(size);
        return rightEdge - doc.widthOfString(text);
    };

    let printedPageNum = 1; // Page 1 is cover, first added page is Page 2
    const drawHeaderFooter = () => {
        printedPageNum += 1;
        const rightEdge = PAGE_WIDTH - MARGIN;
        const pageNumText = String(printedPageNum);
        doc.font(FONT).fontSize(10).fillColor("#000000")
            .text(pageNumText, (PAGE_WIDTH - doc.widthOfString(pageNumText)) / 2, doc.page.height - 35, { lineBreak: false });
        doc.font(FONT_BOLD).fontSize(9)
            .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 9, rightEdge), doc.page.height - 35, { lineBreak: false });
        doc.x = MARGIN;
        doc.y = MARGIN;
    };
    doc.on("pageAdded", drawHeaderFooter);

    // ---- Page 1: Cover Page (double border frame matching FMRC/CH/01/2023) -------------------
    doc.rect(30, 30, PAGE_WIDTH - 60, doc.page.height - 60).lineWidth(2).stroke("#000000");
    doc.rect(35, 35, PAGE_WIDTH - 70, doc.page.height - 70).lineWidth(0.75).stroke("#000000");
    doc.lineWidth(1);

    doc.font(FONT_BOLD).fontSize(12)
        .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 12, PAGE_WIDTH - 55), 85, { lineBreak: false });

    doc.y = 175;
    doc.font(FONT_BOLD).fontSize(17).text("REPORT ON TESTING & EVALUATION OF", MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });
    doc.moveDown(0.3);
    doc.font(FONT_BOLD).fontSize(17).text("COMBINE HARVESTER", MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });
    doc.moveDown(0.3);
    doc.font(FONT_BOLD).fontSize(16).text(`MODEL ${formatValue(machine.model).toUpperCase()}`, MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });

    doc.y = doc.page.height - 190;
    doc.font(FONT_BOLD).fontSize(11).text("Farm Mechanization Research Centre", { align: "center" });
    doc.text("Department of Agriculture", { align: "center" });
    doc.text("Mahailluppallama", { align: "center" });
    doc.text("Sri Lanka", { align: "center" });
    doc.text("Tel   : +94 25 2 249 222", { align: "center" });
    doc.text("Fax   : +94 25 2 249 222", { align: "center" });

    // ---- Page 2: Remarks (boxed) -------------------------------------------------------------
    doc.addPage();
    const remarks = [
        "This report shall not be duplicated in full or part without the approval of FMRC.",
        "This report is null & void without the authorized signatures and stamps of FMRC officials.",
        "Any amendment to this document is not allowed.",
        "Any discrepancy on this report shall be reported to the FMRC within 15 days after the date of receiving.",
        "Test results in this report is based on the sample machine provided by the supplier.",
        "Report is valid only for the tested model.",
        "Report is valid for the period of 10 years from the date of issue.",
        "FMRC have the right to recall the test report if found any inaccurate information provided by the supplier."
    ];
    const boxX = MARGIN, boxY = MARGIN + 15, boxWidth = CONTENT_WIDTH;
    doc.font(FONT).fontSize(11);
    let remarksHeight = 60;
    const remarkLines = remarks.map((r, i) => {
        const text = `${i + 1}.  ${r}`;
        const h = doc.heightOfString(text, { width: boxWidth - 40 }) + 18;
        remarksHeight += h;
        return { text, h };
    });
    doc.rect(boxX, boxY, boxWidth, remarksHeight).stroke("#000000");
    doc.font(FONT_BOLD).fontSize(12).text("Remarks", boxX, boxY + 22, { width: boxWidth, align: "center" });
    let ry = boxY + 55;
    doc.font(FONT).fontSize(11);
    remarkLines.forEach(({ text, h }) => {
        doc.text(text, boxX + 20, ry, { width: boxWidth - 40 });
        ry += h;
    });

    // ---- Page 3: Title, Background, Manufacturer, Importer -----------------------------------
    doc.addPage();
    const heading = (text) => {
        doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true });
        doc.moveDown(0.5);
    };

    heading("TITLE");
    doc.font(FONT).fontSize(11).text(`Test report on ${formatValue(machine.model)} combine harvester.`, { indent: 30 });
    doc.moveDown(1);

    heading("BACKGROUND");
    const background = machine.background_note ||
        `${machine.importer_name || "The supplier"} markets and distributes the model ${formatValue(machine.model)} combine harvester ` +
        `(${formatValue(machine.machine_name)}), which is handed over to Farm Mechanization Research Centre, Department of Agriculture, ` +
        `Mahailluppallama has been tested to check its suitability for agricultural purposes in Sri Lanka.`;
    doc.font(FONT).fontSize(11).text(background, { indent: 30, lineGap: 4 });
    doc.moveDown(1);

    heading("MANUFACTURER'S DETAILS & COUNTRY OF ORIGIN");
    doc.font(FONT_BOLD).fontSize(11).text(machine.manufacturer_country || "Not provided by the importer", { indent: 0, lineGap: 4 });
    doc.font(FONT);
    doc.moveDown(1);

    heading("IMPORTER'S CONTACT DETAILS");
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(machine.importer_name || "......................................", { lineGap: 4 });
    doc.text(machine.importer_address || "......................................", { lineGap: 4 });
    doc.text(`Tel   : ${machine.importer_tel || "......................"}`, { lineGap: 4 });
    doc.text(`Fax   : ${machine.importer_fax || "......................"}`, { lineGap: 4 });
    doc.text(`Web   : ${machine.importer_web || "......................"}`, { lineGap: 4 });
    doc.font(FONT);

    // ---- Page 4+: Test Method and Procedure + Verifications of Manufacturer's Specifications -
    doc.addPage();
    heading("TEST METHOD AND PROCEDURE");
    doc.font(FONT).fontSize(11).text(
        "Given specifications were checked and confirmed with facilities available. Test conditions, field conditions and machine conditions were " +
        "recorded before and after operations. Field performance and field capacity were evaluated. Endurance test was carried out for more than " +
        "200 working hours in different field conditions and crop conditions to observe its durability.",
        { indent: 25, lineGap: 4 }
    );
    doc.moveDown(1);

    heading("VERIFICATIONS OF MANUFACTURER'S SPECIFICATIONS");
    doc.moveDown(0.3);

    const lMm = labData["dimensions.length_mm"];
    const wMm = labData["dimensions.width_mm"];
    const hMm = labData["dimensions.height_mm"];
    const combinedDims = [lMm, wMm, hMm].some(Boolean)
        ? `${blank(lMm)} x ${blank(wMm)} x ${blank(hMm)}`
        : "......";

    const specHeaderRow = {
        type: "header",
        cells: [
            { text: "Parameter", bold: true, align: "center" },
            { text: "Manufacture", bold: true, align: "center" },
            { text: "Verification", bold: true, align: "center" }
        ]
    };
    const specRows = [
        specHeaderRow,
        { type: "data", cells: [{ text: "Model", bold: true }, { text: formatValue(machine.model) }, { text: formatValue(machine.model) }] },
        { type: "data", cells: [{ text: "Structure Form", bold: true }, { text: "Self-propelled Whole-feed Grain Combine harvester" }, { text: "Self-propelled Whole-feed Grain Combine harvester" }] },
        { type: "group", label: "Dimension" },
        { type: "data", cells: [{ text: "L x W x H ( In Work ) (mm)" }, { text: combinedDims }, { text: combinedDims }] },
        { type: "data", cells: [{ text: "Machine Weight", bold: true }, { text: "" }, { text: labData["dimensions.machine_weight_kg"] ? `${labData["dimensions.machine_weight_kg"]} kg` : "......" }] }
    ];

    const labSchema = schemasById[labTest.schema_id];
    if (labSchema?.sections) {
        labSchema.sections
            .filter((s) => s.key !== "dimensions")
            .forEach((section) => {
                specRows.push({ type: "group", label: section.label });
                section.fields.forEach((field) => {
                    specRows.push({
                        type: "data",
                        cells: [
                            { text: field.label },
                            { text: "" },
                            { text: formatValue(labData[`${section.key}.${field.key}`]) }
                        ]
                    });
                });
            });
    }
    drawTable(doc, { x: MARGIN, colWidths: [215, 140, 140], rows: specRows, fontSize: 10 });

    // ---- Performance Tests (Test 01, Test 02, ... for each selected field test) ---------------
    selectedFieldTests.forEach((test, idx) => {
        const fd = parseFormData(test.form_data);
        const testLabel = `Test ${String(idx + 1).padStart(2, "0")}`;
        const { variety, method } = parseVarietyAndMethod(test.test_name, test.group_key);

        // Page A: Test Conditions, Crop Conditions, Field Conditions, Machine Operation Conditions
        doc.addPage();
        if (idx === 0) {
            heading("PERFORMANCE TEST");
        }
        doc.font(FONT_BOLD).fontSize(11).text(testLabel, { underline: true });
        doc.moveDown(0.4);

        const harvestRpm = fd["working_condition.engine_rpm"] || fd["fill_grain_tank_time.engine_rpm"];
        const unloadRpm = fd["unloading_time.engine_rpm"];
        const opSpeed = fd["traveling_speed_single.with_operation.speed_m_s"] || fd["working_efficiency.traveling_speed_m_s"];

        const conditionRows = [
            { type: "group", label: "Test Conditions" },
            { type: "data", cells: [{ text: "Date" }, { text: formatTestDate(test, fd) }] },
            { type: "data", cells: [{ text: "Location" }, { text: blank(fd["site_details.location"]) }] },
            { type: "group", label: "Crop Conditions" },
            { type: "data", cells: [{ text: "Planting Method" }, { text: method }] },
            { type: "data", cells: [{ text: "Plant Variety" }, { text: variety }] },
            { type: "data", cells: [{ text: "Crop Density" }, { text: `${blank(fd["paddy_density.average"])} bush/m²` }] },
            { type: "data", cells: [{ text: "No of Tillers per Bush" }, { text: blank(fd["tillers_per_bush.average"]) }] },
            { type: "data", cells: [{ text: "Overall Height of Crop (Including panicle)" }, { text: cmToMmText(fd["crop_length.average"], 250) }] },
            { type: "data", cells: [{ text: "Standing Angle of Crop with Ground" }, { text: `${blank(fd["standing_angle.average"])}°` }] },
            { type: "data", cells: [{ text: "Moisture Content of Paddy" }, { text: `${blank(fd["paddy_moisture.average"])} %` }] },
            { type: "data", cells: [{ text: "Force of Pull the Pod" }, { text: `${blank(fd["force_pull_pod.average"])} N` }] },
            { type: "group", label: "Field Conditions" },
            { type: "data", cells: [{ text: "Type of Soil" }, { text: blank(fd["site_details.soil_type"]) }] },
            { type: "data", cells: [{ text: "Soil Moisture" }, { text: `${blank(fd["soil_meter_reading.soil_meter_reading.average"])} %` }] },
            { type: "data", cells: [{ text: "Shear Strength" }, { text: `${blank(fd["soil_shear_strength.gauge_reading_kg_m.average"])} kg.m` }] },
            { type: "group", label: "Machine Operation Conditions" },
            { type: "data", cells: [{ text: "Operating Gear" }, { text: blank(fd["working_condition.operating_gear"]) }] },
            {
                type: "split_2",
                leftWidth: 165,
                leftLabel: "Engine rpm",
                topMid: "Harvesting",
                topRight: blank(harvestRpm),
                bottomMid: "Unloading",
                bottomRight: blank(unloadRpm)
            },
            { type: "data", cells: [{ text: "Operating Speed" }, { text: `${fmtNum(opSpeed)} m/s` }] },
            { type: "data", cells: [{ text: "Cutting Width" }, { text: cmToMmText(fd["cutting_width.average"], 500) }] },
            { type: "data", cells: [{ text: "Cutting Height" }, { text: cmToMmText(fd["cutting_height.average"], 150) }] },
            { type: "data", cells: [{ text: "Noise Level of Machine at Operator's Ear Level" }, { text: `${blank(fd["threshing_sound.sound_db"])} dB` }] }
        ];
        drawTable(doc, { x: MARGIN, colWidths: [295, 200], rows: conditionRows, fontSize: 10, cellPadding: 5 });

        // Page B: Performance Results
        doc.addPage();

        const tankCapKg = toNum(fd["tank_capacity.average"]);
        const fillTimeMin = toNum(fd["fill_grain_tank_time.average"]);
        const threshingCap = tankCapKg !== null && fillTimeMin && fillTimeMin > 0
            ? (tankCapKg / fillTimeMin).toFixed(2)
            : "......";

        const sepLossAvg = avgNums([
            fd["loss_analysis.sample1.separating_loss_percent"],
            fd["loss_analysis.sample2.separating_loss_percent"],
            fd["loss_analysis.sample3.separating_loss_percent"]
        ]);
        const headLossAvg = avgNums([
            fd["loss_analysis.sample1.header_loss_percent"],
            fd["loss_analysis.sample2.header_loss_percent"],
            fd["loss_analysis.sample3.header_loss_percent"]
        ]);

        const sampleRatioPct = (numKey) => {
            const pcts = ["sample1", "sample2", "sample3"].map((s) => {
                const w = toNum(fd[`grain_quality.${s}.weight_of_sample_kg`]);
                const part = toNum(fd[`grain_quality.${s}.${numKey}`]);
                if (w && w > 0 && part !== null) return (part / w) * 100;
                return null;
            }).filter((v) => v !== null);
            if (pcts.length === 0) return "......";
            return (pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(2);
        };

        const perfRows = [
            { type: "full_header", label: "Performance Results" },
            { type: "group", label: "Fuel Consumption and Capacities" },
            {
                type: "data",
                cells: [
                    { text: "Fuel Consumption" },
                    { text: `${fmtNum(fd["working_efficiency.fuel_consumption_l_hr"])} l/hr\n${fmtNum(fd["working_efficiency.fuel_consumption_l_ha"])} l/ha` }
                ]
            },
            { type: "data", cells: [{ text: "Grain Threshing Capacity" }, { text: `${threshingCap} kg/min` }] },
            { type: "data", cells: [{ text: "Time for Fill Grain Tank" }, { text: `${blank(fd["fill_grain_tank_time.average"])} min` }] },
            { type: "data", cells: [{ text: "Time Required to Unload Full Grain Tank" }, { text: `${blank(fd["unloading_time.average"])} min` }] },
            { type: "data", cells: [{ text: "Tank Capacity as Grain Weight" }, { text: `${blank(fd["tank_capacity.average"])} kg` }] },
            {
                type: "data",
                cells: [
                    { text: "Field Capacity" },
                    { text: `${fmtNum(fd["working_efficiency.field_capacity_ha_hr"], 3)} ha/hr\n${fmtNum(fd["working_efficiency.field_capacity_acre_day"], 2)} Acre/day` }
                ]
            },
            { type: "group", label: "Harvesting Losses" },
            { type: "data", cells: [{ text: "Separating Losses" }, { text: `${sepLossAvg === null ? "......" : sepLossAvg.toFixed(2)} %` }] },
            { type: "data", cells: [{ text: "Header Losses" }, { text: `${headLossAvg === null ? "......" : headLossAvg.toFixed(3)} %` }] },
            { type: "group", label: "Quality of Harvested Grains" },
            { type: "data", cells: [{ text: "Quality Grain Weight" }, { text: `${sampleRatioPct("quality_grain_weight_kg")} %` }] },
            { type: "data", cells: [{ text: "Unfill Grain Weight" }, { text: `${sampleRatioPct("unfill_grain_weight_kg")} %` }] },
            { type: "data", cells: [{ text: "Damage Grain Weight" }, { text: `${sampleRatioPct("damage_grain_weight_kg")} %` }] },
            { type: "data", cells: [{ text: "Impurity Weight" }, { text: `${sampleRatioPct("other_kg")} %` }] }
        ];
        drawTable(doc, { x: MARGIN, colWidths: [295, 200], rows: perfRows, fontSize: 10, cellPadding: 6 });

        if (idx === selectedFieldTests.length - 1) {
            doc.moveDown(0.5);
            doc.font(FONT_BOLD).fontSize(11).text(
                "•   Performance may be change according to the operator, field condition, climate, etc.",
                { indent: 20 }
            );
            doc.moveDown(1.2);
            heading("ENDURANCE TEST");
            const enduranceHours = enduranceData["endurance.hours_operated"] || "300";
            const enduranceText = enduranceData["endurance.conclusion_note"] ||
                `The endurance test has been carried out for more than ${enduranceHours} hours in different fields. ` +
                `${enduranceData["endurance.breakdowns_reported"] || "Major breakdown or performance abnormality were not encountered during the period of endurance test."}`;
            doc.font(FONT).fontSize(11).text(enduranceText, { indent: 30, lineGap: 4 });
        }
    });

    // ---- Final Page: Signatures (matching Page 16 of FMRC/CH/01/2023) -------------------------
    doc.addPage();
    const issueDate = new Date().toLocaleDateString("en-GB").replace(/\//g, ".");
    const drawSigBlock = (leftTitle1, leftTitle2, personName, roleLabel) => {
        const startY = doc.y;
        doc.font(FONT_BOLD).fontSize(11).text(leftTitle1, MARGIN, startY);
        if (leftTitle2) {
            doc.text(leftTitle2, MARGIN, startY + 18);
        }
        const colonY = leftTitle2 ? startY + 18 : startY;
        const rightX = MARGIN + 195;
        doc.font(FONT_BOLD).fontSize(11).text(": ................................................", rightX, colonY);
        doc.text(formatValue(personName), rightX + 8, colonY + 18);
        doc.text(roleLabel, rightX + 8, colonY + 36);
        doc.text("FMRC", rightX + 8, colonY + 54);
        doc.text(`Date: ${issueDate}`, rightX + 8, colonY + 72);
        doc.y = colonY + 150;
    };

    doc.y = MARGIN + 30;
    drawSigBlock("Test Conducted & Report", "Prepared by", labTest.technical_assistant_name, "Technical Assistant");
    drawSigBlock("Test Report", "Recommended by", labTest.mechanical_engineer_name, "Mechanical Engineer");
    drawSigBlock("Test Report Approved by", null, labTest.chief_engineer_name, "Chief Engineer (Mechanical Research)");

    doc.end();

    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    const report = await createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Combine Harvester Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });

    return report;
};
