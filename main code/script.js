// 1. entire thing functions
const appState = {
    lang: 'en',
    currentStep: 1,
    currentFormPage: 1,
    skipCommissary: false,
    path: null,
    formData: {}
};

document.addEventListener('DOMContentLoaded', () => {
    showScreen('screen1');
    updateStepTracker(1);
    loadQuestionnaire();
    prefillAutoDates();
    
    const headerControls = document.getElementById('headerControls');
    if (headerControls) {
        headerControls.style.display = 'none';
    }
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadAndWipe);
    }

    const startOverBtn = document.getElementById('startOverBtn');
    if (startOverBtn) {
        startOverBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to start over? All entered data will be cleared.")) {
                appState.formData = {};
                appState.path = null;
                appState.skipCommissary = false;
                showScreen('screen1');
            }
        });
    }

    const qBackBtn = document.getElementById('qBackBtn');
    if (qBackBtn) {
        qBackBtn.addEventListener('click', () => {
            if (appState.currentFormPage === 3 && appState.skipCommissary) {
                showFormPage(1);
                return;
            }
            if (appState.currentFormPage > 1) {
                showFormPage(appState.currentFormPage - 1);
            } else {
                showScreen('screen2');
            }
        });
    }

    const revBackBtn = document.getElementById('revBackBtn');
    if (revBackBtn) {
        revBackBtn.addEventListener('click', () => showScreen('screen3'));
    }

    const startNewAppBtn = document.getElementById('startNewAppBtn');
    if (startNewAppBtn) {
        startNewAppBtn.addEventListener('click', () => {
            appState.formData = {};
            appState.path = null;
            appState.skipCommissary = false;
            showScreen('screen1');
        });
    }

    document.querySelectorAll('.lang-switcher span').forEach(span => {
        span.addEventListener('click', (e) => {
            const selectedLang = e.currentTarget.getAttribute('data-lang');
            saveLanguage(selectedLang);
        });
    });
    
    document.querySelectorAll('.languageButtons button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all buttons
            document.querySelectorAll('.languageButtons button').forEach(b => b.classList.remove('active'));
            // Add active class to the clicked button
            e.currentTarget.classList.add('active');

            const selectedLang = e.currentTarget.getAttribute('data-lang');
            saveLanguage(selectedLang);
        });
    });
  

    const nextButtons = document.querySelectorAll(".next-btn");
    nextButtons.forEach(function(button) {
        button.addEventListener("click", function(e) {
            if (button.id === "pSubmitBtn" || button.id === "qSubmitBtn") return; 

            const currentScreen = button.closest(".screen");
            const nextScreen = currentScreen.nextElementSibling;

            if (nextScreen && nextScreen.classList.contains("screen")) {
                showScreen(nextScreen.id);
            }
        });
    });   
    
    const qSubmitBtn = document.getElementById("qSubmitBtn");
    if (qSubmitBtn) {
        qSubmitBtn.addEventListener("click", function(e) {
            e.preventDefault();
            if (!validateForm()) return;

            if (appState.currentFormPage === 1) {
                const kitchenAnswer = document.getElementById('originalPackageCheck')?.value;
                appState.skipCommissary = kitchenAnswer === 'No';
                showFormPage(appState.skipCommissary ? 3 : 2);
            } else if (appState.currentFormPage < 3) {
                showFormPage(appState.currentFormPage + 1);
            } else {
                renderReviewScreen();
                showScreen("screen4");
            }
        });
    }
    
    const tffBtn = document.getElementById('tffPathBtn');
        if (tffBtn) {
            tffBtn.addEventListener('click', () => {
                appState.path = 'tff';
                appState.skipCommissary = false;
                showFormPage(1);
                const today = new Date().toISOString().split('T')[0];
                appState.formData['todaysDate'] = today;
                
                showScreen('screen3');
                loadQuestionnaire(); 
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
    }
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

function showFormPage(pageNumber) {
    document.querySelectorAll('[id^="formPage"]').forEach(page => {
        page.classList.add('hidden');
        page.style.display = 'none';
        page.setAttribute('aria-hidden', 'true');
    });

    const page = document.getElementById(`formPage${pageNumber}`);
    if (!page) return;

    page.classList.remove('hidden');
    page.style.display = 'block';
    page.setAttribute('aria-hidden', 'false');
    appState.currentFormPage = pageNumber;
}
//2 for savelang 
function saveLanguage(langCode) {
    const languages = {
        en: {
            heading: "Choose your language",
            message: "English selected.",
            next: "Next"
        },
        es: {
            heading: "Elija su idioma",
            message: "Español seleccionado.",
            next: "Siguiente"
        },
        zh: {
            heading: "请选择您的语言",
            message: "已选择中文。",
            next: "下一步"
        },
        hi: {
            heading: "अपनी भाषा चुनें",
            message: "हिंदी चुनी गई है।",
            next: "अगला"
        }
    };

    const selected = languages[langCode];
    if (!selected) return;

    // Save the chosen language.
    appState.lang = langCode;
    document.documentElement.lang = langCode;

    // Update the first page.
    document.getElementById("languageHeading").textContent =
        selected.heading;

    document.getElementById("message").textContent =
        selected.message;

    document.getElementById("langNextBtn").textContent =
        selected.next;

    // Highlight the selected language button.
    document.querySelectorAll(".languageButtons button").forEach(button => {
        const isSelected = button.dataset.lang === langCode;

        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    // Update the header language selection.
    document.querySelectorAll(".lang-switcher span").forEach(span => {
        const isSelected = span.dataset.lang === langCode;

        span.classList.toggle("active", isSelected);

        span.style.opacity = isSelected ? "1" : "0.6";
        span.style.fontWeight = isSelected ? "700" : "400";
        span.style.borderBottom = isSelected
        ? "1px solid currentColor"
        : "none";
    });

    const headerControls = document.getElementById("headerControls");

    if (headerControls) {
        headerControls.style.display = "flex";
    }

    updatePageText();
}
// 5. PDF and review functions
function formatKeyToLabel(key) {
    const text = String(key)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
    const knownWords = [
        "contamination", "protection", "containers", "thermometer",
        "delegation", "disposal", "transport", "sanitation", "reusable",
        "business", "sponsor", "contact", "original", "package", "generator",
        "sampling", "details", "outdoor", "cooking", "condiments", "utility",
        "locations", "hand", "wash", "utensil", "task", "prep", "inside",
        "cold", "holding", "permit", "trash", "booth", "walls", "hot",
        "water", "source", "waste", "customer", "commissary", "services",
        "explanation", "signer", "applicant", "signature", "number", "name",
        "event", "address", "phone", "email", "owner", "date", "print",
        "check", "quiz"
    ];
    const words = text === text.toUpperCase()
        ? (() => {
            const result = [];
            let remaining = text.toLowerCase();
            while (remaining) {
                const word = knownWords.find(candidate => remaining.startsWith(candidate));
                if (!word) {
                    result.push(remaining);
                    break;
                }
                result.push(word);
                remaining = remaining.slice(word.length);
            }
            return result;
        })()
        : text.split(/\s+/);

    return words
        .join(" ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getReviewCategory(key) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes("quiz")) return "Quiz Results";
    if (normalizedKey.includes("commissary")) return "Commissary Agreement";
    if (/check|signature|printname|signer/.test(normalizedKey)) {
        return "Checklists & Signatures";
    }
    if (/event|start|end|eventsponsor|sponsorcontact|sponsoremail/.test(normalizedKey)) {
        return "Event Logistics";
    }
    if (/original|generator|sampling|water|waste|enclosure|transport|reusable|customer|menu|commissary|outofcounty/.test(normalizedKey)) {
        return "Operations";
    }
    return "Business Information";
}

function renderReviewScreen() {
    const reviewContainer = document.getElementById('reviewContent');
    if (!reviewContainer) return;

    reviewContainer.innerHTML = '';
    reviewContainer.className = 'max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left';

    const reviewValues = new Map(Object.entries(appState.formData));
    questionnaireQuestions.forEach(question => {
        if (question.id === "faNumber") return;

        const input = document.getElementById(question.id);
        if (!input) return;
        reviewValues.set(
            question.pdfFieldKey || question.id,
            input.type === 'checkbox' ? input.checked : input.value
        );
    });
    document.querySelectorAll(
        '#formPage1 input, #formPage1 select, #formPage1 textarea, ' +
        '#formPage2 input, #formPage2 select, #formPage2 textarea, ' +
        '#formPage3 input, #formPage3 select, #formPage3 textarea'
    ).forEach(input => {
        const question = questionnaireQuestions.find(item => item.id === input.id);
        const key = question?.pdfFieldKey || input.name || input.id;
        if (key) {
            reviewValues.set(key, input.type === 'checkbox' ? input.checked : input.value);
        }
    });

    const includeCommissary = reviewValues.get('OriginalPackageCheck') === 'Yes';
    const sections = {};
    for (const [key, value] of reviewValues) {
        if (key === "FANumber" || key === "faNumber") continue;
        if (!includeCommissary && key.toLowerCase().includes('commissary')) continue;
        const category = getReviewCategory(key);
        if (!sections[category]) sections[category] = [];
        sections[category].push({ key, value });
    }

    for (const [category, entries] of Object.entries(sections)) {
        const section = document.createElement('section');
        section.className = 'bg-[#fff8ed] border-2 border-[#d9641f]/20 rounded-xl p-5 shadow-sm';

        const heading = document.createElement('h3');
        heading.className = "font-['Yeseva_One'] text-xl text-[#d9641f] mt-0 mb-3";
        heading.textContent = category;
        section.appendChild(heading);

        entries.forEach(({ key, value }) => {
            const card = document.createElement('div');
            card.className = 'review-card border-b border-[#d9641f]/10 py-2 last:border-b-0';
            card.innerHTML = `
                <span class="review-label">${formatKeyToLabel(key)}</span>
                <span class="review-value">${value ? value : 'Not answered'}</span>
            `;
            section.appendChild(card);
        });

        reviewContainer.appendChild(section);
    }
}

async function generateCountyPDF() {
    try {
        const { PDFDocument } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.js');

        const formUrl = './assets/tff-application.pdf';
        const response = await fetch(formUrl);

        if (!response.ok) {
            throw new Error(`Failed to load PDF template (HTTP status ${response.status})`);
        }

        const formBytes = await response.arrayBuffer();

        const pdfDoc = await PDFDocument.load(formBytes);
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
        alert(`Could not generate PDF: ${error.message}`);
        return null;
    }
}

async function downloadAndWipe() {
    const businessName = appState.formData['businessName'] || 
                         appState.formData['business_name'] || 
                         appState.formData['companyName'] || 
                         appState.formData['applicantName'] || 
                         'Vendor';
    
    const pdfBytes = await generateCountyPDF();
    if (!pdfBytes) return;

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
        agDesc: "View guidance for agricultural exemptions and direct-to-consumer rules.",
        validationError: "Please fill out all required fields with standard characters before proceeding."
    },
    es: {
        step2Title: "¿Qué tipo de productos vende en el mercado?",
        step2Desc: "Los alimentos cocinados y muestras usan el formulario del condado, mientras que los productos agrícolas propios a menudo no.",
        tffKicker: "Instalación de comida temporal",
        tffTitle: "Comida preparada, comida caliente, productos horneados, muestras",
        tffDesc: "Llena la solicitud oficial de instalaciones de comida temporal del Condado de Alameda directamente en su navegador.",
        agKicker: "Ruta agrícola",
        agTitle: "Productos crudos, fruta, miel cosechada en mi granja",
        agDesc: "Vea la guía para exenciones agrícolas y reglas de venta directa al consumidor.",
        validationError: "Por favor, complete todos los campos obligatorios antes de continuar."
    },
    zh: {
        step2Title: "您在市场出售什么类型的产品？",
        step2Desc: "熟食和样品需要使用县级表格，而您自己农场种植的整块农产品通常不需要。",
        tffKicker: "临时食品设施",
        tffTitle: "熟食、热食、烘焙食品、样品",
        tffDesc: "直接在您的浏览器中填写阿拉amed达县官方临时食品设施申请表。",
        agKicker: "农业路线",
        agTitle: "在我农场种植的生鲜农产品、水果、蜂蜜",
        agDesc: "查看农业豁免和直销规则指南。",
        validationError: "请在继续之前填写所有必填字段。"
    },
    hi: {
        step2Title: "आप बाजार में किस प्रकार के उत्पाद बेच रहे हैं?",
        step2Desc: "पका हुआ भोजन और नमूने काउंटी फॉर्म का उपयोग करते हैं, जबकि आपके अपने खेत की ताजा उपज अक्सर ऐसा नहीं करती है।",
        tffKicker: "अस्थायी खाद्य सुविधा",
        tffTitle: "तैयार भोजन, गर्म भोजन, पके हुए सामान, नमूने",
        tffDesc: "सीधे अपने ब्राउज़र में आधिकारिक Alameda County अस्थायी खाद्य सुविधा आवेदन भरें।",
        agKicker: "कृषि मार्ग",
        agTitle: "मेरे खेत में उगाई गई कच्ची उपज, फल, शहद",
        agDesc: "कृषि छूट और प्रत्यक्ष-से-उपभोक्ता नियमों के लिए मार्गदर्शन देखें।",
        validationError: "कृपया आगे बढ़ने से पहले सभी आवश्यक फ़ील्ड भरें।"
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

    const tffKicker = document.querySelector('#tffPathBtn .path-kicker');
    const tffTitle = document.querySelector('#tffPathBtn h3');
    const tffDesc = document.querySelector('#tffPathBtn p');

    const validationAlertEl = document.getElementById('validationAlert');
    if (validationAlertEl && t.validationError) {
        validationAlertEl.textContent = t.validationError;
    }
    
    if (tffKicker) tffKicker.textContent = t.tffKicker;
    if (tffTitle) tffTitle.textContent = t.tffTitle;
    if (tffDesc) tffDesc.textContent = t.tffDesc;

    const agKicker = document.querySelector('#agPathBtn .path-kicker');
    const agTitle = document.querySelector('#agPathBtn h3');
    const agDesc = document.querySelector('#agPathBtn p');

    if (agKicker) agKicker.textContent = t.agKicker;
    if (agTitle) agTitle.textContent = t.agTitle;
    if (agDesc) agDesc.textContent = t.agDesc;

    questionnaireQuestions.forEach(function(question) {
        if (question.id === "faNumber") return;

        const label = document.querySelector(
            `#applicationForm label[for="${question.id}"], #commercialKitchenForm label[for="${question.id}"], #commissaryForm label[for="${question.id}"], #finalSignatureForm label[for="${question.id}"]`
        );

        if (label) {
            const prompt =
                question.prompts[appState.lang] || question.prompts.en;

            label.textContent =
                prompt + (question.required ? " *" : "");
        }
    });
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
    const commercialKitchenForm = document.getElementById("commercialKitchenForm");
    const commissaryForm = document.getElementById("commissaryForm");
    const finalSignatureForm = document.getElementById("finalSignatureForm");
    if (!form || !commercialKitchenForm || !commissaryForm || !finalSignatureForm) return;

    form.replaceChildren();
    commercialKitchenForm.replaceChildren();
    commissaryForm.replaceChildren();
    finalSignatureForm.replaceChildren();

    questionnaireQuestions.forEach(function(question) {
        if (question.id === "faNumber") return;

        const targetForm = question.id === "originalPackageCheck"
            ? commercialKitchenForm
            : question.phase === 5
                ? commissaryForm
                : question.phase === 6
                    ? finalSignatureForm
                    : question.phase <= 3
                        ? form
                        : null;
        if (!targetForm) return;

        const container = document.createElement("div");
        container.className = "question";

        const label = document.createElement("label");
        label.htmlFor = question.id;

        const prompt = question.prompts[appState.lang] || question.prompts.en;
        label.textContent = prompt + (question.required ? " *" : "");

        let input;
        const storageKey = question.pdfFieldKey || question.id;
        const savedAnswer = appState.formData[storageKey];

        if (question.type === "select") {
            input = document.createElement("select");
            input.id = question.id;
            input.name = question.id;
            input.required = question.required;

            const defaultOpt = document.createElement("option");
            defaultOpt.value = "";
            defaultOpt.textContent = "-- Select an option --";
            defaultOpt.disabled = true;
            defaultOpt.selected = !savedAnswer;
            input.appendChild(defaultOpt);

            question.options.forEach(optText => {
                const opt = document.createElement("option");
                opt.value = optText;
                opt.textContent = optText;
                if (savedAnswer === optText) opt.selected = true;
                input.appendChild(opt);
            });

            container.append(label, input);

        } else if (question.type === "date") {
            input = document.createElement("input");
            input.id = question.id;
            input.name = question.id;
            input.type = "date";
            input.classList.add("auto-date");
            input.required = question.required;
            input.value = savedAnswer ?? "";
            container.append(label, input);

        } else if (question.type === "checkbox") {
            input = document.createElement("input");
            input.id = question.id;
            input.name = question.id;
            input.type = "checkbox";
            input.required = question.required;
            input.checked = savedAnswer === true;
            container.classList.add("checkbox-question");
            container.append(input, label);

        } else {
            input = document.createElement("input");
            input.id = question.id;
            input.name = question.id;
            input.type = question.type || "text";
            input.required = question.required;
            input.value = savedAnswer ?? "";
            container.append(label, input);
        }

        const eventType =
            (question.type === "checkbox" || question.type === "select")
                ? "change"
                : "input";
        input.addEventListener(eventType, function(e) {
            const val = question.type === "checkbox"
                ? e.target.checked
                : e.target.value;
            appState.formData[storageKey] = val;
            updateLiveCounter();
        });

        targetForm.appendChild(container);
        });
    prefillAutoDates();
    updateLiveCounter();
}

function prefillAutoDates() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input.auto-date').forEach(input => {
        if (input.id === 'startDate' || input.id === 'endDate') return;
        if (!input.value) input.value = today;
    });
}

function validateForm() {
    const page = document.getElementById(`formPage${appState.currentFormPage}`);
    if (!page) return false;

    const requiredInputs = Array.from(
        page.querySelectorAll('input[required], select[required], textarea[required]')
    );
    if (appState.currentFormPage === 3) {
        requiredInputs.push(...page.querySelectorAll('input[name$="Initials"]'));
    }

    const unanswered = requiredInputs.filter(input => {
        if (input.type === "checkbox") return !input.checked;
        return !input.value.trim();
    });
    const validationAlert = document.getElementById("validationAlert");

    if (unanswered.length > 0) {
        if (validationAlert) {
            validationAlert.style.setProperty("display", "block", "important");
        }
        unanswered[0].focus();
        return false;
    }

    if (validationAlert) validationAlert.style.display = "none";
    return true;
}

function updateLiveCounter() {
    const requiredQuestions = questionnaireQuestions.filter(function(question) {
        return question.required === true;
    });

    let answered = 0;

    requiredQuestions.forEach(function(question) {
        const input = document.getElementById(question.id);
        if (!input) return;

        if (question.type === "checkbox") {
            if (input.checked) answered++;
        } else {
            if (input.value.trim() !== "") answered++;
        }
    });

    const counter = document.getElementById("liveCounter");

    if (counter) {
        counter.textContent =
            `${answered} of ${requiredQuestions.length} required questions answered`;
    }
}
