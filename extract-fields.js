const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function savePdfFields() {
    try {
        const pdfBytes = fs.readFileSync('./tff-application.pdf');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();

        const fieldData = fields.map((field, index) => ({
            index: index + 1,
            name: field.getName(),
            type: field.constructor.name
        }));

        fs.writeFileSync('pdf-fields.json', JSON.stringify(fieldData, null, 2));
        console.log(`Successfully saved ${fields.length} fields to pdf-fields.json!`);

    } catch (error) {
        console.error('Error saving PDF fields:', error);
    }
}

savePdfFields();