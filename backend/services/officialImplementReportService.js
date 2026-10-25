import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { createReport } from "../models/report.js";
import { listTestRecords } from "../models/testRecord.js";
import { getMachineryById } from "../models/machinery.js";
import { getSchemasByIds } from "../models/testFormSchema.js";
import { REPORTS_DIR, formatValue } from "./reportService.js";

// Reproduces the three official FMRC 4W Implement Certification Reports:
//  1. generateOfficialDiscPloughReport(machineId)   -> FMRC/OM/01/2022 (Disc Plough)
//  2. generateOfficialRotaryTillerReport(machineId) -> FMRC/OM/01/2023 (Rotary Tiller)
//  3. generateOfficialShredderReport(machineId)     -> FMRC/OM/01/2026 (Shredder)

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

const blank = (v, fallback = "") => (v === null || v === undefined || v === "" ? fallback : String(v));

const withUnit = (v, unit, fallback = "") => {
    if (v === null || v === undefined || v === "") return fallback;
    const s = String(v).trim();
    if (s.toLowerCase().endsWith(unit.toLowerCase())) return s;
    return `${s} ${unit}`;
};

const minMaxAvgLines = (formData, sectionKey, prefix, unitSuffix) => {
    const vals = [1, 2, 3].map((i) => toNum(formData[`${sectionKey}.${prefix}_${i}`])).filter((v) => v !== null);
    if (vals.length === 0) return `Min: ......${unitSuffix}\nMax: ......${unitSuffix}\nAverage : ......${unitSuffix}`;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    return `Min: ${min}${unitSuffix}\nMax: ${max}${unitSuffix}\nAverage : ${avg}${unitSuffix}`;
};

const cellTextHeight = (doc, text, width, fontSize, font) => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(text || "", { width: Math.max(width - 10, 20) });
};

const renderPenetrationChart = (doc, depthForceValues, x, y, width, height) => {
    const values = depthForceValues.filter((v) => v !== null);
    const maxForce = values.length ? Math.max(...values, 10) : 40;

    doc.rect(x + 15, y + 4, width - 22, height - 18).stroke("#888888");
    doc.fontSize(6.5).font(FONT_BOLD).fillColor("#000000");
    doc.text("Force (Lb)", x, y - 3);
    doc.text("Depth (Inch)", x + (width - 45) / 2, y + height - 11);

    const chartX = x + 15;
    const chartY = y + 4;
    const chartW = width - 22;
    const chartH = height - 18;

    const points = depthForceValues.map((v, i) => {
        const px = chartX + (i / (depthForceValues.length - 1)) * chartW;
        const py = v === null ? null : chartY + chartH - (v / maxForce) * chartH;
        return { px, py };
    });

    doc.strokeColor("#2b6cb0").lineWidth(1.4);
    let started = false;
    points.forEach(({ px, py }) => {
        if (py === null) { started = false; return; }
        if (!started) { doc.moveTo(px, py); started = true; }
        else { doc.lineTo(px, py); }
    });
    doc.stroke();
    doc.lineWidth(1).strokeColor("#000000").fillColor("#000000");
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
            renderPenetrationChart(doc, cell.chart, cx + 6, y + 8, colWidths[i] - 12, height - 14);
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
                if (headerRow) y += drawRow(doc, x, y, headerRow.colWidths || colWidths, headerRow.cells, opts);
            }
            doc.rect(x, y, totalWidth, h).stroke("#000000");
            doc.font(FONT_BOLD).fontSize(fontSize).fillColor("#000000")
                .text(row.label, x + cellPadding, y + cellPadding, {
                    width: totalWidth - cellPadding * 2,
                    align: row.type === "full_header" ? "center" : "left"
                });
            y += h;
            return;
        }

        if (row.type === "span_left_group") {
            const leftW = row.leftWidth || 90;
            const midW = colWidths[0] - leftW;
            const rightCols = colWidths.slice(1);
            const subHeights = row.subRows.map((sr) => {
                const midH = cellTextHeight(doc, sr.param, midW, fontSize, FONT) + cellPadding * 2;
                const valHs = sr.values.map((v, idx) => cellTextHeight(doc, v, rightCols[idx] || 100, fontSize, FONT) + cellPadding * 2);
                return Math.max(midH, ...valHs);
            });
            const totalH = subHeights.reduce((a, b) => a + b, 0);
            if (y + totalH > bottom) {
                doc.addPage();
                y = doc.y;
            }
            doc.rect(x, y, leftW, totalH).stroke("#000000");
            const labelH = cellTextHeight(doc, row.groupLabel, leftW, fontSize, FONT);
            doc.font(FONT).fontSize(fontSize).fillColor("#000000")
                .text(row.groupLabel, x + cellPadding, y + Math.max((totalH - labelH) / 2, cellPadding), { width: leftW - cellPadding * 2 });

            let sy = y;
            row.subRows.forEach((sr, rIdx) => {
                const sh = subHeights[rIdx];
                doc.rect(x + leftW, sy, midW, sh).stroke("#000000");
                doc.font(FONT).fontSize(fontSize).fillColor("#000000")
                    .text(sr.param, x + leftW + cellPadding, sy + cellPadding, { width: midW - cellPadding * 2 });
                let rcx = x + leftW + midW;
                sr.values.forEach((v, cIdx) => {
                    const cw = rightCols[cIdx];
                    doc.rect(rcx, sy, cw, sh).stroke("#000000");
                    doc.font(FONT).fontSize(fontSize).fillColor("#000000")
                        .text(v || "", rcx + cellPadding, sy + cellPadding, { width: cw - cellPadding * 2 });
                    rcx += cw;
                });
                sy += sh;
            });
            y += totalH;
            return;
        }

        const rColWidths = row.colWidths || colWidths;
        const estHeight = row.forceHeight || Math.max(
            ...row.cells.map((cell, i) => cell.chart ? (row.forceHeight || 105) : cellTextHeight(doc, cell.text, rColWidths[i], cell.fontSize || fontSize, cell.bold ? FONT_BOLD : FONT) + cellPadding * 2)
        );
        if (y + estHeight > bottom) {
            doc.addPage();
            y = doc.y;
            if (headerRow && row !== headerRow) y += drawRow(doc, x, y, headerRow.colWidths || colWidths, headerRow.cells, opts);
        }
        const h = drawRow(doc, x, y, rColWidths, row.cells, { ...opts, forceHeight: row.forceHeight });
        y += h;
    });

    doc.y = y + 10;
    doc.x = MARGIN;
};

const drawCoverAndRemarks = (doc, machine, docNumber, titleLine1, titleLine2, sampleNoun = "equipment") => {
    const rightAlignedX = (text, font, size, rightEdge) => {
        doc.font(font).fontSize(size);
        return rightEdge - doc.widthOfString(text);
    };

    let printedPageNum = 0;
    const drawHeaderFooter = () => {
        printedPageNum += 1;
        const rightEdge = PAGE_WIDTH - MARGIN;
        const pageNumText = String(printedPageNum).padStart(2, "0");
        doc.font(FONT_BOLD).fontSize(10).fillColor("#000000")
            .text(pageNumText, (PAGE_WIDTH - doc.widthOfString(pageNumText)) / 2, doc.page.height - 35, { lineBreak: false });
        doc.font(FONT_BOLD).fontSize(9)
            .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 9, rightEdge), doc.page.height - 35, { lineBreak: false });
        doc.x = MARGIN;
        doc.y = MARGIN;
    };
    doc.on("pageAdded", drawHeaderFooter);

    // Page 1: Cover
    doc.rect(30, 30, PAGE_WIDTH - 60, doc.page.height - 60).lineWidth(2).stroke("#000000");
    doc.rect(35, 35, PAGE_WIDTH - 70, doc.page.height - 70).lineWidth(0.75).stroke("#000000");
    doc.lineWidth(1);

    doc.font(FONT_BOLD).fontSize(11)
        .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 11, PAGE_WIDTH - 55), 65, { lineBreak: false });

    doc.y = 130;
    doc.font(FONT_BOLD).fontSize(18).text(titleLine1, MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });
    doc.moveDown(0.3);
    doc.font(FONT_BOLD).fontSize(18).text(titleLine2, MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });
    doc.moveDown(0.3);
    doc.font(FONT_BOLD).fontSize(17).text(`MODEL ${formatValue(machine.model).toUpperCase()}`, MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });

    doc.y = doc.page.height - 190;
    doc.font(FONT_BOLD).fontSize(11).text("Farm Mechanization Research Centre", { align: "center" });
    doc.text("Department of Agriculture", { align: "center" });
    doc.text("Mahailluppallama", { align: "center" });
    doc.text("Sri Lanka", { align: "center" });
    doc.text("Tel: +94 25 224 9222", { align: "center" });
    doc.text("Email : fmrc@doa.gov.lk", { align: "center" });

    // Page 2: Boxed Remarks
    doc.addPage();
    const remarks = [
        "This report shall not be duplicated in full or part without the approval of FMRC.",
        "This report is null & void without the authorized signatures and stamps of FMRC officials.",
        "Any amendment to this document is not allowed.",
        "Any discrepancy on this report shall be reported to the FMRC within 15 days after the date of receiving.",
        `Test results in this report is based on the sample ${sampleNoun} provided by the supplier.`,
        "Report is valid only for the tested model.",
        "Report is valid for the period of 10 years from the date of issue.",
        "FMRC have the right to recall the test report if found any inaccurate information provided by the supplier."
    ];
    const boxX = MARGIN, boxY = MARGIN + 55, boxWidth = CONTENT_WIDTH;
    doc.font(FONT).fontSize(11);
    let remarksHeight = 60;
    const remarkLines = remarks.map((r, i) => {
        const text = `${i + 1}.  ${r}`;
        const h = doc.heightOfString(text, { width: boxWidth - 40 }) + 18;
        remarksHeight += h;
        return { text, h };
    });
    doc.rect(boxX, boxY, boxWidth, remarksHeight).stroke("#000000");
    doc.font(FONT_BOLD).fontSize(12).text("Remarks", boxX, boxY + 20, { width: boxWidth, align: "center" });
    let ry = boxY + 52;
    doc.font(FONT).fontSize(11);
    remarkLines.forEach(({ text, h }) => {
        doc.text(text, boxX + 20, ry, { width: boxWidth - 40 });
        ry += h;
    });
};

