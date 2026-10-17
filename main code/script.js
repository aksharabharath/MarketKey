// 1. entire thing functions
const appState = {
    lang: 'en',
    currentStep: 1,
    path: null,
    formData: {}
};

document.addEventListener('DOMContentLoaded', () => {
    showScreen('screen1');
    updateStepTracker(1);
    
    const headerControls = document.getElementById('headerControls');
    if (headerControls) {
        headerControls.style.display = 'none';
    }

    document.querySelectorAll('.languageButtons button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all language buttons, then highlight clicked one
            document.querySelectorAll('.languageButtons button').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
    
            const selectedLang = e.currentTarget.getAttribute('data-lang');
            saveLanguage(selectedLang);
        });
    });
    const nextButtons = document.querySelectorAll(".next-btn");
//next button code- 
    nextButtons.forEach(function(button) {
    button.addEventListener("click", function() {
        const currentScreen = button.closest(".screen");
        const nextScreen = currentScreen.nextElementSibling;

        if (nextScreen && nextScreen.classList.contains("screen")) {
            showScreen(nextScreen.id);
        }
    });
  });
});

//------------------- (insert #2-4), check MarketKey/docs/handoff_notes.md for reference if need clarification

//2, for screen switching : 
function showScreen(screenId){
    const screens = document.querySelectorAll(".screen");
    screens.forEach(function(screen) {
        screen.classList.remove("active");
    });
    const targetScreen = document.getElementById(screenId);
    targetScreen.classList.add("active");
    const stepNumber = Number(screenId.replace("screen", ""));
    updateStepTracker(stepNumber);
    window.scrollTo(0, 0);
}


//2, for UPD stateTracker 
function updateStepTracker(currentStep) {
    const steps = document.querySelectorAll(".step-dot");
    steps.forEach(function(step) {
        const number = Number(step.dataset.step);
        if (number <= currentStep) {
            step.classList.add("active");
        } else {
            step.classList.remove("active");
        }
    });
}
//2 for savelang 
function saveLanguage(langCode) {
    if (!langCode) return;
    appState.lang = langCode;

    // Unhide the header controls once a language is chosen
    const headerControls = document.getElementById('headerControls');
    if (headerControls) {
        headerControls.style.display = 'flex';
    }
}
// 5. PDF and review functions
function renderReviewScreen() {
    const reviewContainer = document.getElementById('reviewContent');
    if (!reviewContainer) return;

    reviewContainer.innerHTML = '';

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

async function generateCountyPDF() {
    try {
        const formUrl = '../assets/tff-application.pdf'; 
        const formBytes = await fetch(formUrl).then(res => res.arrayBuffer());

        const pdfDoc = await PDFLib.PDFDocument.load(formBytes);
        const form = pdfDoc.getForm();

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

        form.flatten();

        const pdfBytes = await pdfDoc.save();
        return pdfBytes;

    } catch (error) {
        console.error('Error generating PDF locally:', error);
        alert('Could not generate PDF. Please ensure the local template file is present.');
        return null;
    }
}

async function downloadAndWipe() {
    const businessName = appState.formData['businessName'] || 'Vendor';
    
    const pdfBytes = await generateCountyPDF();
    if (!pdfBytes) return; // stop if generation failed

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `MarketKey-TFF-${businessName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    appState.formData = {};
    appState.path = null;

    showScreen('screen5');
    updateStepTracker(5);
}
