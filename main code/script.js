document.getElementById('generateBtn').addEventListener('click', async () => {
    const businessName = document.getElementById('businessNameInput5').value || 'Fremont Business';

    try {
        // Fetch the blank PDF from the root folder
        const existingPdfBytes = await fetch('./tff-application.pdf').then(res => res.arrayBuffer());

        // Load into pdf-lib
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const form = pdfDoc.getForm();

        // Fill out the government field
        form.getTextField('BUSINESS NAME').setText(businessName);

        // Save and trigger download
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Completed-TFF-Application.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('Success! PDF downloaded.');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Check console for details.');
    }
});