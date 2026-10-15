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
