// 1. entire thing functions
const appState = {
    lang: 'en',
    currentStep: 1,
    path: null,
    formData: {}
};

// wait for the html to load before wiring up buttons and screens
document.addEventListener('DOMContentLoaded', () => {
    // start on screen 1 and set step tracker
    showScreen('screen1');
    updateStepTracker(1);
    
    // hide header controls on load until language is chosen
    const headerControls = document.getElementById('headerControls');
    if (headerControls) {
        headerControls.style.display = 'none';
    }

    // bind click events for language buttons on screen 1
    document.querySelectorAll('.languageButtons button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedLang = e.target.getAttribute('data-lang');
            saveLanguage(selectedLang);
        });
    });
});

//------------------- (insert #2-4), check MarketKey/docs/handoff_notes.md for reference if need clarification

//2: 
function showScreen(screenId){
    const screens = document.querySelectorAll(".screen");
    screens.forEach(function(screen) {
        screen.classList.remove("active");
    });
    const targetScreen = document.getElementById(screenId);
    targetScreen.classList.add("active");
    window.scrollTo(0, 0);
}
const nextButtons = document.querySelectorAll(".next-btn");

nextButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        const currentScreen = button.closest(".screen");
        const nextScreen = currentScreen.nextElementSibling;
        if (nextScreen && nextScreen.classList.contains("screen")) {
            showScreen(nextScreen.id);
        }
    });
});

// 5. PDF and review functions
// read-only review screen from appState.formData
function renderReviewScreen() {
    // targets  review container in HTML and populate it
    const reviewContainer = document.getElementById('reviewContent');
    if (!reviewContainer) return;

    reviewContainer.innerHTML = ''; // clear old review cards

    // loop thru appState.formData and display keys/answers as read-only cards
    for (const [key, value] of Object.entries(appState.formData)) {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <span class="review-label">${key}</span>
            <span class="review-value">${value ? value : 'Not answered'}</span>
        `;
        reviewContainer.appendChild(card);
    }
}

// offline PDF engine using pdf-lib
async function generateCountyPDF() {
    try {
        // load the local blank county PDF template from your assets folder
        const formUrl = '../assets/tff-application.pdf'; 
        const formBytes = await fetch(formUrl).then(res => res.arrayBuffer());

        // load the PDF document using pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.load(formBytes);
        const form = pdfDoc.getForm();

        // map each key from appState.formData to the exact PDF form field names
        for (const [key, value] of Object.entries(appState.formData)) {
            try {
                const field = form.getField(key);
                if (field) {
                    if (typeof value === 'boolean' && value) {
                        field.check();
                    } else if (typeof value === 'string') {
                        field.setText(value);
                    }
                }
            } catch (err) {
                console.warn(`Field not found on PDF template: ${key}`);
            }
        }

        // lock form fields so uneditable
        form.flatten();

        const pdfBytes = await pdfDoc.save();
        return pdfBytes;

    } catch (error) {
        console.error('Error generating PDF locally:', error);
        alert('Could not generate PDF. Please ensure the local template file is present.');
        return null;
    }
}

// trigger browser download, wipe memory, and advance to Step 5
async function downloadAndWipe() {
    const businessName = appState.formData['businessName'] || 'Vendor';
    
    // generate the PDF bytes
    const pdfBytes = await generateCountyPDF();
    if (!pdfBytes) return; // stop if generation failed

    // create a browser Blob and trigger an automatic local download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `MarketKey-TFF-${businessName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // revoke blob URL after 2 seconds for memory management
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    appState.formData = {};
    appState.path = null;

    // advance view to Step 5 (Done screen)
    showScreen('screen5');
    updateStepTracker(5);
}