const drawSignatureBlocks = (doc, labTest) => {
    const issueDate = new Date().toLocaleDateString("en-GB").replace(/\//g, ".");
    const drawSigBlock = (leftTitle1, leftTitle2, personName, roleLabel) => {
        const startY = doc.y;
        doc.font(FONT_BOLD).fontSize(11).text(leftTitle1, MARGIN, startY);
        if (leftTitle2) {
            doc.text(leftTitle2, MARGIN, startY + 16);
        }
        const colonY = leftTitle2 ? startY + 16 : startY;
        const rightX = MARGIN + 195;
        doc.font(FONT_BOLD).fontSize(11).text(": ................................................", rightX, colonY);
        doc.text(formatValue(personName), rightX + 8, colonY + 16);
        doc.text(roleLabel, rightX + 8, colonY + 32);
        doc.text("FMRC", rightX + 8, colonY + 48);
        doc.text(`Date: ${issueDate}`, rightX + 8, colonY + 64);
        doc.y = colonY + 125;
    };

    drawSigBlock("Test Conducted & Report", "Prepared by", labTest?.technical_assistant_name, "Technical Assistant (Agri Extension)");
    drawSigBlock("Test Report", "Recommended by", labTest?.mechanical_engineer_name, "Mechanical Engineer");
    drawSigBlock("Test Report Approved by", null, labTest?.chief_engineer_name, "Chief Engineer (Mechanization Research)");
};

// ============================================================================================
// 1. DISC PLOUGH OFFICIAL REPORT (FMRC/OM/01/2022)
// ============================================================================================
export const generateOfficialDiscPloughReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const labTest = allTests.find((t) => schemaKeyOf(t) === "DISC_PLOUGH_LAB") || allTests[0];
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const fieldTests = allTests.filter((t) => schemaKeyOf(t) === "DISC_PLOUGH_FIELD");

    const labData = parseFormData(labTest?.form_data);
    const enduranceData = parseFormData(enduranceTest?.form_data);

    const fileName = `FMRC-Official-DiscPlough-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/OM/01/${new Date().getFullYear()}`;
    drawCoverAndRemarks(doc, machine, docNumber, "REPORT ON TESTING AND", "EVALUATION OF DISC PLOUGH", "equipment");

    const heading = (text) => {
        doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true });
        doc.moveDown(0.5);
    };

    // Page 3 (02): TITLE, INTRODUCTION, MANUFACTURER'S DETAILS, IMPORTER'S CONTACT DETAILS
    doc.addPage();
    heading("TITLE");
    doc.font(FONT).fontSize(11).text(`Test report on Model ${formatValue(machine.model)} Disc Plough.`, { indent: 35 });
    doc.moveDown(1);

    heading("INTRODUCTION");
    const introText = machine.background_note ||
        `Model ${formatValue(machine.model)} Disc Plough handed over to Farm Mechanization Research Centre, Department of Agriculture, ` +
        `Mahailluppallama has been tested to check its suitability for agricultural purposes in Sri Lanka.`;
    doc.font(FONT).fontSize(11).text(introText, { indent: 35, lineGap: 4 });
    doc.moveDown(1);

    heading("MANUFACTURER'S DETAILS & COUNTRY OF ORIGIN");
    doc.font(FONT_BOLD).fontSize(11).text(machine.manufacturer_country || "Not provided by the importer");
    doc.moveDown(1);

    heading("IMPORTER'S CONTACT DETAILS");
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(machine.importer_name || "......................................", { lineGap: 4 });
    doc.text(machine.importer_address || "......................................", { lineGap: 4 });
    doc.moveDown(0.4);
    doc.text(`Tel     : ${machine.importer_tel || "......................"}`, { lineGap: 4 });
    doc.text(`Web     : ${machine.importer_web || "......................"}`, { lineGap: 4 });
    doc.font(FONT);

    // Page 4 (03): TEST PROCEDURE + MANUFACTURER'S SPECIFICATIONS
    doc.addPage();
    heading("TEST PROCEDURE");
    doc.font(FONT).fontSize(11).text(
        "Test was conducted to evaluate the performance under different soil conditions. Test conditions, field conditions and machine conditions " +
        "were recorded before and after operations. The implement was used for primary land preparation in highland.",
        { indent: 35, lineGap: 4 }
    );
    doc.moveDown(1);

    heading("MANUFACTURER'S SPECIFICATIONS");
    doc.moveDown(0.2);

    const mfgSpecRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Manufacture", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Brand" }, { text: blank(labData["manufacturer_specs.brand_mfg"]) }, { text: blank(labData["manufacturer_specs.brand_ver"]) }] },
        { type: "data", cells: [{ text: "Model" }, { text: blank(labData["manufacturer_specs.model_mfg"] || machine.model) }, { text: blank(labData["manufacturer_specs.model_ver"]) }] },
        { type: "data", cells: [{ text: "Number of Disc" }, { text: blank(labData["manufacturer_specs.num_discs_mfg"]) }, { text: blank(labData["manufacturer_specs.num_discs_ver"]) }] },
        { type: "data", cells: [{ text: "Total Width" }, { text: withUnit(labData["manufacturer_specs.total_width_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.total_width_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Total Length" }, { text: withUnit(labData["manufacturer_specs.total_length_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.total_length_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Total Height" }, { text: withUnit(labData["manufacturer_specs.total_height_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.total_height_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Working Depth" }, { text: withUnit(labData["manufacturer_specs.working_depth_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.working_depth_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Space Between Bodies" }, { text: withUnit(labData["manufacturer_specs.space_between_bodies_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.space_between_bodies_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Diameter of Disc" }, { text: withUnit(labData["manufacturer_specs.disc_diameter_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.disc_diameter_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Required Hp" }, { text: withUnit(labData["manufacturer_specs.required_hp_mfg"], "hp") }, { text: withUnit(labData["manufacturer_specs.required_hp_ver"], "hp") }] },
        { type: "data", cells: [{ text: "Total Weight" }, { text: withUnit(labData["manufacturer_specs.total_weight_mfg"], "kg") }, { text: withUnit(labData["manufacturer_specs.total_weight_ver"], "kg") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [165, 165, 165], rows: mfgSpecRows, fontSize: 10, cellPadding: 5 });

    // Page 5 (04): VERIFICATION OF OTHER SPECIFICATION
    doc.addPage();
    heading("VERIFICATION OF OTHER SPECIFICATION");
    doc.moveDown(0.2);

    const otherSpecRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Category" }, { text: blank(labData["disc_details.category"]) }] },
        { type: "group", label: "Main Frame" },
        { type: "data", cells: [{ text: "Dimension L x W" }, { text: blank(labData["disc_details.main_frame_dim"]) }] },
        { type: "group", label: "Disc" },
        { type: "data", cells: [{ text: "Disc Type" }, { text: blank(labData["disc_details.disc_type"]) }] },
        { type: "data", cells: [{ text: "Thickness" }, { text: withUnit(labData["disc_details.disc_thickness_mm"], "mm") }] },
        { type: "data", cells: [{ text: "Concavity" }, { text: withUnit(labData["disc_details.concavity_mm"], "mm") }] },
        { type: "data", cells: [{ text: "Side Angle" }, { text: withUnit(labData["disc_details.side_angle_deg"], "°") }] },
        { type: "data", cells: [{ text: "Tilt Angle" }, { text: withUnit(labData["disc_details.tilt_angle_deg"], "°") }] },
        { type: "group", label: "Scraper" },
        { type: "data", cells: [{ text: "Length x Width" }, { text: withUnit(labData["disc_details.scraper_length_width_mm"], "mm") }] },
        { type: "data", cells: [{ text: "Thickness" }, { text: withUnit(labData["disc_details.scraper_thickness_mm"], "mm") }] },
        { type: "group", label: "Rear Furrow Wheel" },
        { type: "data", cells: [{ text: "Diameter" }, { text: withUnit(labData["disc_details.rear_wheel_diameter_mm"], "mm") }] },
        { type: "data", cells: [{ text: "Thickness" }, { text: withUnit(labData["disc_details.rear_wheel_thickness_mm"], "mm") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [250, 245], rows: otherSpecRows, fontSize: 10, cellPadding: 5 });

    // Pages 6-7 (05-06): PERFORMANCE TEST - A. Highland Operations (2 tests per page)
    for (let i = 0; i < fieldTests.length; i += 2) {
        doc.addPage();
        if (i === 0) {
            heading("PERFORMANCE TEST");
            doc.font(FONT_BOLD).fontSize(11).text("A.  Highland Operations", { indent: 20 });
            doc.moveDown(0.4);
        }
        const pair = fieldTests.slice(i, i + 2);
        const colW = (CONTENT_WIDTH - 135) / pair.length;
        const colWidths = [135, ...pair.map(() => colW)];
        const parsed = pair.map((t) => parseFormData(t.form_data));

        const perfRows = [
            { type: "data", cells: [{ text: "Date", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["tractor_and_site.test_date"], "......") }))] },
            { type: "data", cells: [{ text: "Place", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["tractor_and_site.location"], "......") }))] },
            { type: "data", cells: [{ text: "Coupled Tractor Model", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["tractor_and_site.used_tractor"], "......") }))] },
            { type: "data", cells: [{ text: "Tractor Power", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["tractor_and_site.tractor_power_hp"], "hp", "......") }))] },
            { type: "full_header", label: "Field Conditions (Before Test)" },
            { type: "data", cells: [{ text: "Field Shape", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["tractor_and_site.shape_of_field"], "......") }))] },
            { type: "data", cells: [{ text: "Type of Soil", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["tractor_and_site.soil_type"], "......") }))] },
            { type: "data", cells: [{ text: "Last Crop", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["tractor_and_site.last_crop"], "......") }))] },
            { type: "data", cells: [{ text: "Weed Density", bold: true }, ...parsed.map((fd) => ({ text: minMaxAvgLines(fd, "weed_data", "weed_density", " (per m²)") }))] },
            { type: "data", cells: [{ text: "Weed Height", bold: true }, ...parsed.map((fd) => ({ text: minMaxAvgLines(fd, "weed_data", "weed_height", " mm") }))] },
            { type: "data", cells: [{ text: "Soil Moisture", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["soil_meter_reading.soil_meter_reading.average"], "%", "......") }))] },
            { type: "data", cells: [{ text: "Soil Shear Strength", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["soil_shear_strength.gauge_reading_kg_m.average"], "(kg. m)", "......") }))] },
            { type: "full_header", label: "Performance" },
            {
                type: "data",
                cells: [
                    { text: "Operating Speed", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["traveling_speed_data.with_load.speed_m_s"] || fd["working_efficiency.traveling_speed_m_s"], "m/s", "......")} Gear ${blank(fd["travel_operation.operating_gear"], "...")}\nwith ${blank(fd["travel_operation.engine_rpm"], "...")} engine rpm`
                    }))
                ]
            },
            { type: "data", cells: [{ text: "Wheel Slip", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["wheel_slip_result.wheel_slip_percent"], "%", "......") }))] },
            { type: "data", cells: [{ text: "Working Width", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["used_implement_data.working_width.ave_mm"], "mm", "......") }))] },
            { type: "data", cells: [{ text: "Working Depth", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["used_implement_data.working_depth.ave_mm"], "mm", "......") }))] },
            {
                type: "data",
                cells: [
                    { text: "Field Capacity", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["working_efficiency.field_capacity_ha_hr"], "ha/hr", "......")}\n${withUnit(fd["working_efficiency.field_capacity_acre_day"], "Acres/Day", "......")}`
                    }))
                ]
            },
            {
                type: "data",
                cells: [
                    { text: "Fuel Consumption", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["working_efficiency.fuel_consumption_l_hr"], "l/hr", "......")}\n${withUnit(fd["working_efficiency.fuel_consumption_l_ha"], "l/ha", "......")}`
                    }))
                ]
            }
        ];
        drawTable(doc, { x: MARGIN, colWidths, rows: perfRows, fontSize: 9.5, cellPadding: 4 });
    }

    // Final Page (07): ENDURANCE TEST + Signatures
    doc.addPage();
    heading("ENDURANCE TEST");
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `The ${formatValue(machine.model)} Disc Plough was operated on different soil conditions with different power sources. ` +
        `${enduranceData["endurance.breakdowns_reported"] || "It has shown satisfactory performance during the endurance test period."}`;
    doc.font(FONT).fontSize(11).text(enduranceText, { indent: 35, lineGap: 4 });
    doc.moveDown(2);

    drawSignatureBlocks(doc, labTest);

    doc.end();
    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    return createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Disc Plough Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};

// ============================================================================================
// 2. ROTARY TILLER OFFICIAL REPORT (FMRC/OM/01/2023)
// ============================================================================================
export const generateOfficialRotaryTillerReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const labTest = allTests.find((t) => schemaKeyOf(t) === "ROTARY_LAB") || allTests[0];
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const lowlandTests = allTests.filter((t) => schemaKeyOf(t) === "ROTARY_LOWLAND");
    const highlandNormalTests = allTests.filter((t) => schemaKeyOf(t) === "ROTARY_HIGHLAND" && /Normal/i.test(t.test_name));
    const highlandAfterDiscTests = allTests.filter((t) => schemaKeyOf(t) === "ROTARY_HIGHLAND" && /After Disc Plough/i.test(t.test_name));

    const labData = parseFormData(labTest?.form_data);
    const enduranceData = parseFormData(enduranceTest?.form_data);

    const fileName = `FMRC-Official-RotaryTiller-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/OM/01/${new Date().getFullYear()}`;
    drawCoverAndRemarks(doc, machine, docNumber, "REPORT ON TESTING AND", "EVALUATION OF ROTARY TILLER", "equipment");

    const heading = (text) => {
        doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true });
        doc.moveDown(0.5);
    };

    // Page 3 (02): TITLE, INTRODUCTION, MANUFACTURER, IMPORTER
    doc.addPage();
    heading("TITLE");
    doc.font(FONT).fontSize(11).text(`Test report on model ${formatValue(machine.model)} rotary tiller.`, { indent: 35 });
    doc.moveDown(1);

    heading("INTRODUCTION");
    const introText = machine.background_note ||
        `Model ${formatValue(machine.model)} rotary tiller handed over to Farm Mechanization Research Centre, Department of Agriculture, ` +
        `Mahailluppallama has been tested to check its suitability for agricultural purposes in Sri Lanka.`;
    doc.font(FONT).fontSize(11).text(introText, { indent: 35, lineGap: 4 });
    doc.moveDown(1);

    heading("MANUFACTURER'S DETAILS & COUNTRY OF ORIGIN");
    doc.font(FONT_BOLD).fontSize(11).text(machine.manufacturer_country || "Not provided by the importer");
    doc.moveDown(1);

    heading("IMPORTER'S CONTACT DETAILS");
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(machine.importer_name || "......................................", { lineGap: 4 });
    doc.text(machine.importer_address || "......................................", { lineGap: 4 });
    doc.moveDown(0.4);
    doc.text(`Tel     : ${machine.importer_tel || "......................"}`, { lineGap: 4 });
    doc.text(`Fax     : ${machine.importer_fax || "......................"}`, { lineGap: 4 });
    doc.text(`E mail  : ${machine.importer_web || "......................"}`, { lineGap: 4 });
    doc.font(FONT);

    // Page 4 (03): TEST PROCEDURE + VERIFICATION OF MANUFACTURER SPECIFICATIONS
    doc.addPage();
    heading("TEST PROCEDURE");
    doc.font(FONT).fontSize(11).text(
        "Test was conducted to evaluate the performance under different soil conditions. Test conditions, field conditions and machine conditions " +
        "were recorded before and after operations. The implement was used for primary and secondary land preparation in irrigated low land fields as well as non-irrigated highland fields.",
        { indent: 35, lineGap: 4 }
    );
    doc.moveDown(0.8);

    heading("VERIFICATION OF MANUFACTURER SPECIFICATIONS");
    doc.moveDown(0.2);

    const mfgRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Manufacture", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Model" }, { text: blank(labData["manufacturer_specs.model_mfg"] || machine.model) }, { text: blank(labData["manufacturer_specs.model_ver"]) }] },
        { type: "data", cells: [{ text: "Series" }, { text: blank(labData["manufacturer_specs.series_mfg"]) }, { text: blank(labData["manufacturer_specs.series_ver"]) }] },
        { type: "data", cells: [{ text: "Size" }, { text: blank(labData["manufacturer_specs.size_mfg"]) }, { text: blank(labData["manufacturer_specs.size_ver"]) }] },
        { type: "data", cells: [{ text: "Overall Width" }, { text: withUnit(labData["manufacturer_specs.overall_width_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.overall_width_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Tilling Width" }, { text: withUnit(labData["manufacturer_specs.tilling_width_mfg"], "mm") }, { text: withUnit(labData["manufacturer_specs.tilling_width_ver"], "mm") }] },
        { type: "data", cells: [{ text: "Tractor Power" }, { text: withUnit(labData["manufacturer_specs.tractor_power_mfg"], "hp") }, { text: withUnit(labData["manufacturer_specs.tractor_power_ver"], "hp") }] },
        { type: "data", cells: [{ text: "3 Point Hitch Type" }, { text: blank(labData["manufacturer_specs.hitch_type_mfg"]) }, { text: blank(labData["manufacturer_specs.hitch_type_ver"]) }] },
        { type: "data", cells: [{ text: "No. of Blades" }, { text: blank(labData["manufacturer_specs.num_blades_mfg"]) }, { text: blank(labData["manufacturer_specs.num_blades_ver"]) }] },
        { type: "data", cells: [{ text: "Primary Transmission" }, { text: blank(labData["manufacturer_specs.primary_transmission_mfg"]) }, { text: blank(labData["manufacturer_specs.primary_transmission_ver"]) }] },
        { type: "data", cells: [{ text: "Transmission Type" }, { text: blank(labData["manufacturer_specs.transmission_type_mfg"]) }, { text: blank(labData["manufacturer_specs.transmission_type_ver"]) }] },
        { type: "data", cells: [{ text: "Max. Working Depth" }, { text: blank(labData["manufacturer_specs.max_working_depth_mfg"]) }, { text: blank(labData["manufacturer_specs.max_working_depth_ver"]) }] },
        { type: "data", cells: [{ text: "Drive Line Safety Device" }, { text: blank(labData["manufacturer_specs.safety_device_mfg"]) }, { text: blank(labData["manufacturer_specs.safety_device_ver"]) }] },
        { type: "data", cells: [{ text: "Gear Speeds" }, { text: blank(labData["manufacturer_specs.gear_speeds_mfg"]) }, { text: blank(labData["manufacturer_specs.gear_speeds_ver"]) }] },
        { type: "data", cells: [{ text: "Rotor RPM (PTO)" }, { text: withUnit(labData["manufacturer_specs.rotor_rpm_mfg"], "rpm") }, { text: withUnit(labData["manufacturer_specs.rotor_rpm_ver"], "rpm") }] },
        { type: "data", cells: [{ text: "Weight" }, { text: withUnit(labData["manufacturer_specs.weight_mfg"], "kg") }, { text: withUnit(labData["manufacturer_specs.weight_ver"], "kg") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [165, 165, 165], rows: mfgRows, fontSize: 9.5, cellPadding: 4 });

    // Page 5 (04): VERIFICATION OF OTHER SPECIFICATION
    doc.addPage();
    heading("VERIFICATION OF OTHER SPECIFICATION");
    doc.moveDown(0.2);

    const otherRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Overall Dimension L x W x H" }, { text: withUnit(labData["other_specs.overall_dim_lxwxh"], "mm") }] },
        { type: "data", cells: [{ text: "Category" }, { text: blank(labData["other_specs.category"]) }] },
        { type: "data", cells: [{ text: "No. of Splines" }, { text: blank(labData["other_specs.num_splines"]) }] },
        { type: "data", cells: [{ text: "Driveline Safety Device" }, { text: blank(labData["other_specs.driveline_safety_device"]) }] },
        { type: "data", cells: [{ text: "Skid Adjustment Option" }, { text: blank(labData["other_specs.skid_adjustment_option"]) }] },
        { type: "data", cells: [{ text: "Slide Transmission System" }, { text: blank(labData["other_specs.slide_transmission_system"]) }] },
        { type: "data", cells: [{ text: "Rotor Tube Diameter" }, { text: blank(labData["other_specs.rotor_tube_diameter"]) }] },
        { type: "data", cells: [{ text: "No. of Flanges" }, { text: blank(labData["other_specs.num_flanges"]) }] },
        { type: "data", cells: [{ text: "Gauge of sheet" }, { text: blank(labData["other_specs.gauge_of_sheet"]) }] },
        { type: "group", label: "Blade" },
        { type: "data", cells: [{ text: "      Dimension (L x W)" }, { text: withUnit(labData["other_specs.blade_dim_lxw"], "mm") }] },
        { type: "data", cells: [{ text: "      Thickness" }, { text: withUnit(labData["other_specs.blade_thickness"], "mm") }] },
        { type: "data", cells: [{ text: "      Weight" }, { text: withUnit(labData["other_specs.blade_weight"], "kg") }] },
        { type: "data", cells: [{ text: "      No of Blades per Flange" }, { text: blank(labData["other_specs.blades_per_flange"]) }] },
        { type: "data", cells: [{ text: "      Spacing" }, { text: withUnit(labData["other_specs.blade_spacing"], "mm") }] },
        { type: "group", label: "Hardness" },
        { type: "data", cells: [{ text: "Near the Cutting Edge" }, { text: withUnit(labData["other_specs.hardness_cutting_edge"], "HRC") }] },
        { type: "data", cells: [{ text: "Near the Fixing Area" }, { text: withUnit(labData["other_specs.hardness_fixing_area"], "HRC") }] },
        { type: "group", label: "Oil Capacity" },
        { type: "data", cells: [{ text: "Pinion Oil Capacity" }, { text: withUnit(labData["other_specs.pinion_oil_capacity"], "l") }] },
        { type: "data", cells: [{ text: "Side transmission Case" }, { text: withUnit(labData["other_specs.side_transmission_oil"], "l") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [245, 250], rows: otherRows, fontSize: 9.5, cellPadding: 3.5 });

    // Page 6 (05): PERFORMANCE TEST - A. Lowland Operations
    if (lowlandTests.length > 0) {
        doc.addPage();
        heading("PERFORMANCE TEST");
        doc.font(FONT_BOLD).fontSize(11).text("A.  Lowland Operations", { indent: 20 });
        doc.moveDown(0.3);

        const colW = (CONTENT_WIDTH - 145) / lowlandTests.length;
        const colWidths = [145, ...lowlandTests.map(() => colW)];
        const parsed = lowlandTests.map((t) => parseFormData(t.form_data));

        const lowRows = [
            { type: "data", cells: [{ text: "Date", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.test_date"], "......") }))] },
            { type: "data", cells: [{ text: "Place", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.location"], "......") }))] },
            { type: "data", cells: [{ text: "Coupled Tractor Model", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.coupled_tractor_model"], "......") }))] },
            { type: "data", cells: [{ text: "Tractor Power", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["site_soil.tractor_power_hp"], "hp", "......") }))] },
            { type: "data", cells: [{ text: "Field Shape", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.field_shape"], "Rectangular") }))] },
            { type: "data", cells: [{ text: "Type Of Soil", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.soil_type"], "......") }))] },
            { type: "data", cells: [{ text: "Last Crop", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.last_crop"], "......") }))] },
            { type: "data", cells: [{ text: "Weed Density", bold: true }, ...parsed.map((fd) => ({ text: minMaxAvgLines(fd, "site_soil", "weed_density", " (per m²)") }))] },
            { type: "data", cells: [{ text: "Weed Height", bold: true }, ...parsed.map((fd) => ({ text: minMaxAvgLines(fd, "site_soil", "weed_height", " mm") }))] },
            { type: "data", cells: [{ text: "Standing Water Level", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["site_soil.standing_water_level_mm"], "mm", "......") }))] },
            { type: "data", cells: [{ text: "Soil Moisture", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["site_soil.soil_moisture_percent"] || fd["moisture_meter_reading.soil_moisture.average"], "%", "......") }))] },
            {
                type: "data",
                forceHeight: 95,
                cells: [
                    { text: "Penetration\nResistance:\n(Force Vs. Depth)", bold: true },
                    ...parsed.map((fd) => ({
                        chart: Array.from({ length: 9 }, (_, d) => toNum(fd[`penetration_resistance.average.depth_${d + 1}`]))
                    }))
                ]
            },
            { type: "data", cells: [{ text: "Method of Field Operation", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.method_of_field_operation"], "Overlapping alternation pattern") }))] },
            {
                type: "data",
                cells: [
                    { text: "Operating Speed", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["traveling_speed_data.with_load.speed_m_s"] || fd["working_efficiency.traveling_speed_m_s"], "m/s", "......")} Gear ${blank(fd["travel_operation.operating_gear"], "...")} with ${blank(fd["travel_operation.engine_rpm"], "...")} engine rpm`
                    }))
                ]
            },
            { type: "data", cells: [{ text: "Wheel Slip", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["wheel_slip_result.wheel_slip_percent"], "%", "......") }))] },
            { type: "data", cells: [{ text: "Working Width", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["used_implement_data.working_width.ave_mm"], "mm", "......") }))] },
            { type: "data", cells: [{ text: "Working Depth", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["used_implement_data.working_depth.ave_mm"], "mm", "......") }))] },
            {
                type: "data",
                cells: [
                    { text: "Field Capacity", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["working_efficiency.field_capacity_ha_hr"], "ha/hr", "......")}\n${withUnit(fd["working_efficiency.field_capacity_acre_day"], "Acres/Day", "......")}`
                    }))
                ]
            },
            {
                type: "data",
                cells: [
                    { text: "Fuel Consumption", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["working_efficiency.fuel_consumption_l_hr"], "l /hr", "......")}\n${withUnit(fd["working_efficiency.fuel_consumption_l_ha"], "l /ha", "......")}`
                    }))
                ]
            }
        ];
        drawTable(doc, { x: MARGIN, colWidths, rows: lowRows, fontSize: 9, cellPadding: 3 });
    }

    const drawHighlandTable = (sectionTitle, tests, includeWeedAndShear = true) => {
        if (tests.length === 0) return;
        doc.addPage();
        doc.font(FONT_BOLD).fontSize(11).text(sectionTitle, { indent: 20 });
        doc.moveDown(0.3);

        const colW = (CONTENT_WIDTH - 145) / tests.length;
        const colWidths = [145, ...tests.map(() => colW)];
        const parsed = tests.map((t) => parseFormData(t.form_data));

        const rows = [
            { type: "data", cells: [{ text: "Date", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.test_date"], "......") }))] },
            { type: "data", cells: [{ text: "Place", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.location"], "......") }))] },
            { type: "data", cells: [{ text: "Land Condition", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.land_condition"], includeWeedAndShear ? "Normal land" : "After Plough with Disc Plough") }))] },
            { type: "data", cells: [{ text: "Coupled Tractor Model", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.coupled_tractor_model"], "......") }))] },
            { type: "data", cells: [{ text: "Tractor Power", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["site_soil.tractor_power_hp"], "hp", "......") }))] },
            { type: "data", cells: [{ text: "Field Shape", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.field_shape"], "Rectangular") }))] },
            { type: "data", cells: [{ text: "Type Of Soil", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.soil_type"], "......") }))] }
        ];
        if (includeWeedAndShear) {
            rows.push(
                { type: "data", cells: [{ text: "Last Crop", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.last_crop"], "......") }))] },
                { type: "data", cells: [{ text: "Weed Density", bold: true }, ...parsed.map((fd) => ({ text: minMaxAvgLines(fd, "site_soil", "weed_density", " (per m²)") }))] },
                { type: "data", cells: [{ text: "Weed Height", bold: true }, ...parsed.map((fd) => ({ text: minMaxAvgLines(fd, "site_soil", "weed_height", " mm") }))] }
            );
        }
        rows.push(
            { type: "data", cells: [{ text: "Soil Moisture", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["site_soil.soil_moisture_percent"] || fd["soil_meter_reading.soil_meter_reading.average"], "%", "......") }))] }
        );
        if (includeWeedAndShear) {
            rows.push(
                { type: "data", cells: [{ text: "Soil Shear Strength", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["soil_shear_strength.gauge_reading_kg_m.average"], "(kg. m)", "......") }))] }
            );
        }
        rows.push(
            { type: "data", cells: [{ text: "Method of Field Operation", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.method_of_field_operation"], "Overlapping alternation pattern") }))] },
            {
                type: "data",
                cells: [
                    { text: "Operating Speed", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["traveling_speed_data.with_load.speed_m_s"] || fd["working_efficiency.traveling_speed_m_s"], "m/s", "......")} Gear ${blank(fd["travel_operation.operating_gear"], "...")} with ${blank(fd["travel_operation.engine_rpm"], "...")} engine rpm`
                    }))
                ]
            },
            { type: "data", cells: [{ text: "Wheel Slip", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["wheel_slip_result.wheel_slip_percent"], "%", "......") }))] },
            { type: "data", cells: [{ text: "Working Width", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["used_implement_data.working_width.ave_mm"], "mm", "......") }))] }
        );
        if (includeWeedAndShear) {
            rows.push(
                { type: "data", cells: [{ text: "Working Depth", bold: true }, ...parsed.map((fd) => ({ text: withUnit(fd["used_implement_data.working_depth.ave_mm"], "mm", "......") }))] }
            );
        }
        rows.push(
            {
                type: "data",
                cells: [
                    { text: "Field Capacity", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["working_efficiency.field_capacity_ha_hr"], "ha/hr", "......")}\n${withUnit(fd["working_efficiency.field_capacity_acre_day"], "Acres/Day", "......")}`
                    }))
                ]
            },
            {
                type: "data",
                cells: [
                    { text: "Fuel Consumption", bold: true },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["working_efficiency.fuel_consumption_l_hr"], "l /hr", "......")}\n${withUnit(fd["working_efficiency.fuel_consumption_l_ha"], "l /ha", "......")}`
                    }))
                ]
            },
            { type: "data", cells: [{ text: "Condition After Operation", bold: true }, ...parsed.map((fd) => ({ text: blank(fd["site_soil.condition_after_operation"], "Fine particles") }))] }
        );
        drawTable(doc, { x: MARGIN, colWidths, rows, fontSize: 9.5, cellPadding: 4 });
    };

    drawHighlandTable("B.  Highland Operations", highlandNormalTests, true);
    drawHighlandTable("C.  Highland Operations (After Plough with Disc Plough)", highlandAfterDiscTests, false);

    // Final Page: ENDURANCE TEST + Signatures
    doc.addPage();
    heading("ENDURANCE TEST");
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `The ${formatValue(machine.model)} Rotary Tiller was operated on different soil conditions with different power sources. ` +
        `${enduranceData["endurance.breakdowns_reported"] || "It has shown satisfactory performance during the endurance test period."}`;
    doc.font(FONT).fontSize(11).text(enduranceText, { indent: 35, lineGap: 4 });
    doc.moveDown(2);

    drawSignatureBlocks(doc, labTest);

    doc.end();
    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    return createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Rotary Tiller Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};

// ============================================================================================
// 3. SHREDDER OFFICIAL REPORT (FMRC/OM/01/2026)
// ============================================================================================
export const generateOfficialShredderReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const labTest = allTests.find((t) => schemaKeyOf(t) === "SHREDDER_LAB") || allTests[0];
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const fieldTests = allTests.filter((t) => schemaKeyOf(t) === "SHREDDER_FIELD");

    const labData = parseFormData(labTest?.form_data);
    const enduranceData = parseFormData(enduranceTest?.form_data);

    const fileName = `FMRC-Official-Shredder-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/OM/01/${new Date().getFullYear()}`;
    drawCoverAndRemarks(doc, machine, docNumber, "REPORT ON TESTING &", "EVALUATION OF SHREDDER", "machine");

    const heading = (text) => {
        doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true });
        doc.moveDown(0.5);
    };

    // Page 3 (02): TITLE, INTRODUCTION, MANUFACTURER
    doc.addPage();
    heading("TITLE");
    doc.font(FONT).fontSize(11).text(`Test report on model ${formatValue(machine.model)} Shredder machine.`, { indent: 35 });
    doc.moveDown(1);

    heading("INTRODUCTION");
    const introText = machine.background_note ||
        `Model ${formatValue(machine.model)} Shredder machine handed over to Farm Mechanization Research Centre, Department of Agriculture, ` +
        `Mahailluppallama has been tested to verify the manufacturer's specifications, test its performance, durability and suitability for agriculture purpose in Sri Lanka.`;
    doc.font(FONT).fontSize(11).text(introText, { indent: 35, lineGap: 4 });
    doc.moveDown(1.2);

    heading("MANUFACTURER");
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(machine.importer_name || machine.manufacturer_country || "......................................", { lineGap: 4 });
    if (machine.importer_address) doc.text(machine.importer_address, { lineGap: 4 });
    doc.moveDown(0.4);
    if (machine.importer_tel) doc.text(`Tel     : ${machine.importer_tel}`, { lineGap: 4 });
    doc.font(FONT);

    // Page 4-5 (03-04): TEST PROCEDURE + VERIFICATION OF SPECIFICATIONS
    doc.addPage();
    heading("TEST PROCEDURE");
    doc.font(FONT).fontSize(11).text(
        "The machine was tested to verify its specification. Test conditions, material properties and machine Parameters, were recorded before and " +
        "after operation. Performance and field capacity were evaluated under standard operating condition. An endurance test was conducted to assess durability and reliability.",
        { indent: 35, lineGap: 4 }
    );
    doc.moveDown(1);

    heading("VERIFICATION OF SPECIFICATIONS");
    doc.moveDown(0.2);

    const specRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "group", label: "Overall Dimension" },
        { type: "data", cells: [{ text: "L x W x H" }, { text: blank(labData["overall_and_frame.overall_lxwxh"]) }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["overall_and_frame.weight"]) }] },
        { type: "group", label: "Frame" },
        { type: "data", cells: [{ text: "Overall dimension (L x W x H)" }, { text: blank(labData["overall_and_frame.frame_lxwxh"]) }] },
        { type: "data", cells: [{ text: "Material" }, { text: blank(labData["overall_and_frame.frame_material"]) }] },
        { type: "group", label: "Cutting Unit" },
        { type: "data", cells: [{ text: "Knife Supporting Unit (D x T)" }, { text: blank(labData["cutting_unit.knife_supporting_unit"]) }] },
        { type: "data", cells: [{ text: "Knife mounting method" }, { text: blank(labData["cutting_unit.knife_mounting_method"]) }] },
        { type: "data", cells: [{ text: "Flat Knife Dimension (L x W x T)" }, { text: blank(labData["cutting_unit.flat_knife_dim"]) }] },
        { type: "data", cells: [{ text: "Weight of Blade" }, { text: blank(labData["cutting_unit.weight_of_blade"]) }] },
        { type: "data", cells: [{ text: "No. of Blade" }, { text: blank(labData["cutting_unit.num_blades"]) }] },
        { type: "data", cells: [{ text: "Side cover" }, { text: blank(labData["cutting_unit.side_cover"]) }] },
        { type: "data", cells: [{ text: "Top cover" }, { text: blank(labData["cutting_unit.top_cover"]) }] },
        { type: "group", label: "Feeding Unit" },
        { type: "data", cells: [{ text: "Feeding Chute (T x L x W)" }, { text: blank(labData["feeding_unit.feeding_chute_txlxw"]) }] },
        { type: "data", cells: [{ text: "Feeding Hole (L x H)" }, { text: blank(labData["feeding_unit.feeding_hole_lxh"]) }] },
        { type: "data", cells: [{ text: "Feeding chute (L x W x T)" }, { text: blank(labData["feeding_unit.feeding_chute_lxwxt"]) }] },
        { type: "group", label: "Power Transmission" },
        { type: "data", cells: [{ text: "Type" }, { text: blank(labData["power_transmission.type"]) }] },
        { type: "data", cells: [{ text: "Belt size" }, { text: blank(labData["power_transmission.belt_size"]) }] },
        { type: "data", cells: [{ text: "Number of belts" }, { text: blank(labData["power_transmission.num_belts"]) }] },
        { type: "data", cells: [{ text: "Driven shaft diameter" }, { text: blank(labData["power_transmission.driven_shaft_dia"]) }] },
        { type: "data", cells: [{ text: "Driven pulley diameter" }, { text: blank(labData["power_transmission.driven_pulley_dia"]) }] },
        { type: "data", cells: [{ text: "Drive shaft diameter" }, { text: blank(labData["power_transmission.drive_shaft_dia"]) }] },
        { type: "data", cells: [{ text: "Drive pulley diameter" }, { text: blank(labData["power_transmission.drive_pulley_dia"]) }] },
        { type: "data", cells: [{ text: "Pulley cover" }, { text: blank(labData["power_transmission.pulley_cover"]) }] },
        { type: "group", label: "Outlet (Top position)" },
        { type: "data", cells: [{ text: "Material" }, { text: blank(labData["outlets.top_outlet_material"]) }] },
        { type: "data", cells: [{ text: "Dimension (L x W x T)" }, { text: blank(labData["outlets.top_outlet_dim"]) }] },
        { type: "group", label: "Outlet 02 (Bottom position)" },
        { type: "data", cells: [{ text: "Material" }, { text: blank(labData["outlets.bottom_outlet_material"]) }] },
        { type: "data", cells: [{ text: "Dimension (L x W x T)" }, { text: blank(labData["outlets.bottom_outlet_dim"]) }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [220, 275], rows: specRows, fontSize: 10, cellPadding: 4.5 });

    // Page 6 (05): PERFORMANCE TEST (Test 01 | Test 02 | Test 03)
    if (fieldTests.length > 0) {
        doc.addPage();
        heading("PERFORMANCE TEST");
        doc.moveDown(0.2);

        const leftW = 190;
        const testColW = (CONTENT_WIDTH - leftW) / fieldTests.length;
        const colWidths = [leftW, ...fieldTests.map(() => testColW)];
        const parsed = fieldTests.map((t) => parseFormData(t.form_data));

        const perfRows = [
            {
                type: "header",
                cells: [
                    { text: "", bold: true },
                    ...fieldTests.map((_, idx) => ({ text: `Test ${String(idx + 1).padStart(2, "0")}`, bold: true, align: "center" }))
                ]
            },
            { type: "group", label: "Test Conditions" },
            { type: "data", cells: [{ text: "Date" }, ...parsed.map((fd) => ({ text: blank(fd["test_conditions.test_date"], "-") }))] },
            { type: "data", cells: [{ text: "Location" }, ...parsed.map((fd) => ({ text: blank(fd["test_conditions.location"], "-") }))] },
            { type: "data", cells: [{ text: "Type of Fodder" }, ...parsed.map((fd) => ({ text: blank(fd["fodder_details.fodder_type"], "-") }))] },
            { type: "data", cells: [{ text: "Power source" }, ...parsed.map((fd) => ({ text: blank(fd["test_conditions.used_tractor"], "-") }))] },
            { type: "data", cells: [{ text: "Fodder Weight" }, ...parsed.map((fd) => ({ text: withUnit(fd["fodder_details.fodder_weight_kg"], "kg", "-") }))] },
            { type: "data", cells: [{ text: "Fodder Diameter Average\n(Without Chopping)" }, ...parsed.map((fd) => ({ text: withUnit(fd["fodder_details.stem_dia_avg_mm"], "mm", "-") }))] },
            { type: "data", cells: [{ text: "Fodder Length Average\n(Without Chopping)" }, ...parsed.map((fd) => ({ text: withUnit(fd["fodder_details.length_avg_mm"], "mm", "-") }))] },
            { type: "data", cells: [{ text: "PTO rpm Average\n(With load)" }, ...parsed.map((fd) => ({ text: withUnit(fd["test_conditions.pto_rpm_with_load"], "rpm", "-") }))] },
            { type: "data", cells: [{ text: "Machine rpm Average\n(With load)" }, ...parsed.map((fd) => ({ text: withUnit(fd["test_conditions.cutter_rpm_with_load"], "rpm", "-") }))] },
            { type: "data", cells: [{ text: "Sound Level" }, ...parsed.map((fd) => ({ text: withUnit(fd["test_conditions.sound_level_db"], "dB", "-") }))] },
            {
                type: "span_left_group",
                leftWidth: 85,
                groupLabel: "Thrown\noutput\nArea",
                subRows: [
                    { param: "Length (Max)", values: parsed.map((fd) => withUnit(fd["output_and_capacity.thrown_length_max_m"], "m", "-")) },
                    { param: "Width (Max)", values: parsed.map((fd) => withUnit(fd["output_and_capacity.thrown_width_max_m"], "m", "-")) }
                ]
            },
            {
                type: "data",
                cells: [
                    { text: "Capacity (with 2 workers\nInvolved in feeding)" },
                    ...parsed.map((fd) => ({
                        text: `${withUnit(fd["output_and_capacity.capacity_kg_min"], "kg/min", "-")}\n${withUnit(fd["output_and_capacity.capacity_kg_hr"], "kg/hr", "-")}`
                    }))
                ]
            },
            { type: "data", cells: [{ text: "Fuel Consumption" }, ...parsed.map((fd) => ({ text: withUnit(fd["output_and_capacity.fuel_consumption_l_hr"], "l /hr", "-") }))] },
            {
                type: "span_left_group",
                leftWidth: 85,
                groupLabel: "Particle size\n(per 500g)",
                subRows: [
                    { param: "Above 5cm", values: parsed.map((fd) => withUnit(fd["output_and_capacity.particle_above_5cm"], "%", "-")) },
                    { param: "Below 5cm", values: parsed.map((fd) => withUnit(fd["output_and_capacity.particle_below_5cm"], "%", "-")) }
                ]
            }
        ];
        drawTable(doc, { x: MARGIN, colWidths, rows: perfRows, fontSize: 10, cellPadding: 4 });
        doc.moveDown(0.5);
        doc.font(FONT).fontSize(11).text("*   Not recommended for coconut outer husk.");
    }

    // Final Page (06): ENDURANCE TEST + Signatures
    doc.addPage();
    heading("ENDURANCE TEST");
    const enduranceHours = enduranceData["endurance.hours_operated"] || "150";
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `Shedder machine was operated for more than ${enduranceHours} hours. ` +
        `${enduranceData["endurance.breakdowns_reported"] || "Major breakdowns or performance abnormalities were not reported during the period of endurance test."}`;
    doc.font(FONT).fontSize(11).text(enduranceText, { indent: 35, lineGap: 4 });
    doc.moveDown(2);

    drawSignatureBlocks(doc, labTest);

    doc.end();
    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    return createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Shredder Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};

// ============================================================================================
// 4. BRUSH CUTTER OFFICIAL REPORT (FMRC/BC/01/2026)
// ============================================================================================
const renderPumpCurveChart = (doc, pointsData, x, y, width, height) => {
    doc.rect(x, y, width, height).stroke("#888888");
    doc.font(FONT_BOLD).fontSize(12).fillColor("#333333")
        .text("Pump Characteristic Curve", x, y + 10, { width, align: "center" });

    const plotX = x + 55;
    const plotY = y + 36;
    const plotW = width - 80;
    const plotH = height - 75;

    const maxHead = 12;
    const maxFlow = Math.max(400, ...pointsData.map((p) => p.flow || 0));

    // Horizontal grid lines (0, 2, 4, 6, 8, 10, 12)
    doc.font(FONT).fontSize(8).fillColor("#444444");
    for (let h = 0; h <= maxHead; h += 2) {
        const gy = plotY + plotH - (h / maxHead) * plotH;
        doc.strokeColor("#dddddd").lineWidth(0.6).moveTo(plotX, gy).lineTo(plotX + plotW, gy).stroke();
        doc.text(String(h), plotX - 24, gy - 4, { width: 20, align: "right" });
    }

    // Vertical grid lines
    const stepX = maxFlow <= 400 ? 50 : Math.ceil(maxFlow / 8 / 50) * 50;
    for (let f = 0; f <= maxFlow; f += stepX) {
        const gx = plotX + (f / maxFlow) * plotW;
        doc.strokeColor("#dddddd").lineWidth(0.6).moveTo(gx, plotY).lineTo(gx, plotY + plotH).stroke();
        doc.text(String(f), gx - 15, plotY + plotH + 5, { width: 30, align: "center" });
    }

    doc.font(FONT_BOLD).fontSize(9).fillColor("#333333");
    doc.text("Discharge (l/min)", plotX, plotY + plotH + 20, { width: plotW, align: "center" });
    doc.text("Total Head (m)", x + 4, plotY + plotH / 2 - 10, { width: 45, align: "center" });

    const valid = pointsData.filter((p) => p.flow !== null && p.head !== null);
    if (valid.length > 0) {
        doc.strokeColor("#2b6cb0").lineWidth(1.8);
        valid.forEach((p, idx) => {
            const px = plotX + (p.flow / maxFlow) * plotW;
            const py = plotY + plotH - (p.head / maxHead) * plotH;
            if (idx === 0) doc.moveTo(px, py);
            else doc.lineTo(px, py);
        });
        doc.stroke();

        valid.forEach((p) => {
            const px = plotX + (p.flow / maxFlow) * plotW;
            const py = plotY + plotH - (p.head / maxHead) * plotH;
            doc.circle(px, py, 2.5).fill("#2b6cb0");
        });
    }

    doc.lineWidth(1).strokeColor("#000000").fillColor("#000000");
};

export const generateOfficialBrushCutterReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const labTest = allTests.find((t) => schemaKeyOf(t) === "BRUSH_CUTTER_LAB") || allTests[0];
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const pumpTest = allTests.find((t) => schemaKeyOf(t) === "BRUSH_CUTTER_PUMP_FIELD");
    const fieldTests = allTests.filter((t) => schemaKeyOf(t) === "BRUSH_CUTTER_FIELD");

    const labData = parseFormData(labTest?.form_data);
    const enduranceData = parseFormData(enduranceTest?.form_data);
    const pumpData = parseFormData(pumpTest?.form_data);

    const fileName = `FMRC-Official-Brush-Cutter-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/BC/01/${new Date().getFullYear()}`;
    drawCoverAndRemarks(
        doc,
        machine,
        docNumber,
        "REPORT ON TESTING &",
        "EVALUATION OF BACK PACK TYPE BRUSH CUTTER",
        "equipment"
    );

    const numberedHeading = (num, title) => {
        doc.font(FONT_BOLD).fontSize(11).text(`${num} `, MARGIN, doc.y, { continued: true, underline: false });
        doc.text(title, { underline: true });
        doc.moveDown(0.5);
    };

    // Page 3 (02): 01. INTRODUCTION, 02. PRODUCT INFORMATION, 03. OBJECTIVE
    doc.addPage();
    numberedHeading("01.", "INTRODUCTION");
    const introText = machine.background_note ||
        `Brush cutter, Model ${formatValue(machine.model)} was submitted to Farm Mechanization Research Centre (FMRC) for testing ` +
        `the field performance and durability. This report presents the results of performance testing and observation of the machine.`;
    doc.font(FONT).fontSize(11).text(introText, MARGIN + 35, doc.y, { width: CONTENT_WIDTH - 35, lineGap: 4 });
    doc.moveDown(1.2);

    numberedHeading("02.", "PRODUCT INFORMATION");
    const prodInfo = [
        ["Manufacturer", machine.manufacturer_country || "Zhejiang, China"],
        ["Importer", [machine.importer_name, machine.importer_address].filter(Boolean).join(", ") || "......................................"],
        ["Model", formatValue(machine.model)],
        ["Type", "Back pack"],
        ["Tel", machine.importer_tel || "......................................"],
        ["E-mail", machine.importer_email || "......................................"]
    ];
    prodInfo.forEach(([label, val]) => {
        const y = doc.y;
        doc.font(FONT_BOLD).fontSize(11).text(label, MARGIN + 35, y);
        doc.font(FONT).fontSize(11).text(`:  ${val}`, MARGIN + 150, y, { width: CONTENT_WIDTH - 150 });
        doc.moveDown(0.3);
    });
    doc.moveDown(0.8);

    numberedHeading("03.", "OBJECTIVE");
    const objectives = [
        "Verification of manufacturer's specifications",
        "Performance Evaluation",
        "Make necessary recommendations to improve for better adoption for local conditions."
    ];
    objectives.forEach((obj) => {
        doc.font(FONT).fontSize(11).text(`•   ${obj}`, MARGIN + 50, doc.y, { lineGap: 4 });
    });

    // Page 4 (03): 04. TEST METHODOLOGY, 05. SPECIFICATION VERIFICATION (5.1)
    doc.addPage();
    numberedHeading("04.", "TEST METHODOLOGY");
    doc.font(FONT).fontSize(11).text(
        "The standard procedures practiced by FMRC and RNAM test codes for power operated brush cutter have been used throughout the test.",
        MARGIN + 35,
        doc.y,
        { width: CONTENT_WIDTH - 35, lineGap: 4 }
    );
    doc.moveDown(1.2);

    numberedHeading("05.", "SPECIFICATION VERIFICATION");
    doc.font(FONT_BOLD).fontSize(11).text("5.1 ", MARGIN + 20, doc.y, { continued: true });
    doc.text("VERIFICATION OF MANUFACTURER SPECIFICATION", { underline: true });
    doc.moveDown(0.5);

    const mfgRows = [
        {
            type: "header",
            cells: [
                { text: "", bold: true },
                { text: "Manufacturer\nSpecification", bold: true, align: "center" },
                { text: "Verification", bold: true, align: "center" }
            ]
        },
        { type: "data", cells: [{ text: "Model", bold: true }, { text: blank(labData["manufacturer_specs.model_mfg"], machine.model), align: "center" }, { text: blank(labData["manufacturer_specs.model_ver"], machine.model), align: "center" }] },
        { type: "data", cells: [{ text: "Engine Type", bold: true }, { text: blank(labData["manufacturer_specs.engine_type_mfg"], "4-Stroke"), align: "center" }, { text: blank(labData["manufacturer_specs.engine_type_ver"], "4-Stroke"), align: "center" }] },
        { type: "data", cells: [{ text: "Displacement", bold: true }, { text: blank(labData["manufacturer_specs.displacement_mfg"], "37.7 CC"), align: "center" }, { text: blank(labData["manufacturer_specs.displacement_ver"], "37.7 CC"), align: "center" }] },
        { type: "data", cells: [{ text: "Carburettor", bold: true }, { text: blank(labData["manufacturer_specs.carburettor_mfg"], "Diaphragm Type"), align: "center" }, { text: blank(labData["manufacturer_specs.carburettor_ver"], "Diaphragm Type"), align: "center" }] },
        { type: "data", cells: [{ text: "Starting Method", bold: true }, { text: blank(labData["manufacturer_specs.starting_method_mfg"], "Recoil Starter"), align: "center" }, { text: blank(labData["manufacturer_specs.starting_method_ver"], "Recoil Starter"), align: "center" }] },
        { type: "data", cells: [{ text: "Fuel Tank Capacity", bold: true }, { text: blank(labData["manufacturer_specs.fuel_tank_mfg"], "0.65 l"), align: "center" }, { text: blank(labData["manufacturer_specs.fuel_tank_ver"], "0.73 l"), align: "center" }] },
        { type: "data", cells: [{ text: "Net weight", bold: true }, { text: blank(labData["manufacturer_specs.net_weight_mfg"], "-"), align: "center" }, { text: blank(labData["manufacturer_specs.net_weight_ver"], "11.5 kg"), align: "center" }] }
    ];
    drawTable(doc, { x: MARGIN + 20, colWidths: [155, 160, 160], rows: mfgRows, fontSize: 10, cellPadding: 5 });

    // Page 5-7: 5.2 VERIFICATION OF OTHER SPECIFICATION
    doc.addPage();
    doc.font(FONT_BOLD).fontSize(11).text("5.2 ", MARGIN + 20, doc.y, { continued: true });
    doc.text("VERIFICATION OF OTHER SPECIFICATION", { underline: true });
    doc.moveDown(0.5);

    const otherRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Specification", bold: true, align: "center" }] },
        { type: "group", label: "Engine" },
        { type: "data", cells: [{ text: "Idle Speed (rpm)" }, { text: blank(labData["other_specs.idle_speed_rpm"], "2900"), align: "center" }] },
        { type: "data", cells: [{ text: "Max Load Speed (rpm)" }, { text: blank(labData["other_specs.max_load_speed_rpm"], "9400"), align: "center" }] },
        { type: "data", cells: [{ text: "Spark Plug" }, { text: blank(labData["other_specs.spark_plug"], "CMR6A"), align: "center" }] },
        { type: "data", cells: [{ text: "Cooling System" }, { text: blank(labData["other_specs.cooling_system"], "Forced Air"), align: "center" }] },
        { type: "data", cells: [{ text: "Air filter type" }, { text: blank(labData["other_specs.air_filter_type"], "Dry"), align: "center" }] },
        { type: "data", cells: [{ text: "Engine Mounting Method" }, { text: blank(labData["other_specs.engine_mounting_method"], "Back Pack"), align: "center" }] },
        { type: "group", label: "Transmission" },
        { type: "data", cells: [{ text: "Power Transmission Method" }, { text: blank(labData["other_specs.power_transmission_method"], "Flexible shaft and Rigid Shaft"), align: "center" }] },
        { type: "group", label: "Dimension" },
        { type: "data", cells: [{ text: "Overall Dimension (L x W x H)" }, { text: blank(labData["other_specs.overall_dim_lxwxh"], "2815 mm x 310 mm x 450 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Length of Flexible Drive" }, { text: blank(labData["other_specs.flexible_drive_length"], "885 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Shaft Arm" }, { text: blank(labData["other_specs.shaft_arm_mm"], "1530 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Grip Length" }, { text: blank(labData["other_specs.grip_length_mm"], "110 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Strap (L x W x T)" }, { text: blank(labData["other_specs.strap_lxwxt"], "900 mm x 28 mm x 1.65 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Comfortable part (L x W x T)" }, { text: blank(labData["other_specs.comfortable_part_lxwxt"], "395 mm x 70 mm x 14 mm"), align: "center" }] },
        { type: "group", label: "Material of Construction" },
        { type: "data", cells: [{ text: "Straps" }, { text: blank(labData["other_specs.material_straps"], "Fabric & Sponge"), align: "center" }] },
        { type: "data", cells: [{ text: "Hand Grip" }, { text: blank(labData["other_specs.material_hand_grip"], "Rubber"), align: "center" }] },
        { type: "data", cells: [{ text: "Handle" }, { text: blank(labData["other_specs.material_handle"], "Plastic"), align: "center" }] },
        { type: "data", cells: [{ text: "Frame" }, { text: blank(labData["other_specs.material_frame"], "Plastic"), align: "center" }] },
        { type: "group", label: "Safety Guard" },
        { type: "data", cells: [{ text: "Material" }, { text: blank(labData["other_specs.material_safety_guard"], "Plastic"), align: "center" }] },
        { type: "group", label: "Attachment" },
        { type: "group", label: "Nylon Cutter" },
        { type: "data", cells: [{ text: "Disc Diameter" }, { text: blank(labData["attachments_specs.nylon_disc_dia"], "118 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Thickness" }, { text: blank(labData["attachments_specs.nylon_thickness"], "65 mm"), align: "center" }] },
        { type: "group", label: "Two Teeth Blade" },
        { type: "data", cells: [{ text: "Dimension (L x W x T)" }, { text: blank(labData["attachments_specs.two_teeth_dim"], "302 mm x 90 mm x 1.56 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.two_teeth_hardness"], "41.8 HRC"), align: "center" }] },
        { type: "group", label: "Teeth Disc" },
        { type: "data", cells: [{ text: "Diameter" }, { text: blank(labData["attachments_specs.teeth_disc_dia"], "255 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Thickness" }, { text: blank(labData["attachments_specs.teeth_disc_thickness"], "1.35 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.teeth_disc_hardness"], "44.5 HRC"), align: "center" }] },
        { type: "data", cells: [{ text: "No. of Teeth" }, { text: blank(labData["attachments_specs.teeth_disc_num_teeth"], "40"), align: "center" }] },
        { type: "group", label: "Weeder" },
        { type: "data", cells: [{ text: "Dimension (L x W )" }, { text: blank(labData["attachments_specs.weeder_dim"], "350 mm x 315 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["attachments_specs.weeder_weight"], "4 kg"), align: "center" }] },
        { type: "data", cells: [{ text: "Blade dimension (L x W x T)" }, { text: blank(labData["attachments_specs.weeder_blade_dim"], "80 mm x 35 mm x 3.2 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.weeder_hardness"], "44.7 HRC"), align: "center" }] },
        { type: "data", cells: [{ text: "No. of Blade" }, { text: blank(labData["attachments_specs.weeder_num_blade"], "12"), align: "center" }] },
        { type: "group", label: "Sweeper" },
        { type: "data", cells: [{ text: "Dimension (L x W )" }, { text: blank(labData["attachments_specs.sweeper_dim"], "580 mm x 315 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["attachments_specs.sweeper_weight"], "5.8 kg"), align: "center" }] },
        { type: "data", cells: [{ text: "Blade dimension (L x W x T)" }, { text: blank(labData["attachments_specs.sweeper_blade_dim"], "125 mm x 550 mm x 1.2 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.sweeper_hardness"], "-"), align: "center" }] },
        { type: "data", cells: [{ text: "No. of Blade" }, { text: blank(labData["attachments_specs.sweeper_num_blade"], "24"), align: "center" }] },
        { type: "group", label: "Tiller" },
        { type: "data", cells: [{ text: "Dimension (L x W )" }, { text: blank(labData["attachments_specs.tiller_dim"], "320 mm x 255 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["attachments_specs.tiller_weight"], "4 kg"), align: "center" }] },
        { type: "data", cells: [{ text: "Blade dimension (L x W x T)" }, { text: blank(labData["attachments_specs.tiller_blade_dim"], "95 mm x 20 mm x 2.74 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.tiller_hardness"], "29 HRC"), align: "center" }] },
        { type: "data", cells: [{ text: "No. of Blade" }, { text: blank(labData["attachments_specs.tiller_num_blade"], "16"), align: "center" }] },
        { type: "group", label: "Chain Saw" },
        { type: "data", cells: [{ text: "Dimension (L x W x T)" }, { text: blank(labData["attachments_specs.chainsaw_dim"], "345 mm x 55 mm x 4.55 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "No. of Teeth" }, { text: blank(labData["attachments_specs.chainsaw_num_teeth"], "22"), align: "center" }] },
        { type: "data", cells: [{ text: "Dry Weight" }, { text: blank(labData["attachments_specs.chainsaw_dry_weight"], "1.6 kg"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight with oil" }, { text: blank(labData["attachments_specs.chainsaw_weight_with_oil"], "1.8 kg"), align: "center" }] },
        { type: "data", cells: [{ text: "Lubricant oil Capacity" }, { text: blank(labData["attachments_specs.chainsaw_oil_capacity"], "140 ml"), align: "center" }] },
        { type: "group", label: "Paddy Harvester" },
        { type: "data", cells: [{ text: "Dimension (L x W x H)" }, { text: blank(labData["attachments_specs.paddy_dim"], "385 mm x 255 mm x 270 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Blade dimension (D x T)" }, { text: blank(labData["attachments_specs.paddy_blade_dim"], "255 mm x 1.35 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["attachments_specs.paddy_weight"], "800 g"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.paddy_hardness"], "44.5 HRC"), align: "center" }] },
        { type: "data", cells: [{ text: "No. of Teeth" }, { text: blank(labData["attachments_specs.paddy_num_teeth"], "40"), align: "center" }] },
        { type: "group", label: "Hedge Trimmer" },
        { type: "data", cells: [{ text: "Dimension (L x W x T)" }, { text: blank(labData["attachments_specs.trimmer_dim"], "905 mm x 95 mm x 2 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Cutting Length" }, { text: blank(labData["attachments_specs.trimmer_cutting_length"], "410 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Hardness" }, { text: blank(labData["attachments_specs.trimmer_hardness"], "42.3 HRC"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["attachments_specs.trimmer_weight"], "2.1 kg"), align: "center" }] },
        { type: "group", label: "Pump Unit" },
        { type: "data", cells: [{ text: "Dimension (L x W x H)" }, { text: blank(labData["attachments_specs.pump_dim"], "250 mm x 230 mm x 120 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Weight" }, { text: blank(labData["attachments_specs.pump_weight"], "1.6 kg"), align: "center" }] },
        { type: "data", cells: [{ text: "Discharge port diameter" }, { text: blank(labData["attachments_specs.pump_discharge_dia"], "27 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Suction Port diameter" }, { text: blank(labData["attachments_specs.pump_suction_dia"], "38 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "Impeller Type" }, { text: blank(labData["attachments_specs.pump_impeller_type"], "Semi Open"), align: "center" }] },
        { type: "data", cells: [{ text: "Impeller weight" }, { text: blank(labData["attachments_specs.pump_impeller_weight"], "98 g"), align: "center" }] },
        { type: "data", cells: [{ text: "Impeller dimension (D x L x T)" }, { text: blank(labData["attachments_specs.pump_impeller_dim"], "100 mm x 35 mm x 6 mm"), align: "center" }] },
        { type: "data", cells: [{ text: "No of impeller vanes" }, { text: blank(labData["attachments_specs.pump_num_vanes"], "03"), align: "center" }] }
    ];
    drawTable(doc, { x: MARGIN + 20, colWidths: [215, 250], rows: otherRows, fontSize: 10, cellPadding: 4.5 });

    // Helper for 3-column attachment performance tables
    const runCols = ["run1", "run2", "run3"];
    const cellVal = (fd, key, col, unit = "", fallback = "-") => {
        const v = fd[`runs_table.${key}.${col}`];
        if (v === undefined || v === null || v === "") return fallback;
        return unit ? withUnit(v, unit, fallback) : String(v);
    };
    const minMaxAvgBlock = (fd, col, prefix, unit) => {
        const min = cellVal(fd, `${prefix}_min`, col, unit, "-");
        const max = cellVal(fd, `${prefix}_max`, col, unit, "-");
        const avg = cellVal(fd, `${prefix}_avg`, col, unit, "-");
        return `Min : ${min}\nMax: ${max}\nAverage : ${avg}`;
    };

    const findAttachmentTest = (keyword) =>
        fieldTests.find((t) => {
            const fd = parseFormData(t.form_data);
            const name = `${t.test_name || ""} ${fd["device_info.cutting_device"] || ""}`.toLowerCase();
            return name.includes(keyword.toLowerCase());
        });

    const drawAttachmentPage = (isFirstPerfPage, deviceLabel, fd, config) => {
        doc.addPage();
        if (isFirstPerfPage) {
            numberedHeading("06.", "PERFORMANCE TEST");
            doc.moveDown(0.3);
        }
        const colWidths = [165, 110, 110, 110];
        const rows = [
            { type: "data", cells: [{ text: "Cutting Device", bold: true }, { text: deviceLabel, bold: true, align: "center" }], colWidths: [165, 330] },
            { type: "group", label: "Test Condition" },
            { type: "data", cells: [{ text: "Date", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "test_date", c), align: "center" }))] },
            { type: "data", cells: [{ text: "Location", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "location", c), align: "center" }))] }
        ];

        if (config.varietyMethod) {
            rows.push(
                { type: "data", cells: [{ text: "Variety", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "type_of_grass_or_crop", c), align: "center" }))] },
                { type: "data", cells: [{ text: "Planting Method", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "variety_or_method", c), align: "center" }))] }
            );
        } else if (config.cropLabel) {
            rows.push({
                type: "data",
                cells: [{ text: config.cropLabel, bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "type_of_grass_or_crop", c), align: "center" }))]
            });
        }

        if (config.includeRowSpacing) {
            rows.push({ type: "data", cells: [{ text: "Row Spacing", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "row_spacing_mm", c, "mm"), align: "center" }))] });
        }
        if (config.includeSoil) {
            rows.push(
                { type: "data", cells: [{ text: "Type of Soil", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "soil_type", c), align: "center" }))] },
                { type: "data", cells: [{ text: "Average Soil Moisture", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "soil_moisture_percent", c, "%"), align: "center" }))] }
            );
        }
        if (config.maxHeightLabel) {
            rows.push({
                type: "data",
                cells: [{ text: config.maxHeightLabel, bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "max_cutting_height_mm", c, "mm"), align: "center" }))]
            });
        }
        if (config.stemLabel) {
            rows.push({
                type: "data",
                cells: [{ text: config.stemLabel, bold: true }, ...runCols.map((c) => ({ text: minMaxAvgBlock(fd, c, "stem_dia", config.stemUnit || "mm") }))]
            });
        }
        if (config.heightLabel) {
            rows.push({
                type: "data",
                cells: [{ text: config.heightLabel, bold: true }, ...runCols.map((c) => ({ text: minMaxAvgBlock(fd, c, "grass_height", "mm") }))]
            });
        }
        if (config.densityLabel) {
            rows.push({
                type: "data",
                cells: [{ text: config.densityLabel, bold: true }, ...runCols.map((c) => ({ text: minMaxAvgBlock(fd, c, "weed_density", config.densityUnit || "(per/m²)") }))]
            });
        }

        rows.push({ type: "group", label: "Observations" });
        if (!config.hideCuttingHeight) {
            rows.push({
                type: "data",
                cells: [{ text: "Cutting Height", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "cutting_height_mm", c, "mm"), align: "center" }))]
            });
        }
        rows.push(
            {
                type: "data",
                cells: [{ text: "Working Speed", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "working_speed_ms", c, config.speedUnit || "m/s"), align: "center" }))]
            },
            { type: "group", label: "Machine Performance Results" },
            {
                type: "data",
                cells: [{ text: "Fuel Consumption", bold: true }, ...runCols.map((c) => ({ text: cellVal(fd, "fuel_consumption_l_hr", c, "l/hr"), align: "center" }))]
            }
        );

        if (!config.hideFieldCapacity) {
            rows.push({
                type: "data",
                cells: [
                    { text: "Field Capacity", bold: true },
                    ...runCols.map((c) => ({
                        text: `${cellVal(fd, "field_capacity_ha_hr", c, config.capUnit1 || "ha/hr")}\n${cellVal(fd, "field_capacity_acres_day", c, config.capUnit2 || "acres/day")}`,
                        align: "center"
                    }))
                ]
            });
        }

        rows.push({
            type: "data",
            cells: [
                { text: "Sound Level\n(At Operator's Ear Level)", bold: true },
                ...runCols.map((c) => ({ text: cellVal(fd, "sound_level_db", c, "dB"), align: "center" }))
            ]
        });

        drawTable(doc, { x: MARGIN, colWidths, rows, fontSize: 10, cellPadding: 5 });
    };

    const attachmentConfigs = [
        { key: "nylon", label: "Nylon Cutter", cropLabel: "Type of Grass", stemLabel: "Stem Diameter of Grass", heightLabel: "Height of Grass", densityLabel: "Weed Density" },
        { key: "two teeth", label: "Two Teeth Blade", cropLabel: "Type of Grass", stemLabel: "Stem Diameter of Grass", heightLabel: "Height of Grass", densityLabel: "Weed Density" },
        { key: "teeth disc", label: "Teeth Disc", cropLabel: "Type of Grass", stemLabel: "Stem Diameter of Grass", heightLabel: "Height of Grass", densityLabel: "Weed Density" },
        { key: "weeder", label: "Weeder", cropLabel: "Type of Crop", includeRowSpacing: true, includeSoil: true, stemLabel: "Stem Diameter", heightLabel: "Weed Height", densityLabel: "Weed Density" },
        { key: "sweeper", label: "Sweeper", cropLabel: "Type of Grass", stemLabel: "Stem Diameter", heightLabel: "Weed Height", densityLabel: "Weed Density" },
        { key: "tiller", label: "Tiller", cropLabel: "Type of Crop", includeRowSpacing: true, includeSoil: true, stemLabel: "Stem Diameter", heightLabel: "Weed Height", densityLabel: "Weed Density" },
        { key: "chain", label: "Chain saw", cropLabel: "Type of Crop", maxHeightLabel: "Maximum Cutting Height", stemLabel: "Diameter of Stem", hideCuttingHeight: true, hideFieldCapacity: true, speedUnit: "" },
        { key: "paddy", label: "Paddy Harvester", varietyMethod: true, maxHeightLabel: "Length of Crop", stemLabel: "Lodging Angle of Plant", stemUnit: "°", densityLabel: "Paddy Density", densityUnit: "Hills/m²" },
        { key: "trimmer", label: "Trimmer", cropLabel: "Type of Plant", maxHeightLabel: "Maximum Cutting Height", stemLabel: "Diameter of Stem", hideCuttingHeight: true, capUnit1: "m²/hr", capUnit2: "m²/day" }
    ];

    attachmentConfigs.forEach((cfg, idx) => {
        const testRec = findAttachmentTest(cfg.key);
        const fd = parseFormData(testRec?.form_data);
        drawAttachmentPage(idx === 0, cfg.label, fd, cfg);
    });

    // Page 17 (16): Pump Unit Performance Test + Pump Characteristic Curve
    doc.addPage();
    const pumpRows = [
        { type: "data", cells: [{ text: "Cutting Device", bold: true }, { text: "Pump Unit", bold: true, align: "center" }], colWidths: [145, 350] },
        { type: "group", label: "Test Condition" },
        { type: "data", cells: [{ text: "Location", bold: true }, { text: blank(pumpData["pump_conditions.location"], "FMRC"), align: "center" }], colWidths: [145, 350] },
        { type: "data", cells: [{ text: "Suction Head", bold: true }, { text: withUnit(pumpData["pump_conditions.suction_head_m"], "m", "1.5 m"), align: "center" }], colWidths: [145, 350] },
        { type: "data", cells: [{ text: "Engine rpm", bold: true }, { text: blank(pumpData["pump_conditions.engine_rpm"], "7000"), align: "center" }], colWidths: [145, 350] },
        { type: "data", cells: [{ text: "Fuel Consumption", bold: true }, { text: withUnit(pumpData["pump_conditions.fuel_consumption_l_hr"], "l/hr", "1.2 l/hr"), align: "center" }], colWidths: [145, 350] },
        { type: "data", cells: [{ text: "Date", bold: true }, { text: blank(pumpData["pump_conditions.test_date"], "26.01.2026"), align: "center" }], colWidths: [145, 350] },
        {
            type: "data",
            colWidths: [145, 116, 117, 117],
            cells: [
                { text: "Total Head", bold: true, align: "center" },
                { text: "Flow Rate\n(l/min)", bold: true, align: "center" },
                { text: "Flow Rate\n(gal/hr)", bold: true, align: "center" },
                { text: "Flow Rate\n(m³/hr)", bold: true, align: "center" }
            ]
        },
        ...[3, 4, 6, 8, 10].map((h) => ({
            type: "data",
            colWidths: [145, 116, 117, 117],
            cells: [
                { text: String(h), bold: true, align: "center" },
                { text: blank(pumpData[`flow_rate_table.head_${h}.l_min`], "-"), align: "center" },
                { text: blank(pumpData[`flow_rate_table.head_${h}.gal_hr`], "-"), align: "center" },
                { text: blank(pumpData[`flow_rate_table.head_${h}.m3_hr`], "-"), align: "center" }
            ]
        }))
    ];
    drawTable(doc, { x: MARGIN, colWidths: [145, 350], rows: pumpRows, fontSize: 10, cellPadding: 4.5 });

    doc.font(FONT).fontSize(10.5);
    doc.text(`•   Maximum total head is ${withUnit(pumpData["pump_conditions.max_total_head_m"], "m", "10 m")}.`, MARGIN + 15, doc.y);
    doc.moveDown(0.2);
    doc.text(
        `•   ${blank(pumpData["pump_conditions.max_flow_rate_note"], "Maximum Flow Rate of 348 (l/min) at Working Pressure 0.2bar.")}`,
        MARGIN + 15,
        doc.y
    );
    doc.moveDown(0.8);

    const curvePoints = [3, 4, 6, 8, 10].map((h) => ({
        head: h,
        flow: toNum(pumpData[`flow_rate_table.head_${h}.l_min`])
    }));
    renderPumpCurveChart(doc, curvePoints, MARGIN + 20, doc.y, CONTENT_WIDTH - 40, 220);

    // Page 18 (17): 07. OBSERVATION, 08. SAFETY, 09. ENDURANCE TEST
    doc.addPage();
    numberedHeading("07.", "OBSERVATION");
    const obsList = [
        "No starting problems were encountered during the field tests.",
        "Carburettor adjustments were easy.",
        "All parts that needed for the periodic maintenance could be removed & replaced easily with provided tools.",
        "Shoulder belt hook & emergency release arrangement are at convenient distance.",
        "Sound level of the machine was higher than the safe noise level for human ear (85 dB) during the operations.",
        "During long term use nuts & bolts got loosened due to vibration."
    ];
    obsList.forEach((item) => {
        doc.font(FONT).fontSize(11).text(`•   ${item}`, MARGIN + 35, doc.y, { width: CONTENT_WIDTH - 35, lineGap: 4 });
        doc.moveDown(0.3);
    });
    doc.moveDown(0.8);

    numberedHeading("08.", "SAFETY");
    const safetyList = [
        "Appropriate earplugs should be worn while operating the machine for a long period continuously.",
        "Loosened bolts & nuts should be checked and tightened before starting of every operation.",
        "Use protective cloths & safety shoes during the operation.",
        "Removing any grass or debris stuck in the blade should never be done while the blade is rotating.",
        "Keep safe distance from the machine while working.",
        "Check and remove large stone, Wooden Stumps and Pieces of metal from the field before operation."
    ];
    safetyList.forEach((item) => {
        doc.font(FONT).fontSize(11).text(`•   ${item}`, MARGIN + 35, doc.y, { width: CONTENT_WIDTH - 35, lineGap: 4 });
        doc.moveDown(0.3);
    });
    doc.moveDown(0.8);

    numberedHeading("09.", "ENDURANCE TEST");
    const enduranceHours = enduranceData["endurance.hours_operated"] || "60";
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `Brush Cutter was operated for more than ${enduranceHours} hours in all conditions with available blades. ` +
        `${enduranceData["endurance.breakdowns_reported"] || "Major breakdowns or performance abnormalities were not reported during the period of endurance test."}`;
    doc.font(FONT).fontSize(11).text(enduranceText, MARGIN + 35, doc.y, { width: CONTENT_WIDTH - 35, lineGap: 4 });

    // Page 19 (18): Signatures
    doc.addPage();
    doc.moveDown(1);
    drawSignatureBlocks(doc, labTest);

    doc.end();
    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    return createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Brush Cutter Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};
