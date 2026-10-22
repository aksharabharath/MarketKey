// 1. entire thing functions
const appState = {
    lang: 'en',
    currentStep: 1,
    currentFormPage: 1,
    skipCommissary: false,
    path: null,
    formData: {}
};

const get = id => document.getElementById(id);
const listen = (id, event, handler) => get(id)?.addEventListener(event, handler);

function resetApp() {
    appState.formData = {};
    appState.path = null;
    appState.skipCommissary = false;
    showScreen('screen1');
}

document.addEventListener('DOMContentLoaded', () => {
    showScreen('screen1');
    updateStepTracker(1);
    loadQuestionnaire();
    prefillAutoDates();
    if (get('headerControls')) get('headerControls').style.display = 'none';

    listen('downloadPdfBtn', 'click', downloadAndWipe);
    listen('startOverBtn', 'click', () => {
        if (confirm('Are you sure you want to start over? All entered data will be cleared.')) resetApp();
    });
    listen('startNewAppBtn', 'click', resetApp);
    listen('revBackBtn', 'click', () => showScreen('screen3'));

    listen('qBackBtn', 'click', () => {
        if (appState.currentFormPage === 3 && appState.skipCommissary) {
            showFormPage(1);
        } else if (appState.currentFormPage > 1) {
            showFormPage(appState.currentFormPage - 1);
        } else {
            showScreen('screen2');
        }
    });

    document.querySelectorAll('.lang-switcher span').forEach(span => {
        span.addEventListener('click', () => saveLanguage(span.dataset.lang));
    });
    document.querySelectorAll('.languageButtons button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.languageButtons button')
                .forEach(item => item.classList.toggle('active', item === button));
            saveLanguage(button.dataset.lang);
        });
    });

    document.querySelectorAll('.next-btn').forEach(button => {
        button.addEventListener('click', event => {
            if (button.id === 'pSubmitBtn' || button.id === 'qSubmitBtn') return;
            const next = button.closest('.screen')?.nextElementSibling;
            if (next?.classList.contains('screen')) showScreen(next.id);
        });
    });

    listen('qSubmitBtn', 'click', event => {
        event.preventDefault();
        if (!validateForm()) return;

        if (appState.currentFormPage === 1) {
            appState.skipCommissary = get('originalPackageCheck')?.value === 'No';
            showFormPage(appState.skipCommissary ? 3 : 2);
        } else if (appState.currentFormPage < 3) {
            showFormPage(appState.currentFormPage + 1);
        } else {
            renderReviewScreen();
            showScreen('screen4');
        }
    });

    listen('tffPathBtn', 'click', () => {
        appState.path = 'tff';
        appState.skipCommissary = false;
        appState.formData.todaysDate = new Date().toISOString().split('T')[0];
        showFormPage(1);
        showScreen('screen3');
        loadQuestionnaire();
    });

    listen('agPathBtn', 'click', () => {
        appState.path = 'ag';
        document.querySelector('.path-cards').style.display = 'none';
        get('agGuidanceView').style.display = 'block';
    });
    listen('agBackBtn', 'click', () => {
        document.querySelector('.path-cards').style.display = 'flex';
        get('agGuidanceView').style.display = 'none';
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

    renderQuestionnaire();
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

function reviewValue(value, translations) {
    if (typeof value === "boolean") return value ? translations.yes : translations.no;
    if (!value) return translations.notAnswered;
    if (typeof value === "string" && /^[\[{]/.test(value.trim())) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return value;
        }
    }
    return value;
}

function renderReviewScreen() {
    const reviewContainer = document.getElementById('reviewContent');
    if (!reviewContainer) return;
    const translations = uiTranslations[appState.lang] || uiTranslations.en;

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
        if (input.closest('#menuTableBuilderTable')) return;
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
        heading.textContent = translations.reviewCategories[category] || category;
        section.appendChild(heading);

        const entryGrid = document.createElement('dl');
        entryGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2';
        entries.forEach(({ key, value }) => {
            const card = document.createElement('div');
            card.className = 'border-b border-[#d9641f]/10 py-2';

            const label = document.createElement('dt');
            label.className = 'review-label';
            label.textContent = formatKeyToLabel(key);
            card.appendChild(label);

            const displayValue = reviewValue(value, translations);
            if (Array.isArray(displayValue)) {
                const list = document.createElement('ul');
                list.className = 'list-disc pl-4 text-sm text-[#713515]';
                displayValue.forEach(row => {
                    const item = document.createElement('li');
                    item.textContent = [
                        row.menuItem,
                        row.preppedBeforeEvent,
                        row.preppedAtEventOnly,
                        row.hotColdTransport,
                        row.servedHotColdReheated,
                        row.transportEquipment,
                        row.cookingServingEquipment
                    ].filter(Boolean).join(' · ') || translations.notAnswered;
                    list.appendChild(item);
                });
                card.appendChild(list);
            } else {
                const valueText = document.createElement('dd');
                valueText.className = 'text-sm font-semibold text-[#713515] break-words';
                valueText.textContent = String(displayValue);
                card.appendChild(valueText);
            }
            entryGrid.appendChild(card);
        });
        section.appendChild(entryGrid);

        reviewContainer.appendChild(section);
    }
}

const pdfFieldAliases = {
    ownerName: "OWNER NAME",
    sponsorApproval: "Sponsor Approval",
    businessName: "BUSINESS NAME",
    numberOfBooths: "# OF BOOTHS",
    indoorOutdoor: "INDICATE INDOOR OR OUTDOOR",
    boothName: "NAME OF THE BOOTH",
    emailAddress: "EMAIL ADDRESS",
    businessAddress: "BUSINESS ADDRESS WITH CITY STATE AND ZIP CODE",
    mailingAddress: "MAILING ADDRESS IF DIFFERNET FROM BUSINESS ADDRESS",
    phoneNumbers: "BUSINESS AND CELL PHONE",
    todaysDate: "today's date",
    eventName: "NAME OF THE EVENT",
    eventAddress: "ADDRESS OF THE EVENT",
    eventSponsorName: "EVENT SPONSOR NAME",
    sponsorContactPhone: "CONTACT PHONE",
    sponsorEmail: "SPONSOR EMAIL",
    originalPackageCheck: "YES OR NO",
    generatorInfo: "Generator Information",
    samplingDetails: "SAMPLING Y/N",
    waterSource: "WHERE WILL YOU OBTAIN CLEAN WATER FOR HANDWASH AND WAREWASH",
    wasteDisposal: "WHERE WILL YOU DISPOSE OF DIRTY WATER GARBAGE AND USED FRY OIL",
    boothEnclosure: "WILL YOU PROVIDE A FULLY ENCLOSED BOOTH IF NO EXPLAIN WHY IF YES EXPLAIN THE MATERIALS USED",
    transportSanitation: "HOW WILL YOU TRANSPORT UTENSILS?",
    reusableUtensils: "WILL YOU OR SPONSOR PROVIDE RESUABLE PLATEWARE ETC?",
    customerContainers: "WHAT ARE YOUR OPERATING PROCEDURES FOR ACCEPTING CUSTOMER OWNED RE USEABLE CONTAINERS SUCH AS CUPS MUGS PLATES ETC HOW WILL YOU ENSURE THE CONTAINERS WILL NOT CREATE A CONTAMINATION ISSUE INSIDE YOUR BOOTH OR WITH YOUR EMPLOYEES TFF OPERATORS ARE NOT ALLOWED TO PROVIDE MULTI USE UTENSILS FOR CUSTOMERS WITH OUT DEPARTMENT APPROVAL",
    printName: "Print Name",
    applicantName: "Print Name",
    applicantSignatureDate: "Date",
    quizBoothName: "booth name",
    quizEventInfo: "Event Name and Dates",
    applicantPhone: "phone number",
    commissaryName: "Commissary  Commercial Kitchen",
    commissaryOwnerName: "Owner Name",
    commissaryAddress: "Street Address",
    commissaryPhones: "Phone",
    commissarySignerName: "Print Authorized Signer Name",
    commissarySignerPhone: "Phone",
    commissarySignerDate: "Date_2",
    commissaryServicesList: "services",
    commissaryNoExplanation: "NO ANSWER EXPLAINED",
    outOfCountyInfo: "CITY/COUNTY",
    checkHandwashInitials: "1",
    checkUtensilWashInitials: "2",
    checkTaskDelegationInitials: "3",
    checkPrepInsideInitials: "4",
    checkOutdoorCookingInitials: "5",
    checkThermometerInitials: "6",
    checkColdHoldingInitials: "7",
    checkHotHoldingInitials: "8",
    checkPermitDisplayInitials: "9",
    checkTrashContainersInitials: "10",
    checkCondimentsInitials: "11",
    checkContaminationProtectionInitials: "12",
    checkBoothWallsInitials: "13 1",
    checkUtilityLocationsInitials: "13 2"
};

function normalizePdfFieldName(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function collectFormData() {
    const data = { ...appState.formData };
    questionnaireQuestions.forEach(question => {
        if (question.id === "faNumber") return;
        const input = document.getElementById(question.id);
        if (input) {
            data[question.pdfFieldKey || question.id] =
                input.type === "checkbox" ? input.checked : input.value;
        }
    });

    document.querySelectorAll(
        '#formPage1 input, #formPage1 select, #formPage1 textarea, ' +
        '#formPage2 input, #formPage2 select, #formPage2 textarea, ' +
        '#formPage3 input, #formPage3 select, #formPage3 textarea'
    ).forEach(input => {
        if (input.closest('#menuTableBuilderTable')) return;
        const question = questionnaireQuestions.find(item => item.id === input.id);
        const key = question?.pdfFieldKey || input.name || input.id;
        if (key !== "FANumber" && key !== "faNumber") {
            data[key] = input.type === "checkbox" ? input.checked : input.value;
        }
    });
    return data;
}

function checkQuizAnswers(data, fieldsByExactName, fieldsByName, quizCheckboxes = []) {
    const optionCounts = [4, 4, 4, 2, 5, 2, 4, 2, 4, 4, 0, 2, 4, 2, 4, 4, 0, 2, 4, 2];
    Object.keys(data).filter(key => /^quiz\d+$/i.test(key)).forEach(key => {
        const select = document.getElementById(key);
        const answer = String(data[key] ?? "");
        let optionIndex = select ? select.selectedIndex - 1 : -1;
        if (optionIndex < 0 && /^[a-d](?:[\s.)]|$)/i.test(answer)) {
            optionIndex = answer.toLowerCase().charCodeAt(0) - 97;
        }
        if (optionIndex < 0 && select) {
            optionIndex = [...select.options].findIndex(option =>
                normalizePdfFieldName(option.value) === normalizePdfFieldName(answer)
            ) - 1;
        }
        if (optionIndex < 0) return;

        const number = key.match(/\d+/)[0];
        const letter = String.fromCharCode(97 + optionIndex);
        const candidates = [
            `Quiz${number}${letter}`, `Quiz ${number} ${letter}`,
            `${number}${letter}`, `${number} ${letter}`, `${number}.${letter}`
        ];
        let field = candidates
            .map(name => fieldsByExactName.get(name) || fieldsByName.get(normalizePdfFieldName(name)))
            .find(item => item && typeof item.check === "function");
        if (!field) {
            const answerName = normalizePdfFieldName(answer.replace(/^[a-d][\s.)-]*/i, ""));
            field = [...fieldsByExactName.values()].find(item => {
                if (typeof item.check !== "function") return false;
                const name = normalizePdfFieldName(item.getName());
                const questionMatches = name.includes(`quiz${number}`) ||
                    name.includes(`q${number}`) ||
                    name.startsWith(`${number}option`);
                const optionMatches = name.endsWith(letter) ||
                    name.includes(`option${optionIndex + 1}`) ||
                    name.endsWith(String(optionIndex + 1)) ||
                    (answerName.length > 2 && name.includes(answerName));
                return questionMatches && optionMatches;
            });
        }
        if (!field && quizCheckboxes.length) {
            const questionIndex = Number(number) - 1;
            const offset = optionCounts.slice(0, questionIndex)
                .reduce((total, count) => total + count, 0);
            field = quizCheckboxes[offset + optionIndex];
        }
        if (field) {
            try {
                field.check();
            } catch (error) {
                console.warn(`Could not check quiz field ${key}: ${error.message}`);
            }
        }
    });
}

