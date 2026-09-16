import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { createReport } from "../models/report.js";
import { listTestRecords } from "../models/testRecord.js";
import { getMachineryById } from "../models/machinery.js";
import { getSchemasByIds } from "../models/testFormSchema.js";
import { REPORTS_DIR, formatValue } from "./reportService.js";

// This renderer reproduces the real FMRC "REPORT ON TESTING & EVALUATION OF TRACTOR" Word
// template page-for-page (title page with border frame, boxed remarks, ruled tables
// throughout, Times New Roman-style serif type, per-page header/footer with page numbers) --
// not a generic data dump. Keep any layout change here in sync with the physical template.

const PAGE_WIDTH = 595.28; // A4 pt
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FONT = "Times-Roman";
const FONT_BOLD = "Times-Bold";
const FONT_ITALIC = "Times-Italic";

const parseFormData = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch { return {}; }
};

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const fmtNum = (v, decimals = 2) => {
    const n = toNum(v);
    return n === null ? "......" : n.toFixed(decimals);
};

const blank = (v) => (v === null || v === undefined || v === "" ? "......" : String(v));

// e.g. "HIGHLAND_DISC_PLOUGH" -> "Disc Plough"
const implementLabelFromGroupKey = (groupKey) => {
    const parts = groupKey.split("_").slice(1);
    return parts.map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
};

const minMaxAvgLines = (formData, sectionKey, fieldPrefix, unit) => {
    const vals = [1, 2, 3].map((i) => toNum(formData[`${sectionKey}.${fieldPrefix}_${i}`])).filter((v) => v !== null);
    if (vals.length === 0) return "Min : ......\nMax : ......\nAverage: ......";
    const min = Math.min(...vals), max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return `Min : ${min}${unit}\nMax : ${max}${unit}\nAverage: ${avg.toFixed(2)}${unit}`;
};

const SPEED_GEAR_TIERS = ["L", "M", "H"];
const SPEED_GEAR_DIRECTIONS = [
    ["Forward", "F"],
    ["Reverse", "R"]
];

// ============================================================================================
// Generic ruled-table renderer -- handles page breaks (redrawing a sticky header row on each
// continuation page) and a special "chart" cell for the penetration-resistance line graphs.
// ============================================================================================

const cellTextHeight = (doc, text, width, fontSize, font) => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(text || "", { width: width - 8 });
};

const drawRow = (doc, x, y, colWidths, cells, opts) => {
    const { fontSize, cellPadding, font, boldFont, minHeight = 0, forceHeight } = opts;
    let height = forceHeight || minHeight;
    if (!forceHeight) {
        cells.forEach((cell, i) => {
            if (cell.chart) return;
            const h = cellTextHeight(doc, cell.text, colWidths[i], cell.fontSize || fontSize, cell.bold ? boldFont : font) + cellPadding * 2;
            height = Math.max(height, h);
        });
    }
    let cx = x;
    cells.forEach((cell, i) => {
        doc.rect(cx, y, colWidths[i], height).stroke("#000000");
        if (cell.chart) {
            renderPenetrationChart(doc, cell.chart, cx + 6, y + 6, colWidths[i] - 12, height - 24);
        } else {
            doc.font(cell.bold ? boldFont : font).fontSize(cell.fontSize || fontSize).fillColor("#000000");
            doc.text(cell.text || "", cx + cellPadding, y + cellPadding, {
                width: colWidths[i] - cellPadding * 2,
                align: cell.align || "left"
            });
        }
        cx += colWidths[i];
    });
    return height;
};

