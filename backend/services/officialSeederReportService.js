import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { createReport } from "../models/report.js";
import { listTestRecords } from "../models/testRecord.js";
import { getMachineryById } from "../models/machinery.js";
import { getSchemasByIds } from "../models/testFormSchema.js";
import { REPORTS_DIR, formatValue } from "./reportService.js";

// Reproduces the two official FMRC Hand Push Roller Seeder certification reports:
//  1. generateOfficialSeederSeedOnlyReport(machineId)   -> FMRC/MS/03/2026 (Seed Only)
//  2. generateOfficialSeederFertilizerReport(machineId) -> FMRC/MS/01/2026 (Seed with Fertilizer)

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

const blank = (v, fallback = "-") => (v === null || v === undefined || v === "" ? fallback : String(v));

const withUnit = (v, unit, fallback = "-") => {
    if (v === null || v === undefined || v === "" || v === "-") return fallback;
    const s = String(v).trim();
    if (s.toLowerCase().endsWith(unit.toLowerCase())) return s;
    return `${s} ${unit}`;
};

const cellTextHeight = (doc, text, width, fontSize, font) => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(text || "", { width: Math.max(width - 10, 20) });
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

const drawTable = (doc, { x = MARGIN, colWidths, rows, fontSize = 10, cellPadding = 5 }) => {
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
            doc.font(FONT_BOLD).fontSize(fontSize).fillColor("#000000")
                .text(row.label, x + cellPadding, y + cellPadding, { width: totalWidth - cellPadding * 2 });
            y += h;
            return;
        }

        if (row.type === "span_left_group") {
            // Left cell spans row.subRows.length sub-rows; middle & right columns are drawn per sub-row
            const leftW = row.leftWidth || 105;
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
            const labelH = cellTextHeight(doc, row.groupLabel, leftW, fontSize, FONT_BOLD);
            doc.font(FONT_BOLD).fontSize(fontSize).fillColor("#000000")
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
                        .text(v || "", rcx + cellPadding, sy + cellPadding, { width: cw - cellPadding * 2, align: sr.align || "left" });
                    rcx += cw;
                });
                sy += sh;
            });
            y += totalH;
            return;
        }

        const rColWidths = row.colWidths || colWidths;
        const estHeight = row.forceHeight || Math.max(
            ...row.cells.map((cell, i) => cellTextHeight(doc, cell.text, rColWidths[i], cell.fontSize || fontSize, cell.bold ? FONT_BOLD : FONT) + cellPadding * 2)
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

// ============================================================================================
// Helper: Builds a Seeding Performance comparison table for 1 or 2 crop test records
// (matching Pages 6-9 of FMRC/MS/03/2026 and Pages 7-9 of FMRC/MS/01/2026)
// ============================================================================================
const drawSeedingComparisonTable = (doc, cropTests) => {
    const numCrops = cropTests.length;
    const leftParamTotalW = 245;
    const cropColW = (CONTENT_WIDTH - leftParamTotalW) / Math.max(numCrops, 1);
    const colWidths = [leftParamTotalW, ...cropTests.map(() => cropColW)];

    const parsed = cropTests.map((t) => {
        const fd = parseFormData(t.form_data);
        const cropName = fd["seed_condition.seed_name"] ||
            t.test_name.replace(/^Seeder Performance Test(?:\s*\([^)]+\))?\s*-\s*/i, "").replace(/\s*\([^)]+\)\s*$/, "").trim() ||
            "Crop";
        const lwt = fd["seed_condition.size_l_w_t_mm"] ||
            ([fd["seed_condition.length_mm"], fd["seed_condition.width_mm"], fd["seed_condition.thickness_mm"]].some(Boolean)
                ? `${blank(fd["seed_condition.length_mm"])} x ${blank(fd["seed_condition.width_mm"])} x ${blank(fd["seed_condition.thickness_mm"])}`
                : "-");
        return { cropName, fd, lwt };
    });

    const rows = [
        {
            type: "header",
            cells: [
                { text: "Crop", bold: true, align: "center" },
                ...parsed.map((p) => ({ text: p.cropName, bold: true, align: "center" }))
            ]
        },
        {
            type: "span_left_group",
            leftWidth: 95,
            groupLabel: "Test\nCondition",
            subRows: [
                { param: "Date", values: parsed.map((p) => blank(p.fd["field_condition.test_date"])) },
                { param: "Location", values: parsed.map((p) => blank(p.fd["field_condition.location"])) }
            ]
        },
        {
            type: "span_left_group",
            leftWidth: 95,
            groupLabel: "Condition of\nSeed",
            subRows: [
                { param: "Variety", values: parsed.map((p) => blank(p.fd["seed_condition.variety"])) },
                { param: "Size of seed\nL x W x T (mm)", values: parsed.map((p) => p.lwt) },
                { param: "Weight of 1000 grains", values: parsed.map((p) => withUnit(p.fd["seed_condition.weight_1000_grains_g"], "g")) },
                { param: "Rate of germination", values: parsed.map((p) => withUnit(p.fd["seed_condition.germination_rate_percent"], "%")) }
            ]
        },
        {
            type: "span_left_group",
            leftWidth: 95,
            groupLabel: "Condition of\nField",
            subRows: [
                { param: "Shape of test field", values: parsed.map((p) => blank(p.fd["field_condition.shape_of_field"])) },
                { param: "Soil type", values: parsed.map((p) => blank(p.fd["field_condition.soil_type"])) },
                { param: "Soil moisture", values: parsed.map((p) => withUnit(p.fd["soil_moisture_table.moisture_percent.average"], "%")) }
            ]
        },
        {
            type: "span_left_group",
            leftWidth: 95,
            groupLabel: "Observations",
            subRows: [
                { param: "Row spacing", values: parsed.map((p) => withUnit(p.fd["operation_condition.row_spacing_cm.average"], "cm")) },
                { param: "Plant spacing", values: parsed.map((p) => withUnit(p.fd["operation_condition.plant_spacing_cm.average"], "cm")) },
                { param: "Depth of seeding", values: parsed.map((p) => withUnit(p.fd["operation_condition.depth_of_seeding_mm.average"], "mm")) },
                { param: "No. of plants per hill", values: parsed.map((p) => blank(p.fd["operation_condition.plants_per_hill.average"])) },
                { param: "Missed hills\n(In 20 hills)", values: parsed.map((p) => blank(p.fd["operation_condition.missing_hills_20.average"])) },
                { param: "No. of seeds without -\nsoil cover (In 20 hills)", values: parsed.map((p) => blank(p.fd["operation_condition.seeds_without_cover_20.average"])) }
            ]
        },
        {
            type: "span_left_group",
            leftWidth: 95,
            groupLabel: "Machine\nPerformance\nResults",
            subRows: [
                { param: "Seed Requirement", values: parsed.map((p) => withUnit(p.fd["field_performance.seed_requirement_kg_acre"], "kg/acer")) },
                { param: "Operating speed", values: parsed.map((p) => withUnit(p.fd["field_performance.operating_speed_m_s"] || p.fd["traveling_speed_seeder.with_load.speed_m_s"], "m/s")) },
                {
                    param: "Field capacity",
                    values: parsed.map((p) => {
                        const haHr = withUnit(p.fd["field_performance.field_capacity_ha_hr"], "ha/hr");
                        const acDay = withUnit(p.fd["field_performance.field_capacity_acre_day"], "acer/day");
                        return `${haHr}\n${acDay}`;
                    })
                }
            ]
        }
    ];

    drawTable(doc, { x: MARGIN, colWidths, rows, fontSize: 10, cellPadding: 5 });
};

