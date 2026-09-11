import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { createReport } from "../models/report.js";
import { listTestRecords } from "../models/testRecord.js";
import { getSchemasByIds } from "../models/testFormSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPORTS_DIR = path.join(__dirname, "..", "reports");

if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

export const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
};

// Renders a structured test's form_data (flat, composite-dotted-key object) as labeled
// sections/tables using the field/table definitions from the matching template, instead of
// dumping raw dotted keys. Table rows are printed as one indented line per row listing every
// column's label=value -- pdfkit already auto-paginates via doc.text(), so no manual page
// handling is needed here.
export const renderTemplateSection = (doc, formData, template) => {
    template.sections.forEach((section) => {
        doc.moveDown(0.4);
        doc.fontSize(10).font("Helvetica-Bold").text(section.label, { indent: 10 });
        doc.font("Helvetica").fontSize(9);

        if (section.type === "fields") {
            section.fields.forEach((field) => {
                const value = formData[`${section.key}.${field.key}`];
                const suffix = field.auto ? " (computed)" : "";
                doc.text(`  ${field.label}: ${formatValue(value)}${suffix}`, { indent: 20 });
            });
        } else if (section.type === "table") {
            section.rows.forEach((row) => {
                const cells = section.columns
                    .map((col) => `${col.label}=${formatValue(formData[`${section.key}.${row.key}.${col.key}`])}`)
                    .join("   ");
                doc.text(`  ${row.label}:  ${cells}`, { indent: 20 });
            });
        }
    });
};

export const generateMachineReport = async (machineId, chiefEngineerId) => {
    const fileName = `FMRC-Machine-Report-${machineId}-${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    // Fetch all test records for this machine
    const allTests = await listTestRecords({ machineId });
    if (allTests.length === 0) throw new Error("No tests found for this machine");

    // We can get machine info from the first test record
    const firstTest = allTests[0];

    // Batch-fetch the (typically <=5) distinct structured schemas actually in use, rather
    // than one query per test.
    const schemaIds = [...new Set(allTests.map((t) => t.schema_id).filter(Boolean))];
    const schemasById = await getSchemasByIds(schemaIds);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("Farm Mechanization Research Centre (FMRC)", { align: "center" });
    doc.fontSize(11).font("Helvetica").text("Official Final Machine Certification Report", { align: "center" });
    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Machine Details
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a6b3c").text("Machine Information").fillColor("black");
    doc.fontSize(10).font("Helvetica");
    doc.moveDown(0.5);
    const detailRows = [
        ["Machine Name", formatValue(firstTest.machine_name)],
        ["Model", formatValue(firstTest.machine_model)],
        ["Supplier", formatValue(firstTest.machine_supplier)],
        ["Total Tests Conducted", String(allTests.length)],
        ["Certification Date", new Date().toLocaleDateString()]
    ];
    detailRows.forEach(([label, value]) => {
        doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);
    });
    doc.moveDown(2);

    // Tests Results section
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a6b3c").text("Comprehensive Test Results").fillColor("black");
    doc.moveDown(1);

    allTests.forEach((t, index) => {
        doc.fontSize(12).font("Helvetica-Bold").text(`Test ${index + 1}: ${t.test_name}`);
        doc.fontSize(9).font("Helvetica-Oblique").text(`Category: ${t.is_field_test ? "Field Test" : "Laboratory Test"} | Status: ${t.status}`);
        doc.moveDown(0.5);

        let parsedFormData = {};
        try {
            parsedFormData = typeof t.form_data === "string"
                ? JSON.parse(t.form_data)
                : (t.form_data || {});
        } catch {
            parsedFormData = {};
        }

        doc.fontSize(10).font("Helvetica");
        const schema = t.schema_id ? schemasById[t.schema_id] : null;
        if (schema) {
            renderTemplateSection(doc, parsedFormData, schema);
        } else {
            const entries = Object.entries(parsedFormData);
            if (entries.length === 0) {
                doc.text("  No parameters recorded.", { indent: 10 });
            } else {
                entries.forEach(([key, value]) => {
                    doc.text(`  • ${key}: ${formatValue(value)}`, { indent: 10 });
                });
            }
        }
        
        doc.moveDown(0.5);
        doc.fontSize(9).font("Helvetica").fillColor("gray");
        doc.text(`  Conducted by: ${formatValue(t.technical_assistant_name)}`, { indent: 10 });
        doc.text(`  Reviewed by: ${formatValue(t.mechanical_engineer_name)}`, { indent: 10 });
        doc.text(`  Approved by: ${formatValue(t.chief_engineer_name)}`, { indent: 10 });
        doc.fillColor("black");
        
        doc.moveDown(1);
    });

    const anyRejected = allTests.some(t => t.status === 'Rejected');
    const finalStatus = anyRejected ? "CERTIFICATION REJECTED" : "CERTIFIED";
    const statusColor = anyRejected ? "red" : "#1a6b3c";

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
    
    doc.fontSize(14).font("Helvetica-Bold").fillColor(statusColor).text(`FINAL STATUS: ${finalStatus}`, { align: "center" });
    doc.fillColor("black");

    doc.moveDown(3);
    doc.fontSize(8).font("Helvetica").fillColor("gray").text(
        "This is a digitally generated aggregated report from the FMRC Smart Agricultural Machinery Testing and Planning System.",
        { align: "center" }
    );

    doc.end();

    await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });

    const report = await createReport({
        machine_id: machineId,
        test_id: null,
        report_type: 'Machine Certification',
        pdf_file_path: fileName,
        approved_by: chiefEngineerId,
        certification_status: anyRejected ? "Rejected" : "Certified"
    });

    return report;
};