// rows: [{ type: 'header'|'group'|'data', cells: [{text,bold,align,chart}] | undefined, label }]
const drawTable = (doc, { x = MARGIN, colWidths, rows, fontSize = 9, cellPadding = 5 }) => {
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const bottom = doc.page.height - MARGIN;
    const headerRow = rows.find((r) => r.type === "header");
    const opts = { fontSize, cellPadding, font: FONT, boldFont: FONT_BOLD };

    let y = doc.y;
    rows.forEach((row) => {
        if (row.type === "group") {
            const h = cellTextHeight(doc, row.label, totalWidth, fontSize, FONT_BOLD) + cellPadding * 2;
            if (y + h > bottom) {
                doc.addPage();
                y = doc.y;
                if (headerRow) y += drawRow(doc, x, y, colWidths, headerRow.cells, opts);
            }
            doc.rect(x, y, totalWidth, h).stroke("#000000");
            doc.font(FONT_BOLD).fontSize(fontSize).text(row.label, x + cellPadding, y + cellPadding, { width: totalWidth - cellPadding * 2 });
            y += h;
            return;
        }

        // Estimate height first (without forcing) to decide on page break.
        const estHeight = row.forceHeight || Math.max(
            ...row.cells.map((cell, i) => cell.chart ? (row.forceHeight || 100) : cellTextHeight(doc, cell.text, colWidths[i], cell.fontSize || fontSize, cell.bold ? FONT_BOLD : FONT) + cellPadding * 2)
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

// Renders a simple Force-vs-Depth line chart (9 points) with pdfkit's own vector primitives --
// no image/canvas dependency.
const renderPenetrationChart = (doc, depthForceValues, x, y, width, height) => {
    const values = depthForceValues.filter((v) => v !== null);
    const maxForce = values.length ? Math.max(...values, 1) : 1;

    doc.rect(x, y, width, height).stroke("#888888");
    doc.fontSize(6).font(FONT).fillColor("#555555");
    doc.text("Force (lb)", x - 2, y - 9);
    doc.text("Depth (inch)", x + width - 45, y + height + 2);

    const points = depthForceValues.map((v, i) => {
        const px = x + (i / (depthForceValues.length - 1)) * width;
        const py = v === null ? null : y + height - (v / maxForce) * height;
        return { px, py };
    });

    doc.strokeColor("#1a6b3c").lineWidth(1.2);
    let started = false;
    points.forEach(({ px, py }) => {
        if (py === null) { started = false; return; }
        if (!started) { doc.moveTo(px, py); started = true; }
        else { doc.lineTo(px, py); }
    });
    doc.stroke();
    doc.lineWidth(1).strokeColor("#000000").fillColor("#000000");
};

// Pulls one implement's ticked (include_in_final_report) test out of `allTests`, for a given
// group_key. Returns null if the group isn't present on this machine at all.
const findGroupTest = (allTests, groupKey) => allTests.find((t) => t.group_key === groupKey && t.include_in_final_report);

// ============================================================================================

// Renders the PDF and writes it to disk, returning just the file name -- no DB write. Split
// out from generateOfficialTractorReport so the download endpoint can re-render a report's PDF
// (e.g. if the file went missing from disk) without touching its existing CE approval status.
export const buildOfficialTractorReportPdf = async (machineId) => {
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
        const describe = (g) => `${g.startsWith("HIGHLAND_") ? "Highland" : "Lowland"} - ${implementLabelFromGroupKey(g)}`;
        throw new Error(
            `No test is marked "include in final report" for: ${missingGroups.map(describe).join(", ")}. ` +
            `Ask a Mechanical Engineer to tick one replicate per implement during review.`
        );
    }

    const labTest = allTests.find((t) => schemaKeyOf(t) === "LAB");
    const speedTest = allTests.find((t) => schemaKeyOf(t) === "SPEED");
    const transportTest = allTests.find((t) => schemaKeyOf(t) === "TRANSPORT");
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const missingSingular = [
        ["Lab Test", labTest], ["Speed Test", speedTest], ["Transport Test", transportTest], ["Endurance Test", enduranceTest]
    ].filter(([, t]) => !t).map(([label]) => label);
    if (missingSingular.length > 0) {
        throw new Error(`Missing required test(s) for the final report: ${missingSingular.join(", ")}.`);
    }

    const labData = parseFormData(labTest.form_data);
    const speedData = parseFormData(speedTest.form_data);
    const transportData = parseFormData(transportTest.form_data);
    const enduranceData = parseFormData(enduranceTest.form_data);

    const lowlandGroups = groupKeys.filter((g) => g.startsWith("LOWLAND_"));
    const highlandGroups = groupKeys.filter((g) => g.startsWith("HIGHLAND_"));
    const lowlandColumns = lowlandGroups.map((g) => {
        const test = findGroupTest(allTests, g);
        return { label: implementLabelFromGroupKey(g), formData: parseFormData(test.form_data) };
    });
    const highlandColumns = highlandGroups.map((g) => {
        const test = findGroupTest(allTests, g);
        return { label: implementLabelFromGroupKey(g), formData: parseFormData(test.form_data) };
    });

    const fileName = `FMRC-Official-Tractor-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/FWT/.../${new Date().getFullYear()}`;

    // ---- Per-page running header (doc ref, top-right) + footer (page number + doc ref) -------
    // Page 1 (the cover) is drawn manually below with its own border frame and no footer.
    const rightAlignedX = (text, font, size, rightEdge) => {
        doc.font(font).fontSize(size);
        return rightEdge - doc.widthOfString(text);
    };
    let printedPageNum = 0;
    const drawHeaderFooter = () => {
        printedPageNum += 1;
        const rightEdge = PAGE_WIDTH - MARGIN;
        doc.font(FONT_BOLD).fontSize(9).fillColor("#000000")
            .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 9, rightEdge), 20, { lineBreak: false });
        const pageNumText = String(printedPageNum).padStart(2, "0");
        doc.font(FONT).fontSize(9)
            .text(pageNumText, (PAGE_WIDTH - doc.widthOfString(pageNumText)) / 2, doc.page.height - 30, { lineBreak: false });
        doc.text(docNumber, rightAlignedX(docNumber, FONT, 9, rightEdge), doc.page.height - 30, { lineBreak: false });
        doc.x = MARGIN;
        doc.y = MARGIN;
    };
    doc.on("pageAdded", drawHeaderFooter);

    // ---- Page 1: Title page (double-line border frame, like the physical template) ----------
    doc.font(FONT_BOLD).fontSize(9).text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 9, PAGE_WIDTH - MARGIN), 20, { lineBreak: false });
    doc.rect(30, 30, PAGE_WIDTH - 60, doc.page.height - 60).lineWidth(2).stroke("#000000");
    doc.rect(35, 35, PAGE_WIDTH - 70, doc.page.height - 70).lineWidth(0.75).stroke("#000000");
    doc.lineWidth(1);

    doc.y = 150;
    doc.font(FONT_BOLD).fontSize(20).text("REPORT ON TESTING & EVALUATION", MARGIN + 10, doc.y, { width: CONTENT_WIDTH - 20, align: "center", underline: true });
    doc.font(FONT_BOLD).fontSize(20).text("OF TRACTOR", MARGIN + 10, doc.y, { width: CONTENT_WIDTH - 20, align: "center", underline: true });
    doc.moveDown(0.8);
    doc.font(FONT_BOLD).fontSize(15).text(`MODEL ${formatValue(machine.model)}`, MARGIN + 10, doc.y, { width: CONTENT_WIDTH - 20, align: "center", underline: true });

    doc.y = doc.page.height - 180;
    doc.font(FONT_BOLD).fontSize(11).text("Farm Mechanization Research Centre", { align: "center" });
    doc.font(FONT).text("Department of Agriculture", { align: "center" });
    doc.text("Mahailluppallama", { align: "center" });
    doc.text("Sri Lanka", { align: "center" });
    doc.text("Tel: +94 25 224 9222", { align: "center" });
    doc.text("Email : fmrc@doa.gov.lk", { align: "center" });

    // ---- Page 2: Remarks (boxed) -------------------------------------------------------------
    doc.addPage();
    doc.font(FONT_BOLD).fontSize(12).text("Remarks", { align: "center", underline: true });
    doc.moveDown(1);
    const remarks = [
        "This report shall not be duplicated in full or part without the approval of FMRC.",
        "This report is null & void without the authorized signatures and stamps of FMRC officials.",
        "Any amendment to this document is not allowed.",
        "Any discrepancy on this report shall be reported to the FMRC within 15 days after the date of receiving.",
        "Test results in this report is based on the sample tractor provided by the supplier.",
        "Report is valid only for the tested model.",
        "Report is valid for the period of 10 years from the date of issue.",
        "FMRC have the right to recall the test report if found any inaccurate information provided by the supplier."
    ];
    const boxX = MARGIN + 10, boxY = doc.y, boxWidth = CONTENT_WIDTH - 20;
    doc.font(FONT).fontSize(11);
    let remarksHeight = 20;
    const remarkLines = remarks.map((r, i) => {
        const text = `${i + 1}.  ${r}`;
        const h = doc.heightOfString(text, { width: boxWidth - 30 }) + 14;
        remarksHeight += h;
        return { text, h };
    });
    doc.rect(boxX, boxY, boxWidth, remarksHeight).stroke("#000000");
    let ry = boxY + 16;
    remarkLines.forEach(({ text, h }) => {
        doc.text(text, boxX + 15, ry, { width: boxWidth - 30 });
        ry += h;
    });
    doc.y = boxY + remarksHeight + 20;

    // ---- Title / Background / Manufacturer / Importer ----------------------------------------
    doc.addPage();
    const heading = (text) => { doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true }); doc.moveDown(0.4); };

    heading("TITLE");
    doc.font(FONT).fontSize(11).text(`Test report on model ${formatValue(machine.model)} four-wheel drive tractor.`, { indent: 20 });
    doc.moveDown(0.8);

    heading("BACKGROUND");
    const background = machine.background_note ||
        `Model ${formatValue(machine.model)} four-wheel drive tractor was handed over to Farm Mechanization Research Centre, ` +
        `Department of Agriculture, Mahailluppallama by the supplier it has been tested to check its suitability for agricultural purposes in Sri Lanka.`;
    doc.text(background, { indent: 20 });
    doc.moveDown(0.8);

    heading("MANUFACTURER'S DETAILS & COUNTRY OF ORIGIN");
    doc.font(FONT_BOLD).text(machine.manufacturer_country || "Not provided by the importer", { indent: 20 });
    doc.font(FONT);
    doc.moveDown(0.8);

    heading("IMPORTER'S CONTACT DETAILS");
    doc.font(FONT_BOLD);
    doc.text(machine.importer_name || "......................................", { indent: 20 });
    doc.text(machine.importer_address || "......................................", { indent: 20 });
    doc.text(`Tel : ${machine.importer_tel || "......................"}`, { indent: 20 });
    doc.text(`Fax : ${machine.importer_fax || "......................"}`, { indent: 20 });
    doc.text(`Web : ${machine.importer_web || "......................"}`, { indent: 20 });
    doc.font(FONT);

    // ---- Test method + Manufacturer Spec Verification ----------------------------------------
    doc.addPage();
    heading("TEST METHOD AND PROCEDURE");
    doc.font(FONT).fontSize(11).text(
        "Test was conducted in accordance with the test code and procedures established by the Regional Network for Agricultural Machinery (RNAM).",
        { indent: 20 }
    );
    doc.moveDown(0.8);

    heading("VERIFICATIONS OF MANUFACTURER'S SPECIFICATIONS");
    doc.moveDown(0.3);

    const specHeaderRow = { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Manufacturer", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] };
    const specRows = [specHeaderRow];
    specRows.push({ type: "data", cells: [{ text: "Model", bold: true }, { text: "" }, { text: formatValue(machine.model) }] });
    schemasById[labTest.schema_id].sections
        .filter((s) => s.key !== "actuating_forces")
        .forEach((section) => {
            specRows.push({ type: "group", label: section.label });
            section.fields.forEach((field) => {
                specRows.push({ type: "data", cells: [{ text: field.label }, { text: "" }, { text: formatValue(labData[`${section.key}.${field.key}`]) }] });
            });
        });
    drawTable(doc, { x: MARGIN, colWidths: [235, 130, 130], rows: specRows, fontSize: 9 });

    // ---- Performance Test: Lowland Operation --------------------------------------------------
    doc.addPage();
    heading("PERFORMANCE TEST");
    doc.font(FONT_BOLD).fontSize(11).text("01. Lowland Operation");
    doc.moveDown(0.4);

    const opColWidth = (CONTENT_WIDTH - 110) / Math.max(lowlandColumns.length, 1);
    const lowlandColWidths = [110, ...lowlandColumns.map(() => opColWidth)];
    const lowlandRows = [
        { type: "header", cells: [{ text: "Implement", bold: true }, ...lowlandColumns.map((c) => ({ text: c.label, bold: true, align: "center" }))] },
        { type: "data", cells: [{ text: "Date", bold: true }, ...lowlandColumns.map((c) => ({ text: blank(c.formData["site_soil.test_date"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Place", bold: true }, ...lowlandColumns.map((c) => ({ text: blank(c.formData["site_soil.location"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Type of Soil", bold: true }, ...lowlandColumns.map((c) => ({ text: blank(c.formData["site_soil.soil_type"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Last Crop", bold: true }, ...lowlandColumns.map((c) => ({ text: blank(c.formData["site_soil.last_crop"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Weed Density (/m²)", bold: true }, ...lowlandColumns.map((c) => ({ text: minMaxAvgLines(c.formData, "site_soil", "weed_density", ""), align: "center" }))] },
        { type: "data", cells: [{ text: "Weed Height (mm)", bold: true }, ...lowlandColumns.map((c) => ({ text: minMaxAvgLines(c.formData, "site_soil", "weed_height", " mm"), align: "center" }))] },
        { type: "data", cells: [{ text: "Soil Moisture", bold: true }, ...lowlandColumns.map((c) => ({ text: `${blank(c.formData["site_soil.soil_moisture_percent"])} % Saturated`, align: "center" }))] },
        {
            type: "data", forceHeight: 110,
            cells: [{ text: "Penetration Resistance\n(Force vs. Depth)", bold: true }, ...lowlandColumns.map((c) => ({
                chart: Array.from({ length: 9 }, (_, d) => toNum(c.formData[`penetration_resistance.average.depth_${d + 1}`]))
            }))]
        },
        { type: "data", cells: [{ text: "Standing Water Level (mm)", bold: true }, ...lowlandColumns.map((c) => ({ text: blank(c.formData["site_soil.standing_water_level_mm"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Operating Speed", bold: true }, ...lowlandColumns.map((c) => ({ text: `${fmtNum(c.formData["traveling_speed_data.with_load.speed_m_s"])} m/s\nGear ${blank(c.formData["travel_operation.operating_gear"])}\n${blank(c.formData["travel_operation.engine_rpm"])} Engine rpm`, align: "center" }))] },
        { type: "data", cells: [{ text: "Wheel Slip (%)", bold: true }, ...lowlandColumns.map((c) => ({ text: fmtNum(c.formData["wheel_slip_result.wheel_slip_percent"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Working Width (mm)", bold: true }, ...lowlandColumns.map((c) => ({ text: fmtNum(c.formData["used_implement_data.working_width.ave_mm"], 0), align: "center" }))] },
        { type: "data", cells: [{ text: "Working Depth (mm)", bold: true }, ...lowlandColumns.map((c) => ({ text: fmtNum(c.formData["used_implement_data.working_depth.ave_mm"], 0), align: "center" }))] },
        { type: "data", cells: [{ text: "Field Capacity", bold: true }, ...lowlandColumns.map((c) => ({ text: `${fmtNum(c.formData["working_efficiency.field_capacity_ha_hr"])} ha/hr\n${fmtNum(c.formData["working_efficiency.field_capacity_acre_day"])} acres/day`, align: "center" }))] },
        { type: "data", cells: [{ text: "Fuel Consumption", bold: true }, ...lowlandColumns.map((c) => ({ text: `${fmtNum(c.formData["working_efficiency.fuel_consumption_l_hr"])} l/hr\n${fmtNum(c.formData["working_efficiency.fuel_consumption_l_ha"])} l/ha`, align: "center" }))] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: lowlandColWidths, rows: lowlandRows, fontSize: 8 });

    // ---- Performance Test: Highland Operation -------------------------------------------------
    doc.addPage();
    doc.font(FONT_BOLD).fontSize(11).text("02. Highland Operation");
    doc.moveDown(0.4);

    const hOpColWidth = (CONTENT_WIDTH - 110) / Math.max(highlandColumns.length, 1);
    const highlandColWidths = [110, ...highlandColumns.map(() => hOpColWidth)];
    const highlandRows = [
        { type: "header", cells: [{ text: "Implement", bold: true }, ...highlandColumns.map((c) => ({ text: c.label, bold: true, align: "center" }))] },
        { type: "data", cells: [{ text: "Date", bold: true }, ...highlandColumns.map((c) => ({ text: blank(c.formData["site_soil.test_date"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Place", bold: true }, ...highlandColumns.map((c) => ({ text: blank(c.formData["site_soil.location"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Type of Soil", bold: true }, ...highlandColumns.map((c) => ({ text: blank(c.formData["site_soil.soil_type"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Last Crop", bold: true }, ...highlandColumns.map((c) => ({ text: blank(c.formData["site_soil.last_crop"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Weed Density (/m²)", bold: true }, ...highlandColumns.map((c) => ({ text: minMaxAvgLines(c.formData, "site_soil", "weed_density", ""), align: "center" }))] },
        { type: "data", cells: [{ text: "Weed Height (mm)", bold: true }, ...highlandColumns.map((c) => ({ text: minMaxAvgLines(c.formData, "site_soil", "weed_height", " mm"), align: "center" }))] },
        { type: "data", cells: [{ text: "Soil Moisture", bold: true }, ...highlandColumns.map((c) => ({ text: `${blank(c.formData["site_soil.soil_moisture_percent"])} % Saturated`, align: "center" }))] },
        { type: "data", cells: [{ text: "Soil Shear Strength (kg.m)", bold: true }, ...highlandColumns.map((c) => ({ text: fmtNum(c.formData["soil_shear_strength.gauge_reading_kg_m.average"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Operating Speed", bold: true }, ...highlandColumns.map((c) => ({ text: `${fmtNum(c.formData["traveling_speed_data.with_load.speed_m_s"])} m/s\nGear ${blank(c.formData["travel_operation.operating_gear"])}\n${blank(c.formData["travel_operation.engine_rpm"])} Engine rpm`, align: "center" }))] },
        { type: "data", cells: [{ text: "Wheel Slip (%)", bold: true }, ...highlandColumns.map((c) => ({ text: fmtNum(c.formData["wheel_slip_result.wheel_slip_percent"]), align: "center" }))] },
        { type: "data", cells: [{ text: "Working Width (mm)", bold: true }, ...highlandColumns.map((c) => ({ text: fmtNum(c.formData["used_implement_data.working_width.ave_mm"], 0), align: "center" }))] },
        { type: "data", cells: [{ text: "Working Depth (mm)", bold: true }, ...highlandColumns.map((c) => ({ text: fmtNum(c.formData["used_implement_data.working_depth.ave_mm"], 0), align: "center" }))] },
        { type: "data", cells: [{ text: "Field Capacity", bold: true }, ...highlandColumns.map((c) => ({ text: `${fmtNum(c.formData["working_efficiency.field_capacity_ha_hr"])} ha/hr\n${fmtNum(c.formData["working_efficiency.field_capacity_acre_day"])} acres/day`, align: "center" }))] },
        { type: "data", cells: [{ text: "Fuel Consumption", bold: true }, ...highlandColumns.map((c) => ({ text: `${fmtNum(c.formData["working_efficiency.fuel_consumption_l_hr"])} l/hr\n${fmtNum(c.formData["working_efficiency.fuel_consumption_l_ha"])} l/ha`, align: "center" }))] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: highlandColWidths, rows: highlandRows, fontSize: 8 });

    // ---- Traveling Speeds Test + MSPTO Speed Test ---------------------------------------------
    doc.addPage();
    const buildSpeedGridRows = (title, refRpm, unit, valueOf) => {
        heading(title.replace("{rpm}", blank(refRpm)));
        const gearColWidth = (CONTENT_WIDTH - 70) / 6;
        const colWidths = [70, gearColWidth, gearColWidth, gearColWidth, gearColWidth, gearColWidth, gearColWidth];
        const rows = [
            { type: "header", cells: [{ text: "Gear", bold: true }, { text: "Low", bold: true, align: "center" }, { text: "", bold: true }, { text: "Medium", bold: true, align: "center" }, { text: "", bold: true }, { text: "High", bold: true, align: "center" }, { text: "", bold: true }] },
            { type: "header", cells: [{ text: "" }, { text: "*", align: "center" }, { text: "Actual", align: "center" }, { text: "*", align: "center" }, { text: "Actual", align: "center" }, { text: "*", align: "center" }, { text: "Actual", align: "center" }] }
        ];
        SPEED_GEAR_DIRECTIONS.forEach(([dirLabel, dirCode]) => {
            for (let i = 1; i <= 4; i++) {
                const cells = [{ text: `${dirLabel} ${i}`, bold: true }];
                SPEED_GEAR_TIERS.forEach((tier) => {
                    const v = valueOf(`${dirCode}-${tier}${i}`);
                    cells.push({ text: "......", align: "center" }, { text: v, align: "center" });
                });
                rows.push({ type: "data", cells });
            }
        });
        drawTable(doc, { x: MARGIN, colWidths, rows, fontSize: 8 });
        doc.font(FONT_ITALIC).fontSize(8).text(`* (Manufacturer @ ${blank(refRpm)} ${unit === "km/hr" ? "Erpm" : "Erpm"})`, { indent: 10 });
        doc.moveDown(0.6);
    };

    buildSpeedGridRows(
        "03. Traveling Speeds Test (Speed km/hr @ {rpm} Engine rpm)",
        speedData["general.engine_rpm"],
        "km/hr",
        (gear) => fmtNum(speedData[`speed_table.${gear}.speed_km_hr`])
    );
    buildSpeedGridRows(
        "04. MSPTO Speed Test (Speed rpm @ {rpm} Engine rpm)",
        speedData["mspto_reference.mspto_reference_engine_rpm"],
        "rpm",
        (gear) => blank(speedData[`mspto_speed_table.${gear}.reading_rpm`])
    );

    // ---- Actuating Forces + Turning Radius -----------------------------------------------------
    doc.addPage();
    heading("05. Actuating Forces");
    const N_PER_KGF = 9.80665;
    const forceRows = [
        ["Accelerator - Hand", "actuating_forces.accel_hand_kgf"],
        ["Accelerator - Foot", "actuating_forces.accel_foot_kgf"],
        ["Brake", "actuating_forces.brake_kgf"],
        ["Clutch", "actuating_forces.clutch_kgf"],
        ["Hydraulic Lever - Position", "actuating_forces.hyd_position_kgf"],
        ["Hydraulic Lever - Draft", "actuating_forces.hyd_draft_kgf"],
        ["Steering", "actuating_forces.steering_kgf"],
        ["Gear Lever - Main", "actuating_forces.gear_main_kgf"],
        ["Gear Lever - High/Low", "actuating_forces.gear_hilow_kgf"],
        ["Gear Lever - Forward", "actuating_forces.gear_forward_kgf"],
        ["Gear Lever - Reverse", "actuating_forces.gear_reverse_kgf"]
    ];
    const forceTableRows = [
        { type: "header", cells: [{ text: "Actuators", bold: true }, { text: "kg.f", bold: true, align: "center" }, { text: "N", bold: true, align: "center" }] },
        ...forceRows.map(([label, key]) => {
            const kgf = toNum(labData[key]);
            const n = kgf === null ? "......" : (kgf * N_PER_KGF).toFixed(2);
            return { type: "data", cells: [{ text: label }, { text: kgf === null ? "......" : String(kgf), align: "center" }, { text: n, align: "center" }] };
        })
    ];
    drawTable(doc, { x: MARGIN, colWidths: [235, 130, 130], rows: forceTableRows, fontSize: 9 });

    heading("06. Turning Radius");
    const trAvg = (row, cols) => {
        const vals = cols.map((c) => toNum(speedData[`turning_radius.${row}.${c}`])).filter((v) => v !== null);
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0) : "......";
    };
    const turningRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true }, { text: "Manufacturer", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Turning circle radius with 4WD disengaged and with brakes (mm)" }, { text: "" }, { text: trAvg("with_brake", ["without_4wd_r", "without_4wd_l"]), align: "center" }] },
        { type: "data", cells: [{ text: "Turning circle radius 4WD disengaged and without brakes (mm)" }, { text: "" }, { text: trAvg("without_brake", ["without_4wd_r", "without_4wd_l"]), align: "center" }] },
        { type: "data", cells: [{ text: "Turning circle radius with 4WD engaged with brakes (mm)" }, { text: "" }, { text: trAvg("with_brake", ["with_4wd_r", "with_4wd_l"]), align: "center" }] },
        { type: "data", cells: [{ text: "Turning circle radius with 4WD engaged without brakes (mm)" }, { text: "" }, { text: trAvg("without_brake", ["with_4wd_r", "with_4wd_l"]), align: "center" }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [235, 130, 130], rows: turningRows, fontSize: 9 });

    // ---- Transport Test + Safety + Endurance ---------------------------------------------------
    doc.addPage();
    heading("06. Transport Test");
    doc.font(FONT).fontSize(11);
    doc.text(`Distance of travel : ${fmtNum(transportData["computed_results.traveling_distance_km"])} Km`, { indent: 20 });
    doc.text(`Weight of the load : ${formatValue(transportData["trip_details.load_weight_kg"])} Kg (without trailer)`, { indent: 20 });
    doc.text(`Average travelling speed : ${fmtNum(transportData["computed_results.traveling_speed_km_hr"])} km/hr`, { indent: 20 });
    doc.text(`Fuel consumption : ${fmtNum(transportData["computed_results.fuel_consumption_l_hr"])} l/hr`, { indent: 20 });
    doc.moveDown(0.8);

    heading("SAFETY");
    const ropsText = machine.rops_available
        ? "This tractor is fitted with a rollover protective system (ROPS)."
        : "This tractor hasn't provided rollover protection to the operator.";
    doc.font(FONT).fontSize(11).text(
        `To ensure the higher degree of safety, rollover protective system (ROPS) must be available for agricultural tractors. `,
        { indent: 20, continued: true }
    );
    doc.font(FONT_BOLD).text(ropsText);
    if (machine.safety_note) { doc.font(FONT); doc.text(machine.safety_note, { indent: 20 }); }
    doc.moveDown(0.8);

    heading("ENDURANCE TEST");
    doc.font(FONT).fontSize(11);
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `The tractor was operated for more than ${formatValue(enduranceData["endurance.hours_operated"])} hours, for ${formatValue(enduranceData["endurance.implements_used"])} ` +
        `in ${formatValue(enduranceData["endurance.conditions"])}. ${enduranceData["endurance.breakdowns_reported"] || "Major breakdowns or performance abnormalities were not reported during the period of endurance test."}`;
    doc.text(enduranceText, { indent: 20 });

    // ---- Signatures ------------------------------------------------------------------------------
    doc.addPage();
    doc.font(FONT_BOLD).fontSize(11).text("Test Conducted & Report", { continued: false });
    doc.text("Prepared by");
    doc.font(FONT).text(`: ${formatValue(labTest.technical_assistant_name)}`, { indent: 20 });
    doc.text("Technical Assistant, FMRC", { indent: 20 });
    doc.moveDown(2);

    doc.font(FONT_BOLD).text("Test Report");
    doc.text("Recommended by");
    doc.font(FONT).text(`: ${formatValue(labTest.mechanical_engineer_name)}`, { indent: 20 });
    doc.text("Mechanical Engineer, FMRC", { indent: 20 });
    doc.moveDown(2);

    doc.font(FONT_BOLD).text("Test Report Approved by");
    doc.font(FONT).text(`: ${formatValue(labTest.chief_engineer_name)}`, { indent: 20 });
    doc.text("Chief Engineer (Mechanization Research), FMRC", { indent: 20 });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { indent: 20 });

    doc.end();

    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    return fileName;
};

export const generateOfficialTractorReport = async (machineId) => {
    const fileName = await buildOfficialTractorReportPdf(machineId);

    return createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Tractor Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};