const drawCoverAndRemarks = (doc, machine, docNumber, padZeroPageNum = false) => {
    const rightAlignedX = (text, font, size, rightEdge) => {
        doc.font(font).fontSize(size);
        return rightEdge - doc.widthOfString(text);
    };

    let printedPageNum = 0;
    const drawHeaderFooter = () => {
        printedPageNum += 1;
        const rightEdge = PAGE_WIDTH - MARGIN;
        const pageNumText = padZeroPageNum ? String(printedPageNum).padStart(2, "0") : String(printedPageNum);
        doc.font(padZeroPageNum ? FONT_BOLD : FONT).fontSize(10).fillColor("#000000")
            .text(pageNumText, (PAGE_WIDTH - doc.widthOfString(pageNumText)) / 2, doc.page.height - 35, { lineBreak: false });
        doc.font(FONT_BOLD).fontSize(9)
            .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 9, rightEdge), doc.page.height - 35, { lineBreak: false });
        doc.x = MARGIN;
        doc.y = MARGIN;
    };
    doc.on("pageAdded", drawHeaderFooter);

    // Page 1: Cover Page
    doc.rect(30, 30, PAGE_WIDTH - 60, doc.page.height - 60).lineWidth(2).stroke("#000000");
    doc.rect(35, 35, PAGE_WIDTH - 70, doc.page.height - 70).lineWidth(0.75).stroke("#000000");
    doc.lineWidth(1);

    doc.font(FONT_BOLD).fontSize(11)
        .text(docNumber, rightAlignedX(docNumber, FONT_BOLD, 11, PAGE_WIDTH - 55), 65, { lineBreak: false });

    doc.y = 140;
    doc.font(FONT_BOLD).fontSize(17).text("REPORT ON TESTING & EVALUATION OF", MARGIN + 10, doc.y, {
        width: CONTENT_WIDTH - 20,
        align: "center",
        underline: true
    });
    doc.moveDown(0.3);
    doc.font(FONT_BOLD).fontSize(17).text("HAND PUSH ROLLER SEEDER", MARGIN + 10, doc.y, {
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
    doc.text("Tel: +94 25 224 9222", { align: "center" });
    doc.text("Email : fmrc@doa.gov.lk", { align: "center" });

    // Page 2: Remarks (boxed)
    doc.addPage();
    const remarks = [
        "This report shall not be duplicated in full or part without the approval of FMRC.",
        "This report is null & void without the authorized signatures and stamps of FMRC officials.",
        "Any amendment to this document is not allowed.",
        "Any discrepancy on this report shall be reported to the FMRC within 15 days after the date of receiving.",
        "Test results in this report is based on the sample provided by the supplier.",
        "Report is valid only for the tested model.",
        "Report is valid for the period of 10 years from the date of issue.",
        "FMRC have the right to recall the test report if found any inaccurate information provided by the supplier."
    ];
    const boxX = MARGIN, boxY = MARGIN + 40, boxWidth = CONTENT_WIDTH;
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
// 1. SEEDER - SEED ONLY OFFICIAL REPORT (FMRC/MS/03/2026)
// ============================================================================================
export const generateOfficialSeederSeedOnlyReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const labTest = allTests.find((t) => schemaKeyOf(t) === "SEEDER_LAB_SEED_ONLY") || allTests[0];
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const fieldTests = allTests.filter((t) => schemaKeyOf(t) === "SEEDER_FIELD");

    const labData = parseFormData(labTest?.form_data);
    const enduranceData = parseFormData(enduranceTest?.form_data);

    const fileName = `FMRC-Official-Seeder-SeedOnly-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/MS/03/${new Date().getFullYear()}`;
    drawCoverAndRemarks(doc, machine, docNumber, false);

    const heading = (text) => {
        doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true });
        doc.moveDown(0.5);
    };

    // Page 3: 01. INTRODUCTION & 02. PRODUCT INFORMATION
    doc.addPage();
    heading("01. INTRODUCTION");
    const introText = machine.background_note ||
        `This report presents the evaluation of the model ${formatValue(machine.model)} roller seeder conducted at the Farm Mechanization Research Centre (FMRC). ` +
        `The roller seeder designed to plant Maize local, Maize Hybrid, Groundnut, Cowpea, Green gram, Black gram and Beans seeds by using inter changeable rollers. ` +
        `The machine was evaluated to verify its conformity with the manufacturer's declared specifications and to assess its seedling performance operational efficiency and durability under standard test conditions.`;
    doc.font(FONT).fontSize(11).text(introText, { lineGap: 5 });
    doc.moveDown(1.2);

    heading("02. PRODUCT INFORMATION");
    const drawInfoLine = (label, value) => {
        const y = doc.y;
        doc.font(FONT).fontSize(11).text(label, MARGIN, y);
        doc.text(`: ${value}`, MARGIN + 95, y);
        doc.moveDown(0.3);
    };
    drawInfoLine("Manufacture", machine.manufacturer_country || "Not provided by the importer");
    drawInfoLine("Importer", `${machine.importer_name || "......"}${machine.importer_address ? `, ${machine.importer_address}` : ""}`);
    doc.moveDown(0.4);
    drawInfoLine("Tel", machine.importer_tel || "......");
    drawInfoLine("Fax", machine.importer_fax || "......");
    drawInfoLine("E-mail", machine.importer_web || "......");
    doc.moveDown(0.4);
    drawInfoLine("Model", formatValue(machine.model));
    drawInfoLine("Type", "Manual Hand-push Multi-crop roller seeder.");

    // Page 4: 03. OBJECTIVE, 04. TEST METHODOLOGY, 05. SPECIFICATIONS VERIFICATION (5.1)
    doc.addPage();
    heading("03. OBJECTIVE");
    doc.font(FONT).fontSize(11).text(
        "To verify the conformity of the roller seeder with manufacture's declared specifications and to evaluate its seeding performance, " +
        "field capacity, durability and suitability for field operation under standard test conditions.",
        { lineGap: 4 }
    );
    doc.moveDown(1);

    heading("04. TEST METHODOLOGY");
    doc.font(FONT).fontSize(11).text(
        "Tests were conducted in accordance with the relevant FMRC procedures. Laboratory and field evaluations were carried out to determine " +
        "seed metering performance, seed placement accuracy, field capacity and operational durability under standard working conditions.",
        { lineGap: 4 }
    );
    doc.moveDown(1);

    heading("05. SPECIFICATIONS VERIFICATION");
    heading("5.1 VERIFICATIONS OF MANUFACTURE'S SPECIFICATIONS");
    doc.moveDown(0.2);

    const spec51Rows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Manufacturer", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Model" }, { text: blank(labData["manufacturer_specs.model_mfg"] || machine.model, "") }, { text: blank(labData["manufacturer_specs.model_ver"], "") }] },
        { type: "data", cells: [{ text: "Brand" }, { text: blank(labData["manufacturer_specs.brand_mfg"], "") }, { text: blank(labData["manufacturer_specs.brand_ver"], "") }] },
        { type: "data", cells: [{ text: "Product Name" }, { text: blank(labData["manufacturer_specs.product_name_mfg"], "") }, { text: blank(labData["manufacturer_specs.product_name_ver"], "") }] },
        { type: "data", cells: [{ text: "Mouth numbers" }, { text: blank(labData["manufacturer_specs.mouth_numbers_mfg"], "") }, { text: blank(labData["manufacturer_specs.mouth_numbers_ver"], "") }] },
        { type: "data", cells: [{ text: "Spacing" }, { text: blank(labData["manufacturer_specs.spacing_mfg"], "") }, { text: blank(labData["manufacturer_specs.spacing_ver"], "") }] },
        { type: "data", cells: [{ text: "Suitable Seeds / Functions" }, { text: blank(labData["manufacturer_specs.suitable_seeds_mfg"], "") }, { text: blank(labData["manufacturer_specs.suitable_seeds_ver"], "") }] },
        { type: "data", cells: [{ text: "Hole Seeding Rate" }, { text: blank(labData["manufacturer_specs.hole_seeding_rate_mfg"], "") }, { text: blank(labData["manufacturer_specs.hole_seeding_rate_ver"], "") }] },
        { type: "data", cells: [{ text: "Capacity" }, { text: blank(labData["manufacturer_specs.capacity_mfg"], "") }, { text: blank(labData["manufacturer_specs.capacity_ver"], "") }] },
        { type: "data", cells: [{ text: "G.W./N.W." }, { text: blank(labData["manufacturer_specs.gw_nw_mfg"], "") }, { text: blank(labData["manufacturer_specs.gw_nw_ver"], "") }] },
        { type: "data", cells: [{ text: "Packing" }, { text: blank(labData["manufacturer_specs.packing_mfg"], "") }, { text: blank(labData["manufacturer_specs.packing_ver"], "") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [145, 175, 175], rows: spec51Rows, fontSize: 10, cellPadding: 5 });

    // Page 5: 5.2 VERIFICATION OF OTHER SPECIFICATIONS
    doc.addPage();
    heading("5.2 VERIFICATION OF OTHER SPECIFICATIONS");
    doc.moveDown(0.2);

    const spec52Rows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        {
            type: "span_left_group",
            leftWidth: 110,
            groupLabel: "Dimensions",
            subRows: [
                { param: "Total Length", values: [withUnit(labData["dimensions.total_length_mm"], "mm")] },
                { param: "Total Width", values: [withUnit(labData["dimensions.total_width_mm"], "mm")] },
                { param: "Total Height", values: [withUnit(labData["dimensions.total_height_mm"], "mm")] }
            ]
        },
        { type: "group", label: "Metering Mechanism" },
        { type: "data", cells: [{ text: "Type of Metering Device" }, { text: blank(labData["metering_mechanism.type_of_metering_device"]) }] },
        { type: "data", cells: [{ text: "Number of Rollers for seed selector" }, { text: blank(labData["metering_mechanism.number_of_rollers"]) }] },
        { type: "group", label: "Source of Power for Driving" },
        { type: "data", cells: [{ text: "Metering Mechanism" }, { text: blank(labData["power_source.metering_mechanism"]) }] },
        { type: "data", cells: [{ text: "Furrow/ Hill Opening Mechanism" }, { text: blank(labData["power_source.furrow_opening_mechanism"]) }] },
        { type: "data", cells: [{ text: "Furrow/ Soil Covering Mechanism" }, { text: blank(labData["power_source.furrow_covering_mechanism"]) }] },
        { type: "group", label: "Material of Construction" },
        { type: "data", cells: [{ text: "Seed Hopper" }, { text: blank(labData["material_of_construction.seed_hopper"]) }] },
        { type: "data", cells: [{ text: "Metering Device" }, { text: blank(labData["material_of_construction.metering_device"]) }] },
        { type: "data", cells: [{ text: "Handle" }, { text: blank(labData["material_of_construction.handle"]) }] },
        { type: "data", cells: [{ text: "Handle Grip" }, { text: blank(labData["material_of_construction.handle_grip"]) }] },
        { type: "data", cells: [{ text: "Injector" }, { text: blank(labData["material_of_construction.injector"]) }] },
        { type: "data", cells: [{ text: "Handle Grip Comfortable part" }, { text: blank(labData["material_of_construction.handle_grip_comfortable_part"]) }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [255, 240], rows: spec52Rows, fontSize: 10, cellPadding: 5 });

    // Pages 6+: 06. PERFORMANCE TEST (2 crops per page)
    for (let i = 0; i < fieldTests.length; i += 2) {
        doc.addPage();
        if (i === 0) {
            heading("06. PERFORMANCE TEST");
            doc.moveDown(0.2);
        }
        const pair = fieldTests.slice(i, i + 2);
        drawSeedingComparisonTable(doc, pair);
    }

    // Final Page: 07. ENDURANCE TEST + Signatures
    doc.addPage();
    heading("07. ENDURANCE TEST");
    const enduranceHours = enduranceData["endurance.hours_operated"] || "50";
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `The machine was subjected to an endurance test for a duration exceeding ${enduranceHours} operational hours under normal working conditions. ` +
        `${enduranceData["endurance.breakdowns_reported"] || "No major failures, breakdowns, or significant performance deviations were observed. During the test period, indicating satisfactory operational reliability."}`;
    doc.font(FONT).fontSize(11).text(enduranceText, { lineGap: 4 });
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
        report_type: "Official Seeder (Seed Only) Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};

// ============================================================================================
// 2. SEEDER - SEED WITH FERTILIZER OFFICIAL REPORT (FMRC/MS/01/2026)
// ============================================================================================
export const generateOfficialSeederFertilizerReport = async (machineId) => {
    const machine = await getMachineryById(machineId);
    if (!machine) throw new Error("Machine not found.");

    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine.");

    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);
    const schemaKeyOf = (t) => (t.schema_id ? schemasById[t.schema_id]?.schema_key : null);

    const labTest = allTests.find((t) => schemaKeyOf(t) === "SEEDER_LAB_FERTILIZER") || allTests[0];
    const enduranceTest = allTests.find((t) => schemaKeyOf(t) === "ENDURANCE");
    const seedingTests = allTests.filter((t) => schemaKeyOf(t) === "SEEDER_FIELD");
    const fertOnlyTests = allTests.filter((t) => schemaKeyOf(t) === "SEEDER_FERTILIZER_FIELD" && /Fertilizer Application/i.test(t.test_name));
    const combinedTests = allTests.filter((t) => schemaKeyOf(t) === "SEEDER_FERTILIZER_FIELD" && /Combined/i.test(t.test_name));

    const labData = parseFormData(labTest?.form_data);
    const enduranceData = parseFormData(enduranceTest?.form_data);

    const fileName = `FMRC-Official-Seeder-Fertilizer-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    doc.font(FONT);

    const docNumber = machine.document_ref_number || `FMRC/MS/01/${new Date().getFullYear()}`;
    drawCoverAndRemarks(doc, machine, docNumber, true);

    const heading = (text) => {
        doc.font(FONT_BOLD).fontSize(11).text(text, { underline: true });
        doc.moveDown(0.5);
    };

    // Page 3 (02): TITLE, INTRODUCTION, MANUFACTURER'S DETAILS, IMPORTER'S CONTACT DETAILS
    doc.addPage();
    heading("TITLE");
    doc.font(FONT).fontSize(11).text(`Test report on model "${formatValue(machine.model)}" hand push roller seeder machine.`, { indent: 30 });
    doc.moveDown(1);

    heading("INTRODUCTION");
    const introText = machine.background_note ||
        `The model "${formatValue(machine.model)}" hand push roller seeder machine that was handed over to Farm Mechanization Research Centre, ` +
        `Department of Agriculture, Mahailluppallama has been put through a series of tests to verify that it meets the manufacturer's specifications, ` +
        `performance, durability and the suitability for agricultural purposes in Sri Lanka.`;
    doc.font(FONT).fontSize(11).text(introText, { indent: 30, lineGap: 4 });
    doc.moveDown(1);

    heading("MANUFACTURER'S DETAILS & COUNTRY OF ORIGIN");
    doc.font(FONT_BOLD).fontSize(11).text(machine.manufacturer_country || "Not provided by the importer");
    doc.moveDown(1);

    heading("IMPORTER'S CONTACT DETAILS");
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(machine.importer_name || "......................................", { lineGap: 3 });
    doc.text(machine.importer_address || "......................................", { lineGap: 3 });
    doc.moveDown(0.4);
    doc.text(`Tel     : ${machine.importer_tel || "......................"}`, { lineGap: 3 });
    doc.text(`E-mail  : ${machine.importer_web || "......................"}`, { lineGap: 3 });
    doc.font(FONT);

    // Page 4 (03): VERIFICATIONS OF MANUFACTURE'S SPECIFICATIONS
    doc.addPage();
    heading("VERIFICATIONS OF MANUFACTURE'S SPECIFICATIONS");
    doc.moveDown(0.2);

    const mfgSpecRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Manufacturer", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        { type: "data", cells: [{ text: "Model" }, { text: blank(labData["manufacturer_specs.model_mfg"] || machine.model, "") }, { text: blank(labData["manufacturer_specs.model_ver"] || machine.model, "") }] },
        { type: "data", cells: [{ text: "Brand" }, { text: blank(labData["manufacturer_specs.brand_mfg"], "") }, { text: blank(labData["manufacturer_specs.brand_ver"], "") }] },
        { type: "data", cells: [{ text: "Functions" }, { text: blank(labData["manufacturer_specs.functions_mfg"], "") }, { text: blank(labData["manufacturer_specs.functions_ver"], "") }] },
        { type: "data", cells: [{ text: "Suitable Seeds / Functions" }, { text: blank(labData["manufacturer_specs.suitable_seeds_mfg"], "") }, { text: blank(labData["manufacturer_specs.suitable_seeds_ver"], "") }] },
        { type: "data", cells: [{ text: "Hole Seeding Rate" }, { text: blank(labData["manufacturer_specs.hole_seeding_rate_mfg"], "") }, { text: blank(labData["manufacturer_specs.hole_seeding_rate_ver"], "") }] },
        { type: "data", cells: [{ text: "Seeding Depth" }, { text: blank(labData["manufacturer_specs.seeding_depth_mfg"], "") }, { text: blank(labData["manufacturer_specs.seeding_depth_ver"], "") }] },
        { type: "data", cells: [{ text: "Work efficiency" }, { text: blank(labData["manufacturer_specs.work_efficiency_mfg"], "") }, { text: blank(labData["manufacturer_specs.work_efficiency_ver"], "") }] },
        { type: "data", cells: [{ text: "Seeds Box" }, { text: blank(labData["manufacturer_specs.seeds_box_mfg"], "") }, { text: blank(labData["manufacturer_specs.seeds_box_ver"], "") }] },
        { type: "data", cells: [{ text: "Space (Seed to Seed)" }, { text: blank(labData["manufacturer_specs.space_seed_to_seed_mfg"], "") }, { text: blank(labData["manufacturer_specs.space_seed_to_seed_ver"], "") }] },
        { type: "data", cells: [{ text: "Spike Number" }, { text: blank(labData["manufacturer_specs.spike_number_mfg"], "") }, { text: blank(labData["manufacturer_specs.spike_number_ver"], "") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [145, 175, 175], rows: mfgSpecRows, fontSize: 10, cellPadding: 5 });

    // Page 5 (04): VERIFICATION OF OTHER SPECIFICATIONS
    doc.addPage();
    heading("VERIFICATION OF OTHER SPECIFICATIONS");
    doc.moveDown(0.2);

    const otherSpecRows = [
        { type: "header", cells: [{ text: "Parameter", bold: true, align: "center" }, { text: "Verification", bold: true, align: "center" }] },
        {
            type: "span_left_group",
            leftWidth: 110,
            groupLabel: "Dimensions",
            subRows: [
                { param: "Total Length", values: [withUnit(labData["dimensions.length_mm"], "mm")] },
                { param: "Total Width", values: [withUnit(labData["dimensions.width_mm"], "mm")] },
                { param: "Total Height", values: [withUnit(labData["dimensions.height_mm"], "mm")] }
            ]
        },
        { type: "group", label: "Metering Mechanism" },
        { type: "data", cells: [{ text: "Type of Metering Device" }, { text: blank(labData["metering_mechanism.type_of_metering_device"]) }] },
        { type: "data", cells: [{ text: "Number of Rollers for seed" }, { text: blank(labData["metering_mechanism.number_of_rollers"]) }] },
        { type: "group", label: "Fertilizer Unit" },
        { type: "data", cells: [{ text: "Hopper capacity" }, { text: blank(labData["fertilizer_unit.hopper_capacity"] || labData["dimensions.hopper_capacity_fertilizer_kg"]) }] },
        { type: "data", cells: [{ text: "Fertilizing depth spacing" }, { text: withUnit(labData["fertilizer_unit.fertilizing_depth_spacing"], "mm") }] },
        { type: "data", cells: [{ text: "Spacing" }, { text: withUnit(labData["fertilizer_unit.spacing_cm"], "cm") }] },
        { type: "data", cells: [{ text: "Spike numbers" }, { text: blank(labData["fertilizer_unit.spike_numbers"]) }] },
        { type: "group", label: "Source of Power for Driving" },
        { type: "data", cells: [{ text: "Metering Mechanism" }, { text: blank(labData["power_source.metering_mechanism"]) }] },
        { type: "data", cells: [{ text: "Furrow/ Hill Opening Mechanism" }, { text: blank(labData["power_source.furrow_opening_mechanism"]) }] },
        { type: "data", cells: [{ text: "Furrow/ Soil Covering Mechanism" }, { text: blank(labData["power_source.furrow_closing_mechanism"]) }] },
        { type: "group", label: "Material of Construction" },
        {
            type: "span_left_group",
            leftWidth: 110,
            groupLabel: "Hopper",
            subRows: [
                { param: "Seed", values: [blank(labData["material_of_construction.hopper_seed"])] },
                { param: "Fertilizer", values: [blank(labData["material_of_construction.hopper_fertilizer"])] }
            ]
        },
        { type: "data", cells: [{ text: "Metering Device" }, { text: blank(labData["material_of_construction.metering_device"]) }] },
        { type: "data", cells: [{ text: "Handle" }, { text: blank(labData["material_of_construction.handle"]) }] },
        { type: "data", cells: [{ text: "Handle Grip" }, { text: blank(labData["material_of_construction.handle_grip"]) }] },
        { type: "data", cells: [{ text: "Injector" }, { text: blank(labData["material_of_construction.injector"]) }] },
        { type: "data", cells: [{ text: "Handle Grip Comfortable part" }, { text: blank(labData["material_of_construction.foot_or_grip_part"]) }] },
        { type: "data", cells: [{ text: "Net Weight" }, { text: withUnit(labData["dimensions.weight_of_machine_kg"], "kg") }] }
    ];
    drawTable(doc, { x: MARGIN, colWidths: [255, 240], rows: otherSpecRows, fontSize: 10, cellPadding: 4 });

    // Pages 6-8 (05-07): PERFORMANCE TEST FOR SEEDING APPLICATION
    for (let i = 0; i < seedingTests.length; i += 2) {
        doc.addPage();
        if (i === 0) {
            heading("PERFORMANCE TEST FOR SEEDING APPLICATION");
            doc.moveDown(0.2);
        }
        drawSeedingComparisonTable(doc, seedingTests.slice(i, i + 2));
    }

    // Page 9 (08): PERFORMANCE TEST FOR FERTILIZER APPLICATION
    if (fertOnlyTests.length > 0) {
        doc.addPage();
        heading("PERFORMANCE TEST FOR FERTILIZER APPLICATION");
        doc.moveDown(0.2);

        const leftParamTotalW = 245;
        const cropColW = (CONTENT_WIDTH - leftParamTotalW) / fertOnlyTests.length;
        const colWidths = [leftParamTotalW, ...fertOnlyTests.map(() => cropColW)];
        const parsedFert = fertOnlyTests.map((t) => ({
            cropName: t.test_name.replace(/^.*-\s*/, "").trim(),
            fd: parseFormData(t.form_data)
        }));

        const fertAppRows = [
            { type: "header", cells: [{ text: "Crop", bold: true, align: "center" }, ...parsedFert.map((p) => ({ text: p.cropName, bold: true, align: "center" }))] },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Test\nCondition",
                subRows: [
                    { param: "Date", values: parsedFert.map((p) => blank(p.fd["field_condition.test_date"])) },
                    { param: "Location", values: parsedFert.map((p) => blank(p.fd["field_condition.location"])) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Condition of\nCrop",
                subRows: [
                    { param: "Variety", values: parsedFert.map((p) => blank(p.fd["crop_seed_condition.variety"])) },
                    { param: "Age of crop", values: parsedFert.map((p) => withUnit(p.fd["crop_seed_condition.age_of_crop_days"], "days")) },
                    { param: "Height of crop", values: parsedFert.map((p) => withUnit(p.fd["crop_seed_condition.height_of_crop_mm"], "mm")) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Condition of\nField",
                subRows: [
                    { param: "Shape of test field", values: parsedFert.map((p) => blank(p.fd["field_condition.shape_of_field"])) },
                    { param: "Soil type", values: parsedFert.map((p) => blank(p.fd["field_condition.soil_type"])) },
                    { param: "Soil moisture", values: parsedFert.map((p) => withUnit(p.fd["field_condition.soil_moisture_percent"], "%")) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Condition of\nFertilizer",
                subRows: [
                    { param: "Name of the fertilizer", values: parsedFert.map((p) => blank(p.fd["fertilizer_condition.fertilizer_name"])) },
                    { param: "Type of the fertilizer", values: parsedFert.map((p) => blank(p.fd["fertilizer_condition.fertilizer_type"])) },
                    { param: "Shape of the fertilizer granules", values: parsedFert.map((p) => blank(p.fd["fertilizer_condition.granule_shape"])) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Observations",
                subRows: [
                    { param: "Row spacing", values: parsedFert.map((p) => withUnit(p.fd["observations.row_spacing_cm"], "cm")) },
                    { param: "Fertilizing spacing", values: parsedFert.map((p) => withUnit(p.fd["observations.plant_or_fertilizing_spacing_cm"], "cm")) },
                    { param: "Fertilizing depth", values: parsedFert.map((p) => withUnit(p.fd["observations.fertilizer_depth_mm"], "mm")) },
                    { param: "Position of the selector", values: parsedFert.map((p) => blank(p.fd["observations.selector_position_fertilizer"])) },
                    { param: "Amount of fertilizer per hill", values: parsedFert.map((p) => withUnit(p.fd["observations.fertilizer_per_hill_g"], "g")) },
                    { param: "Missed hills\n(In 20 hills)", values: parsedFert.map((p) => blank(p.fd["observations.missed_hills_20"])) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Machine\nPerformance\nResults",
                subRows: [
                    { param: "Fertilizer Requirement", values: parsedFert.map((p) => withUnit(p.fd["performance_results.fertilizer_requirement_kg_ha"], "kg/ha")) },
                    { param: "Operating speed", values: parsedFert.map((p) => withUnit(p.fd["performance_results.operating_speed_m_s"], "m/s")) },
                    {
                        param: "Field capacity",
                        values: parsedFert.map((p) => `${withUnit(p.fd["performance_results.field_capacity_ha_hr"], "ha/hr")}\n${withUnit(p.fd["performance_results.field_capacity_acre_day"], "acer/day")}`)
                    }
                ]
            }
        ];
        drawTable(doc, { x: MARGIN, colWidths, rows: fertAppRows, fontSize: 10, cellPadding: 4 });
    }

    // Page 10 (09): PERFORMANCE TEST FOR COMBINED SEED AND FERTILIZER APPLICATION
    if (combinedTests.length > 0) {
        doc.addPage();
        heading("PERFORMANCE TEST FOR COMBINED SEED AND FERTILIZER APPLICATION");
        doc.moveDown(0.2);

        const leftParamTotalW = 245;
        const cropColW = (CONTENT_WIDTH - leftParamTotalW) / combinedTests.length;
        const colWidths = [leftParamTotalW, ...combinedTests.map(() => cropColW)];
        const parsedComb = combinedTests.map((t) => ({
            cropName: t.test_name.replace(/^.*-\s*/, "").trim(),
            fd: parseFormData(t.form_data)
        }));

        const combRows = [
            { type: "header", cells: [{ text: "Crop", bold: true, align: "center" }, ...parsedComb.map((p) => ({ text: p.cropName, bold: true, align: "center" }))] },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Test\nCondition",
                subRows: [
                    { param: "Date", values: parsedComb.map((p) => blank(p.fd["field_condition.test_date"])) },
                    { param: "Location", values: parsedComb.map((p) => blank(p.fd["field_condition.location"])) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Condition of\nSeed",
                subRows: [
                    { param: "Variety", values: parsedComb.map((p) => blank(p.fd["crop_seed_condition.variety"])) },
                    { param: "Size of seed\nL x W x T (mm)", values: parsedComb.map((p) => blank(p.fd["crop_seed_condition.size_l_w_t_mm"])) },
                    { param: "Weight of 1000 grains", values: parsedComb.map((p) => withUnit(p.fd["crop_seed_condition.weight_1000_grains_g"], "g")) },
                    { param: "Rate of germination", values: parsedComb.map((p) => withUnit(p.fd["crop_seed_condition.germination_rate_percent"], "%")) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Condition of\nFertilizer",
                subRows: [
                    { param: "Name of the fertilizer", values: parsedComb.map((p) => blank(p.fd["fertilizer_condition.fertilizer_name"])) },
                    { param: "Type of the fertilizer", values: parsedComb.map((p) => blank(p.fd["fertilizer_condition.fertilizer_type"])) },
                    { param: "Shape of the fertilizer granules", values: parsedComb.map((p) => blank(p.fd["fertilizer_condition.granule_shape"])) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Condition of\nField",
                subRows: [
                    { param: "Method of land preparation", values: parsedComb.map((p) => blank(p.fd["field_condition.land_preparation"])) },
                    { param: "Soil type", values: parsedComb.map((p) => blank(p.fd["field_condition.soil_type"])) },
                    { param: "Soil moisture", values: parsedComb.map((p) => withUnit(p.fd["field_condition.soil_moisture_percent"], "%")) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Observations",
                subRows: [
                    { param: "Row spacing", values: parsedComb.map((p) => withUnit(p.fd["observations.row_spacing_cm"], "cm")) },
                    { param: "Plant spacing", values: parsedComb.map((p) => withUnit(p.fd["observations.plant_or_fertilizing_spacing_cm"], "cm")) },
                    { param: "Injecting Depth — Seed", values: parsedComb.map((p) => withUnit(p.fd["observations.seed_depth_mm"], "mm")) },
                    { param: "Injecting Depth — Fertilizer", values: parsedComb.map((p) => withUnit(p.fd["observations.fertilizer_depth_mm"], "mm")) },
                    { param: "Position of selector — Seed", values: parsedComb.map((p) => blank(p.fd["observations.selector_position_seed"])) },
                    { param: "Position of selector — Fertilizer", values: parsedComb.map((p) => blank(p.fd["observations.selector_position_fertilizer"])) },
                    { param: "No. of plants per hill", values: parsedComb.map((p) => blank(p.fd["observations.plants_per_hill"])) },
                    { param: "Amount of fertilizer per hill", values: parsedComb.map((p) => withUnit(p.fd["observations.fertilizer_per_hill_g"], "g")) },
                    { param: "Missed hills (In 20 hills)", values: parsedComb.map((p) => blank(p.fd["observations.missed_hills_20"])) }
                ]
            },
            {
                type: "span_left_group", leftWidth: 95, groupLabel: "Machine\nPerformance\nResults",
                subRows: [
                    { param: "Requirement — Seed", values: parsedComb.map((p) => withUnit(p.fd["performance_results.seed_requirement_kg_ha"], "kg/ha")) },
                    { param: "Requirement — Fertilizer", values: parsedComb.map((p) => withUnit(p.fd["performance_results.fertilizer_requirement_kg_ha"], "kg/ha")) },
                    { param: "Operating speed", values: parsedComb.map((p) => withUnit(p.fd["performance_results.operating_speed_m_s"], "m/s")) },
                    {
                        param: "Field capacity",
                        values: parsedComb.map((p) => `${withUnit(p.fd["performance_results.field_capacity_ha_hr"], "ha/hr")}\n${withUnit(p.fd["performance_results.field_capacity_acre_day"], "acer/day")}`)
                    }
                ]
            }
        ];
        drawTable(doc, { x: MARGIN, colWidths, rows: combRows, fontSize: 9.5, cellPadding: 3.5 });
    }

    // Page 11 (10): Fertilizer Release Quantity Table (Urea, TSP, Nil Keta, Dam Keta, Yaramila positions 1-6)
    doc.addPage();
    const fertTypes = [
        ["Urea", "urea"],
        ["TSP", "tsp"],
        ["Nil Keta", "nilketa"],
        ["Dam Keta", "dam_keta"],
        ["Yaramila", "yaramila"]
    ];
    const fertCalibRows = [
        {
            type: "header",
            colWidths: [140, 155, 200],
            cells: [
                { text: "Name of Fertilizer", bold: true, align: "center" },
                { text: "Position Number", bold: true, align: "center" },
                { text: "Release Fertilizer quantity\n(Average) g/hill", bold: true, align: "center" }
            ]
        },
        ...fertTypes.map(([label, key]) => ({
            type: "span_left_group",
            leftWidth: 140,
            groupLabel: label,
            subRows: [1, 2, 3, 4, 5, 6].map((pos) => ({
                param: String(pos),
                align: "left",
                values: [blank(labData[`fertilizer_calibration.${key}_pos_${pos}.average`], "0")]
            }))
        }))
    ];
    drawTable(doc, { x: MARGIN, colWidths: [295, 200], rows: fertCalibRows, fontSize: 10, cellPadding: 4 });

    // Page 12 (11): COMMENTS + ENDURANCE TEST
    doc.addPage();
    heading("COMMENTS");
    const defaultComments =
        "According to the fertilizer application rates recommended by the Department of Agriculture, Sri Lanka. The seeder's fertilizer dispensing " +
        "unit doesn't meet the required accuracy for applying Urea and TSP. There for FMRC doesn't recommend the use of this seeder for applying " +
        "Urea & TSP in Maize, Green gram, Black gram, Cowpea, Bean and Ground nut cultivation.\n\n" +
        "This seeder is not suitable for green gram and black gram seeds because there are not any rollers made for such seeds.\n\n" +
        "In addition, the Department of Agriculture, Sri Lanka hasn't issued any fertilizer application recommendations for Nil keta, Dam keta and " +
        "Yaramila. There for, it is the user's responsibility to determine the suitability of using these fertilizers with seeder based on the " +
        "fertilizer application rate achieved by the machine.";
    doc.font(FONT).fontSize(11).text(labData["comments_section.comments_note"] || defaultComments, { indent: 30, lineGap: 4 });
    doc.moveDown(1.5);

    heading("ENDURANCE TEST");
    const enduranceHours = enduranceData["endurance.hours_operated"] || "50";
    const enduranceText = enduranceData["endurance.conclusion_note"] ||
        `The hand push roller seeder was operated for more than ${enduranceHours} hours for the planting bean, maize, groundnut, black gram, green gram ` +
        `and cowpea. ${enduranceData["endurance.breakdowns_reported"] || "During the period of endurance test, there were not any major breakdowns or performance abnormalities reported."}`;
    doc.font(FONT).fontSize(11).text(enduranceText, { indent: 30, lineGap: 4 });

    // Page 13 (12): Signatures
    doc.addPage();
    doc.y = MARGIN + 30;
    drawSignatureBlocks(doc, labTest);

    doc.end();
    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    return createReport({
        machine_id: machineId,
        test_id: null,
        report_type: "Official Seeder (Seed with Fertilizer) Certification Report",
        pdf_file_path: fileName,
        approved_by: null,
        ce_status: "Pending"
    });
};