function writePdfField(field, value, name) {
    try {
        if (typeof field.select === "function") {
            field.select(String(value));
        } else if (typeof field.check === "function") {
            if (value === true || value === "true" || value === "Yes") field.check();
        } else if (typeof field.setText === "function") {
            try {
                if (typeof field.setFontSize === "function") field.setFontSize(8);
            } catch {
                // Legacy fields without /DA retain their existing appearance.
            }
            field.setText(String(value));
        }
    } catch (error) {
        console.warn(`Could not fill PDF field ${name}: ${error.message}`);
    }
}

async function generateCountyPDF() {
    try {
        const { PDFDocument, StandardFonts, rgb } =
            await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.js');

        const formUrl = './assets/tff-application.pdf';
        const response = await fetch(formUrl);

        if (!response.ok) {
            throw new Error(`Failed to load PDF template (HTTP status ${response.status})`);
        }

        const formBytes = await response.arrayBuffer();

        const pdfDoc = await PDFDocument.load(formBytes);
        const form = pdfDoc.getForm();
        const fieldsByExactName = new Map(
            form.getFields().map(field => [field.getName(), field])
        );
        const fieldsByName = new Map(
            form.getFields().map(field => [normalizePdfFieldName(field.getName()), field])
        );
        const data = collectFormData();
        const fieldValues = new Map();

        for (const [key, value] of Object.entries(data)) {
            if (key === "FANumber" || key === "faNumber") continue;
            if (key === "startDate" || key === "StartDate") {
                fieldValues.set("START DATE END DATE", `${value} - ${data.endDate || data.EndDate || ""}`.trim());
            } else if (key === "startTime" || key === "StartTime") {
                fieldValues.set("START TIME END TIME", `${value} - ${data.endTime || data.EndTime || ""}`.trim());
            } else if (key === "menuTableBuilder" || key === "MenuTableBuilder") {
                try {
                    JSON.parse(value).forEach((row, index) => {
                        const number = index + 1;
                        const location = row.preparationLocation || "";
                        const item = row.ingredientsSource
                            ? `${row.menuItem || ""} (${row.ingredientsSource})`
                            : row.menuItem || "";
                        fieldValues.set(`MENU ITEM #${number}`, item);
                        fieldValues.set(
                            `PREPPED BEFORE EVENT ${number}`,
                            row.preppedBeforeEvent ?? (location.toLowerCase().includes("before") ? location : "")
                        );
                        fieldValues.set(
                            `PREPPED AT EVENT ${number}`,
                            row.preppedAtEventOnly ?? (location && !location.toLowerCase().includes("before") ? location : "")
                        );
                        fieldValues.set(`BROUGHT HOT OR COLD ${number}`, row.hotColdTransport || "");
                        fieldValues.set(`SERVED HOT OR COLD ${number}`, row.servedHotColdReheated || "");
                        fieldValues.set(`EQUIPMENT ${number}`, row.transportEquipment || "");
                        fieldValues.set(`ELECTRIC ${number}`, row.cookingServingEquipment || row.equipmentUsed || "");
                    });
                } catch {
                    console.warn("Could not parse menu table data");
                }
            } else if (key !== "endDate" && key !== "EndDate" && key !== "endTime" && key !== "EndTime") {
                const alias = pdfFieldAliases[key] || pdfFieldAliases[key.charAt(0).toLowerCase() + key.slice(1)] || key;
                fieldValues.set(alias, value);
            }
        }

        fieldValues.set(
            "booth name",
            data.boothName || data.BoothName || data.quizBoothName || ""
        );
        fieldValues.set(
            "Event Name and Dates",
            `${data.eventName || data.EventName || ""} ` +
            `${data.startDate || data.StartDate || ""} - ` +
            `${data.endDate || data.EndDate || ""}`.trim()
        );
        fieldValues.set(
            "Print Name",
            data.applicantName || data.PrintName || data.printName || ""
        );
        Object.entries({
            "1": "checkHandwashInitials",
            "2": "checkUtensilWashInitials",
            "3": "checkTaskDelegationInitials",
            "4": "checkPrepInsideInitials",
            "5": "checkOutdoorCookingInitials",
            "6": "checkThermometerInitials",
            "7": "checkColdHoldingInitials",
            "8": "checkHotHoldingInitials",
            "9": "checkPermitDisplayInitials",
            "10": "checkTrashContainersInitials",
            "11": "checkCondimentsInitials",
            "12": "checkContaminationProtectionInitials",
            "13 1": "checkBoothWallsInitials",
            "13 2": "checkUtilityLocationsInitials"
        }).forEach(([pdfName, key]) => {
            if (data[key] !== undefined) fieldValues.set(pdfName, String(data[key]));
        });

        for (const [fieldName, value] of fieldValues) {
            const field = fieldsByExactName.get(fieldName) ||
                fieldsByName.get(normalizePdfFieldName(fieldName));
            if (!field || value === "" || value === null || value === undefined) continue;
            writePdfField(field, value, fieldName);
        }
        const quizCheckboxes = form.getFields()
            .filter(field => typeof field.check === "function" && /^check box/i.test(field.getName()))
            .slice(0, 59);
        checkQuizAnswers(data, fieldsByExactName, fieldsByName, quizCheckboxes);

        const signature = data.applicantSignature || data.ApplicantSignature;
        if (signature) {
            const signatureField = fieldsByExactName.get("Applicant Signature");
            const widget = signatureField?.acroField.getWidgets()[0];
            if (widget) {
                const pageRef = widget.P();
                const page = pdfDoc.getPages().find(item => item.ref === pageRef) ||
                    pdfDoc.getPages()[5];
                const rect = widget.getRectangle();
                const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
                page.drawText(String(signature), {
                    x: rect.x + 2,
                    y: rect.y + 5,
                    size: 9,
                    font,
                    color: rgb(0, 0, 0),
                    maxWidth: rect.width - 4
                });
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
    const businessName = appState.formData['BusinessName'] ||
                         appState.formData['businessName'] ||
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
        validationError: "Please fill out all required fields with standard characters before proceeding.",
        reviewTitle: "Review Your Application",
        reviewDesc: "Please review your information below before generating your official county PDF.",
        reviewBack: "Back to Questions",
        reviewDownload: "Download Official Application PDF",
        yes: "Yes",
        no: "No",
        notAnswered: "Not answered",
        reviewCategories: {
            "Business Information": "Business Information",
            "Event Logistics": "Event Logistics",
            "Operations": "Operations",
            "Checklists & Signatures": "Checklists & Signatures",
            "Quiz Results": "Quiz Results",
            "Commissary Agreement": "Commissary Agreement"
        }
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
        validationError: "Por favor, complete todos los campos obligatorios antes de continuar.",
        reviewTitle: "Revise su solicitud",
        reviewDesc: "Revise la información a continuación antes de generar el PDF oficial del condado.",
        reviewBack: "Volver a las preguntas",
        reviewDownload: "Descargar la solicitud oficial en PDF",
        yes: "Sí",
        no: "No",
        notAnswered: "Sin respuesta",
        reviewCategories: {
            "Business Information": "Información del negocio",
            "Event Logistics": "Detalles del evento",
            "Operations": "Operaciones",
            "Checklists & Signatures": "Listas de verificación y firmas",
            "Quiz Results": "Resultados del cuestionario",
            "Commissary Agreement": "Acuerdo de cocina/comisariato"
        }
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
        validationError: "请在继续之前填写所有必填字段。",
        reviewTitle: "查看您的申请",
        reviewDesc: "生成县官方 PDF 前，请查看以下信息。",
        reviewBack: "返回问题",
        reviewDownload: "下载官方申请 PDF",
        yes: "是",
        no: "否",
        notAnswered: "未回答",
        reviewCategories: {
            "Business Information": "企业信息",
            "Event Logistics": "活动详情",
            "Operations": "运营信息",
            "Checklists & Signatures": "检查清单与签名",
            "Quiz Results": "测验结果",
            "Commissary Agreement": "共享厨房协议"
        }
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
        validationError: "कृपया आगे बढ़ने से पहले सभी आवश्यक फ़ील्ड भरें।",
        reviewTitle: "अपने आवेदन की समीक्षा करें",
        reviewDesc: "आधिकारिक काउंटी PDF बनाने से पहले नीचे दी गई जानकारी की समीक्षा करें।",
        reviewBack: "प्रश्नों पर वापस जाएँ",
        reviewDownload: "आधिकारिक आवेदन PDF डाउनलोड करें",
        yes: "हाँ",
        no: "नहीं",
        notAnswered: "उत्तर नहीं दिया गया",
        reviewCategories: {
            "Business Information": "व्यवसाय की जानकारी",
            "Event Logistics": "कार्यक्रम का विवरण",
            "Operations": "संचालन",
            "Checklists & Signatures": "जाँच सूची और हस्ताक्षर",
            "Quiz Results": "प्रश्नोत्तरी के परिणाम",
            "Commissary Agreement": "साझा रसोई समझौता"
        }
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

    const reviewTitle = document.querySelector('#screen4 .triage-title');
    const reviewDesc = document.querySelector('#screen4 .triage-desc');
    const reviewBack = document.getElementById('revBackBtn');
    const reviewDownload = document.getElementById('downloadPdfBtn');
    if (reviewTitle) reviewTitle.textContent = t.reviewTitle;
    if (reviewDesc) reviewDesc.textContent = t.reviewDesc;
    if (reviewBack) reviewBack.textContent = t.reviewBack;
    if (reviewDownload) reviewDownload.textContent = t.reviewDownload;

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

    renderReviewScreen();
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

        } else if (question.type === "table-builder") {
            input = document.createElement("input");
            input.id = question.id;
            input.name = question.id;
            input.type = "hidden";
            input.value = savedAnswer ?? "";

            const table = document.createElement("table");
            table.id = `${question.id}Table`;
            table.className = "w-full border-collapse text-sm mt-3";
            table.innerHTML = `
                <caption class="sr-only">Menu items and equipment details</caption>
                <thead>
                    <tr>
                        <th scope="col" class="p-2 text-left">Menu Item</th>
                        <th scope="col" class="p-2 text-left">Prepped Before Event</th>
                        <th scope="col" class="p-2 text-left">Prepped at Event Only</th>
                        <th scope="col" class="p-2 text-left">Hot/Cold Transport</th>
                        <th scope="col" class="p-2 text-left">Served Hot/Cold/Reheated</th>
                        <th scope="col" class="p-2 text-left">Transport Equipment</th>
                        <th scope="col" class="p-2 text-left">Cooking/Serving Equipment</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const syncRows = () => {
                const rows = [...table.tBodies[0].rows].map(row =>
                    [...row.querySelectorAll("input")].reduce((values, field) => {
                        values[field.dataset.column] = field.value;
                        return values;
                    }, {})
                );
                input.value = JSON.stringify(rows);
                appState.formData[storageKey] = input.value;
                updateLiveCounter();
            };

            const addRow = values => {
                const row = table.tBodies[0].insertRow();
                [
                    "menuItem", "preppedBeforeEvent", "preppedAtEventOnly",
                    "hotColdTransport", "servedHotColdReheated",
                    "transportEquipment", "cookingServingEquipment"
                ]
                    .forEach(column => {
                        const cell = row.insertCell();
                        cell.className = "p-2 align-top";
                        const field = document.createElement("input");
                        field.type = "text";
                        field.dataset.column = column;
                        field.name = `${question.id}[${table.tBodies[0].rows.length - 1}][${column}]`;
                        field.value = values[column] ??
                            (column === "preppedBeforeEvent" && values.preparationLocation?.toLowerCase().includes("before")
                                ? values.preparationLocation
                                : column === "preppedAtEventOnly" && values.preparationLocation?.toLowerCase().includes("before") === false
                                    ? values.preparationLocation
                                    : column === "cookingServingEquipment" ? values.equipmentUsed : "");
                        field.required = question.required;
                        field.className = "w-full";
                        field.setAttribute("aria-label", column.replace(/([A-Z])/g, " $1"));
                        field.addEventListener("input", syncRows);
                        cell.appendChild(field);
                    });
            };

            let savedRows = [];
            try {
                savedRows = savedAnswer ? JSON.parse(savedAnswer) : [];
            } catch {
                savedRows = [];
            }
            (Array.isArray(savedRows) && savedRows.length ? savedRows : [{}]).forEach(addRow);
            syncRows();

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "mt-3 bg-transparent text-[#d9641f] border-2 border-[#d9641f] py-2 px-4 font-bold rounded-lg";
            addButton.textContent = "Add Row";
            addButton.addEventListener("click", () => {
                addRow({});
                syncRows();
            });
            container.append(label, table, addButton, input);

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

function whenQuestionsReady(callback) {
    return questionnaireQuestions.length
        ? callback()
        : loadQuestionnaire().then(callback);
}

function setTestField(input, value) {
    if (!input) return;
    input.value = input.type === 'checkbox' ? Boolean(value) : value;
    if (input.type === 'checkbox') input.checked = Boolean(value);
    input.dispatchEvent(new Event(
        input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input',
        { bubbles: true }
    ));
    if (input.closest('#menuTableBuilderTable')) return;

    const question = questionnaireQuestions.find(item => item.id === input.id);
    const key = question?.pdfFieldKey || input.name || input.id;
    if (key !== 'FANumber' && key !== 'faNumber') {
        appState.formData[key] = input.type === 'checkbox' ? input.checked : input.value;
    }
}

function testDates() {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    today.setDate(today.getDate() + 1);
    return { startDate, endDate: today.toISOString().split('T')[0] };
}

function finishTestPage(page) {
    appState.path = 'tff';
    showFormPage(page);
    showScreen('screen3');
    updateLiveCounter();
}

function fillPage1() {
    return whenQuestionsReady(() => {
        const { startDate, endDate } = testDates();
        appState.skipCommissary = false;
        const values = {
            ownerName: 'Alex Rivera',
            sponsorApproval: 'Yes',
            businessName: 'Rivera Fresh Foods',
            numberOfBooths: '2',
            indoorOutdoor: 'Outdoor',
            boothName: 'Rivera Fresh Foods',
            emailAddress: 'alex.rivera@example.com',
            businessAddress: '123 Market Street, Fremont, CA 94538',
            mailingAddress: '123 Market Street, Fremont, CA 94538',
            phoneNumbers: '510-555-0142',
            eventName: 'Fremont Sunday Market',
            eventAddress: '400 Capitol Avenue, Fremont, CA',
            startDate,
            endDate,
            startTime: '9:00 AM',
            endTime: '3:00 PM',
            eventSponsorName: 'Fremont Market Association',
            sponsorContactPhone: '510-555-0198',
            sponsorEmail: 'events@fremontmarket.example',
            originalPackageCheck: 'Yes',
            generatorInfo: 'Honda EU2200i, 1800 watts',
            samplingDetails: 'Fruit samples served in single-use cups',
            waterSource: 'Event-provided potable water station',
            wasteDisposal: 'Event grey-water tank and refuse bins',
            boothEnclosure: 'Four walls, overhead cover, and pass-through window',
            transportSanitation: 'Covered, sanitized containers in a clean vehicle',
            reusableUtensils: 'No reusable utensils',
            customerContainers: 'Customer containers stay separate from food and staff equipment'
        };
        questionnaireQuestions
            .filter(question => question.phase <= 3 && question.id !== 'faNumber')
            .forEach(question => {
                const input = get(question.id);
                if (question.type === 'date') {
                    setTestField(input, question.id === 'endDate' ? endDate : startDate);
                } else if (question.type === 'select') {
                    setTestField(input, question.id === 'originalPackageCheck'
                        ? 'Yes'
                        : input?.options[1]?.value || '');
                } else if (question.type !== 'table-builder') {
                    setTestField(input, values[question.id] || 'Sample response');
                }
            });

        setTestField(get('applicationDate'), startDate);
        const fields = get('menuTableBuilderTable')?.querySelectorAll('tbody input') || [];
        ['Chicken tacos', 'Fresh produce and tortillas', 'Commercial kitchen', 'Flat-top griddle']
            .forEach((value, index) => setTestField(fields[index], value));
        finishTestPage(1);
    });
}

function fillPage2() {
    return whenQuestionsReady(() => {
        questionnaireQuestions
            .filter(question => question.phase === 5)
            .forEach(question => setTestField(get(question.id), `Test ${question.id}`));
        setTestField(get('commissarySignerDate'), testDates().startDate);
        finishTestPage(2);
    });
}

function fillPage3() {
    return whenQuestionsReady(() => {
        questionnaireQuestions
            .filter(question => question.phase === 6)
            .forEach(question => {
                setTestField(get(question.id), question.type === 'date'
                    ? testDates().startDate
                    : `Test ${question.id}`);
            });
        document.querySelectorAll('#formPage3 select').forEach(select => {
            setTestField(select, select.options[1]?.value || '');
        });
        document.querySelectorAll('#formPage3 input[type="text"]').forEach(input => {
            setTestField(input, input.value || 'Test response');
        });
        document.querySelectorAll('[id$="Initials"]').forEach(input => setTestField(input, 'TS'));
        setTestField(get('applicantPhone'), '510-555-0142');
        setTestField(get('applicantSignature'), 'Alex Rivera');
        finishTestPage(3);
    });
}

window.fillPage1 = fillPage1;
window.fillPage2 = fillPage2;
window.fillPage3 = fillPage3;
