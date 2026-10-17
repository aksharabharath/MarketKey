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
    loadQuestionnaire();
    
    const headerControls = document.getElementById('headerControls');
    if (headerControls) {
        headerControls.style.display = 'none';
    }

    document.querySelectorAll('.languageButtons button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.languageButtons button').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
    
            const selectedLang = e.currentTarget.getAttribute('data-lang');
            saveLanguage(selectedLang);
        });
    });

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

    const tffBtn = document.getElementById('tffPathBtn');
        if (tffBtn) {
            tffBtn.addEventListener('click', () => {
                appState.path = 'tff';
                const today = new Date().toISOString().split('T')[0];
                appState.formData['todaysDate'] = today;
                
                showScreen('screen3');
                loadQuestionnaire(); // <--- THIS WAS MISSING
            });
        }

    const agBtn = document.getElementById('agPathBtn');
    if (agBtn) {
        agBtn.addEventListener('click', () => {
            appState.path = 'ag';
            const pathCards = document.querySelector('.path-cards');
            const agGuidance = document.getElementById('agGuidanceView');
            if (pathCards) pathCards.style.display = 'none';
            if (agGuidance) agGuidance.style.display = 'block';
        });
    }

    const agBackBtn = document.getElementById('agBackBtn');
    if (agBackBtn) {
        agBackBtn.addEventListener('click', () => {
            const pathCards = document.querySelector('.path-cards');
            const agGuidance = document.getElementById('agGuidanceView');
            if (pathCards) pathCards.style.display = 'flex';
            if (agGuidance) agGuidance.style.display = 'none';
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
    
    updatePageText();

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

    const headerControls = document.getElementById('headerControls');
    if (headerControls) {
        headerControls.style.display = 'flex';
    }

    updatePageText();
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

const uiTranslations = {
    en: {
        step2Title: "What type of products are you selling at the market?",
        step2Desc: "Cooked food and samples use the county form, while whole produce from your own farm often does not.",
        tffKicker: "Temporary food facility",
        tffTitle: "Prepared food, hot food, baked goods, samples",
        tffDesc: "Fills out the official Alameda County temporary food facility application directly in your browser.",
        agKicker: "Agricultural route",
        agTitle: "Raw produce, fruit, honey grown on my farm",
        agDesc: "View guidance for agricultural exemptions and direct-to-consumer rules."
    },
    es: {
        step2Title: "¿Qué tipo de productos vende en el mercado?",
        step2Desc: "Los alimentos cocinados y muestras usan el formulario del condado, mientras que los productos agrícolas propios a menudo no.",
        tffKicker: "Instalación de comida temporal",
        tffTitle: "Comida preparada, comida caliente, productos horneados, muestras",
        tffDesc: "Llena la solicitud oficial de instalaciones de comida temporal del Condado de Alameda directamente en su navegador.",
        agKicker: "Ruta agrícola",
        agTitle: "Productos crudos, fruta, miel cosechada en mi granja",
        agDesc: "Vea la guía para exenciones agrícolas y reglas de venta directa al consumidor."
    },
    zh: {
        step2Title: "您在市场出售什么类型的产品？",
        step2Desc: "熟食和样品需要使用县级表格，而您自己农场种植的整块农产品通常不需要。",
        tffKicker: "临时食品设施",
        tffTitle: "熟食、热食、烘焙食品、样品",
        tffDesc: "直接在您的浏览器中填写阿拉amed达县官方临时食品设施申请表。",
        agKicker: "农业路线",
        agTitle: "在我农场种植的生鲜农产品、水果、蜂蜜",
        agDesc: "查看农业豁免和直销规则指南。"
    },
    hi: {
        step2Title: "आप बाजार में किस प्रकार के उत्पाद बेच रहे हैं?",
        step2Desc: "पका हुआ भोजन और नमूने काउंटी फॉर्म का उपयोग करते हैं, जबकि आपके अपने खेत की ताजा उपज अक्सर ऐसा नहीं करती है।",
        tffKicker: "अस्थायी खाद्य सुविधा",
        tffTitle: "तैयार भोजन, गर्म भोजन, पके हुए सामान, नमूने",
        tffDesc: "सीधे अपने ब्राउज़र में आधिकारिक Alameda County अस्थायी खाद्य सुविधा आवेदन भरें।",
        agKicker: "कृषि मार्ग",
        agTitle: "मेरे खेत में उगाई गई कच्ची उपज, फल, शहद",
        agDesc: "कृषि छूट और प्रत्यक्ष-से-उपभोक्ता नियमों के लिए मार्गदर्शन देखें।"
    }
};

function updatePageText() {
    const lang = appState.lang;
    const t = uiTranslations[lang];
    if (!t) return;

    const titleEl = document.querySelector('#screen2 .triage-title');
    const descEl = document.querySelector('#screen2 .triage-desc');

    if (titleEl) titleEl.textContent = t.step2Title;
    if (descEl) descEl.textContent = t.step2Desc;

    questionnaireQuestions.forEach(function(question) {
        const label = document.querySelector(
            `#applicationForm label[for="${question.id}"]`
        );

        if (label) {
            const prompt =
                question.prompts[appState.lang] || question.prompts.en;

            label.textContent =
                prompt + (question.required ? " *" : "");
        }
    });
}

    const tffKicker = document.querySelector('#tffPathBtn .path-kicker');
    const tffTitle = document.querySelector('#tffPathBtn h3');
    const tffDesc = document.querySelector('#tffPathBtn p');
    if (tffKicker) tffKicker.textContent = t.tffKicker;
    if (tffTitle) tffTitle.textContent = t.tffTitle;
    if (tffDesc) tffDesc.textContent = t.tffDesc;

    const agKicker = document.querySelector('#agPathBtn .path-kicker');
    const agTitle = document.querySelector('#agPathBtn h3');
    const agDesc = document.querySelector('#agPathBtn p');
    if (agKicker) agKicker.textContent = t.agKicker;
    if (agTitle) agTitle.textContent = t.agTitle;
    if (agDesc) agDesc.textContent = t.agDesc;
}

let questionnaireQuestions = [];

async function loadQuestionnaire() {
    const form = document.getElementById("applicationForm");

    try {
        const response = await fetch("./questions.json");

        if (!response.ok) {
            throw new Error("Could not load questions.json");
        }

        questionnaireQuestions = await response.json();
        renderQuestionnaire();
    } catch (error) {
        form.textContent =
            "The questions could not load. Please refresh the page.";

        console.error(error);
    }
}

function renderQuestionnaire() {
    const form = document.getElementById("applicationForm");
    if (!form) return;

    form.replaceChildren();

    questionnaireQuestions.forEach(function(question) {
        const container = document.createElement("div");
        container.className = "question";

        const label = document.createElement("label");
        label.htmlFor = question.id;

        const prompt =
            question.prompts[appState.lang] || question.prompts.en;

        label.textContent = prompt + (question.required ? " *" : "");

        const input = document.createElement("input");

        input.id = question.id;
        input.name = question.id;
        input.type = question.type;
        input.required = question.required;

        input.dataset.pdfFieldKey = question.pdfFieldKey;

        const savedAnswer = appState.formData[question.id];

        if (question.type === "checkbox") {
            input.checked = savedAnswer === true;
            container.classList.add("checkbox-question");

            container.append(input, label);
        } else {
            input.value = savedAnswer ?? "";

            container.append(label, input);
        }

        form.appendChild(container);
    });
}
