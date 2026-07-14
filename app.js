// Civil Engineering Calculator - Core JavaScript Logic (English Suite) - Fixed

// Disable console logs in production environment
if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('192.168.')) {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.debug = () => {};
}

// Global HTML Sanitizer to prevent XSS script injection
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// -------------------------------------------------------------
// Firebase Configuration & Google Authentication
// -------------------------------------------------------------
// Paste your Firebase Web configuration keys here
const firebaseConfig = {
    apiKey: "AIzaSyB3R7YhmG3_uftvFrxz7_BiYXuu3bIWXOc",
    authDomain: "structo-7a1f2.firebaseapp.com",
    projectId: "structo-7a1f2",
    storageBucket: "structo-7a1f2.firebasestorage.app",
    messagingSenderId: "21349238263",
    appId: "1:21349238263:web:072248ddd70570042a9af2"
};

let authInstance = null;

function isFirebaseConfigured() {
    return firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
}

function initFirebase() {
    if (isFirebaseConfigured()) {
        try {
            if (typeof firebase !== 'undefined' && !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            if (typeof firebase !== 'undefined') {
                authInstance = firebase.auth();
            }
        } catch (e) {
            console.error("Firebase Auth Init Failed", e);
        }
    }
}

function checkAuthState() {
    const isGuest = localStorage.getItem('structo_guest_session') === 'true';
    const userSession = JSON.parse(localStorage.getItem('structo_user_session'));

    if (isGuest) {
        showMainApp("Guest");
    } else if (userSession) {
        showMainApp(userSession.displayName || userSession.email || "User");
    } else {
        // Show Login UI
        const loginContainer = document.getElementById('login-container');
        if (loginContainer) loginContainer.style.display = 'flex';
        
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.style.setProperty('display', 'none', 'important');
    }
}

function showMainApp(userName) {
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) loginContainer.style.display = 'none';

    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
}

async function loginWithGoogle() {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

    if (isNative) {
        try {
            showToast("Opening Google Sign-In...", "info");
            
            if (!window.Capacitor.Plugins || !window.Capacitor.Plugins.FirebaseAuthentication) {
                throw new Error("FirebaseAuthentication plugin is not available on the Capacitor bridge.");
            }

            const { FirebaseAuthentication } = window.Capacitor.Plugins;
            const result = await FirebaseAuthentication.signInWithGoogle();
            
            if (result && result.user) {
                const user = result.user;
                localStorage.setItem('structo_user_session', JSON.stringify({
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoUrl
                }));
                showMainApp(user.displayName || user.email);
            } else {
                throw new Error("Sign-in completed but no user profile was returned.");
            }
        } catch (e) {
            console.error("Native Google Login failed", e);
            showToast(`Native Sign-In failed: ${e.message}`, 'error');
        }
    } else {
        if (!isFirebaseConfigured()) {
            showToast("Firebase configuration keys are missing. Please configure Firebase to sign in.", "error");
            return;
        }

        try {
            initFirebase();
            if (!authInstance) {
                throw new Error("Firebase Auth has not been initialized correctly.");
            }
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await authInstance.signInWithPopup(provider);
            
            if (result && result.user) {
                const user = result.user;
                localStorage.setItem('structo_user_session', JSON.stringify({
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL
                }));
                showMainApp(user.displayName || user.email);
            }
        } catch (e) {
            console.error("Web Google Login failed", e);
            showToast(`Web Sign-In failed: ${e.message}`, 'error');
        }
    }
}

function loginAsGuest() {
    localStorage.setItem('structo_guest_session', 'true');
    showMainApp("Guest");
}

async function logout() {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
    
    localStorage.removeItem('structo_guest_session');
    localStorage.removeItem('structo_user_session');

    try {
        if (isNative) {
            if (window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) {
                await window.Capacitor.Plugins.FirebaseAuthentication.signOut();
            }
        } else {
            if (authInstance) {
                await authInstance.signOut();
            }
        }
    } catch (e) {
        console.error("Sign out error:", e);
    }

    // Return to Login UI
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) loginContainer.style.display = 'flex';

    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.setProperty('display', 'none', 'important');
    
    showToast("Logged out successfully.", "info");
}

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let activeTab = 'dashboard';
let theme = 'dark';
let boqReport = JSON.parse(localStorage.getItem('civil_calc_boq')) || [];
let bbsList = JSON.parse(localStorage.getItem('civil_calc_bbs')) || [];

const DEFAULT_CHECKLIST = [
    // Phase 1: Shuttering
    { id: 'shut_1', phase: 'shuttering', text: 'Shuttering lines, levels, and plumbness verified.', checked: false, isDefault: true },
    { id: 'shut_2', phase: 'shuttering', text: 'Props (vertical supports) spaced properly (< 1m spacing) and braced.', checked: false, isDefault: true },
    { id: 'shut_3', phase: 'shuttering', text: 'Sole plates used under props resting on soil.', checked: false, isDefault: true },
    { id: 'shut_4', phase: 'shuttering', text: 'Gaps between shuttering sheets sealed with tape or foam to prevent slurry leak.', checked: false, isDefault: true },
    { id: 'shut_5', phase: 'shuttering', text: 'Formwork cleaning completed and shuttering oil applied.', checked: false, isDefault: true },
    { id: 'shut_6', phase: 'shuttering', text: 'Beam depths and slab thicknesses marked correctly on forms.', checked: false, isDefault: true },

    // Phase 2: Reinforcement
    { id: 'reinf_1', phase: 'reinforcement', text: 'Main and distribution rebar diameters and spacing match drawings.', checked: false, isDefault: true },
    { id: 'reinf_2', phase: 'reinforcement', text: 'Concrete cover blocks (20mm for slab, 25/30mm for beams) placed at 1m intervals.', checked: false, isDefault: true },
    { id: 'reinf_3', phase: 'reinforcement', text: 'Chairs placed between top and bottom mesh to prevent reinforcement flattening.', checked: false, isDefault: true },
    { id: 'reinf_4', phase: 'reinforcement', text: 'All rebar intersection points tied securely with binding wire.', checked: false, isDefault: true },
    { id: 'reinf_5', phase: 'reinforcement', text: 'Development length (Ld) and lapping zones verified as per drawings.', checked: false, isDefault: true },
    { id: 'reinf_6', phase: 'reinforcement', text: 'Stirrups hook angles bent at 135 degrees and tied properly.', checked: false, isDefault: true },

    // Phase 3: MEP
    { id: 'mep_1', phase: 'mep', text: 'Electrical conduits, fan boxes, and junction boxes placed and tied.', checked: false, isDefault: true },
    { id: 'mep_2', phase: 'mep', text: 'Plumbing/sanitary pipes and sleeves placed through beams/slabs.', checked: false, isDefault: true },
    { id: 'mep_3', phase: 'mep', text: 'Conduits inspected for blockage or crushed points.', checked: false, isDefault: true },
    { id: 'mep_4', phase: 'mep', text: 'Proper clearance between conduit pipes and rebars maintained.', checked: false, isDefault: true },

    // Phase 4: Prep
    { id: 'prep_1', phase: 'prep', text: 'Shuttering washed with water to remove dust/debris.', checked: false, isDefault: true },
    { id: 'prep_2', phase: 'prep', text: 'Concrete mixer, needle vibrators (including a working backup) tested.', checked: false, isDefault: true },
    { id: 'prep_3', phase: 'prep', text: 'Cement bag stack, sand, aggregate, and water quantities cross-checked.', checked: false, isDefault: true },
    { id: 'prep_4', phase: 'prep', text: 'Cube moulds (150x150x150mm) cleaned, oiled, and ready for sampling.', checked: false, isDefault: true },
    { id: 'prep_5', phase: 'prep', text: 'Adequate lighting arranged for night casting (if needed).', checked: false, isDefault: true },
    { id: 'prep_6', phase: 'prep', text: 'Weather forecast checked (rain precautions/tarpaulins ready).', checked: false, isDefault: true },

    // Phase 5: Pouring
    { id: 'pour_1', phase: 'pouring', text: 'Concrete slump test performed at batch entry (Target: 75-100mm).', checked: false, isDefault: true },
    { id: 'pour_2', phase: 'pouring', text: 'Concrete pouring height limited to 1.5m to avoid segregation.', checked: false, isDefault: true },
    { id: 'pour_3', phase: 'pouring', text: 'Needle vibrators used correctly (vertical entry, no touching rebars/shuttering).', checked: false, isDefault: true },
    { id: 'pour_4', phase: 'pouring', text: 'Correct concrete grade mixed (e.g. M20 / M25) and verified.', checked: false, isDefault: true },
    { id: 'pour_5', phase: 'pouring', text: 'Constant monitoring of shuttering/props for displacement/leakage.', checked: false, isDefault: true },

    // Phase 6: Post
    { id: 'post_1', phase: 'post', text: 'Finished top surface leveled and trowelled correctly.', checked: false, isDefault: true },
    { id: 'post_2', phase: 'post', text: 'Initial setting curing (wet hessian bags) applied within 2-4 hours.', checked: false, isDefault: true },
    { id: 'post_3', phase: 'post', text: 'Curing ponds constructed using clay/mortar after initial setting.', checked: false, isDefault: true },
    { id: 'post_4', phase: 'post', text: 'Minimum curing period of 7-10 days planned and documented.', checked: false, isDefault: true },
    { id: 'post_5', phase: 'post', text: 'Shuttering removal schedule established (minimum 14-21 days for slabs/props).', checked: false, isDefault: true }
];

let siteChecklist = JSON.parse(localStorage.getItem('civil_calc_checklist')) || JSON.parse(JSON.stringify(DEFAULT_CHECKLIST));

// Tab Titles and Descriptions for header updates
const tabInfo = {
    dashboard: { title: 'Structo', desc: 'All-in-one suite of smart tools for civil calculations' },
    concrete: { title: 'Concrete Materials Estimator', desc: 'Estimate concrete volume, cement, sand, aggregates, and water quantities' },
    'water-cement': { title: 'Water-Cement Ratio & Mix Design', desc: 'Standard concrete mix design and water-cement requirements per IS 456 & IS 10262' },
    steel: { title: 'Steel Rebar Weight & Cost', desc: 'Calculate reinforcing steel weight, spacing grids, and cost estimates' },
    bbs: { title: 'Bar Bending Schedule (BBS)', desc: 'Generate rebar scheduling lists, cutting lengths, and summary weight logs' },
    bricks: { title: 'Brick Masonry Estimator', desc: 'Estimate total bricks, cement bags, and sand with opening deductions' },
    earthwork: { title: 'Earthwork & Excavation', desc: 'Compute excavation and backfill volumes, swell factors, and dump truck trips' },
    converter: { title: 'Civil Unit Converter', desc: 'Quick unit conversions for length, area, volume, force, stress, and density' },
    beam: { title: 'Beam Structural Analysis', desc: 'Calculate bending moment, shear force, reactions, and deflection diagrams' },
    shuttering: { title: 'Formwork & Shuttering Calculator', desc: 'Calculate the total surface area and cost of formwork/shuttering required for structural members' },
    'concrete-guides': { title: 'Concrete Mix Specification Guide', desc: 'Reference guide detailing standard mix ratios, application guidelines, and code specifications' },
    surveying: { title: 'Surveying Auto Level Calculator', desc: 'Height of Instrument (HI) and Reduced Level (RL) field book calculator' },
    'water-tank': { title: 'Water Tank Capacity Calculator', desc: 'Calculate volumetric capacity in Liters and Cubic Meters for water storage structures' },
    'curing-guide': { title: 'Deshuttering & Curing Guide', desc: 'IS 456 guidelines and timelines for concrete curing and shuttering stripping' },
    checklist: { title: 'Site Inspection Checklist', desc: 'Pre-construction inspection checksheets for concrete, slab casting, shuttering, and reinforcement checks' },
    'boq-report': { title: 'BOQ Summary Report', desc: 'Bill of Quantities and cost summary checklist for your project' },
    profile: { title: 'Professional Profile', desc: 'Manage your civil engineering professional identity and profile details' }
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    updateBOQBadge();

    // Initial runs
    toggleConcreteInputs();
    updateDefaultSteelPercent();
    calculateSteel();
    calculateBricks();
    calculateExcavation();
    calculateBeam();
    initUnitConverter();
    initBBS();
    calculateWaterCement();
    renderChecklist();
    calculateCuringShutteringTime();

    // 5 New Tools Initial Runs
    toggleShutteringInputs();
    calculateShuttering();
    calculateSurveyRL();
    toggleTankInputs();
    calculateWaterTank();
    calculateCuringGuide();
    initProfile();
});

// Setup Initial App State
function initApp() {
    initFirebase();
    checkAuthState();

    const savedTheme = localStorage.getItem('civil_calc_theme');
    if (savedTheme) {
        theme = savedTheme;
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeUI();
    }
}

// -------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
    // Sidebar Tab Navigation
    document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.getAttribute('data-tab'));
            closeMobileSidebar();
        });
    });

    // Close Mobile Sidebar Helper
    function closeMobileSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }

    // Open Mobile Sidebar Helper
    function openMobileSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    // Dashboard Quick Card Navigation
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('click', () => {
            switchTab(card.getAttribute('data-card-tab'));
        });
    });

    // Mobile Sidebar Toggle (Hamburger Button)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openMobileSidebar();
        });
    }

    // Mobile Sidebar Close Button
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileSidebar();
        });
    }

    // Sidebar Overlay Click (closes drawer)
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }

    // Header Back Button
    const headerBackBtn = document.getElementById('header-back-btn');
    if (headerBackBtn) {
        headerBackBtn.addEventListener('click', () => {
            switchTab('dashboard');
        });
    }

    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    // Help Modal Trigger
    document.getElementById('help-modal-trigger').addEventListener('click', () => {
        document.getElementById('help-modal').classList.add('active');
    });
    document.getElementById('help-modal-close').addEventListener('click', () => {
        document.getElementById('help-modal').classList.remove('active');
    });
    document.getElementById('help-modal').addEventListener('click', (e) => {
        if (e.target.id === 'help-modal') {
            document.getElementById('help-modal').classList.remove('active');
        }
    });

    // Search Box Listener
    document.getElementById('search-calculators').addEventListener('input', handleSearch);

    // Header Report Button
    document.getElementById('header-report-btn').addEventListener('click', () => {
        switchTab('boq-report');
    });

    // -- Concrete Events --
    document.getElementById('concrete-type').addEventListener('change', () => {
        toggleConcreteInputs();
        updateDefaultSteelPercent();
    });
    document.getElementById('concrete-class-type').addEventListener('change', (e) => {
        const isRCC = e.target.value === 'rcc';
        document.getElementById('concrete-rcc-steel-row').style.display = isRCC ? 'grid' : 'none';
        document.getElementById('concrete-rcc-results').style.display = isRCC ? 'flex' : 'none';
        updateDefaultSteelPercent();
        calculateConcrete();
    });
    document.getElementById('btn-calc-concrete').addEventListener('click', calculateConcrete);
    document.getElementById('btn-add-concrete-report').addEventListener('click', addConcreteToReport);
    document.getElementById('concrete-mix-grade').addEventListener('change', (e) => {
        const customRow = document.getElementById('concrete-custom-ratio-row');
        customRow.style.display = e.target.value === 'custom' ? 'grid' : 'none';
    });
    // Add change listeners to concrete inputs for live updates
    const concreteLiveInputs = ['concrete-wastage', 'concrete-cement-cost', 'concrete-wc-ratio', 'concrete-steel-percent', 'concrete-steel-rate'];
    concreteLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateConcrete);
    });

    // -- Water-Cement & Mix Design Events --
    document.getElementById('btn-wc-calc').addEventListener('click', calculateWaterCement);
    document.getElementById('btn-wc-reset').addEventListener('click', resetWCForm);
    document.getElementById('btn-wc-add-boq').addEventListener('click', addWaterCementToBOQ);

    const wcLiveInputs = [
        'wc-concrete-grade', 'wc-concrete-type', 'wc-exposure', 'wc-aggregate-size',
        'wc-slump', 'wc-aggregate-shape', 'wc-admixture', 'wc-job-volume', 'wc-ratio-override'
    ];
    wcLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', calculateWaterCement);
            if (el.tagName === 'INPUT') {
                el.addEventListener('input', calculateWaterCement);
            }
        }
    });

    // -- Steel Events --
    document.getElementById('btn-calc-steel').addEventListener('click', calculateSteel);
    document.getElementById('btn-add-steel-report').addEventListener('click', addSteelToReport);
    document.querySelectorAll('input[name="steel-calc-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('steel-simple-inputs').style.display = e.target.value === 'simple' ? 'block' : 'none';
            document.getElementById('steel-grid-inputs').style.display = e.target.value === 'grid' ? 'block' : 'none';
            document.getElementById('steel-lapping-inputs').style.display = e.target.value === 'lapping' ? 'block' : 'none';
            document.getElementById('clear-cover-ref-card').style.display = e.target.value === 'lapping' ? 'block' : 'none';
            calculateSteel();
        });
    });
    // Add change/input listeners for live updates on steel inputs
    const steelLiveInputs = [
        'steel-diameter', 'steel-length', 'steel-grid-len', 'steel-grid-wid', 'steel-grid-cover',
        'steel-grid-main-dia', 'steel-grid-main-spacing', 'steel-grid-dist-dia', 'steel-grid-dist-spacing',
        'steel-hooks', 'steel-cranks', 'steel-rate', 'steel-overlap',
        'lapping-dia', 'lapping-concrete', 'lapping-steel', 'lapping-zone', 'lapping-joints-count'
    ];
    steelLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventType, calculateSteel);
        }
    });

    // -- Masonry & Finishing Events --
    document.getElementById('brick-size-type').addEventListener('change', (e) => {
        document.getElementById('brick-custom-size-row').style.display = e.target.value === 'custom' ? 'grid' : 'none';
    });
    document.getElementById('flooring-tile-size').addEventListener('change', (e) => {
        document.getElementById('flooring-custom-tile-row').style.display = e.target.value === 'custom' ? 'grid' : 'none';
    });
    document.getElementById('btn-calc-bricks').addEventListener('click', calculateBricks);
    document.getElementById('btn-add-brick-report').addEventListener('click', addBrickToReport);
    document.querySelectorAll('input[name="masonry-subtab"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('masonry-brickwork-inputs').style.display = e.target.value === 'brickwork' ? 'block' : 'none';
            document.getElementById('masonry-plastering-inputs').style.display = e.target.value === 'plastering' ? 'block' : 'none';
            document.getElementById('masonry-flooring-inputs').style.display = e.target.value === 'flooring' ? 'block' : 'none';
            calculateBricks();
        });
    });
    // Add change/input listeners for live updates on masonry inputs
    const masonryLiveInputs = [
        'brick-wall-len', 'brick-wall-height', 'brick-wall-thick', 'brick-size-type',
        'custom-brick-l', 'custom-brick-w', 'custom-brick-h', 'brick-mortar-ratio',
        'brick-mortar-joint', 'brick-doors-num', 'brick-door-w', 'brick-door-h',
        'brick-windows-num', 'brick-window-w', 'brick-window-h', 'brick-custom-deduction', 'brick-wastage',
        'plaster-wall-len', 'plaster-wall-height', 'plaster-thickness', 'plaster-mix-ratio',
        'plaster-wastage', 'plaster-cement-cost', 'plaster-sand-cost',
        'flooring-room-len', 'flooring-room-wid', 'flooring-tile-size', 'flooring-grout-width',
        'flooring-custom-tile-len', 'flooring-custom-tile-wid', 'flooring-skirting-height',
        'flooring-bed-thick', 'flooring-bed-ratio', 'flooring-tile-cost', 'flooring-wastage',
        'flooring-cement-cost', 'flooring-sand-cost'
    ];
    masonryLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventType, calculateBricks);
        }
    });

    // -- Earthwork & Excavation Events --
    document.getElementById('btn-calc-excavation').addEventListener('click', calculateExcavation);
    document.getElementById('btn-add-exc-report').addEventListener('click', addExcavationToReport);
    document.querySelectorAll('input[name="earthwork-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('earthwork-pit-inputs').style.display = e.target.value === 'pit' ? 'block' : 'none';
            document.getElementById('earthwork-trench-inputs').style.display = e.target.value === 'trench' ? 'block' : 'none';
            document.getElementById('earthwork-plinth-inputs').style.display = e.target.value === 'plinth' ? 'block' : 'none';
            calculateExcavation();
        });
    });
    // Add change/input listeners for live updates on earthwork inputs
    const earthworkLiveInputs = [
        'exc-length', 'exc-width', 'exc-depth', 'exc-slope', 'exc-swell',
        'exc-footing-vol', 'exc-column-vol', 'exc-compaction',
        'trench-length', 'trench-width', 'trench-depth', 'trench-slope', 'trench-swell', 'trench-rate',
        'plinth-length', 'plinth-width', 'plinth-depth', 'plinth-compaction', 'plinth-sand-rate'
    ];
    earthworkLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventType, calculateExcavation);
        }
    });

    // -- CSV & Excel Export Events --
    document.getElementById('btn-export-bbs-csv').addEventListener('click', exportBBSToCSV);
    document.getElementById('btn-export-boq-csv').addEventListener('click', exportBOQToCSV);
    document.getElementById('btn-export-bbs-xls').addEventListener('click', exportBBSToExcel);
    document.getElementById('btn-export-boq-xls').addEventListener('click', exportBOQToExcel);

    // -- Beam Events --
    document.getElementById('btn-calc-beam').addEventListener('click', calculateBeam);
    document.getElementById('btn-add-beam-report').addEventListener('click', addBeamToReport);
    document.getElementById('beam-support-type').addEventListener('change', toggleBeamInputs);
    document.querySelectorAll('input[name="beam-load-type"]').forEach(radio => {
        radio.addEventListener('change', toggleBeamInputs);
    });

    // -- Unit Converter --
    document.getElementById('conv-category').addEventListener('change', updateConverterUnits);
    document.getElementById('conv-from-val').addEventListener('input', calculateUnitConversion);
    document.getElementById('conv-from-unit').addEventListener('change', calculateUnitConversion);
    document.getElementById('conv-to-unit').addEventListener('change', calculateUnitConversion);
    document.getElementById('btn-swap-units').addEventListener('click', swapUnits);

    // -- BBS Events --
    document.getElementById('bbs-shape-type').addEventListener('change', toggleBBSInputs);
    document.getElementById('btn-add-bbs-item').addEventListener('click', addBBSItem);
    document.getElementById('btn-reset-bbs-form').addEventListener('click', resetBBSForm);
    document.getElementById('btn-clear-bbs').addEventListener('click', clearBBSSchedule);
    document.getElementById('btn-add-bbs-boq').addEventListener('click', addBBSSteelToBOQ);

    // Live calculation listeners for BBS inputs
    const bbsLiveInputs = [
        'bbs-shape-type', 'bbs-dia', 'bbs-len-straight', 'bbs-straight-hooks',
        'bbs-len-l-a', 'bbs-len-l-b', 'bbs-len-crank-l', 'bbs-len-crank-h',
        'bbs-len-crank-cover', 'bbs-crank-double', 'bbs-stirrup-b', 'bbs-stirrup-d',
        'bbs-stirrup-cover', 'bbs-stirrup-circ-dia', 'bbs-stirrup-circ-cover',
        'bbs-num-members', 'bbs-num-bars'
    ];
    bbsLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventType, calculateLiveBBS);
        }
    });

    // Report & Print Actions
    document.getElementById('btn-clear-report').addEventListener('click', clearBOQReport);
    document.getElementById('btn-print-report').addEventListener('click', () => {
        const oldTitle = document.title;
        document.title = "Structo_BOQ_Estimate_" + new Date().toISOString().slice(0, 10);
        window.print();
        document.title = oldTitle;
    });
    document.getElementById('btn-print-bbs').addEventListener('click', printBBS);

    // Site Checklist Actions
    document.getElementById('btn-reset-checklist').addEventListener('click', resetChecklist);
    document.getElementById('btn-print-checklist').addEventListener('click', printChecklist);

    // Site Checklist Custom Item Adders
    const phases = ['shuttering', 'reinforcement', 'mep', 'prep', 'pouring', 'post'];
    phases.forEach(phase => {
        const btn = document.getElementById(`btn-add-${phase}`);
        const input = document.getElementById(`add-${phase}-input`);
        
        if (btn) {
            btn.addEventListener('click', () => addCustomChecklistItem(phase));
        }
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addCustomChecklistItem(phase);
                }
            });
        }
    });

    // Formula Toggles Event Listeners (removes need for inline event handlers)
    document.querySelectorAll('.formula-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-formula-id');
            if (id) toggleFormula(id);
        });
    });

    // Curing & Shuttering Time Estimator events
    const estInputs = ['est-element-type', 'est-cement-type', 'est-weather'];
    estInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calculateCuringShutteringTime);
    });

    // -- 5 New Civil Engineering Tools Events --
    
    // 1. Formwork & Shuttering Events
    const shutteringLiveInputs = ['shuttering-member-type', 'shuttering-length', 'shuttering-width', 'shuttering-height', 'shuttering-qty', 'shuttering-rate'];
    shutteringLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
                if (id === 'shuttering-member-type') toggleShutteringInputs();
                calculateShuttering();
            });
        }
    });
    const btnCalcShuttering = document.getElementById('btn-calc-shuttering');
    if (btnCalcShuttering) btnCalcShuttering.addEventListener('click', calculateShuttering);
    const btnAddShutteringReport = document.getElementById('btn-add-shuttering-report');
    if (btnAddShutteringReport) btnAddShutteringReport.addEventListener('click', addShutteringToBOQ);

    // 2. Concrete Mix Guides Events
    const searchConcreteGuides = document.getElementById('search-concrete-guides');
    if (searchConcreteGuides) {
        searchConcreteGuides.addEventListener('input', searchConcreteGrades);
    }

    // 3. Surveying (Auto Level) Events
    const surveyLiveInputs = ['survey-benchmark', 'survey-bs', 'survey-sight-val'];
    surveyLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateSurveyRL);
    });
    document.querySelectorAll('input[name="survey-sight-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const label = document.getElementById('survey-sight-label');
            if (label) {
                label.innerText = e.target.value === 'FS' ? 'Foresight Reading (FS)' : 'Intermediate Sight (IS)';
            }
            calculateSurveyRL();
        });
    });
    const btnCalcSurvey = document.getElementById('btn-calc-survey');
    if (btnCalcSurvey) btnCalcSurvey.addEventListener('click', calculateSurveyRL);
    const btnSurveyAddRow = document.getElementById('btn-survey-add-row');
    if (btnSurveyAddRow) btnSurveyAddRow.addEventListener('click', addSurveyRow);
    const btnClearSurveyTable = document.getElementById('btn-clear-survey-table');
    if (btnClearSurveyTable) btnClearSurveyTable.addEventListener('click', clearSurveyTable);

    // 4. Water Tank Events
    const tankLiveInputs = ['tank-shape', 'tank-length', 'tank-width', 'tank-diameter', 'tank-depth'];
    tankLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
                if (id === 'tank-shape') toggleTankInputs();
                calculateWaterTank();
            });
        }
    });
    const btnCalcTank = document.getElementById('btn-calc-tank');
    if (btnCalcTank) btnCalcTank.addEventListener('click', calculateWaterTank);
    const btnAddTankReport = document.getElementById('btn-add-tank-report');
    if (btnAddTankReport) btnAddTankReport.addEventListener('click', addTankToBOQ);

    // 5. Curing & Stripping Guide Events
    const curingLiveInputs = ['curing-element-type', 'curing-cement-type', 'curing-weather'];
    curingLiveInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calculateCuringGuide);
    });

    // -- Login Screen Events --
    const googleLoginBtn = document.getElementById('btn-google-login');
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', loginWithGoogle);

    const guestLoginBtn = document.getElementById('btn-guest-login');
    if (guestLoginBtn) guestLoginBtn.addEventListener('click', loginAsGuest);

    const logoutBtn = document.getElementById('btn-logout-trigger');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Run input validations setup
    setupNumberInputValidation();
}

// -------------------------------------------------------------
// Tab Router & UI Updates
// -------------------------------------------------------------
function switchTab(tabId) {
    if (!tabInfo[tabId]) return;
    activeTab = tabId;

    document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === tabId);
    });

    document.getElementById('current-tab-title').innerText = tabInfo[tabId].title;
    document.getElementById('current-tab-desc').innerText = tabInfo[tabId].desc;

    // Show/hide Back Button and Hamburger Menu
    const backBtn = document.getElementById('header-back-btn');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (backBtn && menuBtn) {
        if (tabId === 'dashboard') {
            backBtn.style.display = 'none';
            menuBtn.style.display = '';
        } else {
            backBtn.style.display = 'flex';
            menuBtn.style.display = 'none';
        }
    }

    if (tabId === 'boq-report') {
        renderBOQTable();
    } else if (tabId === 'bbs') {
        calculateLiveBBS();
        renderBBSTable();
    } else if (tabId === 'water-cement') {
        calculateWaterCement();
    } else if (tabId === 'checklist') {
        renderChecklist();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (activeTab !== 'dashboard') switchTab('dashboard');

    document.querySelectorAll('.dashboard-card').forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const desc = card.querySelector('p').innerText.toLowerCase();
        card.style.display = (title.includes(query) || desc.includes(query)) ? 'flex' : 'none';
    });
}

function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('civil_calc_theme', theme);
    updateThemeUI();
    showToast(`Switched to ${theme} theme successfully!`, 'info');
}

function updateThemeUI() {
    const btnSpan = document.querySelector('#theme-toggle-btn span');
    btnSpan.innerText = theme === 'dark' ? 'Toggle Light Mode' : 'Toggle Dark Mode';
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    if (type === 'error') toast.style.borderLeftColor = 'var(--danger)';
    else if (type === 'info') toast.style.borderLeftColor = 'var(--accent)';

    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

function toggleFormula(id) {
    const body = document.getElementById(id);
    const toggleBtn = body.previousElementSibling;
    if (body.style.display === 'block') {
        body.style.display = 'none';
        toggleBtn.classList.remove('expanded');
    } else {
        body.style.display = 'block';
        toggleBtn.classList.add('expanded');
    }
}

// -------------------------------------------------------------
// 1. Concrete Calculator Logic
// -------------------------------------------------------------
function toggleConcreteInputs() {
    const type = document.getElementById('concrete-type').value;
    const stdRow = document.getElementById('concrete-dim-standard-row');
    const circRow = document.getElementById('concrete-dim-circular-row');
    const trapGroup = document.getElementById('concrete-dim-trapezoidal-group');
    const badge = document.getElementById('concrete-visualizer-badge');
    const d1 = document.getElementById('concrete-dim1-label');
    const d2 = document.getElementById('concrete-dim2-label');
    const d3 = document.getElementById('concrete-dim3-label');

    stdRow.style.display = 'none';
    circRow.style.display = 'none';
    trapGroup.style.display = 'none';

    if (type === 'slab') {
        stdRow.style.display = 'grid';
        d1.innerText = 'Slab Length';
        d2.innerText = 'Slab Width';
        d3.innerText = 'Slab Thickness';
        badge.innerText = 'Slab (Rectangular)';
    } else if (type === 'beam') {
        stdRow.style.display = 'grid';
        d1.innerText = 'Beam Span';
        d2.innerText = 'Beam Breadth (B)';
        d3.innerText = 'Beam Depth (D)';
        badge.innerText = 'Beam (Rectangular)';
    } else if (type === 'column-rect') {
        stdRow.style.display = 'grid';
        d1.innerText = 'Column Height';
        d2.innerText = 'Column Width (B)';
        d3.innerText = 'Column Depth (D)';
        badge.innerText = 'Column (Rectangular)';
    } else if (type === 'footing-rect') {
        stdRow.style.display = 'grid';
        d1.innerText = 'Footing Length';
        d2.innerText = 'Footing Width';
        d3.innerText = 'Footing Depth';
        badge.innerText = 'Footing (Rectangular)';
    } else if (type === 'column-circ') {
        circRow.style.display = 'grid';
        badge.innerText = 'Column (Circular)';
    } else if (type === 'footing-trap') {
        trapGroup.style.display = 'block';
        badge.innerText = 'Footing (Trapezoidal)';
    }
    calculateConcrete();
}

function calculateConcrete() {
    drawConcreteInputHelper();
    const type = document.getElementById('concrete-type').value;
    const wastage = parseFloat(document.getElementById('concrete-wastage').value) || 0;
    const costPerBag = parseFloat(document.getElementById('concrete-cement-cost').value) || 0;
    const mixGrade = document.getElementById('concrete-mix-grade').value;
    const wcRatio = parseFloat(document.getElementById('concrete-wc-ratio').value) || 0.50;

    let volume = 0;

    if (type === 'slab' || type === 'beam' || type === 'column-rect' || type === 'footing-rect') {
        const length = parseFloat(document.getElementById('concrete-length').value) || 0;
        const width = parseFloat(document.getElementById('concrete-width').value) || 0;
        const thickness = parseFloat(document.getElementById('concrete-thickness').value) || 0;
        volume = length * width * thickness;
    } else if (type === 'column-circ') {
        const dia = parseFloat(document.getElementById('concrete-circ-dia').value) || 0;
        const height = parseFloat(document.getElementById('concrete-circ-height').value) || 0;
        volume = Math.PI * Math.pow(dia / 2, 2) * height;
    } else if (type === 'footing-trap') {
        const l1 = parseFloat(document.getElementById('concrete-trap-l1').value) || 0;
        const w1 = parseFloat(document.getElementById('concrete-trap-w1').value) || 0;
        const l2 = parseFloat(document.getElementById('concrete-trap-l2').value) || 0;
        const w2 = parseFloat(document.getElementById('concrete-trap-w2').value) || 0;
        const h1 = parseFloat(document.getElementById('concrete-trap-h1').value) || 0;
        const h2 = parseFloat(document.getElementById('concrete-trap-h2').value) || 0;

        // Frustum of pyramid volume + rectangular base footing volume
        const a1 = l1 * w1;
        const a2 = l2 * w2;
        const vBase = a1 * h1;
        const vFrustum = (h2 / 3) * (a1 + a2 + Math.sqrt(a1 * a2));
        volume = vBase + vFrustum;
    }

    let wetVolumeTotal = volume * (1 + wastage / 100);
    // Concrete dry volume multiplier (1.54) accounts for volume reduction during wet mixing.
    // Standard IS Code practice uses 1.54 to convert wet concrete volume to dry ingredients volume.
    let dryVolume = wetVolumeTotal * 1.54;

    // Nominal mix proportions by volume as per standard IS 456:2000 guidelines
    let cRatio = 1, sRatio = 1.5, aRatio = 3; // M20 default (1 Cement : 1.5 Sand : 3 Aggregate)
    if (mixGrade === 'M5') { cRatio = 1; sRatio = 5; aRatio = 10; }
    else if (mixGrade === 'M7.5') { cRatio = 1; sRatio = 4; aRatio = 8; }
    else if (mixGrade === 'M10') { cRatio = 1; sRatio = 3; aRatio = 6; }
    else if (mixGrade === 'M15') { cRatio = 1; sRatio = 2; aRatio = 4; } // M15 nominal mix (1:2:4)
    else if (mixGrade === 'M20') { cRatio = 1; sRatio = 1.5; aRatio = 3; } // M20 nominal mix (1:1.5:3)
    else if (mixGrade === 'M25') { cRatio = 1; sRatio = 1; aRatio = 2; } // M25 nominal mix (1:1:2)
    else if (mixGrade === 'M30') { cRatio = 1; sRatio = 0.75; aRatio = 1.5; }
    else if (mixGrade === 'custom') {
        cRatio = parseFloat(document.getElementById('custom-cement').value) || 1;
        sRatio = parseFloat(document.getElementById('custom-sand').value) || 1.5;
        aRatio = parseFloat(document.getElementById('custom-aggregate').value) || 3;
    }

    // Update active concrete results title and mix ratio details
    const resultsTitleEl = document.getElementById('concrete-results-title');
    const mixRatioEl = document.getElementById('concrete-res-mix-ratio');
    const mixDescEl = document.getElementById('concrete-res-mix-desc');
    const isRCC = document.getElementById('concrete-class-type').value === 'rcc';

    if (resultsTitleEl) {
        resultsTitleEl.innerText = isRCC ? 'RCC Calculation Summary' : 'PCC Calculation Summary';
    }

    if (mixRatioEl) {
        mixRatioEl.innerText = `${cRatio} : ${sRatio} : ${aRatio}`;
    }

    if (mixDescEl) {
        let descText = '';
        if (mixGrade === 'M5') descText = 'Grade: M5 (Lean Concrete base)';
        else if (mixGrade === 'M7.5') descText = 'Grade: M7.5 (Lean Concrete base)';
        else if (mixGrade === 'M10') descText = 'Grade: M10 (PCC leveling/foundation)';
        else if (mixGrade === 'M15') descText = 'Grade: M15 (PCC Flooring/shallow beds)';
        else if (mixGrade === 'M20') descText = 'Grade: M20 (Standard Slab/Beams/Columns)';
        else if (mixGrade === 'M25') descText = 'Grade: M25 (Standard High-Strength Structural RCC)';
        else if (mixGrade === 'M30') descText = 'Grade: M30 (Severe exposure / High-Strength RCC)';
        else if (mixGrade === 'custom') descText = 'Custom Mix Design';
        mixDescEl.innerText = descText;
    }

    const totalParts = cRatio + sRatio + aRatio;

    // Cement Calculation (50kg bags). Density = 1440 kg/m3. 1 Bag volume = 50 / 1440 = 0.03472222 m3
    let cementVol = (dryVolume * cRatio) / totalParts;
    let cementBags = Math.ceil(cementVol / 0.03472222);

    // Sand volume in cft (1 m3 = 35.31466672 cft)
    let sandVolM3 = (dryVolume * sRatio) / totalParts;
    let sandVolCft = sandVolM3 * 35.31466672;

    // Coarse Aggregate volume in cft (1 m3 = 35.31466672 cft)
    let aggVolM3 = (dryVolume * aRatio) / totalParts;
    let aggVolCft = aggVolM3 * 35.31466672;

    // Water Required (W/C ratio * cement weight)
    let waterLiters = (cementBags * 50) * wcRatio;

    let estimatedCost = cementBags * costPerBag;

    // Steel reinforcement estimate
    const classType = document.getElementById('concrete-class-type').value;
    let steelWeightKg = 0;
    let steelCost = 0;

    if (classType === 'rcc') {
        const steelPercent = parseFloat(document.getElementById('concrete-steel-percent').value) || 1.0;
        const steelRate = parseFloat(document.getElementById('concrete-steel-rate').value) || 65;
        steelWeightKg = volume * (steelPercent / 100) * 7850;
        steelCost = steelWeightKg * steelRate;
        estimatedCost += steelCost;

        document.getElementById('concrete-res-steel-val').innerHTML = `${steelWeightKg.toFixed(1)} <span class="result-unit">kg</span>`;
        document.getElementById('concrete-res-steel-cost').innerText = `~ ${(steelWeightKg / 1000).toFixed(3)} Tons (Cost: ₹${Math.round(steelCost).toLocaleString('en-IN')})`;
    }

    // Update UI Results
    document.getElementById('concrete-res-volume').innerHTML = `${volume.toFixed(3)} <span class="result-unit">m³</span>`;
    document.getElementById('concrete-res-volume-ft').innerText = `~ ${(volume * 35.31466672).toFixed(1)} cft (Dry Vol: ${dryVolume.toFixed(2)} m³)`;
    document.getElementById('concrete-res-cement').innerHTML = `${cementBags} <span class="result-unit">Bags</span>`;
    document.getElementById('concrete-res-cement-kg').innerText = `~ ${(cementBags * 50).toLocaleString()} kg`;
    document.getElementById('concrete-res-sand').innerHTML = `${Math.ceil(sandVolCft)} <span class="result-unit">cft</span>`;
    document.getElementById('concrete-res-sand-ton').innerText = `~ ${sandVolM3.toFixed(2)} m³ / ${(sandVolM3 * 1.6).toFixed(1)} Tons`;
    document.getElementById('concrete-res-aggregate').innerHTML = `${Math.ceil(aggVolCft)} <span class="result-unit">cft</span>`;
    document.getElementById('concrete-res-agg-ton').innerText = `~ ${aggVolM3.toFixed(2)} m³ / ${(aggVolM3 * 1.6).toFixed(1)} Tons`;
    document.getElementById('concrete-res-water').innerHTML = `${Math.ceil(waterLiters).toLocaleString()} <span class="result-unit">Liters</span>`;
    document.getElementById('concrete-res-cost').innerText = `Est. Cost: ₹${Math.round(estimatedCost).toLocaleString('en-IN')}`;

    drawConcreteSVG(type);
}

function drawConcreteSVG(type) {
    const svg = document.getElementById('concrete-svg');
    svg.innerHTML = ''; // clear

    const gridPattern = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    gridPattern.innerHTML = `
        <pattern id="concrete-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
        </pattern>
    `;
    svg.appendChild(gridPattern);

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'url(#concrete-grid)');
    svg.appendChild(bgRect);

    if (type === 'slab') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 100,140 L 300,90 L 450,120 L 250,175 Z');
        path.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        path.setAttribute('stroke', 'var(--accent)');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);

        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        edge.setAttribute('d', 'M 100,140 L 100,155 L 250,190 L 450,135 L 450,120 M 250,175 L 250,190');
        edge.setAttribute('fill', 'rgba(6, 182, 212, 0.35)');
        edge.setAttribute('stroke', 'var(--accent)');
        edge.setAttribute('stroke-width', '2');
        svg.appendChild(edge);

        addSVGText(svg, 180, 115, `Length`, '11px');
        addSVGText(svg, 380, 105, `Width`, '11px');
        addSVGText(svg, 270, 205, `Thickness`, '11px', 'var(--accent)');
    } else if (type === 'beam') {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 80,120 L 380,120 L 420,135 L 120,135 Z');
        path.setAttribute('fill', 'rgba(16, 185, 129, 0.15)');
        path.setAttribute('stroke', 'var(--accent-secondary)');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);

        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        edge.setAttribute('d', 'M 80,120 L 80,155 L 120,170 L 420,170 L 420,135 M 120,135 L 120,170');
        edge.setAttribute('fill', 'rgba(16, 185, 129, 0.35)');
        edge.setAttribute('stroke', 'var(--accent-secondary)');
        edge.setAttribute('stroke-width', '2');
        svg.appendChild(edge);

        addSVGText(svg, 230, 110, `Span Length`, '11px');
        addSVGText(svg, 390, 155, `B`, '11px');
        addSVGText(svg, 75, 175, `D`, '11px', 'var(--accent-secondary)');
    } else if (type === 'column-rect') {
        // Height Column
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 220,190 L 280,170 L 280,45 L 220,65 Z');
        path.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        path.setAttribute('stroke', 'var(--accent)');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);

        const side = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        side.setAttribute('d', 'M 280,170 L 330,180 L 330,55 L 280,45 Z');
        side.setAttribute('fill', 'rgba(6, 182, 212, 0.35)');
        side.setAttribute('stroke', 'var(--accent)');
        side.setAttribute('stroke-width', '2');
        svg.appendChild(side);

        addSVGText(svg, 140, 115, `Height (H)`, '11px');
        addSVGText(svg, 240, 205, `Width (B)`, '10px');
        addSVGText(svg, 310, 200, `Depth (D)`, '10px', 'var(--accent)');
    } else if (type === 'column-circ') {
        // Draw cylinder
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 230,60 L 230,170 A 40,15 0 0 0 310,170 L 310,60 A 40,15 0 0 0 230,60 Z');
        path.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        path.setAttribute('stroke', 'var(--accent)');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);

        const top = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        top.setAttribute('cx', '270');
        top.setAttribute('cy', '60');
        top.setAttribute('rx', '40');
        top.setAttribute('ry', '15');
        top.setAttribute('fill', 'rgba(6, 182, 212, 0.35)');
        top.setAttribute('stroke', 'var(--accent)');
        top.setAttribute('stroke-width', '2');
        svg.appendChild(top);

        addSVGText(svg, 175, 120, `Height`, '11px');
        addSVGText(svg, 250, 40, `Diameter`, '11px', 'var(--accent)');
    } else if (type === 'footing-rect') {
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        base.setAttribute('d', 'M 150,160 L 320,130 L 400,160 L 230,190 Z');
        base.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');
        base.setAttribute('stroke', 'var(--accent-tertiary)');
        base.setAttribute('stroke-width', '2');
        svg.appendChild(base);

        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        edge.setAttribute('d', 'M 150,160 L 150,175 L 230,205 L 400,175 L 400,160 M 230,190 L 230,205');
        edge.setAttribute('fill', 'rgba(245, 158, 11, 0.35)');
        edge.setAttribute('stroke', 'var(--accent-tertiary)');
        edge.setAttribute('stroke-width', '2');
        svg.appendChild(edge);

        addSVGText(svg, 175, 145, `Length`, '11px');
        addSVGText(svg, 370, 150, `Width`, '11px');
        addSVGText(svg, 240, 220, `Depth`, '11px', 'var(--accent-tertiary)');
    } else if (type === 'footing-trap') {
        // Frustum Drawing
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        base.setAttribute('d', 'M 130,170 L 320,140 L 410,170 L 220,200 Z');
        base.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');
        base.setAttribute('stroke', 'var(--accent-tertiary)');
        base.setAttribute('stroke-width', '2');
        svg.appendChild(base);

        const baseEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        baseEdge.setAttribute('d', 'M 130,170 L 130,180 L 220,210 L 410,180 L 410,170 M 220,200 L 220,210');
        baseEdge.setAttribute('fill', 'rgba(245, 158, 11, 0.3)');
        baseEdge.setAttribute('stroke', 'var(--accent-tertiary)');
        baseEdge.setAttribute('stroke-width', '2');
        svg.appendChild(baseEdge);

        // Top Column face
        const top = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        top.setAttribute('d', 'M 240,105 L 290,95 L 310,110 L 260,120 Z');
        top.setAttribute('fill', 'rgba(245, 158, 11, 0.45)');
        top.setAttribute('stroke', 'var(--accent-tertiary)');
        top.setAttribute('stroke-width', '2');
        svg.appendChild(top);

        const connectors = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        connectors.setAttribute('d', 'M 240,105 L 130,170 M 290,95 L 320,140 M 310,110 L 410,170 M 260,120 L 220,200');
        connectors.setAttribute('stroke', 'var(--accent-tertiary)');
        connectors.setAttribute('stroke-dasharray', '3,3');
        svg.appendChild(connectors);

        addSVGText(svg, 150, 195, `Base L1`, '10px');
        addSVGText(svg, 385, 190, `Base W1`, '10px');
        addSVGText(svg, 245, 85, `Top L2/W2`, '10px', 'var(--accent-tertiary)');
    }
}

function addConcreteToReport() {
    const type = document.getElementById('concrete-type').value;
    const classType = document.getElementById('concrete-class-type').value;
    const mix = document.getElementById('concrete-mix-grade').value;
    const vol = document.getElementById('concrete-res-volume').innerText;
    const cement = document.getElementById('concrete-res-cement').innerText;
    const sand = document.getElementById('concrete-res-sand').innerText;
    const agg = document.getElementById('concrete-res-aggregate').innerText;
    const cost = document.getElementById('concrete-res-cost').innerText.split(': ')[1];

    let dims = '';
    if (type === 'slab' || type === 'beam' || type === 'column-rect' || type === 'footing-rect') {
        const l = document.getElementById('concrete-length').value;
        const w = document.getElementById('concrete-width').value;
        const t = document.getElementById('concrete-thickness').value;
        dims = `${l}m x ${w}m x ${t}m`;
    } else if (type === 'column-circ') {
        const d = document.getElementById('concrete-circ-dia').value;
        const h = document.getElementById('concrete-circ-height').value;
        dims = `Dia: ${d}m, Height: ${h}m`;
    } else {
        const l1 = document.getElementById('concrete-trap-l1').value;
        const w1 = document.getElementById('concrete-trap-w1').value;
        dims = `Trap Base: ${l1}m x ${w1}m`;
    }

    let details = `Vol: ${vol}, Cement: ${cement}, Sand: ${sand}, Aggregate: ${agg}`;
    if (classType === 'rcc') {
        const steelWeight = document.getElementById('concrete-res-steel-val').innerText;
        details += `, Rebar Steel: ${steelWeight}`;
    }

    const item = {
        id: Date.now(),
        type: `${classType.toUpperCase()} (${type.toUpperCase()}) - ${mix}`,
        dims: dims,
        details: details,
        cost: cost
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Concrete item added to BOQ successfully!');
}

// -------------------------------------------------------------
// 2. Steel Rebar Calculator Logic
// -------------------------------------------------------------
function calculateSteel() {
    drawSteelInputHelper();
    const calcMode = document.querySelector('input[name="steel-calc-mode"]:checked').value;
    const rate = parseFloat(document.getElementById('steel-rate').value) || 0;
    const overlap = parseFloat(document.getElementById('steel-overlap').value) || 0;

    let totalWeight = 0;
    let barsCount = 0;
    let description = '';
    let unitWeightText = '';

    if (calcMode === 'simple') {
        const dia = parseInt(document.getElementById('steel-diameter').value);
        const len = parseFloat(document.getElementById('steel-length').value) || 0;

        // weight (kg/m) = D^2 / 162 (Standard civil engineering approximation per IS 1786 nominal mass)
        const unitWeight = (dia * dia) / 162;
        totalWeight = unitWeight * len * (1 + overlap / 100);
        barsCount = totalWeight / (unitWeight * 12);
        description = `${dia}mm Rebar, Total Length: ${len}m`;
        unitWeightText = `Unit Weight: ${unitWeight.toFixed(3)} kg/m`;

        drawSteelSimpleSVG(dia);
    } else if (calcMode === 'grid') {
        // Slab reinforcement grid mode
        const slabLen = parseFloat(document.getElementById('steel-grid-len').value) || 0;
        const slabWid = parseFloat(document.getElementById('steel-grid-wid').value) || 0;
        const coverMm = parseFloat(document.getElementById('steel-grid-cover').value) || 20;
        const mainDia = parseInt(document.getElementById('steel-grid-main-dia').value);
        const mainSpacingMm = parseFloat(document.getElementById('steel-grid-main-spacing').value);
        const distDia = parseInt(document.getElementById('steel-grid-dist-dia').value);
        const distSpacingMm = parseFloat(document.getElementById('steel-grid-dist-spacing').value);
        const hooks = document.getElementById('steel-hooks').checked;
        const cranks = document.getElementById('steel-cranks').checked;

        const coverM = coverMm / 1000;
        const mainSpacingM = mainSpacingMm / 1000;
        const distSpacingM = distSpacingMm / 1000;

        // Effective Spans
        const effLen = slabLen - 2 * coverM;
        const effWid = slabWid - 2 * coverM;

        // Hook additions per bar (18 * Dia / 1000 meters total per bar for two 180deg hooks)
        const hookLengthMain = hooks ? (18 * mainDia / 1000) : 0;
        const hookLengthDist = hooks ? (18 * distDia / 1000) : 0;

        // Crank additions per bar (0.42 * d * 2 for bent-ups on both ends of bar)
        // Assume Slab thickness is 150mm for calculation of structural depth
        const slabThickForCrank = 0.15;
        const effDepth = slabThickForCrank - 2 * coverM - (mainDia / 2000);
        const crankAddMain = cranks ? (0.42 * effDepth * 2) : 0;

        // Main Bars (run along Width, spaced along Length)
        const numMainBars = Math.ceil(effLen / mainSpacingM) + 1;
        const mainBarLen = effWid + hookLengthMain + crankAddMain;
        const totalMainLen = numMainBars * mainBarLen;
        // Standard divisor 162 is used for main rebar weight calculation (IS 1786)
        const mainUnitWeight = (mainDia * mainDia) / 162;
        const mainWeight = totalMainLen * mainUnitWeight;

        // Distribution Bars (run along Length, spaced along Width)
        const numDistBars = Math.ceil(effWid / distSpacingM) + 1;
        const distBarLen = effLen + hookLengthDist;
        const totalDistLen = numDistBars * distBarLen;
        // Standard divisor 162 is used for distribution rebar weight calculation
        const distUnitWeight = (distDia * distDia) / 162;
        const distWeight = totalDistLen * distUnitWeight;

        totalWeight = (mainWeight + distWeight) * (1 + overlap / 100);
        // expressed in equivalent main bar pieces using standard divisor 162
        barsCount = totalWeight / (((mainDia * mainDia) / 162) * 12);
        description = `Grid Mesh: Main ${mainDia}mm@${mainSpacingMm}mm, Dist ${distDia}mm@${distSpacingMm}mm`;
        unitWeightText = `Main Bars: ${numMainBars} pcs, Dist Bars: ${numDistBars} pcs`;

        drawSteelGridSVG(slabLen, slabWid, mainSpacingM, distSpacingM);
    } else {
        // Lapping and Development length mode
        const dia = parseInt(document.getElementById('lapping-dia').value);
        const concreteGrade = document.getElementById('lapping-concrete').value;
        const steelGrade = document.getElementById('lapping-steel').value;
        const zone = document.getElementById('lapping-zone').value;
        const jointsCount = parseInt(document.getElementById('lapping-joints-count').value) || 1;

        // Base bond stress tau_bd (IS 456:2000 Clause 26.2.1.1)
        let tau_bd = 1.2; 
        if (concreteGrade === 'M15') tau_bd = 1.0;
        else if (concreteGrade === 'M20') tau_bd = 1.2;
        else if (concreteGrade === 'M25') tau_bd = 1.4;
        else if (concreteGrade === 'M30') tau_bd = 1.5;
        else if (concreteGrade === 'M35') tau_bd = 1.7;
        else if (concreteGrade === 'M40') tau_bd = 1.9;

        // Increase by 60% for deformed/HYSD bars
        const isDeformed = (steelGrade === 'Fe415' || steelGrade === 'Fe500');
        if (isDeformed) {
            tau_bd *= 1.6;
        }

        // Increase by 25% for compression
        const isCompression = (zone === 'compression');
        if (isCompression) {
            tau_bd *= 1.25;
        }

        // Yield strength fy
        let fy = 500;
        if (steelGrade === 'Fe250') fy = 250;
        else if (steelGrade === 'Fe415') fy = 415;
        else if (steelGrade === 'Fe500') fy = 500;

        // Design yield stress sigma_s (0.87 fy)
        const sigma_s = 0.87 * fy;

        // Development Length L_d
        const L_d = (dia * sigma_s) / (4 * tau_bd);

        // Lap length
        let lapLength = L_d;
        if (zone === 'tension-flexure') {
            lapLength = Math.max(L_d, 30 * dia);
        } else if (zone === 'tension-direct') {
            lapLength = Math.max(2 * L_d, 30 * dia);
        } else if (zone === 'compression') {
            lapLength = Math.max(L_d, 24 * dia);
        }

        // Total lapping weight
        const totalLapLenM = (lapLength * jointsCount) / 1000;
        // Standard divisor 162 is used for lapping unit weight calculation (IS 1786)
        const unitWeight = (dia * dia) / 162;
        totalWeight = unitWeight * totalLapLenM;
        barsCount = totalLapLenM / 12;

        description = `Lapping: ${jointsCount} joints of ${dia}mm (${steelGrade}) in ${concreteGrade}`;
        unitWeightText = `Ld: ${Math.round(L_d)}mm | Lap Length: ${Math.round(lapLength)}mm`;

        drawSteelLappingSVG(dia, lapLength);
    }

    const estimatedCost = totalWeight * rate;

    // Update Results
    document.getElementById('steel-res-weight').innerHTML = `${totalWeight.toFixed(2)} <span class="result-unit">kg</span>`;
    document.getElementById('steel-res-weight-ton').innerText = `~ ${(totalWeight / 1000).toFixed(3)} Metric Tons`;
    document.getElementById('steel-res-bars').innerHTML = `${barsCount.toFixed(1)} <span class="result-unit">pcs (12m)</span>`;
    document.getElementById('steel-res-unit-weight').innerText = unitWeightText;
    document.getElementById('steel-res-cost').innerText = `₹${Math.ceil(estimatedCost).toLocaleString('en-IN')}`;
}

function drawSteelSimpleSVG(dia) {
    const svg = document.getElementById('steel-svg');
    svg.innerHTML = ''; // clear

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="rebarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4b5563" />
            <stop offset="50%" stop-color="#9ca3af" />
            <stop offset="100%" stop-color="#374151" />
        </linearGradient>
    `;
    svg.appendChild(defs);

    const rebar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rebar.setAttribute('x', '40');
    rebar.setAttribute('y', '100');
    rebar.setAttribute('width', '400');
    rebar.setAttribute('height', Math.max(10, dia * 1.2));
    rebar.setAttribute('rx', '4');
    rebar.setAttribute('fill', 'url(#rebarGrad)');
    svg.appendChild(rebar);

    for (let x = 60; x < 430; x += 15) {
        const rib = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        rib.setAttribute('d', `M ${x},96 L ${x + 6},${104 + dia * 1.2}`);
        rib.setAttribute('stroke', '#111827');
        rib.setAttribute('stroke-width', '3');
        rib.setAttribute('stroke-linecap', 'round');
        svg.appendChild(rib);
    }

    addSVGText(svg, 190, 80, `Rebar Diameter: ${dia} mm`, '13px', 'var(--accent-tertiary)');
    addSVGText(svg, 190, 150, `Standard Rebar profile detail`, '11px');
}

function drawSteelGridSVG(len, wid, s1, s2) {
    const svg = document.getElementById('steel-svg');
    svg.innerHTML = ''; // clear

    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', '70');
    border.setAttribute('y', '30');
    border.setAttribute('width', '340');
    border.setAttribute('height', '160');
    border.setAttribute('fill', 'rgba(255,255,255,0.02)');
    border.setAttribute('stroke', 'rgba(255,255,255,0.1)');
    border.setAttribute('stroke-width', '1');
    svg.appendChild(border);

    // main reinforcement bars
    const numV = Math.min(15, Math.ceil(340 / (s1 * 100)));
    const spaceV = 340 / (numV - 1);
    for (let i = 0; i < numV; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 70 + i * spaceV);
        line.setAttribute('y1', '30');
        line.setAttribute('x2', 70 + i * spaceV);
        line.setAttribute('y2', '190');
        line.setAttribute('stroke', 'var(--accent)');
        line.setAttribute('stroke-width', '2.5');
        svg.appendChild(line);
    }

    // distribution bars
    const numH = Math.min(10, Math.ceil(160 / (s2 * 100)));
    const spaceH = 160 / (numH - 1);
    for (let i = 0; i < numH; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '70');
        line.setAttribute('y1', 30 + i * spaceH);
        line.setAttribute('x2', '410');
        line.setAttribute('y2', 30 + i * spaceH);
        line.setAttribute('stroke', 'var(--accent-tertiary)');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
    }

    addSVGText(svg, 160, 215, `Grid Spacing: Main ${Math.round(s1 * 1000)}mm | Dist ${Math.round(s2 * 1000)}mm`, '11px');
    addSVGText(svg, 190, 20, `Slab Reinforcement Grid`, '12px', 'var(--accent-tertiary)');
}

function drawSteelLappingSVG(dia, lapLen) {
    const svg = document.getElementById('steel-svg');
    svg.innerHTML = ''; // clear

    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', '10');
    border.setAttribute('y', '10');
    border.setAttribute('width', '460');
    border.setAttribute('height', '200');
    border.setAttribute('fill', 'rgba(255,255,255,0.02)');
    border.setAttribute('stroke', 'rgba(255,255,255,0.08)');
    border.setAttribute('stroke-width', '1');
    border.setAttribute('rx', '6');
    svg.appendChild(border);

    // Left Bar
    const leftBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    leftBar.setAttribute('x', '40');
    leftBar.setAttribute('y', '90');
    leftBar.setAttribute('width', '240');
    leftBar.setAttribute('height', '12');
    leftBar.setAttribute('fill', '#9ca3af');
    leftBar.setAttribute('rx', '2');
    svg.appendChild(leftBar);

    // Right Bar
    const rightBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rightBar.setAttribute('x', '200');
    rightBar.setAttribute('y', '110');
    rightBar.setAttribute('width', '240');
    rightBar.setAttribute('height', '12');
    rightBar.setAttribute('fill', '#6b7280');
    rightBar.setAttribute('rx', '2');
    svg.appendChild(rightBar);

    // Overlap zone highlight (from x=200 to x=280)
    const overlapZone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    overlapZone.setAttribute('x', '200');
    overlapZone.setAttribute('y', '80');
    overlapZone.setAttribute('width', '80');
    overlapZone.setAttribute('height', '50');
    overlapZone.setAttribute('fill', 'rgba(6, 182, 212, 0.08)');
    overlapZone.setAttribute('stroke', 'var(--accent)');
    overlapZone.setAttribute('stroke-dasharray', '3,3');
    overlapZone.setAttribute('stroke-width', '1.5');
    svg.appendChild(overlapZone);

    // Dimension line
    const dimLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    dimLine.setAttribute('x1', '200');
    dimLine.setAttribute('y1', '150');
    dimLine.setAttribute('x2', '280');
    dimLine.setAttribute('y2', '150');
    dimLine.setAttribute('stroke', 'var(--accent-tertiary)');
    dimLine.setAttribute('stroke-width', '1.5');
    svg.appendChild(dimLine);

    // Dimension ticks
    const tick1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick1.setAttribute('x1', '200');
    tick1.setAttribute('y1', '145');
    tick1.setAttribute('x2', '200');
    tick1.setAttribute('y2', '155');
    tick1.setAttribute('stroke', 'var(--accent-tertiary)');
    tick1.setAttribute('stroke-width', '1.5');
    svg.appendChild(tick1);

    const tick2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick2.setAttribute('x1', '280');
    tick2.setAttribute('y1', '145');
    tick2.setAttribute('x2', '280');
    tick2.setAttribute('y2', '155');
    tick2.setAttribute('stroke', 'var(--accent-tertiary)');
    tick2.setAttribute('stroke-width', '1.5');
    svg.appendChild(tick2);

    addSVGText(svg, 240, 170, `Lap: ${Math.round(lapLen)} mm`, '11px', 'var(--accent-tertiary)');
    addSVGText(svg, 140, 75, `Bar 1 (Φ ${dia}mm)`, '10px');
    addSVGText(svg, 340, 138, `Bar 2 (Φ ${dia}mm)`, '10px');
    addSVGText(svg, 240, 35, `IS 456 Rebar Lapping Profile`, '12px', 'var(--accent-tertiary)');
}

function addSteelToReport() {
    const calcMode = document.querySelector('input[name="steel-calc-mode"]:checked').value;
    const weight = document.getElementById('steel-res-weight').innerText;
    const cost = document.getElementById('steel-res-cost').innerText;

    let desc = '';
    let dims = '';
    if (calcMode === 'simple') {
        const dia = document.getElementById('steel-diameter').value;
        const len = document.getElementById('steel-length').value;
        desc = `Rebar Steel (${dia}mm)`;
        dims = `Total length: ${len}m`;
    } else if (calcMode === 'grid') {
        const slabLen = document.getElementById('steel-grid-len').value;
        const slabWid = document.getElementById('steel-grid-wid').value;
        const main = document.getElementById('steel-grid-main-dia').value;
        const dist = document.getElementById('steel-grid-dist-dia').value;
        desc = `RCC Slab Mesh (Main ${main}mm, Dist ${dist}mm)`;
        dims = `${slabLen}m x ${slabWid}m Slab`;
    } else {
        const dia = document.getElementById('lapping-dia').value;
        const concrete = document.getElementById('lapping-concrete').value;
        const steel = document.getElementById('lapping-steel').value;
        const zone = document.getElementById('lapping-zone').value;
        const count = document.getElementById('lapping-joints-count').value;
        desc = `Lapping & Development (${dia}mm ${steel} in ${concrete})`;
        dims = `${count} joints (${zone === 'compression' ? 'Comp' : 'Tens'})`;
    }

    const item = {
        id: Date.now(),
        type: desc,
        dims: dims,
        details: `Weight: ${weight}, Bars: ${document.getElementById('steel-res-bars').innerText}`,
        cost: cost
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Steel specification added to BOQ successfully!');
}

// -------------------------------------------------------------
// 3. Brick Masonry Calculator Logic
// -------------------------------------------------------------
function calculateBricks() {
    drawMasonryInputHelper();
    const subtab = document.querySelector('input[name="masonry-subtab"]:checked').value;

    if (subtab === 'brickwork') {
        const wallL = parseFloat(document.getElementById('brick-wall-len').value) || 0;
        const wallH = parseFloat(document.getElementById('brick-wall-height').value) || 0;
        const wallT = parseFloat(document.getElementById('brick-wall-thick').value) || 0;
        const brickType = document.getElementById('brick-size-type').value;
        const jointMm = parseFloat(document.getElementById('brick-mortar-joint').value) || 0;
        const mortarRatio = parseFloat(document.getElementById('brick-mortar-ratio').value) || 6;
        const wastage = parseFloat(document.getElementById('brick-wastage').value) || 0;

        // Deductions
        const doorNum = parseInt(document.getElementById('brick-doors-num').value) || 0;
        const doorW = parseFloat(document.getElementById('brick-door-w').value) || 0;
        const doorH = parseFloat(document.getElementById('brick-door-h').value) || 0;

        const winNum = parseInt(document.getElementById('brick-windows-num').value) || 0;
        const winW = parseFloat(document.getElementById('brick-window-w').value) || 0;
        const winH = parseFloat(document.getElementById('brick-window-h').value) || 0;

        const customDeduction = parseFloat(document.getElementById('brick-custom-deduction').value) || 0;

        const doorDeductionVol = doorNum * doorW * doorH * wallT;
        const winDeductionVol = winNum * winW * winH * wallT;

        let grossVol = wallL * wallH * wallT;
        let netWallVol = grossVol - doorDeductionVol - winDeductionVol - customDeduction;
        if (netWallVol < 0) netWallVol = 0;

        // Brick Size in meters
        let bL = 0.19, bW = 0.09, bH = 0.09;
        if (brickType === 'traditional') {
            bL = 0.229; bW = 0.112; bH = 0.070;
        } else if (brickType === 'flyash') {
            bL = 0.230; bW = 0.110; bH = 0.075;
        } else if (brickType === 'custom') {
            bL = (parseFloat(document.getElementById('custom-brick-l').value) || 190) / 1000;
            bW = (parseFloat(document.getElementById('custom-brick-w').value) || 90) / 1000;
            bH = (parseFloat(document.getElementById('custom-brick-h').value) || 90) / 1000;
        }

        const j = jointMm / 1000;
        const singleBrickVol = bL * bW * bH;
        const brickVolWithMortar = (bL + j) * (bW + j) * (bH + j);

        // Number of bricks (with wastage)
        const bricksNeededNoWastage = netWallVol / brickVolWithMortar;
        const bricksNeededTotal = Math.ceil(bricksNeededNoWastage * (1 + wastage / 100));

        // Mortar Volume Calculation
        const totalBricksVolActual = bricksNeededNoWastage * singleBrickVol;
        let wetMortarVol = netWallVol - totalBricksVolActual;
        if (wetMortarVol < 0) wetMortarVol = 0;

        // Dry Mortar volume (compaction/wastage factor 1.33)
        let dryMortarVol = wetMortarVol * 1.33;

        // Cement & Sand parts
        const totalParts = 1 + mortarRatio;
        const cementVol = (dryMortarVol * 1) / totalParts;
        const cementBags = Math.ceil(cementVol / 0.03472222); // 1 bag = 50kg = 0.03472222 m3 (50 / 1440)
        const sandVolM3 = (dryMortarVol * mortarRatio) / totalParts;
        const sandVolCft = sandVolM3 * 35.31466672;

        // Display updates
        document.getElementById('brick-res-bricks-title').innerText = 'Bricks Required';
        document.getElementById('brick-res-cement-title').innerText = 'Cement Bags (Mortar)';
        document.getElementById('brick-res-sand-title').innerText = 'Mortar Sand';
        document.getElementById('brick-res-cement-desc').innerText = `Dry Mortar Vol: ~${dryMortarVol.toFixed(2)} m³`;
        document.getElementById('brick-res-sand-desc').innerText = `~${sandVolM3.toFixed(2)} m³ / ${(sandVolM3 * 1.6).toFixed(1)} Tons`;

        document.getElementById('brick-res-bricks').innerHTML = `${bricksNeededTotal.toLocaleString()} <span class="result-unit">pcs</span>`;
        document.getElementById('brick-res-wall-vol').innerText = `Net Wall Volume: ${netWallVol.toFixed(3)} m³ (Gross: ${grossVol.toFixed(2)} m³)`;
        document.getElementById('brick-res-cement').innerHTML = `${cementBags} <span class="result-unit">Bags</span>`;
        document.getElementById('brick-res-sand').innerHTML = `${sandVolCft.toFixed(1)} <span class="result-unit">cft</span>`;

    } else if (subtab === 'plastering') {
        const wallL = parseFloat(document.getElementById('plaster-wall-len').value) || 0;
        const wallH = parseFloat(document.getElementById('plaster-wall-height').value) || 0;
        const thickness = parseFloat(document.getElementById('plaster-thickness').value) || 12;
        const ratio = parseFloat(document.getElementById('plaster-mix-ratio').value) || 4;
        const wastage = parseFloat(document.getElementById('plaster-wastage').value) || 10;

        const area = wallL * wallH;
        const wetVol = area * (thickness / 1000);
        const wetVolWithWastage = wetVol * (1 + wastage / 100);
        const dryVol = wetVolWithWastage * 1.33;

        const totalParts = 1 + ratio;
        const cementVol = dryVol / totalParts;
        const cementBags = Math.ceil(cementVol / 0.03472222); // 50 / 1440
        const sandVol = (dryVol * ratio) / totalParts;
        const sandCft = sandVol * 35.31466672;

        document.getElementById('brick-res-bricks-title').innerText = 'Plaster Area';
        document.getElementById('brick-res-cement-title').innerText = 'Cement Bags (Plaster)';
        document.getElementById('brick-res-sand-title').innerText = 'Plaster Sand';
        document.getElementById('brick-res-cement-desc').innerText = `Dry Plaster Vol: ~${dryVol.toFixed(2)} m³`;
        document.getElementById('brick-res-sand-desc').innerText = `~${sandVol.toFixed(2)} m³ / ${(sandVol * 1.6).toFixed(1)} Tons`;

        document.getElementById('brick-res-bricks').innerHTML = `${area.toFixed(1)} <span class="result-unit">m²</span>`;
        document.getElementById('brick-res-wall-vol').innerText = `Plaster Thickness: ${thickness}mm | Wet Vol: ${wetVol.toFixed(3)} m³`;
        document.getElementById('brick-res-cement').innerHTML = `${cementBags} <span class="result-unit">Bags</span>`;
        document.getElementById('brick-res-sand').innerHTML = `${sandCft.toFixed(1)} <span class="result-unit">cft</span>`;

    } else {
        // flooring
        const roomL = parseFloat(document.getElementById('flooring-room-len').value) || 0;
        const roomW = parseFloat(document.getElementById('flooring-room-wid').value) || 0;
        const tileSize = document.getElementById('flooring-tile-size').value;
        const groutMm = parseFloat(document.getElementById('flooring-grout-width').value) || 2;
        const skirtingH = parseFloat(document.getElementById('flooring-skirting-height').value) || 100;
        const bedThick = parseFloat(document.getElementById('flooring-bed-thick').value) || 40;
        const bedRatio = parseFloat(document.getElementById('flooring-bed-ratio').value) || 4;
        const wastage = parseFloat(document.getElementById('flooring-wastage').value) || 10;

        const roomArea = roomL * roomW;

        // Tile size in meters
        let tL = 0.6, tW = 0.6;
        if (tileSize === '300x300') { tL = 0.3; tW = 0.3; }
        else if (tileSize === '600x600') { tL = 0.6; tW = 0.6; }
        else if (tileSize === '800x800') { tL = 0.8; tW = 0.8; }
        else if (tileSize === 'custom') {
            tL = (parseFloat(document.getElementById('flooring-custom-tile-len').value) || 600) / 1000;
            tW = (parseFloat(document.getElementById('flooring-custom-tile-wid').value) || 600) / 1000;
        }

        const tileArea = tL * tW;
        const tilesRaw = roomArea / tileArea;

        // Skirting tiles count
        const perimeter = (2 * (roomL + roomW)) - 1.0; // assume 1m door opening
        const skirtingArea = perimeter * (skirtingH / 1000);
        const skirtingTilesRaw = skirtingArea / tileArea;

        const totalTiles = Math.ceil((tilesRaw + skirtingTilesRaw) * (1 + wastage / 100));

        // Bedding mortar volume
        const bedWetVol = roomArea * (bedThick / 1000);
        const bedDryVol = bedWetVol * 1.33 * (1 + wastage / 100);

        const totalParts = 1 + bedRatio;
        const cementVol = bedDryVol / totalParts;
        const cementBags = Math.ceil(cementVol / 0.03472222); // 50 / 1440
        const sandVol = (bedDryVol * bedRatio) / totalParts;
        const sandCft = sandVol * 35.31466672;

        document.getElementById('brick-res-bricks-title').innerText = 'Tiles Required';
        document.getElementById('brick-res-cement-title').innerText = 'Cement Bags (Bedding)';
        document.getElementById('brick-res-sand-title').innerText = 'Bedding Sand';
        document.getElementById('brick-res-cement-desc').innerText = `Dry Bedding Vol: ~${bedDryVol.toFixed(2)} m³`;
        document.getElementById('brick-res-sand-desc').innerText = `~${sandVol.toFixed(2)} m³ / ${(sandVol * 1.6).toFixed(1)} Tons`;

        document.getElementById('brick-res-bricks').innerHTML = `${totalTiles} <span class="result-unit">pcs</span>`;
        document.getElementById('brick-res-wall-vol').innerText = `Floor: ${roomArea.toFixed(2)} m² | Skirting: ${skirtingArea.toFixed(2)} m²`;
        document.getElementById('brick-res-cement').innerHTML = `${cementBags} <span class="result-unit">Bags</span>`;
        document.getElementById('brick-res-sand').innerHTML = `${sandCft.toFixed(1)} <span class="result-unit">cft</span>`;
    }

    drawBricksSVG();
}

function drawBricksSVG() {
    const subtab = document.querySelector('input[name="masonry-subtab"]:checked').value;
    const svg = document.getElementById('bricks-svg');
    svg.innerHTML = '';
    
    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    grid.setAttribute('width', '100%');
    grid.setAttribute('height', '100%');
    grid.setAttribute('fill', 'rgba(0,0,0,0.05)');
    svg.appendChild(grid);

    if (subtab === 'brickwork') {
        const rowHeight = 25;
        const brickWidth = 55;

        for (let row = 0; row < 7; row++) {
            const y = 180 - row * rowHeight;
            const isHeaderRow = (row % 2 === 0);

            if (isHeaderRow) {
                const headerWidth = 27;
                for (let x = 40; x < 440; x += headerWidth + 2) {
                    const brick = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    brick.setAttribute('x', x);
                    brick.setAttribute('y', y);
                    brick.setAttribute('width', headerWidth);
                    brick.setAttribute('height', rowHeight - 2);
                    brick.setAttribute('fill', '#b91c1c');
                    brick.setAttribute('stroke', '#111827');
                    brick.setAttribute('stroke-width', '1');
                    svg.appendChild(brick);
                }
            } else {
                const offset = (row % 4 === 1) ? 0 : -27;
                for (let x = 40 + offset; x < 450; x += brickWidth + 2) {
                    if (x < 40) continue;
                    const brick = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    brick.setAttribute('x', x);
                    brick.setAttribute('y', y);
                    brick.setAttribute('width', Math.min(brickWidth, 440 - x));
                    brick.setAttribute('height', rowHeight - 2);
                    brick.setAttribute('fill', '#dc2626');
                    brick.setAttribute('stroke', '#111827');
                    brick.setAttribute('stroke-width', '1');
                    svg.appendChild(brick);
                }
            }
        }
        addSVGText(svg, 170, 20, `Brick Bond Layout elevation`, '12px', '#ef4444');
    } else if (subtab === 'plastering') {
        const wall = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        wall.setAttribute('x', '60');
        wall.setAttribute('y', '40');
        wall.setAttribute('width', '360');
        wall.setAttribute('height', '140');
        wall.setAttribute('fill', '#4b5563');
        wall.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        svg.appendChild(wall);

        const coat = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        coat.setAttribute('x', '240');
        coat.setAttribute('y', '40');
        coat.setAttribute('width', '180');
        coat.setAttribute('height', '140');
        coat.setAttribute('fill', '#9ca3af');
        coat.setAttribute('opacity', '0.85');
        svg.appendChild(coat);

        const trowel = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        trowel.setAttribute('points', '210,100 250,80 250,120');
        trowel.setAttribute('fill', '#d1d5db');
        trowel.setAttribute('stroke', '#374151');
        svg.appendChild(trowel);

        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        handle.setAttribute('x1', '210');
        handle.setAttribute('y1', '100');
        handle.setAttribute('x2', '180');
        handle.setAttribute('y2', '100');
        handle.setAttribute('stroke', '#78350f');
        handle.setAttribute('stroke-width', '5');
        svg.appendChild(handle);

        addSVGText(svg, 100, 110, `Rough Brickwork`, '11px', '#ffffff');
        addSVGText(svg, 270, 110, `Finished Plaster`, '11px', '#111827');
        addSVGText(svg, 170, 20, `Wall Plastering Detail Layout`, '12px', 'var(--accent-tertiary)');
    } else {
        const floor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        floor.setAttribute('x', '80');
        floor.setAttribute('y', '40');
        floor.setAttribute('width', '320');
        floor.setAttribute('height', '140');
        floor.setAttribute('fill', 'rgba(255,255,255,0.05)');
        floor.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        svg.appendChild(floor);

        for (let x = 120; x < 400; x += 40) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', '40');
            line.setAttribute('x2', x);
            line.setAttribute('y2', '180');
            line.setAttribute('stroke', 'var(--accent)');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }
        for (let y = 75; y < 180; y += 35) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '80');
            line.setAttribute('y1', y);
            line.setAttribute('x2', '400');
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'var(--accent)');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }
    }
}

function addBrickToReport() {
    const subtab = document.querySelector('input[name="masonry-subtab"]:checked').value;
    const bricksVal = document.getElementById('brick-res-bricks').innerText;
    const cement = document.getElementById('brick-res-cement').innerText;
    const sand = document.getElementById('brick-res-sand').innerText;

    let type = '';
    let dims = '';
    let details = '';
    let costVal = 0;

    if (subtab === 'brickwork') {
        const l = document.getElementById('brick-wall-len').value;
        const h = document.getElementById('brick-wall-height').value;
        const t = document.getElementById('brick-wall-thick').value;
        type = 'Brick Masonry Work';
        dims = `${l}m x ${h}m x ${Math.round(t * 1000)}mm`;
        details = `Bricks: ${bricksVal}, Cement: ${cement}, Sand: ${sand}`;
        const count = parseInt(bricksVal.replace(/,/g, '')) || 0;
        costVal = count * 8;
    } else if (subtab === 'plastering') {
        const l = document.getElementById('plaster-wall-len').value;
        const h = document.getElementById('plaster-wall-height').value;
        const thick = document.getElementById('plaster-thickness').value;
        const cementCost = parseFloat(document.getElementById('plaster-cement-cost').value) || 450;
        const sandCost = parseFloat(document.getElementById('plaster-sand-cost').value) || 60;
        
        type = 'Plastering Work';
        dims = `${l}m x ${h}m @ ${thick}mm`;
        details = `Cement: ${cement}, Sand: ${sand}`;

        const bags = parseInt(cement.split(' ')[0]) || 0;
        const sandCft = parseFloat(sand.split(' ')[0]) || 0;
        costVal = bags * cementCost + sandCft * sandCost;
    } else {
        const l = document.getElementById('flooring-room-len').value;
        const w = document.getElementById('flooring-room-wid').value;
        const tileCost = parseFloat(document.getElementById('flooring-tile-cost').value) || 450;
        const cementCost = parseFloat(document.getElementById('flooring-cement-cost').value) || 450;
        const sandCost = parseFloat(document.getElementById('flooring-sand-cost').value) || 60;

        type = 'Flooring & Tiling';
        dims = `${l}m x ${w}m room`;
        details = `Tiles: ${bricksVal}, Cement: ${cement}, Sand: ${sand}`;

        const area = parseFloat(l) * parseFloat(w) || 0;
        const bags = parseInt(cement.split(' ')[0]) || 0;
        const sandCft = parseFloat(sand.split(' ')[0]) || 0;
        costVal = area * tileCost + bags * cementCost + sandCft * sandCost;
    }

    const item = {
        id: Date.now(),
        type: type,
        dims: dims,
        details: details,
        cost: '₹' + Math.ceil(costVal).toLocaleString('en-IN')
    };

    boqReport.push(item);
    saveBOQReport();
    showToast(`${type} added to BOQ successfully!`);
}

// -------------------------------------------------------------
// 4. Excavation & Earthwork Calculator Logic
// -------------------------------------------------------------
function calculateExcavation() {
    drawEarthworkInputHelper();
    const mode = document.querySelector('input[name="earthwork-mode"]:checked').value;
    
    // Target title cards
    const mainTitleCard = document.getElementById('exc-res-volume').previousElementSibling;
    const topDimsTitleCard = document.getElementById('exc-res-top-dims').previousElementSibling;
    const backfillTitleCard = document.getElementById('exc-res-backfill').previousElementSibling;

    let volume = 0;
    let looseVolume = 0;
    let topDimsText = '';
    let backfillText = '';
    let backfillVal = 0;
    let trips = 0;

    if (mode === 'pit') {
        const lBottom = parseFloat(document.getElementById('exc-length').value) || 0;
        const wBottom = parseFloat(document.getElementById('exc-width').value) || 0;
        const depth = parseFloat(document.getElementById('exc-depth').value) || 0;
        const slope = parseFloat(document.getElementById('exc-slope').value) || 0;
        const swell = parseFloat(document.getElementById('exc-swell').value) || 0;

        const footingVol = parseFloat(document.getElementById('exc-footing-vol').value) || 0;
        const columnVol = parseFloat(document.getElementById('exc-column-vol').value) || 0;
        const compactionFactor = parseFloat(document.getElementById('exc-compaction').value) || 20;

        // Top Dimensions
        const lTop = lBottom + 2 * slope * depth;
        const wTop = wBottom + 2 * slope * depth;

        // Prismoidal Volume
        const aBottom = lBottom * wBottom;
        const aTop = lTop * wTop;
        const aMid = ((lBottom + lTop) / 2) * ((wBottom + wTop) / 2);

        volume = (depth / 6) * (aBottom + aTop + 4 * aMid);
        looseVolume = volume * (1 + swell / 100);

        // Backfill Volume (In-situ volume minus concrete structural volume)
        const concreteStructureVol = footingVol + columnVol;
        let netBackfillInSitu = volume - concreteStructureVol;
        if (netBackfillInSitu < 0) netBackfillInSitu = 0;

        // Update card titles
        mainTitleCard.innerText = "In-Situ Excavation Volume";
        topDimsTitleCard.innerText = "Top Opening Span";
        backfillTitleCard.innerText = "Soil Backfilling Volume";

        document.getElementById('exc-res-volume').innerHTML = `${volume.toFixed(2)} <span class="result-unit">m³</span>`;
        document.getElementById('exc-res-loose-vol').innerText = `Loose Transport Volume (Swell): ~ ${looseVolume.toFixed(2)} m³`;
        document.getElementById('exc-res-top-dims').innerText = `${lTop.toFixed(2)}m x ${wTop.toFixed(2)}m`;
        document.getElementById('exc-res-backfill').innerHTML = `${netBackfillInSitu.toFixed(2)} <span class="result-unit">m³</span>`;

        trips = Math.ceil(looseVolume / 5);
        document.getElementById('exc-res-trips').innerText = `Transport requires ~${trips} dump truck trips (5m³ each)`;

    } else if (mode === 'trench') {
        const length = parseFloat(document.getElementById('trench-length').value) || 0;
        const wBottom = parseFloat(document.getElementById('trench-width').value) || 0;
        const depth = parseFloat(document.getElementById('trench-depth').value) || 0;
        const slope = parseFloat(document.getElementById('trench-slope').value) || 0;
        const swell = parseFloat(document.getElementById('trench-swell').value) || 15;
        const rate = parseFloat(document.getElementById('trench-rate').value) || 150;

        const wTop = wBottom + 2 * slope * depth;
        const crossSection = ((wBottom + wTop) / 2) * depth;
        volume = crossSection * length;
        looseVolume = volume * (1 + swell / 100);
        const cost = volume * rate;

        // Update card titles
        mainTitleCard.innerText = "Trench Excavation Volume";
        topDimsTitleCard.innerText = "Trench Cross-Section";
        backfillTitleCard.innerText = "Excavation Cost";

        document.getElementById('exc-res-volume').innerHTML = `${volume.toFixed(2)} <span class="result-unit">m³</span>`;
        document.getElementById('exc-res-loose-vol').innerText = `Loose Transport Volume (Swell): ~ ${looseVolume.toFixed(2)} m³`;
        document.getElementById('exc-res-top-dims').innerText = `${crossSection.toFixed(2)} m² (Top: ${wTop.toFixed(1)}m)`;
        document.getElementById('exc-res-backfill').innerHTML = `₹${Math.ceil(cost).toLocaleString('en-IN')}`;

        trips = Math.ceil(looseVolume / 5);
        document.getElementById('exc-res-trips').innerText = `Transport requires ~${trips} dump truck trips (5m³ each)`;

    } else {
        // Plinth filling
        const length = parseFloat(document.getElementById('plinth-length').value) || 0;
        const width = parseFloat(document.getElementById('plinth-width').value) || 0;
        const depth = parseFloat(document.getElementById('plinth-depth').value) || 0;
        const compaction = parseFloat(document.getElementById('plinth-compaction').value) || 30;
        const rate = parseFloat(document.getElementById('plinth-sand-rate').value) || 2500;

        const compactedVol = length * width * depth;
        const looseVol = compactedVol * (1 + compaction / 100);

        // 1 Brass = 100 cft = 2.83 m3 (using high-precision conversion 35.31466672)
        const brassCount = (looseVol * 35.31466672) / 100;
        const cost = brassCount * rate;

        // Update card titles
        mainTitleCard.innerText = "Compacted Plinth Volume";
        topDimsTitleCard.innerText = "Volume in Brass";
        backfillTitleCard.innerText = "Filling Cost";

        document.getElementById('exc-res-volume').innerHTML = `${compactedVol.toFixed(2)} <span class="result-unit">m³</span>`;
        document.getElementById('exc-res-loose-vol').innerText = `Required Loose Vol (incl. Shrinkage): ~ ${looseVol.toFixed(2)} m³`;
        document.getElementById('exc-res-top-dims').innerText = `${brassCount.toFixed(2)} Brass (${Math.round(looseVol * 35.3)} cft)`;
        document.getElementById('exc-res-backfill').innerHTML = `₹${Math.ceil(cost).toLocaleString('en-IN')}`;

        trips = Math.ceil(looseVol / 5);
        document.getElementById('exc-res-trips').innerText = `Transport requires ~${trips} dump truck trips (5m³ each)`;
    }

    drawExcavationSVG();
}

function drawExcavationSVG() {
    const mode = document.querySelector('input[name="earthwork-mode"]:checked').value;
    const svg = document.getElementById('exc-svg');
    svg.innerHTML = '';

    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    grid.setAttribute('width', '100%');
    grid.setAttribute('height', '100%');
    grid.setAttribute('fill', 'rgba(0,0,0,0.05)');
    svg.appendChild(grid);

    if (mode === 'pit') {
        const lb = parseFloat(document.getElementById('exc-length').value) || 0;
        const depth = parseFloat(document.getElementById('exc-depth').value) || 0;
        const slope = parseFloat(document.getElementById('exc-slope').value) || 0;
        const lt = lb + 2 * slope * depth;

        // Ground Level Line
        const ground = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ground.setAttribute('x1', '30');
        ground.setAttribute('y1', '60');
        ground.setAttribute('x2', '450');
        ground.setAttribute('y2', '60');
        ground.setAttribute('stroke', '#10b981');
        ground.setAttribute('stroke-width', '3');
        svg.appendChild(ground);

        const points = `100,60 150,160 330,160 380,60`;
        const pit = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        pit.setAttribute('points', points);
        pit.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');
        pit.setAttribute('stroke', '#f59e0b');
        pit.setAttribute('stroke-width', '2');
        svg.appendChild(pit);

        // Labels
        addSVGText(svg, 205, 45, `Top Opening Width: ${lt.toFixed(2)}m`, '10px');
        addSVGText(svg, 205, 185, `Bottom Pit Width: ${lb.toFixed(2)}m`, '10px');
        addSVGText(svg, 385, 110, `Slope (H:V): ${slope}:1`, '10px');
    } else if (mode === 'trench') {
        const l = parseFloat(document.getElementById('trench-length').value) || 0;
        const wb = parseFloat(document.getElementById('trench-width').value) || 0;
        const d = parseFloat(document.getElementById('trench-depth').value) || 0;
        const slope = parseFloat(document.getElementById('trench-slope').value) || 0;
        const wt = wb + 2 * slope * d;

        const ground = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ground.setAttribute('x1', '50');
        ground.setAttribute('y1', '70');
        ground.setAttribute('x2', '430');
        ground.setAttribute('y2', '70');
        ground.setAttribute('stroke', '#10b981');
        ground.setAttribute('stroke-width', '2.5');
        svg.appendChild(ground);

        const trench = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        trench.setAttribute('points', '100,70 140,150 240,150 200,70');
        trench.setAttribute('fill', 'rgba(245, 158, 11, 0.12)');
        trench.setAttribute('stroke', '#d97706');
        trench.setAttribute('stroke-width', '1.5');
        svg.appendChild(trench);

        const trenchExt = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        trenchExt.setAttribute('points', '200,70 240,150 380,150 340,70');
        trenchExt.setAttribute('fill', 'rgba(245, 158, 11, 0.08)');
        trenchExt.setAttribute('stroke', '#b45309');
        trenchExt.setAttribute('stroke-width', '1.5');
        svg.appendChild(trenchExt);

        addSVGText(svg, 220, 35, `Trench Profile (L = ${l}m)`, '12px', 'var(--accent-tertiary)');
        addSVGText(svg, 120, 60, `Width: ${wt.toFixed(2)}m`, '10px');
        addSVGText(svg, 190, 165, `Bottom: ${wb.toFixed(2)}m`, '10px');
    } else {
        const ground = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ground.setAttribute('x1', '40');
        ground.setAttribute('y1', '160');
        ground.setAttribute('x2', '440');
        ground.setAttribute('y2', '160');
        ground.setAttribute('stroke', '#6b7280');
        ground.setAttribute('stroke-width', '2');
        svg.appendChild(ground);

        const plinthWallLeft = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plinthWallLeft.setAttribute('x', '100');
        plinthWallLeft.setAttribute('y', '80');
        plinthWallLeft.setAttribute('width', '25');
        plinthWallLeft.setAttribute('height', '80');
        plinthWallLeft.setAttribute('fill', '#b91c1c');
        svg.appendChild(plinthWallLeft);

        const plinthWallRight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plinthWallRight.setAttribute('x', '350');
        plinthWallRight.setAttribute('y', '80');
        plinthWallRight.setAttribute('width', '25');
        plinthWallRight.setAttribute('height', '80');
        plinthWallRight.setAttribute('fill', '#b91c1c');
        svg.appendChild(plinthWallRight);

        const sandFill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sandFill.setAttribute('x', '125');
        sandFill.setAttribute('y', '95');
        sandFill.setAttribute('width', '225');
        sandFill.setAttribute('height', '65');
        sandFill.setAttribute('fill', '#fef08a');
        sandFill.setAttribute('opacity', '0.6');
        svg.appendChild(sandFill);

        addSVGText(svg, 235, 130, `Sand / Soil Filling`, '11px', '#854d0e');
        addSVGText(svg, 235, 35, `Plinth Retaining & Sand Bedding`, '12px', 'var(--accent-tertiary)');
        addSVGText(svg, 235, 75, `Plinth Depth`, '10px');
    }
}

function addExcavationToReport() {
    const mode = document.querySelector('input[name="earthwork-mode"]:checked').value;
    const vol = document.getElementById('exc-res-volume').innerText;
    const backfill = document.getElementById('exc-res-backfill').innerText;

    let type = '';
    let dims = '';
    let details = '';
    let costText = '';

    if (mode === 'pit') {
        const l = document.getElementById('exc-length').value;
        const w = document.getElementById('exc-width').value;
        const d = document.getElementById('exc-depth').value;
        type = 'Pit Excavation & Backfill';
        dims = `Base: ${l}m x ${w}m x ${d}m depth`;
        details = `Excavated Vol: ${vol}, Net Backfilling: ${backfill}`;
        const rawVolVal = parseFloat(vol.split(' ')[0]) || 0;
        costText = '₹' + Math.ceil(rawVolVal * 150).toLocaleString('en-IN');
    } else if (mode === 'trench') {
        const l = document.getElementById('trench-length').value;
        const w = document.getElementById('trench-width').value;
        const d = document.getElementById('trench-depth').value;
        type = 'Trench Excavation';
        dims = `Length: ${l}m, Width: ${w}m, Depth: ${d}m`;
        details = `Excavated Vol: ${vol}`;
        costText = backfill;
    } else {
        const l = document.getElementById('plinth-length').value;
        const w = document.getElementById('plinth-width').value;
        const d = document.getElementById('plinth-depth').value;
        type = 'Plinth Sand/Soil Filling';
        dims = `${l}m x ${w}m x ${d}m thick`;
        details = `Compacted Vol: ${vol}, ${document.getElementById('exc-res-top-dims').innerText}`;
        costText = backfill;
    }

    const item = {
        id: Date.now(),
        type: type,
        dims: dims,
        details: details,
        cost: costText
    };

    boqReport.push(item);
    saveBOQReport();
    showToast(`${type} added to BOQ successfully!`);
}

// -------------------------------------------------------------
// 5. Unit Converter Logic
// -------------------------------------------------------------
function updateConverterUnits() {
    const category = document.getElementById('conv-category').value;
    const fromSelect = document.getElementById('conv-from-unit');
    const toSelect = document.getElementById('conv-to-unit');

    fromSelect.innerHTML = '';
    toSelect.innerHTML = '';

    const units = unitDatabase[category].units;
    let i = 0;
    for (let key in units) {
        const opt1 = document.createElement('option');
        opt1.value = key;
        opt1.innerText = units[key].name;
        if (i === 0) opt1.selected = true;
        fromSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = key;
        opt2.innerText = units[key].name;
        if (i === 1 || (i === 0 && Object.keys(units).length === 1)) opt2.selected = true;
        toSelect.appendChild(opt2);

        i++;
    }
    calculateUnitConversion();
}

function calculateUnitConversion() {
    const category = document.getElementById('conv-category').value;
    const fromUnit = document.getElementById('conv-from-unit').value;
    const toUnit = document.getElementById('conv-to-unit').value;
    const fromVal = parseFloat(document.getElementById('conv-from-val').value) || 0;

    if (!fromUnit || !toUnit) return;

    const units = unitDatabase[category].units;
    const baseVal = fromVal / units[fromUnit].factor;
    const toVal = baseVal * units[toUnit].factor;

    document.getElementById('conv-to-val').value = toVal.toFixed(5);
}

function swapUnits() {
    const fromSelect = document.getElementById('conv-from-unit');
    const toSelect = document.getElementById('conv-to-unit');

    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;

    const fromInput = document.getElementById('conv-from-val');
    const toInput = document.getElementById('conv-to-val');
    fromInput.value = parseFloat(toInput.value) || 0;

    calculateUnitConversion();
}

// -------------------------------------------------------------
// 6. Beam Analysis Logic
// -------------------------------------------------------------
function toggleBeamInputs() {
    const support = document.getElementById('beam-support-type').value;
    const loadType = document.querySelector('input[name="beam-load-type"]:checked').value;
    const offsetRow = document.getElementById('beam-load-offset-row');

    // Show load offset ONLY if point load on simply supported beam
    if (loadType === 'point' && support === 'simply') {
        offsetRow.style.display = 'block';
    } else {
        offsetRow.style.display = 'none';
    }
    calculateBeam();
}

function calculateBeam() {
    const support = document.getElementById('beam-support-type').value;
    const span = parseFloat(document.getElementById('beam-span').value) || 1;
    const loadType = document.querySelector('input[name="beam-load-type"]:checked').value;
    const loadVal = parseFloat(document.getElementById('beam-load-val').value) || 0;
    let offsetA = parseFloat(document.getElementById('beam-load-offset').value) || 0;
    const eGpa = parseFloat(document.getElementById('beam-e').value) || 200;
    const i106 = parseFloat(document.getElementById('beam-i').value) || 150;

    let maxMoment = 0; // kNm
    let maxShear = 0; // kN
    let maxDeflection = 0; // mm
    let reactionsText = '';
    let momentPosText = '';

    if (support === 'simply') {
        document.getElementById('beam-visual-label').innerText = 'Simply Supported Beam';
        if (loadType === 'point') {
            // Point load P at distance 'a' from left support
            if (offsetA > span) offsetA = span;
            const b = span - offsetA;

            const ra = (loadVal * b) / span;
            const rb = (loadVal * offsetA) / span;
            maxShear = Math.max(ra, rb);
            maxMoment = (loadVal * offsetA * b) / span;

            // Deflection calculation (Singularity methods / Macauley's method)
            // Deflection formula at x = sqrt((L^2 - b^2)/3) for offset point load
            if (offsetA === span / 2) {
                // center load
                maxDeflection = (loadVal * Math.pow(span, 3) * 1000) / (48 * eGpa * i106);
            } else {
                const longerSeg = offsetA >= b ? offsetA : b;
                const shorterSeg = offsetA >= b ? b : offsetA;
                maxDeflection = (loadVal * shorterSeg * Math.pow(span * span - shorterSeg * shorterSeg, 1.5) * 1000) / (9 * Math.sqrt(3) * eGpa * i106 * span);
            }

            reactionsText = `Reactions: R_A = ${ra.toFixed(1)} kN, R_B = ${rb.toFixed(1)} kN`;
            momentPosText = `Max moment occurs at point of load (x = ${offsetA.toFixed(1)}m)`;
        } else {
            // UDL load over span
            const ra = (loadVal * span) / 2;
            const rb = ra;
            maxShear = ra;
            maxMoment = (loadVal * Math.pow(span, 2)) / 8;
            maxDeflection = (5 * loadVal * Math.pow(span, 4) * 1000) / (384 * eGpa * i106);

            reactionsText = `Reactions: R_A = R_B = ${ra.toFixed(1)} kN`;
            momentPosText = `Max moment occurs at mid-span (x = ${(span / 2).toFixed(1)}m)`;
        }
    } else {
        // Cantilever Beam (Fixed at Left Support x=0, Free at Right Support x=L)
        document.getElementById('beam-visual-label').innerText = 'Cantilever Beam';
        if (loadType === 'point') {
            // Concentrated load P at free end (x=L)
            maxShear = loadVal;
            maxMoment = loadVal * span;
            maxDeflection = (loadVal * Math.pow(span, 3) * 1000) / (3 * eGpa * i106);

            reactionsText = `Fixed Reaction: V_A = ${loadVal.toFixed(1)} kN`;
            momentPosText = `Max moment occurs at fixed support (x = 0)`;
        } else {
            // UDL over cantilever span
            maxShear = loadVal * span;
            maxMoment = (loadVal * Math.pow(span, 2)) / 2;
            maxDeflection = (loadVal * Math.pow(span, 4) * 1000) / (8 * eGpa * i106);

            reactionsText = `Fixed Reaction: V_A = ${maxShear.toFixed(1)} kN`;
            momentPosText = `Max moment occurs at fixed support (x = 0)`;
        }
    }

    // Allowable deflection limit L/325 (standard structural criteria)
    const allowDeflection = (span * 1000) / 325;

    document.getElementById('beam-res-moment').innerHTML = `${maxMoment.toFixed(2)} <span class="result-unit">kNm</span>`;
    document.getElementById('beam-res-shear').innerHTML = `${maxShear.toFixed(2)} <span class="result-unit">kN</span>`;
    document.getElementById('beam-res-deflection').innerHTML = `${maxDeflection.toFixed(2)} <span class="result-unit">mm</span>`;
    document.getElementById('beam-res-reactions').innerText = reactionsText;
    document.getElementById('beam-res-moment-pos').innerText = momentPosText;
    document.getElementById('beam-res-def-limit').innerText = `Allowable Deflection Limit (Span/325): ${allowDeflection.toFixed(1)} mm`;

    drawBeamSVG(span, support, loadType, loadVal, offsetA, maxShear, maxMoment);
}

function drawBeamSVG(span, support, type, load, offsetA, Vmax, Mmax) {
    const svg = document.getElementById('beam-svg');
    svg.innerHTML = ''; // clear

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', 'rgba(0,0,0,0.03)');
    svg.appendChild(bg);

    const startX = 60;
    const endX = 400;
    const beamY = 50;

    // Draw Support boundary conditions
    if (support === 'simply') {
        // Left Pin
        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        pin.setAttribute('points', `${startX},${beamY} ${startX - 8},${beamY + 15} ${startX + 8},${beamY + 15}`);
        pin.setAttribute('fill', 'none');
        pin.setAttribute('stroke', 'var(--text-secondary)');
        pin.setAttribute('stroke-width', '2');
        svg.appendChild(pin);

        // Right Roller
        const roller = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        roller.setAttribute('cx', endX);
        roller.setAttribute('cy', beamY + 6);
        roller.setAttribute('r', '5');
        roller.setAttribute('fill', 'none');
        roller.setAttribute('stroke', 'var(--text-secondary)');
        roller.setAttribute('stroke-width', '2');
        svg.appendChild(roller);

        const rollerBase = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rollerBase.setAttribute('x1', endX - 10);
        rollerBase.setAttribute('y1', beamY + 12);
        rollerBase.setAttribute('x2', endX + 10);
        rollerBase.setAttribute('y2', beamY + 12);
        rollerBase.setAttribute('stroke', 'var(--text-secondary)');
        rollerBase.setAttribute('stroke-width', '2');
        svg.appendChild(rollerBase);
    } else {
        // Cantilever Fixed support wall on Left
        const wall = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        wall.setAttribute('x1', startX);
        wall.setAttribute('y1', beamY - 20);
        wall.setAttribute('x2', startX);
        wall.setAttribute('y2', beamY + 20);
        wall.setAttribute('stroke', 'var(--text-secondary)');
        wall.setAttribute('stroke-width', '4');
        svg.appendChild(wall);

        // Hatching lines for wall
        for (let y = beamY - 18; y < beamY + 20; y += 6) {
            const hatch = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hatch.setAttribute('x1', startX);
            hatch.setAttribute('y1', y);
            hatch.setAttribute('x2', startX - 6);
            hatch.setAttribute('y2', y - 4);
            hatch.setAttribute('stroke', 'var(--text-muted)');
            hatch.setAttribute('stroke-width', '1');
            svg.appendChild(hatch);
        }
    }

    // Draw Beam Axis
    const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    beam.setAttribute('x1', startX);
    beam.setAttribute('y1', beamY);
    beam.setAttribute('x2', endX);
    beam.setAttribute('y2', beamY);
    beam.setAttribute('stroke', 'var(--text-primary)');
    beam.setAttribute('stroke-width', '5');
    svg.appendChild(beam);

    // Draw Loading
    if (type === 'point') {
        const loadX = startX + (offsetA / span) * (endX - startX);
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrow.setAttribute('d', `M ${loadX},15 L ${loadX},44 M ${loadX - 4},38 L ${loadX},44 L ${loadX + 4},38`);
        arrow.setAttribute('stroke', '#ef4444');
        arrow.setAttribute('stroke-width', '3');
        arrow.setAttribute('fill', 'none');
        svg.appendChild(arrow);

        addSVGText(svg, loadX + 6, 25, `${load} kN`, '10px', '#ef4444');
    } else {
        // UDL load arrows
        const udlPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let dStr = '';
        for (let x = startX; x <= endX; x += 15) {
            dStr += `M ${x},25 L ${x},45 M ${x - 3},38 L ${x},45 L ${x + 3},38 `;
        }
        dStr += `M ${startX},25 L ${endX},25`;
        udlPath.setAttribute('d', dStr);
        udlPath.setAttribute('stroke', '#ef4444');
        udlPath.setAttribute('stroke-width', '1.5');
        udlPath.setAttribute('fill', 'none');
        svg.appendChild(udlPath);

        addSVGText(svg, 210, 18, `${load} kN/m`, '10px', '#ef4444');
    }

    // --- SFD (Shear Force Diagram) ---
    const sfdY = 140;
    const sfdBase = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    sfdBase.setAttribute('x1', startX);
    sfdBase.setAttribute('y1', sfdY);
    sfdBase.setAttribute('x2', endX);
    sfdBase.setAttribute('y2', sfdY);
    sfdBase.setAttribute('stroke', 'var(--text-muted)');
    sfdBase.setAttribute('stroke-dasharray', '2,2');
    svg.appendChild(sfdBase);

    const sfdPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    let sfdPoints = '';

    if (support === 'simply') {
        if (type === 'point') {
            const loadX = startX + (offsetA / span) * (endX - startX);
            sfdPoints = `${startX},${sfdY} ${startX},${sfdY - 25} ${loadX},${sfdY - 25} ${loadX},${sfdY + 25} ${endX},${sfdY + 25} ${endX},${sfdY}`;
        } else {
            // Linear diagonal drop
            sfdPoints = `${startX},${sfdY} ${startX},${sfdY - 25} ${endX},${sfdY + 25} ${endX},${sfdY}`;
        }
    } else {
        // Cantilever SFD
        if (type === 'point') {
            sfdPoints = `${startX},${sfdY} ${startX},${sfdY - 30} ${endX},${sfdY - 30} ${endX},${sfdY}`;
        } else {
            sfdPoints = `${startX},${sfdY} ${startX},${sfdY - 30} ${endX},${sfdY} Z`;
        }
    }
    sfdPoly.setAttribute('points', sfdPoints);
    sfdPoly.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
    sfdPoly.setAttribute('stroke', 'var(--accent)');
    sfdPoly.setAttribute('stroke-width', '1.5');
    svg.appendChild(sfdPoly);
    addSVGText(svg, 15, sfdY + 4, 'SFD', '9px');

    // --- BMD (Bending Moment Diagram) ---
    const bmdY = 220;
    const bmdBase = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bmdBase.setAttribute('x1', startX);
    bmdBase.setAttribute('y1', bmdY);
    bmdBase.setAttribute('x2', endX);
    bmdBase.setAttribute('y2', bmdY);
    bmdBase.setAttribute('stroke', 'var(--text-muted)');
    bmdBase.setAttribute('stroke-dasharray', '2,2');
    svg.appendChild(bmdBase);

    const bmdPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let bmdD = '';

    if (support === 'simply') {
        if (type === 'point') {
            const loadX = startX + (offsetA / span) * (endX - startX);
            bmdD = `M ${startX},${bmdY} L ${loadX},${bmdY + 30} L ${endX},${bmdY} Z`;
        } else {
            bmdD = `M ${startX},${bmdY} Q 230,${bmdY + 35} 400,${bmdY} Z`;
        }
    } else {
        // Cantilever BMD is negative (hogging moment)
        if (type === 'point') {
            bmdD = `M ${startX},${bmdY} L ${startX},${bmdY - 35} L ${endX},${bmdY} Z`;
        } else {
            bmdD = `M ${startX},${bmdY} L ${startX},${bmdY - 35} Q 230,${bmdY - 5} 400,${bmdY} Z`;
        }
    }
    bmdPath.setAttribute('d', bmdD);
    bmdPath.setAttribute('fill', 'rgba(16, 185, 129, 0.15)');
    bmdPath.setAttribute('stroke', 'var(--accent-secondary)');
    bmdPath.setAttribute('stroke-width', '1.5');
    svg.appendChild(bmdPath);
    addSVGText(svg, 15, bmdY + 4, 'BMD', '9px');
}

function addBeamToReport() {
    const support = document.getElementById('beam-support-type').value;
    const span = document.getElementById('beam-span').value;
    const loadType = document.querySelector('input[name="beam-load-type"]:checked').value;
    const loadVal = document.getElementById('beam-load-val').value;
    const mom = document.getElementById('beam-res-moment').innerText;
    const shear = document.getElementById('beam-res-shear').innerText;
    const def = document.getElementById('beam-res-deflection').innerText;

    const item = {
        id: Date.now(),
        type: `Structural Analysis (${support.toUpperCase()})`,
        dims: `Span: ${span}m, Load: ${loadVal} ${loadType === 'point' ? 'kN' : 'kN/m'}`,
        details: `Max Moment: ${mom}, Max Shear: ${shear}, Deflection: ${def}`,
        cost: '--'
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Beam analysis added to BOQ successfully!');
}

// -------------------------------------------------------------
// Report Aggregation & Printing (BOQ Builder)
// -------------------------------------------------------------
function saveBOQReport() {
    localStorage.setItem('civil_calc_boq', JSON.stringify(boqReport));
    updateBOQBadge();
}

function updateBOQBadge() {
    document.getElementById('boq-count').innerText = boqReport.length;
}

function renderBOQTable() {
    const tableBody = document.getElementById('boq-table-body');
    const emptyState = document.getElementById('boq-empty-state');
    const container = document.getElementById('boq-container');

    if (boqReport.length === 0) {
        emptyState.style.display = 'block';
        container.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    container.style.display = 'block';
    tableBody.innerHTML = '';

    let serial = 1;
    boqReport.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${serial++}</td>
            <td style="font-weight:700;">${sanitizeHTML(item.type)}</td>
            <td>${sanitizeHTML(item.dims)}</td>
            <td style="color:var(--text-secondary); font-size:0.85rem;">${sanitizeHTML(item.details)}</td>
            <td>
                <div class="boq-actions">
                    <span style="font-weight:700; margin-right: 1.5rem;">${sanitizeHTML(item.cost)}</span>
                    <button class="action-icon-btn" title="Remove item">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;
        const deleteButton = row.querySelector('.action-icon-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => deleteBOQItem(index));
        }
        tableBody.appendChild(row);
    });
}

window.deleteBOQItem = function (index) {
    boqReport.splice(index, 1);
    saveBOQReport();
    renderBOQTable();
    showToast('Item removed from BOQ report!', 'info');
};

function clearBOQReport() {
    if (confirm('Are you sure you want to clear the entire BOQ report?')) {
        boqReport = [];
        saveBOQReport();
        renderBOQTable();
        showToast('All items cleared from BOQ.');
    }
}

// -------------------------------------------------------------
// Helper Structures and Conversions
// -------------------------------------------------------------
const unitDatabase = {
    length: {
        units: {
            m: { name: 'Meters (m)', factor: 1 },
            ft: { name: 'Feet (ft)', factor: 3.280839895 },
            inch: { name: 'Inches (in)', factor: 39.37007874 },
            yard: { name: 'Yards (yd)', factor: 1.093613298 },
            mm: { name: 'Millimeters (mm)', factor: 1000 }
        }
    },
    area: {
        units: {
            sqm: { name: 'Square Meters (m²)', factor: 1 },
            sqft: { name: 'Square Feet (ft²)', factor: 10.76391042 },
            acre: { name: 'Acres', factor: 0.0002471053815 },
            hectare: { name: 'Hectares', factor: 0.0001 },
            bigha: { name: 'Bigha (Standard)', factor: 0.0003953686 }
        }
    },
    volume: {
        units: {
            cum: { name: 'Cubic Meters (m³)', factor: 1 },
            cft: { name: 'Cubic Feet (cft)', factor: 35.31466672 },
            liters: { name: 'Liters (L)', factor: 1000 },
            gallons: { name: 'US Gallons', factor: 264.17205236 }
        }
    },
    weight: {
        units: {
            kg: { name: 'Kilograms (kg)', factor: 1 },
            ton: { name: 'Metric Tons (t)', factor: 0.001 },
            quintal: { name: 'Quintals (q)', factor: 0.01 },
            lbs: { name: 'Pounds (lbs)', factor: 2.20462262 }
        }
    },
    stress: {
        units: {
            mpa: { name: 'Megapascals (MPa)', factor: 1 },
            kpa: { name: 'Kilopascals (kPa)', factor: 1000 },
            psi: { name: 'Pounds per Sq Inch (psi)', factor: 145.03773773 },
            kgcm2: { name: 'kg/cm²', factor: 10.19716213 },
            knm2: { name: 'kN/m²', factor: 1000 }
        }
    },
    density: {
        units: {
            kgm3: { name: 'kg/m³', factor: 1 },
            lbft3: { name: 'lb/ft³', factor: 0.06242796 }
        }
    }
};

function initUnitConverter() {
    updateConverterUnits();
}

function addSVGText(svg, x, y, text, fontSize = '11px', fill = 'var(--text-secondary)') {
    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textNode.setAttribute('x', x);
    textNode.setAttribute('y', y);
    textNode.setAttribute('font-size', fontSize);
    textNode.setAttribute('fill', fill);
    textNode.setAttribute('font-family', 'var(--font-body)');
    textNode.setAttribute('text-anchor', 'middle');
    textNode.textContent = text;
    svg.appendChild(textNode);
}

// -------------------------------------------------------------
// 7. Bar Bending Schedule (BBS) Suite
// -------------------------------------------------------------
function initBBS() {
    toggleBBSInputs();
    renderBBSTable();
}

function toggleBBSInputs() {
    const shape = document.getElementById('bbs-shape-type').value;

    // Hide all
    document.getElementById('bbs-shape-straight-inputs').style.display = 'none';
    document.getElementById('bbs-shape-l-inputs').style.display = 'none';
    document.getElementById('bbs-shape-cranked-inputs').style.display = 'none';
    document.getElementById('bbs-shape-stirrup-rect-inputs').style.display = 'none';
    document.getElementById('bbs-shape-stirrup-circ-inputs').style.display = 'none';

    // Show selected
    if (shape === 'straight') {
        document.getElementById('bbs-shape-straight-inputs').style.display = 'block';
    } else if (shape === 'bend-l') {
        document.getElementById('bbs-shape-l-inputs').style.display = 'block';
    } else if (shape === 'cranked') {
        document.getElementById('bbs-shape-cranked-inputs').style.display = 'block';
    } else if (shape === 'stirrup-rect') {
        document.getElementById('bbs-shape-stirrup-rect-inputs').style.display = 'block';
    } else if (shape === 'stirrup-circ') {
        document.getElementById('bbs-shape-stirrup-circ-inputs').style.display = 'block';
    }

    calculateLiveBBS();
}

function calculateLiveBBS() {
    const shape = document.getElementById('bbs-shape-type').value;
    const dia = parseFloat(document.getElementById('bbs-dia').value) || 12;
    const numMembers = parseInt(document.getElementById('bbs-num-members').value) || 1;
    const numBars = parseInt(document.getElementById('bbs-num-bars').value) || 1;

    let cuttingLen = 0; // in meters
    const d = dia / 1000; // dia in meters

    if (shape === 'straight') {
        const length = parseFloat(document.getElementById('bbs-len-straight').value) || 0;
        const includeHooks = document.getElementById('bbs-straight-hooks').checked;
        // 180-degree hooks add 9d each side (+18d total)
        cuttingLen = length + (includeHooks ? 18 * d : 0);
    } else if (shape === 'bend-l') {
        const a = parseFloat(document.getElementById('bbs-len-l-a').value) || 0;
        const b = parseFloat(document.getElementById('bbs-len-l-b').value) || 0;
        // L-Bend has one 90-degree bend deduction of 2d
        cuttingLen = a + b - (2 * d);
    } else if (shape === 'cranked') {
        const l = parseFloat(document.getElementById('bbs-len-crank-l').value) || 0;
        const h = parseFloat(document.getElementById('bbs-len-crank-h').value) || 0;
        const cover = (parseFloat(document.getElementById('bbs-len-crank-cover').value) || 0) / 1000;
        const doubleCrank = document.getElementById('bbs-crank-double').checked;

        // Effective depth height for cranked rebar
        const hEff = h - 2 * cover - d;
        const crankAdd = doubleCrank ? 2 * 0.42 * hEff : 0.42 * hEff;

        // standard cranked rebar has 180 deg hooks (+18d) and clear cover subtracted from both ends
        cuttingLen = l - 2 * cover + crankAdd + (18 * d);
    } else if (shape === 'stirrup-rect') {
        const width = parseFloat(document.getElementById('bbs-stirrup-b').value) || 0;
        const depth = parseFloat(document.getElementById('bbs-stirrup-d').value) || 0;
        const cover = (parseFloat(document.getElementById('bbs-stirrup-cover').value) || 0) / 1000;

        // core dimensions of stirrup
        const a = width - 2 * cover;
        const b = depth - 2 * cover;

        // Cutting length = 2*(a+b) + 24d (standard 135 deg hook addition and bend deductions included)
        cuttingLen = 2 * (a + b) + (24 * d);
    } else if (shape === 'stirrup-circ') {
        const colDia = parseFloat(document.getElementById('bbs-stirrup-circ-dia').value) || 0;
        const cover = (parseFloat(document.getElementById('bbs-stirrup-circ-cover').value) || 0) / 1000;

        // core diameter of stirrup
        const coreD = colDia - 2 * cover - d;
        // Cutting length = pi * coreD + 24d
        cuttingLen = Math.PI * coreD + (24 * d);
    }

    if (cuttingLen < 0) cuttingLen = 0;

    const totalCount = numMembers * numBars;
    const totalLength = totalCount * cuttingLen;

    // steel unit weight formula = D^2 / 162 kg/m (Standard IS Code rebar weight formula)
    const unitWeight = (dia * dia) / 162;
    const totalWeight = totalLength * unitWeight;

    // Update UI Summary Panel
    document.getElementById('bbs-calc-cutting-len').innerText = `${cuttingLen.toFixed(3)} m`;
    document.getElementById('bbs-calc-total-count').innerText = totalCount;
    document.getElementById('bbs-calc-total-length').innerText = `${totalLength.toFixed(2)} m`;
    document.getElementById('bbs-calc-total-weight').innerText = `${totalWeight.toFixed(2)} kg`;

    drawBBSShapeSVG(shape, cuttingLen, dia);
}

function drawBBSShapeSVG(shape, cuttingLen, dia) {
    const svg = document.getElementById('bbs-shape-svg');
    svg.innerHTML = ''; // clear

    // Grid Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', 'rgba(0,0,0,0.03)');
    svg.appendChild(bg);

    const strokeColor = 'var(--accent-tertiary)';
    const strokeWidth = '3.5';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    if (shape === 'straight') {
        const includeHooks = document.getElementById('bbs-straight-hooks').checked;
        if (includeHooks) {
            path.setAttribute('d', 'M 80,95 L 80,85 L 340,85 L 340,95');
        } else {
            path.setAttribute('d', 'M 80,85 L 340,85');
        }
        svg.appendChild(path);

        // Length text
        const lenVal = parseFloat(document.getElementById('bbs-len-straight').value) || 0;
        addSVGText(svg, 210, 75, `L = ${lenVal.toFixed(2)}m`, '12px');
        addSVGText(svg, 210, 110, includeHooks ? 'Straight Bar with 180° Hooks' : 'Straight Profile', '10px', 'var(--text-muted)');
    } else if (shape === 'bend-l') {
        path.setAttribute('d', 'M 100,50 L 100,120 L 320,120');
        svg.appendChild(path);

        const a = parseFloat(document.getElementById('bbs-len-l-a').value) || 0;
        const b = parseFloat(document.getElementById('bbs-len-l-b').value) || 0;
        addSVGText(svg, 210, 138, `Horiz. A = ${a.toFixed(2)}m`, '11px');
        addSVGText(svg, 80, 85, `Vert. B = ${b.toFixed(2)}m`, '11px');
    } else if (shape === 'cranked') {
        const doubleCrank = document.getElementById('bbs-crank-double').checked;
        if (doubleCrank) {
            path.setAttribute('d', 'M 60,110 L 130,110 L 170,75 L 260,75 L 300,110 L 370,110');
        } else {
            path.setAttribute('d', 'M 60,110 L 170,110 L 210,75 L 370,75');
        }
        svg.appendChild(path);

        const l = parseFloat(document.getElementById('bbs-len-crank-l').value) || 0;
        addSVGText(svg, 215, 60, `Span L = ${l.toFixed(2)}m`, '12px');
        addSVGText(svg, 215, 130, doubleCrank ? 'Double 45° Bent-up Crank' : 'Single 45° Bent-up Crank', '10px', 'var(--text-muted)');
    } else if (shape === 'stirrup-rect') {
        path.setAttribute('d', 'M 140,50 L 280,50 L 280,130 L 140,130 Z M 140,130 L 125,140 M 140,130 L 145,145');
        svg.appendChild(path);

        const w = parseFloat(document.getElementById('bbs-stirrup-b').value) || 0;
        const d = parseFloat(document.getElementById('bbs-stirrup-d').value) || 0;
        addSVGText(svg, 210, 42, `Width = ${w.toFixed(2)}m`, '11px');
        addSVGText(svg, 315, 95, `Depth = ${d.toFixed(2)}m`, '11px');
        addSVGText(svg, 210, 155, 'Rectangular Stirrup (with 135° Hooks)', '10px', 'var(--text-muted)');
    } else if (shape === 'stirrup-circ') {
        const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circ.setAttribute('cx', '210');
        circ.setAttribute('cy', '90');
        circ.setAttribute('r', '45');
        circ.setAttribute('fill', 'none');
        circ.setAttribute('stroke', strokeColor);
        circ.setAttribute('stroke-width', strokeWidth);
        svg.appendChild(circ);

        // hooks overlapping lines
        const hooksPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hooksPath.setAttribute('d', 'M 210,45 L 200,32 M 210,45 L 220,32');
        hooksPath.setAttribute('fill', 'none');
        hooksPath.setAttribute('stroke', strokeColor);
        hooksPath.setAttribute('stroke-width', strokeWidth);
        svg.appendChild(hooksPath);

        const colDia = parseFloat(document.getElementById('bbs-stirrup-circ-dia').value) || 0;
        addSVGText(svg, 210, 95, `Dia = ${colDia.toFixed(2)}m`, '11px');
        addSVGText(svg, 210, 155, 'Circular Column Spiral/Stirrup', '10px', 'var(--text-muted)');
    }
}

function addBBSItem() {
    const member = sanitizeHTML(document.getElementById('bbs-member').value.trim()) || 'Beam B1';
    const mark = sanitizeHTML(document.getElementById('bbs-mark').value.trim()) || 'Main Steel';
    const shape = document.getElementById('bbs-shape-type').value;
    const dia = parseInt(document.getElementById('bbs-dia').value) || 12;
    const numMembers = parseInt(document.getElementById('bbs-num-members').value) || 1;
    const numBars = parseInt(document.getElementById('bbs-num-bars').value) || 1;

    // Calculate cutting length
    const d = dia / 1000;
    let cuttingLen = 0;

    if (shape === 'straight') {
        const length = parseFloat(document.getElementById('bbs-len-straight').value) || 0;
        const includeHooks = document.getElementById('bbs-straight-hooks').checked;
        cuttingLen = length + (includeHooks ? 18 * d : 0);
    } else if (shape === 'bend-l') {
        const a = parseFloat(document.getElementById('bbs-len-l-a').value) || 0;
        const b = parseFloat(document.getElementById('bbs-len-l-b').value) || 0;
        cuttingLen = a + b - (2 * d);
    } else if (shape === 'cranked') {
        const l = parseFloat(document.getElementById('bbs-len-crank-l').value) || 0;
        const h = parseFloat(document.getElementById('bbs-len-crank-h').value) || 0;
        const cover = (parseFloat(document.getElementById('bbs-len-crank-cover').value) || 0) / 1000;
        const doubleCrank = document.getElementById('bbs-crank-double').checked;
        const hEff = h - 2 * cover - d;
        const crankAdd = doubleCrank ? 2 * 0.42 * hEff : 0.42 * hEff;
        cuttingLen = l - 2 * cover + crankAdd + (18 * d);
    } else if (shape === 'stirrup-rect') {
        const width = parseFloat(document.getElementById('bbs-stirrup-b').value) || 0;
        const depth = parseFloat(document.getElementById('bbs-stirrup-d').value) || 0;
        const cover = (parseFloat(document.getElementById('bbs-stirrup-cover').value) || 0) / 1000;
        const a = width - 2 * cover;
        const b = depth - 2 * cover;
        cuttingLen = 2 * (a + b) + (24 * d);
    } else if (shape === 'stirrup-circ') {
        const colDia = parseFloat(document.getElementById('bbs-stirrup-circ-dia').value) || 0;
        const cover = (parseFloat(document.getElementById('bbs-stirrup-circ-cover').value) || 0) / 1000;
        const coreD = colDia - 2 * cover - d;
        cuttingLen = Math.PI * coreD + (24 * d);
    }

    if (cuttingLen < 0) cuttingLen = 0;

    const totalBars = numMembers * numBars;
    const totalLength = totalBars * cuttingLen;
    // Standard rebar nominal unit weight formula D^2 / 162
    const unitWeight = (dia * dia) / 162;
    const totalWeight = totalLength * unitWeight;

    const item = {
        id: Date.now(),
        member: member,
        mark: mark,
        shape: shape,
        dia: dia,
        numMembers: numMembers,
        numBars: numBars,
        totalBars: totalBars,
        cuttingLen: cuttingLen,
        totalLength: totalLength,
        totalWeight: totalWeight
    };

    bbsList.push(item);
    saveBBSList();
    renderBBSTable();
    showToast('Rebar added to Bar Bending Schedule successfully!');
}

function saveBBSList() {
    localStorage.setItem('civil_calc_bbs', JSON.stringify(bbsList));
}

window.deleteBBSItem = function (index) {
    bbsList.splice(index, 1);
    saveBBSList();
    renderBBSTable();
    showToast('Rebar item removed from BBS.', 'info');
};

function clearBBSSchedule() {
    if (confirm('Are you sure you want to clear the entire Bar Bending Schedule?')) {
        bbsList = [];
        saveBBSList();
        renderBBSTable();
        showToast('All schedule items cleared.');
    }
}

function resetBBSForm() {
    document.getElementById('bbs-member').value = 'Beam B1';
    document.getElementById('bbs-mark').value = 'Main Bottom Bars';
    document.getElementById('bbs-dia').value = '12';
    document.getElementById('bbs-shape-type').value = 'straight';
    document.getElementById('bbs-len-straight').value = '4.5';
    document.getElementById('bbs-straight-hooks').checked = false;
    document.getElementById('bbs-len-l-a').value = '3.5';
    document.getElementById('bbs-len-l-b').value = '0.5';
    document.getElementById('bbs-len-crank-l').value = '5.0';
    document.getElementById('bbs-len-crank-h').value = '0.15';
    document.getElementById('bbs-len-crank-cover').value = '20';
    document.getElementById('bbs-crank-double').checked = true;
    document.getElementById('bbs-stirrup-b').value = '0.3';
    document.getElementById('bbs-stirrup-d').value = '0.45';
    document.getElementById('bbs-stirrup-cover').value = '25';
    document.getElementById('bbs-stirrup-circ-dia').value = '0.45';
    document.getElementById('bbs-stirrup-circ-cover').value = '40';
    document.getElementById('bbs-num-members').value = '1';
    document.getElementById('bbs-num-bars').value = '4';

    toggleBBSInputs();
}

function renderBBSTable() {
    const tableBody = document.getElementById('bbs-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (bbsList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--text-secondary); padding: 2rem;">No rebar specifications in schedule. Add items using the form above.</td></tr>`;
        updateBBSSummaries();
        return;
    }

    bbsList.forEach((item, index) => {
        // shape icon mini SVG
        let shapeIcon = '';
        if (item.shape === 'straight') {
            shapeIcon = `<svg width="40" height="20" style="stroke:var(--accent-tertiary); stroke-width:2; fill:none;"><line x1="5" y1="10" x2="35" y2="10"></line></svg>`;
        } else if (item.shape === 'bend-l') {
            shapeIcon = `<svg width="40" height="20" style="stroke:var(--accent-tertiary); stroke-width:2; fill:none;"><polyline points="10,5 10,15 30,15"></polyline></svg>`;
        } else if (item.shape === 'cranked') {
            shapeIcon = `<svg width="40" height="20" style="stroke:var(--accent-tertiary); stroke-width:1.5; fill:none;"><path d="M5,15 L12,15 L18,7 L26,7 L32,15 L38,15"></path></svg>`;
        } else if (item.shape === 'stirrup-rect') {
            shapeIcon = `<svg width="40" height="20" style="stroke:var(--accent-tertiary); stroke-width:1.5; fill:none;"><rect x="10" y="3" width="20" height="14"></rect><line x1="8" y1="17" x2="10" y2="15"></line></svg>`;
        } else if (item.shape === 'stirrup-circ') {
            shapeIcon = `<svg width="40" height="20" style="stroke:var(--accent-tertiary); stroke-width:1.5; fill:none;"><circle cx="20" cy="10" r="7"></circle><line x1="20" y1="3" x2="23" y2="0"></line></svg>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Item No.">#${index + 1}</td>
            <td data-label="Member" style="font-weight:700;">${sanitizeHTML(item.member)}</td>
            <td data-label="Description">${sanitizeHTML(item.mark)}</td>
            <td data-label="Shape" class="bbs-shape-td">${shapeIcon}</td>
            <td data-label="Dia" class="bbs-dia-td"><strong>${item.dia}</strong> mm</td>
            <td data-label="No. of Members">${item.numMembers}</td>
            <td data-label="No. of Bars">${item.numBars}</td>
            <td data-label="Total Bars">${item.totalBars}</td>
            <td data-label="Cutting L">${item.cuttingLen.toFixed(3)} m</td>
            <td data-label="Total L">${item.totalLength.toFixed(2)} m</td>
            <td data-label="Weight" class="bbs-weight-td" style="color:var(--accent-tertiary); font-weight:700;">${item.totalWeight.toFixed(2)} kg</td>
            <td data-label="Action">
                <button class="action-icon-btn" title="Delete rebar">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        const deleteButton = row.querySelector('.action-icon-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => deleteBBSItem(index));
        }
        tableBody.appendChild(row);
    });

    updateBBSSummaries();
}

function updateBBSSummaries() {
    const diaCards = document.getElementById('bbs-dia-summary-cards');
    if (!diaCards) return;

    // initialize totals by diameter
    const totals = {
        8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0, 32: 0
    };

    let grandWeight = 0;

    bbsList.forEach(item => {
        const dia = item.dia;
        if (totals[dia] !== undefined) {
            totals[dia] += item.totalWeight;
        } else {
            totals[dia] = item.totalWeight;
        }
        grandWeight += item.totalWeight;
    });

    diaCards.innerHTML = '';

    const marketRate = 65; // ₹65 per kg standard steel price
    const grandCost = Math.round(grandWeight * marketRate);

    // render summaries
    for (let key in totals) {
        const wt = totals[key];
        const cost = Math.round(wt * marketRate);

        const card = document.createElement('div');
        card.className = 'dashboard-card';
        card.style.cursor = 'default';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <span style="font-weight:700; color:var(--accent-tertiary); font-size:1.1rem;">Φ ${key} mm</span>
                <span style="font-size:0.8rem; opacity:0.6;">Rate: ₹${marketRate}/kg</span>
            </div>
            <div style="margin-top: 0.75rem;">
                <h3 style="font-size:1.35rem; font-family:var(--font-heading); margin-bottom: 0.25rem;">${wt.toFixed(1)} kg</h3>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">Cost: ₹${cost.toLocaleString('en-IN')}</p>
            </div>
        `;
        diaCards.appendChild(card);
    }

    document.getElementById('bbs-grand-weight').innerText = `${grandWeight.toFixed(2)} kg`;
    document.getElementById('bbs-grand-cost').innerText = `₹${grandCost.toLocaleString('en-IN')}`;
}

function addBBSSteelToBOQ() {
    if (bbsList.length === 0) {
        showToast('Bar Bending Schedule is empty! Add rebar items first.', 'error');
        return;
    }

    let grandWeight = 0;
    bbsList.forEach(item => grandWeight += item.totalWeight);

    const marketRate = 65; // ₹65 per kg
    const grandCostVal = Math.round(grandWeight * marketRate);

    const item = {
        id: Date.now(),
        type: 'Steel Reinforcement (BBS Schedule)',
        dims: `${bbsList.length} Rebar Schedule Items`,
        details: `Total Weight: ${grandWeight.toFixed(2)} kg of steel (across various diameters)`,
        cost: '₹' + grandCostVal.toLocaleString('en-IN')
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Bar Bending Schedule total steel added to BOQ report!');
}

// -------------------------------------------------------------
// Water-Cement & Mix Design Calculator Functions
// -------------------------------------------------------------
function updateDefaultSteelPercent() {
    const classTypeSelect = document.getElementById('concrete-class-type');
    if (!classTypeSelect) return;
    const classType = classTypeSelect.value;
    const type = document.getElementById('concrete-type').value;
    const steelInput = document.getElementById('concrete-steel-percent');
    if (steelInput) {
        if (classType !== 'rcc') {
            return;
        }
        if (type === 'slab') steelInput.value = '1.0';
        else if (type === 'beam') steelInput.value = '2.0';
        else if (type === 'column-rect' || type === 'column-circ') steelInput.value = '2.5';
        else if (type === 'footing-rect' || type === 'footing-trap') steelInput.value = '0.8';
    }
}

function calculateWaterCement() {
    const grade = document.getElementById('wc-concrete-grade').value;
    const concreteType = document.getElementById('wc-concrete-type').value;
    const exposure = document.getElementById('wc-exposure').value;
    const aggSize = document.getElementById('wc-aggregate-size').value;
    const slump = parseFloat(document.getElementById('wc-slump').value);
    const aggShape = document.getElementById('wc-aggregate-shape').value;
    const admixture = document.getElementById('wc-admixture').value;
    const jobVol = parseFloat(document.getElementById('wc-job-volume').value) || 1.0;
    const wcOverride = parseFloat(document.getElementById('wc-ratio-override').value);

    // 1. Grade fck
    let fck = 20;
    if (grade === 'M15') fck = 15;
    else if (grade === 'M20') fck = 20;
    else if (grade === 'M25') fck = 25;
    else if (grade === 'M30') fck = 30;
    else if (grade === 'M35') fck = 35;
    else if (grade === 'M40') fck = 40;

    // 2. Standard Deviation S (IS 10262 Table 1)
    let S = 4.0;
    if (grade === 'M15') S = 3.5;
    else if (grade === 'M20' || grade === 'M25') S = 4.0;
    else if (grade === 'M30' || grade === 'M35' || grade === 'M40') S = 5.0;

    // Target mean strength f'ck = fck + 1.65 S
    const fckTarget = fck + 1.65 * S;

    // 3. Durability Durations (IS 456 Table 5 limits)
    let codeMaxWc = 0.50;
    let minCement = 300; // RCC moderate default

    if (concreteType === 'rcc') {
        if (exposure === 'mild') { codeMaxWc = 0.55; minCement = 300; }
        else if (exposure === 'moderate') { codeMaxWc = 0.50; minCement = 300; }
        else if (exposure === 'severe') { codeMaxWc = 0.45; minCement = 320; }
        else if (exposure === 'verysevere') { codeMaxWc = 0.45; minCement = 340; }
        else if (exposure === 'extreme') { codeMaxWc = 0.40; minCement = 360; }
    } else { // PCC
        if (exposure === 'mild') { codeMaxWc = 0.60; minCement = 220; }
        else if (exposure === 'moderate') { codeMaxWc = 0.60; minCement = 240; }
        else if (exposure === 'severe') { codeMaxWc = 0.50; minCement = 250; }
        else if (exposure === 'verysevere') { codeMaxWc = 0.45; minCement = 260; }
        else if (exposure === 'extreme') { codeMaxWc = 0.40; minCement = 280; }
    }

    // Design target W/C ratio based on target strength
    // Standard empirical approximation curve: W/C = 1.05 - 0.02 * f'ck
    let designWc = 1.05 - 0.02 * fckTarget;
    designWc = Math.max(0.35, Math.min(0.60, designWc));

    // Final chosen W/C (lesser of design or durability max limit)
    let selectedWc = Math.min(designWc, codeMaxWc);

    // Apply manual override if provided
    if (!isNaN(wcOverride) && wcOverride >= 0.25 && wcOverride <= 0.80) {
        selectedWc = wcOverride;
    }

    // 4. Base Water Content (IS 10262 for 25-50mm slump)
    let baseWater = 186; // 20mm default
    if (aggSize === '10') baseWater = 208;
    else if (aggSize === '20') baseWater = 186;
    else if (aggSize === '40') baseWater = 165;

    // Slump Adjustment (+3% for every 25mm above 50mm)
    let slumpAdj = 0;
    if (slump === 75) slumpAdj = 0.03;
    else if (slump === 100) slumpAdj = 0.06;
    else if (slump === 150) slumpAdj = 0.12;

    let waterWithSlump = baseWater * (1 + slumpAdj);

    // Aggregate Shape Adjustment
    let shapeAdj = 0;
    if (aggShape === 'subangular') shapeAdj = -10;
    else if (aggShape === 'gravel') shapeAdj = -15;
    else if (aggShape === 'rounded') shapeAdj = -20;

    let waterWithShape = waterWithSlump + shapeAdj;

    // Chemical Admixture Reduction
    let admixReduction = 0;
    if (admixture === 'plasticizer') admixReduction = 0.08;
    else if (admixture === 'superplasticizer') admixReduction = 0.25;

    let finalWater = waterWithShape * (1 - admixReduction);

    // 5. Cement Weight
    let finalCement = finalWater / selectedWc;
    let minCementApplied = false;
    if (finalCement < minCement) {
        finalCement = minCement;
        minCementApplied = true;
    }

    // Capping maximum cement at 450 kg/m3 as per IS 456 to avoid shrinkage cracks
    if (finalCement > 450) {
        finalCement = 450;
    }

    // 6. Job total calculations
    const jobCementKg = finalCement * jobVol;
    const jobCementBags = Math.ceil(jobCementKg / 50);
    const jobWater = finalWater * jobVol;

    // Estimate Sand & Aggregates based on nominal mix proportions of the concrete grade
    // Nominal mix proportions as per IS 456 guidelines
    let cRatio = 1, sRatio = 1.5, aRatio = 3; // default M20
    if (grade === 'M15') { cRatio = 1; sRatio = 2; aRatio = 4; }
    else if (grade === 'M20') { cRatio = 1; sRatio = 1.5; aRatio = 3; }
    else if (grade === 'M25') { cRatio = 1; sRatio = 1; aRatio = 2; }
    else if (grade === 'M30') { cRatio = 1; sRatio = 0.75; aRatio = 1.5; }
    else if (grade === 'M35') { cRatio = 1; sRatio = 0.6; aRatio = 1.2; }
    else if (grade === 'M40') { cRatio = 1; sRatio = 0.5; aRatio = 1.0; }

    // Sand and Aggregate volumes calculation.
    // Nominal mix ratios are by volume. Bulk density of cement is 1440 kg/m³.
    // Therefore, cement volume = cement mass / 1440.
    // Fine Sand volume (m³) = cement volume * sand ratio.
    // Coarse Aggregate volume (m³) = cement volume * aggregate ratio.
    const jobSandM3 = (jobCementKg / 1440) * sRatio;
    const jobSandCft = jobSandM3 * 35.31466672;
    const jobAggM3 = (jobCementKg / 1440) * aRatio;
    const jobAggCft = jobAggM3 * 35.31466672;

    // Update UI Elements
    document.getElementById('wc-res-target-strength').innerHTML = `${fckTarget.toFixed(1)} <span class="result-unit">N/mm²</span>`;
    document.getElementById('wc-res-fck-base').innerText = `Standard Deviation S = ${S} MPa (IS 10262)`;
    document.getElementById('wc-res-wc-ratio').innerText = selectedWc.toFixed(2);
    document.getElementById('wc-res-wc-code').innerText = `Code Max: ${codeMaxWc.toFixed(2)} (${concreteType.toUpperCase()}, ${exposure.toUpperCase()})`;
    document.getElementById('wc-res-water-m3').innerHTML = `${finalWater.toFixed(1)} <span class="result-unit">Liters</span>`;
    document.getElementById('wc-res-water-adj').innerText = `Base: ${baseWater}L | Admixture: ${admixture !== 'none' ? admixture : 'None'}`;
    document.getElementById('wc-res-cement-m3').innerHTML = `${Math.round(finalCement)} <span class="result-unit">kg</span>`;
    document.getElementById('wc-res-cement-code').innerText = `${minCementApplied ? 'Min Limit Applied: ' : 'Required Min: '}${minCement} kg/m³`;
    document.getElementById('wc-res-job-summary').innerText = `Cement: ${jobCementBags} Bags (~${Math.round(jobCementKg)} kg) | Water: ${Math.round(jobWater)} Liters`;
    document.getElementById('wc-res-job-sand-agg').innerText = `Sand: ~${jobSandM3.toFixed(2)} m³ (${jobSandCft.toFixed(1)} cft) | Coarse Agg: ~${jobAggM3.toFixed(2)} m³ (${jobAggCft.toFixed(1)} cft)`;
}

function resetWCForm() {
    document.getElementById('wc-concrete-grade').value = 'M20';
    document.getElementById('wc-concrete-type').value = 'rcc';
    document.getElementById('wc-exposure').value = 'moderate';
    document.getElementById('wc-aggregate-size').value = '20';
    document.getElementById('wc-slump').value = '75';
    document.getElementById('wc-aggregate-shape').value = 'angular';
    document.getElementById('wc-admixture').value = 'none';
    document.getElementById('wc-job-volume').value = '1.0';
    document.getElementById('wc-ratio-override').value = '';
    calculateWaterCement();
    showToast('Parameters reset to default!', 'info');
}

function addWaterCementToBOQ() {
    const grade = document.getElementById('wc-concrete-grade').value;
    const type = document.getElementById('wc-concrete-type').value;
    const vol = parseFloat(document.getElementById('wc-job-volume').value) || 1.0;
    const summary = document.getElementById('wc-res-job-summary').innerText;
    const sandAgg = document.getElementById('wc-res-job-sand-agg').innerText;
    const wcRatioStr = document.getElementById('wc-res-wc-ratio').innerText;

    // Cost estimation calculation for BOQ
    const cementBagsMatch = summary.match(/Cement:\s*(\d+)\s*Bags/);
    const cementBags = cementBagsMatch ? parseInt(cementBagsMatch[1]) : 0;
    const costCement = cementBags * 450; // ₹450 per bag
    const costSandAgg = vol * 2800; // ₹2800 per m3 for sand and aggregates
    const totalCostVal = Math.round(costCement + costSandAgg);

    const item = {
        id: Date.now(),
        type: `Concrete Mix Design (${grade}) - ${type.toUpperCase()}`,
        dims: `Volume: ${vol.toFixed(2)} m³ (Design W/C: ${wcRatioStr})`,
        details: `${summary}, ${sandAgg}`,
        cost: '₹' + totalCostVal.toLocaleString('en-IN')
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Mix Design materials added to BOQ report!');
}

function exportBBSToCSV() {
    if (bbsList.length === 0) {
        showToast('No BBS items to export!', 'error');
        return;
    }
    let csv = 'Member,Bar Mark,Shape,Diameter (mm),No. of Members,No. of Bars,Total Bars,Cutting Length (m),Total Length (m),Total Weight (kg)\n';
    bbsList.forEach(item => {
        csv += `"${item.member}","${item.mark}","${item.shape}",${item.dia},${item.numMembers},${item.numBars},${item.totalBars},${item.cuttingLen.toFixed(2)},${item.totalLength.toFixed(2)},${item.totalWeight.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `BBS_Schedule_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('BBS Schedule exported to CSV successfully!');
}

function exportBOQToCSV() {
    if (boqReport.length === 0) {
        showToast('No BOQ items to export!', 'error');
        return;
    }
    let csv = 'S.No.,Item Description,Dimensions/Parameters,Material Details,Estimated Cost\n';
    let serial = 1;
    boqReport.forEach(item => {
        csv += `${serial++},"${item.type}","${item.dims}","${item.details}","${item.cost}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `BOQ_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('BOQ Report exported to CSV successfully!');
}

function exportBOQToExcel() {
    if (boqReport.length === 0) {
        showToast('No BOQ items to export!', 'error');
        return;
    }
    
    let html = `
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            table { border-collapse: collapse; font-family: sans-serif; }
            th { background-color: #f2f2f2; border: 1px solid #dddddd; padding: 8px; font-weight: bold; }
            td { border: 1px solid #dddddd; padding: 8px; }
            .header { font-size: 16px; font-weight: bold; padding: 10px 0; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">Structo Civil Estimator - Bill of Quantities (BOQ)</div>
        <table>
            <thead>
                <tr>
                    <th>S.No.</th>
                    <th>Item Description</th>
                    <th>Dimensions / Specifications</th>
                    <th>Quantities & Material Breakup</th>
                    <th>Estimated Cost</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let serial = 1;
    boqReport.forEach(item => {
        html += `
            <tr>
                <td style="text-align:center;">${serial++}</td>
                <td>${item.type}</td>
                <td>${item.dims}</td>
                <td>${item.details}</td>
                <td>${item.cost}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `BOQ_Report_${new Date().toISOString().slice(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('BOQ Report exported to Excel successfully!');
}

function exportBBSToExcel() {
    if (bbsList.length === 0) {
        showToast('No BBS items to export!', 'error');
        return;
    }
    
    let html = `
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            table { border-collapse: collapse; font-family: sans-serif; }
            th { background-color: #f2f2f2; border: 1px solid #dddddd; padding: 8px; font-weight: bold; }
            td { border: 1px solid #dddddd; padding: 8px; }
            .header { font-size: 16px; font-weight: bold; padding: 10px 0; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">Structo Civil Estimator - Bar Bending Schedule (BBS)</div>
        <table>
            <thead>
                <tr>
                    <th>S.No.</th>
                    <th>Member</th>
                    <th>Description</th>
                    <th>Shape</th>
                    <th>Diameter (mm)</th>
                    <th>No. of Members</th>
                    <th>No. of Bars</th>
                    <th>Total Bars</th>
                    <th>Cutting Length (m)</th>
                    <th>Total Length (m)</th>
                    <th>Weight (kg)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    bbsList.forEach((item, index) => {
        html += `
            <tr>
                <td style="text-align:center;">#${index + 1}</td>
                <td>${item.member}</td>
                <td>${item.mark}</td>
                <td>${item.shape}</td>
                <td style="text-align:center;">${item.dia}</td>
                <td style="text-align:center;">${item.numMembers}</td>
                <td style="text-align:center;">${item.numBars}</td>
                <td style="text-align:center;">${item.totalBars}</td>
                <td style="text-align:right;">${item.cuttingLen.toFixed(3)} m</td>
                <td style="text-align:right;">${item.totalLength.toFixed(2)} m</td>
                <td style="text-align:right; font-weight:bold;">${item.totalWeight.toFixed(2)} kg</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `BBS_Schedule_${new Date().toISOString().slice(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('BBS Schedule exported to Excel successfully!');
}

function printBBS() {
    if (bbsList.length === 0) {
        showToast('No BBS items to print!', 'error');
        return;
    }
    const bbsTab = document.getElementById('bbs');
    if (!bbsTab) return;
    const oldTitle = document.title;
    document.title = "Structo_Bar_Bending_Schedule_" + new Date().toISOString().slice(0, 10);
    
    bbsTab.classList.add('print-active');
    window.print();
    bbsTab.classList.remove('print-active');
    document.title = oldTitle;
}

function drawConcreteInputHelper() {
    const type = document.getElementById('concrete-type').value;
    const container = document.getElementById('concrete-input-helper-container');
    if (!container) return;
    container.innerHTML = '';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 240 140');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = 'rgba(255, 255, 255, 0.02)';
    svg.style.borderRadius = '4px';

    if (type === 'slab') {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        p.setAttribute('points', '40,80 120,40 200,60 120,100');
        p.setAttribute('fill', 'rgba(6, 182, 212, 0.1)');
        p.setAttribute('stroke', 'var(--accent)');
        p.setAttribute('stroke-width', '1.5');
        svg.appendChild(p);

        const side1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        side1.setAttribute('points', '40,80 120,100 120,115 40,95');
        side1.setAttribute('fill', 'rgba(6, 182, 212, 0.2)');
        side1.setAttribute('stroke', 'var(--accent)');
        side1.setAttribute('stroke-width', '1.5');
        svg.appendChild(side1);

        const side2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        side2.setAttribute('points', '120,100 200,60 200,75 120,115');
        side2.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        side2.setAttribute('stroke', 'var(--accent)');
        side2.setAttribute('stroke-width', '1.5');
        svg.appendChild(side2);

        addSVGText(svg, 75, 95, 'Width (W)', '10px');
        addSVGText(svg, 165, 85, 'Length (L)', '10px');
        addSVGText(svg, 75, 115, 'Thickness (T)', '9px', 'var(--accent-tertiary)');
    } else if (type === 'beam') {
        const beam = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        beam.setAttribute('x', '30');
        beam.setAttribute('y', '50');
        beam.setAttribute('width', '180');
        beam.setAttribute('height', '40');
        beam.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        beam.setAttribute('stroke', 'var(--accent)');
        beam.setAttribute('stroke-width', '1.5');
        svg.appendChild(beam);

        addSVGText(svg, 120, 43, 'Length (L)', '10px');
        addSVGText(svg, 220, 70, 'Depth (D)', '10px');
        addSVGText(svg, 120, 75, 'Width (B)', '9px', 'var(--accent-tertiary)');
    } else if (type === 'column') {
        const col = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        col.setAttribute('x', '80');
        col.setAttribute('y', '20');
        col.setAttribute('width', '50');
        col.setAttribute('height', '100');
        col.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        col.setAttribute('stroke', 'var(--accent)');
        col.setAttribute('stroke-width', '1.5');
        svg.appendChild(col);

        addSVGText(svg, 50, 75, 'Height (H)', '10px');
        addSVGText(svg, 105, 130, 'Width (B)', '9px', 'var(--accent-tertiary)');
        addSVGText(svg, 150, 75, 'Depth (D)', '9px');
    } else {
        const footing = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        footing.setAttribute('points', '50,110 80,60 160,60 190,110');
        footing.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        footing.setAttribute('stroke', 'var(--accent)');
        footing.setAttribute('stroke-width', '1.5');
        svg.appendChild(footing);

        addSVGText(svg, 120, 52, 'Top Dim', '10px');
        addSVGText(svg, 120, 125, 'Bottom Width (W)', '10px');
        addSVGText(svg, 215, 90, 'Depth (D)', '9px');
    }
    container.appendChild(svg);
}

function drawSteelInputHelper() {
    const mode = document.querySelector('input[name="steel-calc-mode"]:checked').value;
    const container = document.getElementById('steel-input-helper-container');
    if (!container) return;
    container.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 240 140');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = 'rgba(255, 255, 255, 0.02)';
    svg.style.borderRadius = '4px';

    if (mode === 'simple') {
        const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bar.setAttribute('x', '30');
        bar.setAttribute('y', '60');
        bar.setAttribute('width', '180');
        bar.setAttribute('height', '8');
        bar.setAttribute('fill', 'var(--accent)');
        bar.setAttribute('rx', '2');
        svg.appendChild(bar);

        addSVGText(svg, 120, 50, 'Length (L)', '10px');
        addSVGText(svg, 120, 85, 'Diameter (D)', '9px', 'var(--accent-tertiary)');
    } else if (mode === 'grid') {
        for (let x = 50; x <= 190; x += 35) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', '20');
            line.setAttribute('x2', x);
            line.setAttribute('y2', '120');
            line.setAttribute('stroke', 'var(--accent)');
            line.setAttribute('stroke-width', '1.5');
            svg.appendChild(line);
        }
        for (let y = 30; y <= 110; y += 25) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '40');
            line.setAttribute('y1', y);
            line.setAttribute('x2', '200');
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'rgba(255,255,255,0.4)');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }
        addSVGText(svg, 120, 15, 'Slab Length & Width', '10px');
        addSVGText(svg, 210, 70, 'Spacing', '9px', 'var(--accent-tertiary)');
    } else {
        const bar1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bar1.setAttribute('x1', '40');
        bar1.setAttribute('y1', '55');
        bar1.setAttribute('x2', '140');
        bar1.setAttribute('y2', '55');
        bar1.setAttribute('stroke', 'var(--accent)');
        bar1.setAttribute('stroke-width', '5');
        svg.appendChild(bar1);

        const bar2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        bar2.setAttribute('x1', '100');
        bar2.setAttribute('y1', '75');
        bar2.setAttribute('x2', '200');
        bar2.setAttribute('y2', '75');
        bar2.setAttribute('stroke', 'rgba(255,255,255,0.5)');
        bar2.setAttribute('stroke-width', '5');
        svg.appendChild(bar2);

        const bracket = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bracket.setAttribute('x', '100');
        bracket.setAttribute('y', '45');
        bracket.setAttribute('width', '40');
        bracket.setAttribute('height', '40');
        bracket.setAttribute('fill', 'rgba(6, 182, 212, 0.08)');
        bracket.setAttribute('stroke', 'var(--accent-tertiary)');
        bracket.setAttribute('stroke-dasharray', '2,2');
        svg.appendChild(bracket);

        addSVGText(svg, 120, 100, 'Overlap (Lap)', '10px', 'var(--accent-tertiary)');
        addSVGText(svg, 120, 32, 'Concrete & Steel Grade', '9px');
    }
    container.appendChild(svg);
}

function drawMasonryInputHelper() {
    const subtab = document.querySelector('input[name="masonry-subtab"]:checked').value;
    const container = document.getElementById('masonry-input-helper-container');
    if (!container) return;
    container.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 240 140');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = 'rgba(255, 255, 255, 0.02)';
    svg.style.borderRadius = '4px';

    if (subtab === 'brickwork') {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        p.setAttribute('points', '50,80 110,50 190,65 130,95');
        p.setAttribute('fill', 'rgba(220, 38, 38, 0.15)');
        p.setAttribute('stroke', '#dc2626');
        p.setAttribute('stroke-width', '1.5');
        svg.appendChild(p);

        const side1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        side1.setAttribute('points', '50,80 130,95 130,115 50,100');
        side1.setAttribute('fill', 'rgba(220, 38, 38, 0.25)');
        side1.setAttribute('stroke', '#dc2626');
        side1.setAttribute('stroke-width', '1.5');
        svg.appendChild(side1);

        const side2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        side2.setAttribute('points', '130,95 190,65 190,85 130,115');
        side2.setAttribute('fill', 'rgba(220, 38, 38, 0.25)');
        side2.setAttribute('stroke', '#dc2626');
        side2.setAttribute('stroke-width', '1.5');
        svg.appendChild(side2);

        addSVGText(svg, 85, 95, 'L', '10px');
        addSVGText(svg, 160, 85, 'W', '10px');
        addSVGText(svg, 85, 115, 'H (Thickness)', '9px', 'var(--accent-tertiary)');
    } else if (subtab === 'plastering') {
        const wall = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        wall.setAttribute('x', '40');
        wall.setAttribute('y', '30');
        wall.setAttribute('width', '160');
        wall.setAttribute('height', '80');
        wall.setAttribute('fill', 'rgba(156, 163, 175, 0.1)');
        wall.setAttribute('stroke', '#9ca3af');
        wall.setAttribute('stroke-width', '1.5');
        svg.appendChild(wall);

        const plaster = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plaster.setAttribute('x', '120');
        plaster.setAttribute('y', '30');
        plaster.setAttribute('width', '80');
        plaster.setAttribute('height', '80');
        plaster.setAttribute('fill', 'rgba(6, 182, 212, 0.15)');
        plaster.setAttribute('stroke', 'var(--accent)');
        plaster.setAttribute('stroke-width', '1.5');
        svg.appendChild(plaster);

        addSVGText(svg, 80, 75, 'L x H Area', '10px');
        addSVGText(svg, 160, 75, 'Plaster (t)', '9px', 'var(--accent-tertiary)');
    } else {
        const floor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        floor.setAttribute('x', '40');
        floor.setAttribute('y', '30');
        floor.setAttribute('width', '160');
        floor.setAttribute('height', '80');
        floor.setAttribute('fill', 'rgba(6, 182, 212, 0.05)');
        floor.setAttribute('stroke', 'var(--accent)');
        floor.setAttribute('stroke-width', '1.5');
        svg.appendChild(floor);

        for (let x = 80; x < 200; x += 40) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', '30');
            line.setAttribute('x2', x);
            line.setAttribute('y2', '110');
            line.setAttribute('stroke', 'rgba(255,255,255,0.15)');
            svg.appendChild(line);
        }

        addSVGText(svg, 120, 70, 'Room L x W', '10px');
        addSVGText(svg, 120, 122, 'Tile size & Bed thickness', '9px', 'var(--accent-tertiary)');
    }
    container.appendChild(svg);
}

function drawEarthworkInputHelper() {
    const mode = document.querySelector('input[name="earthwork-mode"]:checked').value;
    const container = document.getElementById('earthwork-input-helper-container');
    if (!container) return;
    container.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 240 140');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = 'rgba(255, 255, 255, 0.02)';
    svg.style.borderRadius = '4px';

    if (mode === 'pit') {
        const pit = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        pit.setAttribute('points', '50,40 70,100 170,100 190,40');
        pit.setAttribute('fill', 'rgba(245, 158, 11, 0.1)');
        pit.setAttribute('stroke', '#f59e0b');
        pit.setAttribute('stroke-width', '1.5');
        svg.appendChild(pit);

        addSVGText(svg, 120, 32, 'Top L x W', '10px');
        addSVGText(svg, 120, 115, 'Bottom L x W', '10px');
        addSVGText(svg, 210, 75, 'Depth (D)', '9px', 'var(--accent-tertiary)');
    } else if (mode === 'trench') {
        const trench = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        trench.setAttribute('points', '60,40 80,100 160,100 180,40');
        trench.setAttribute('fill', 'rgba(245, 158, 11, 0.1)');
        trench.setAttribute('stroke', '#f59e0b');
        trench.setAttribute('stroke-width', '1.5');
        svg.appendChild(trench);

        addSVGText(svg, 120, 32, 'Top Width', '10px');
        addSVGText(svg, 120, 115, 'Bottom Width', '10px');
        addSVGText(svg, 205, 75, 'Slope & L', '9px', 'var(--accent-tertiary)');
    } else {
        const plinth = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plinth.setAttribute('x', '60');
        plinth.setAttribute('y', '40');
        plinth.setAttribute('width', '120');
        plinth.setAttribute('height', '60');
        plinth.setAttribute('fill', 'rgba(254, 240, 138, 0.1)');
        plinth.setAttribute('stroke', '#fef08a');
        plinth.setAttribute('stroke-width', '1.5');
        svg.appendChild(plinth);

        addSVGText(svg, 120, 75, 'Sand Filling', '11px', '#854d0e');
        addSVGText(svg, 120, 32, 'Plinth L x W', '10px');
        addSVGText(svg, 195, 75, 'Depth (D)', '9px', 'var(--accent-tertiary)');
    }
    container.appendChild(svg);
}

// -------------------------------------------------------------
// 10. Site Checklist Module Logic
// -------------------------------------------------------------
function renderChecklist() {
    const phases = ['shuttering', 'reinforcement', 'mep', 'prep', 'pouring', 'post'];
    
    phases.forEach(phase => {
        const container = document.getElementById(`container-${phase}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        const phaseItems = siteChecklist.filter(item => item.phase === phase);
        const checkedItems = phaseItems.filter(item => item.checked);
        
        // Update phase count badge
        const badge = document.getElementById(`count-${phase}`);
        if (badge) {
            badge.innerText = `${checkedItems.length}/${phaseItems.length}`;
        }
        
        phaseItems.forEach(item => {
            const row = document.createElement('div');
            row.className = `checklist-item-row ${item.checked ? 'checked' : ''}`;
            
            // Toggle check status when row is clicked (excluding clicking delete button)
            row.addEventListener('click', (e) => {
                if (e.target.closest('.checklist-item-delete-btn')) return;
                toggleChecklistItem(item.id);
            });
            
            row.innerHTML = `
                <div class="checklist-checkbox-wrapper">
                    <input type="checkbox" ${item.checked ? 'checked' : ''} readonly>
                    <span class="checklist-checkmark"></span>
                </div>
                <div class="checklist-item-text">${sanitizeHTML(item.text)}</div>
                ${!item.isDefault ? `
                    <button class="checklist-item-delete-btn" title="Delete custom item">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                ` : ''}
            `;
            
            if (!item.isDefault) {
                row.querySelector('.checklist-item-delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteChecklistItem(item.id);
                });
            }
            
            container.appendChild(row);
        });
    });
    
    updateChecklistProgress();
}

function toggleChecklistItem(id) {
    const item = siteChecklist.find(i => i.id === id);
    if (item) {
        item.checked = !item.checked;
        saveChecklist();
        renderChecklist();
    }
}

function deleteChecklistItem(id) {
    siteChecklist = siteChecklist.filter(i => i.id !== id);
    saveChecklist();
    renderChecklist();
    showToast('Custom checklist item deleted.', 'info');
}

function addCustomChecklistItem(phase) {
    const input = document.getElementById(`add-${phase}-input`);
    if (!input) return;
    const text = sanitizeHTML(input.value.trim());
    if (!text) {
        showToast('Please enter checklist text first.', 'error');
        return;
    }
    
    const newItem = {
        id: 'custom_' + Date.now(),
        phase: phase,
        text: text,
        checked: false,
        isDefault: false
    };
    
    siteChecklist.push(newItem);
    saveChecklist();
    renderChecklist();
    
    input.value = '';
    showToast('Custom check added successfully!');
}

function updateChecklistProgress() {
    const total = siteChecklist.length;
    const checked = siteChecklist.filter(item => item.checked).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    
    const progressBar = document.getElementById('checklist-progress-bar');
    const progressText = document.getElementById('checklist-progress-text');
    const countText = document.getElementById('checklist-count-text');
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.innerText = `${percent}% Completed`;
    if (countText) countText.innerText = `${checked} / ${total} Checks Passed`;
    
    const badge = document.getElementById('checklist-readiness-badge');
    if (badge) {
        if (percent < 50) {
            badge.style.background = 'var(--danger)';
            badge.innerText = '🔴 Not Ready';
        } else if (percent < 90) {
            badge.style.background = 'var(--accent-tertiary)';
            badge.innerText = '🟡 Partially Checked';
        } else if (percent < 100) {
            badge.style.background = 'var(--accent)';
            badge.innerText = '🔵 Almost Ready';
        } else {
            badge.style.background = 'var(--accent-secondary)';
            badge.innerText = '🟢 Safe to Pour!';
        }
    }
}

function saveChecklist() {
    localStorage.setItem('civil_calc_checklist', JSON.stringify(siteChecklist));
}

function resetChecklist() {
    if (confirm('Are you sure you want to reset all checklist status? Custom added checks will be kept.')) {
        siteChecklist.forEach(item => item.checked = false);
        saveChecklist();
        renderChecklist();
        showToast('Checklist state reset successfully!', 'info');
    }
}

function printChecklist() {
    const checklistTab = document.getElementById('checklist');
    if (!checklistTab) return;
    const oldTitle = document.title;
    document.title = "Structo_Slab_Casting_Checklist_" + new Date().toISOString().slice(0, 10);
    
    checklistTab.classList.add('print-active');
    window.print();
    checklistTab.classList.remove('print-active');
    document.title = oldTitle;
}

// Setup input validation for all numeric fields
function setupNumberInputValidation() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        // Prevent typing non-numeric characters (like e, E, +, and - since we only allow non-negative)
        input.addEventListener('keydown', (e) => {
            const invalidKeys = ['e', 'E', '+'];
            const minAttr = input.getAttribute('min');
            const minVal = minAttr !== null ? parseFloat(minAttr) : 0;
            // If min is defined and is >= 0, we also prevent '-' key
            if (isNaN(minVal) || minVal >= 0) {
                invalidKeys.push('-');
            }
            if (invalidKeys.includes(e.key)) {
                e.preventDefault();
            }
        });

        // Sanitize and enforce constraints on input/change
        const validateInput = () => {
            let valStr = input.value;
            if (valStr === '') return;
            
            // Clean value of any malicious script injection characters or non-numeric/decimal characters
            const minAttr = input.getAttribute('min');
            const minVal = minAttr !== null ? parseFloat(minAttr) : 0;
            
            const regex = (minVal < 0) ? /[^\d.-]/g : /[^\d.]/g;
            let sanitized = valStr.replace(regex, '');
            
            // Handle multiple decimal points
            const parts = sanitized.split('.');
            if (parts.length > 2) {
                sanitized = parts[0] + '.' + parts.slice(1).join('');
            }
            
            if (valStr !== sanitized) {
                input.value = sanitized;
            }

            const val = parseFloat(sanitized);
            if (!isNaN(val)) {
                // Check min constraint
                if (minAttr !== null && val < minVal) {
                    input.value = minVal;
                }
                // Check max constraint
                const maxAttr = input.getAttribute('max');
                if (maxAttr !== null) {
                    const maxVal = parseFloat(maxAttr);
                    if (val > maxVal) {
                        input.value = maxVal;
                    }
                }
            }
        };

        input.addEventListener('input', validateInput);
        input.addEventListener('change', validateInput);
        input.addEventListener('blur', () => {
            let originalValue = input.value;
            // On blur, if value is empty or invalid, set it to the default/min value
            if (input.value.trim() === '') {
                const minAttr = input.getAttribute('min');
                input.value = minAttr !== null ? minAttr : '0';
            }
            validateInput();
            
            if (input.value !== originalValue) {
                // Dispatch input event to recalculate live values
                input.dispatchEvent(new Event('input'));
            }
        });
    });
}

// Calculate Minimum Shuttering Stripping Time and Curing Duration per IS 456
function calculateCuringShutteringTime() {
    const elementType = document.getElementById('est-element-type').value;
    const cementType = document.getElementById('est-cement-type').value;
    const weather = document.getElementById('est-weather').value;

    let strippingTime = '';
    let strippingNote = '';
    let curingTime = '';
    let curingNote = '';

    // Stripping time calculations based on IS 456 Clauses
    if (elementType === 'wall-column-beam-side') {
        if (weather === 'normal') {
            strippingTime = '16 - 24 Hours';
            strippingNote = 'For walls, columns, and vertical faces of beams (temp ≥ 15°C).';
        } else {
            strippingTime = '24 - 36 Hours';
            strippingNote = 'Vertical formwork removal in cold/wet weather (temp < 15°C).';
        }
    } else if (elementType === 'slab-props-left') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '3 Days';
            strippingNote = 'Slab soffit formwork (props left under slab).';
        } else {
            strippingTime = '4 - 5 Days';
            strippingNote = 'Extended for blended cement or colder weather.';
        }
    } else if (elementType === 'beam-soffit-props-left') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '7 Days';
            strippingNote = 'Beam soffit formwork (props left under beam).';
        } else {
            strippingTime = '10 Days';
            strippingNote = 'Extended for blended cement or colder weather.';
        }
    } else if (elementType === 'slab-props-removal-under-4.5m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '7 Days';
            strippingNote = 'Props left under slab can be removed since span ≤ 4.5m.';
        } else {
            strippingTime = '10 Days';
            strippingNote = 'Extended for blended cement or colder weather (span ≤ 4.5m).';
        }
    } else if (elementType === 'slab-props-removal-over-4.5m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '14 Days';
            strippingNote = 'Props left under slab can be removed since span > 4.5m.';
        } else {
            strippingTime = '14 - 18 Days';
            strippingNote = 'Extended duration for blended cement or colder weather (span > 4.5m).';
        }
    } else if (elementType === 'beam-props-removal-under-6m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '14 Days';
            strippingNote = 'Props under beams & arches can be removed since span ≤ 6m.';
        } else {
            strippingTime = '18 - 21 Days';
            strippingNote = 'Extended for blended cement or colder weather (span ≤ 6m).';
        }
    } else if (elementType === 'beam-props-removal-over-6m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '21 Days';
            strippingNote = 'Props under beams & arches can be removed since span > 6m.';
        } else {
            strippingTime = '21 - 28 Days';
            strippingNote = 'Extended for blended cement or colder weather (span > 6m).';
        }
    }

    // Curing duration calculations based on IS 456 Clause 13.5
    if (cementType === 'opc') {
        if (weather === 'normal') {
            curingTime = '7 Days';
            curingNote = 'Minimum curing period for OPC under normal weather conditions.';
        } else {
            curingTime = '10 Days';
            curingNote = 'Extended curing for OPC under hot/dry weather or severe exposure.';
        }
    } else {
        // Blended/PPC cement
        if (weather === 'normal') {
            curingTime = '10 Days';
            curingNote = 'Minimum curing period for PPC/blended cements under normal conditions.';
        } else {
            curingTime = '14 Days';
            curingNote = 'Extended curing for PPC/blended cements under hot/dry or severe exposure.';
        }
    }

    // Update UI elements
    const shutteringRes = document.getElementById('shuttering-time-res');
    const shutteringNoteEl = document.getElementById('shuttering-time-note');
    const curingRes = document.getElementById('curing-time-res');
    const curingNoteEl = document.getElementById('curing-time-note');

    if (shutteringRes) shutteringRes.innerText = strippingTime;
    if (shutteringNoteEl) shutteringNoteEl.innerText = strippingNote;
    if (curingRes) curingRes.innerText = curingTime;
    if (curingNoteEl) curingNoteEl.innerText = curingNote;
}

// -------------------------------------------------------------
// 1. Formwork & Shuttering Calculator
// -------------------------------------------------------------

function toggleShutteringInputs() {
    const memberType = document.getElementById('shuttering-member-type').value;
    const lenLabel = document.getElementById('shuttering-len-label');
    const widLabel = document.getElementById('shuttering-wid-label');
    const heightLabel = document.getElementById('shuttering-height-label');
    const widGroup = document.getElementById('shuttering-wid-group');

    if (memberType === 'slab') {
        lenLabel.innerText = 'Slab Length';
        widLabel.innerText = 'Slab Width';
        heightLabel.innerText = 'Slab Thickness';
        widGroup.style.display = 'block';
    } else if (memberType === 'beam') {
        lenLabel.innerText = 'Beam Length';
        widLabel.innerText = 'Beam Width (Bottom)';
        heightLabel.innerText = 'Beam Height / Depth';
        widGroup.style.display = 'block';
    } else if (memberType === 'column') {
        lenLabel.innerText = 'Column Width (Side A)';
        widLabel.innerText = 'Column Depth (Side B)';
        heightLabel.innerText = 'Column Height';
        widGroup.style.display = 'block';
    } else if (memberType === 'footing') {
        lenLabel.innerText = 'Footing Length';
        widLabel.innerText = 'Footing Width';
        heightLabel.innerText = 'Footing Depth / Height';
        widGroup.style.display = 'block';
    }
}

function calculateShuttering() {
    const memberType = document.getElementById('shuttering-member-type').value;
    const length = parseFloat(document.getElementById('shuttering-length').value) || 0;
    const width = parseFloat(document.getElementById('shuttering-width').value) || 0;
    const height = parseFloat(document.getElementById('shuttering-height').value) || 0;
    const qty = parseInt(document.getElementById('shuttering-qty').value) || 1;
    const rate = parseFloat(document.getElementById('shuttering-rate').value) || 0;

    let areaPerMember = 0;

    if (memberType === 'slab') {
        // Slab: bottom soffit (L*W) + side edges (2 * (L+W) * thickness)
        areaPerMember = (length * width) + 2 * (length + width) * height;
    } else if (memberType === 'beam') {
        // Beam: bottom soffit (L*W) + 2 vertical sides (2 * L * depth)
        areaPerMember = (length * width) + 2 * length * height;
    } else if (memberType === 'column') {
        // Column: 4 vertical sides (2 * H * (A + B))
        areaPerMember = 2 * height * (length + width);
    } else if (memberType === 'footing') {
        // Footing: 4 vertical sides (2 * Depth * (L + W))
        areaPerMember = 2 * height * (length + width);
    }

    const totalArea = areaPerMember * qty;
    const totalAreaSqft = totalArea * 10.7639;
    const totalCost = totalArea * rate;

    const areaRes = document.getElementById('shuttering-res-area');
    const areaSqftRes = document.getElementById('shuttering-res-area-sqft');
    const costRes = document.getElementById('shuttering-res-cost');
    const rateInfoRes = document.getElementById('shuttering-res-rate-info');

    if (areaRes) areaRes.innerHTML = `${totalArea.toFixed(2)}<span class="result-unit">m²</span>`;
    if (areaSqftRes) areaSqftRes.innerText = `~ ${totalAreaSqft.toFixed(2)} sq.ft (Per member: ${areaPerMember.toFixed(2)} m²)`;
    if (costRes) costRes.innerText = `₹${Math.round(totalCost).toLocaleString('en-IN')}`;
    if (rateInfoRes) rateInfoRes.innerText = `Based on rate: ₹${rate.toFixed(2)} per m²`;
}

function addShutteringToBOQ() {
    const memberType = document.getElementById('shuttering-member-type').value;
    const length = parseFloat(document.getElementById('shuttering-length').value) || 0;
    const width = parseFloat(document.getElementById('shuttering-width').value) || 0;
    const height = parseFloat(document.getElementById('shuttering-height').value) || 0;
    const qty = parseInt(document.getElementById('shuttering-qty').value) || 1;
    const rate = parseFloat(document.getElementById('shuttering-rate').value) || 0;
    
    const areaRes = document.getElementById('shuttering-res-area');
    const costRes = document.getElementById('shuttering-res-cost');
    const areaText = areaRes ? areaRes.innerText : '0 m²';
    const costText = costRes ? costRes.innerText : '₹0';

    const typeStr = `Formwork & Shuttering (${memberType.toUpperCase()})`;
    const dimsStr = `${length}m x ${width}m x ${height}m (Qty: ${qty})`;
    const detailsStr = `Total Area: ${areaText}, Rate: ₹${rate}/m²`;

    const item = {
        id: Date.now(),
        type: typeStr,
        dims: dimsStr,
        details: detailsStr,
        cost: costText.replace('₹', '').replace(/,/g, '')
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Formwork shuttering added to BOQ successfully!');
}

// -------------------------------------------------------------
// 2. Concrete Mix Specifications Guide Search
// -------------------------------------------------------------

function searchConcreteGrades() {
    const searchVal = document.getElementById('search-concrete-guides');
    if (!searchVal) return;
    const query = searchVal.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#concrete-guides-table-body tr');

    rows.forEach(row => {
        const searchData = row.getAttribute('data-search') || '';
        if (searchData.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// -------------------------------------------------------------
// 3. Surveying (Auto Level) Tool
// -------------------------------------------------------------

function calculateSurveyRL() {
    const benchmark = parseFloat(document.getElementById('survey-benchmark').value) || 0;
    const bs = parseFloat(document.getElementById('survey-bs').value) || 0;
    const sightVal = parseFloat(document.getElementById('survey-sight-val').value) || 0;

    const hi = benchmark + bs;
    const rl = hi - sightVal;

    const hiRes = document.getElementById('survey-res-hi');
    const rlRes = document.getElementById('survey-res-rl');

    if (hiRes) hiRes.innerHTML = `${hi.toFixed(3)}<span class="result-unit">m</span>`;
    if (rlRes) rlRes.innerHTML = `${rl.toFixed(3)}<span class="result-unit">m</span>`;
}

let surveyStations = [];

function addSurveyRow() {
    const benchmark = parseFloat(document.getElementById('survey-benchmark').value) || 0;
    const bs = parseFloat(document.getElementById('survey-bs').value) || 0;
    const sightTypeRadio = document.querySelector('input[name="survey-sight-type"]:checked');
    const sightType = sightTypeRadio ? sightTypeRadio.value : 'FS';
    const sightVal = parseFloat(document.getElementById('survey-sight-val').value) || 0;
    const remarkVal = document.getElementById('survey-remark');
    const remark = remarkVal && remarkVal.value.trim() !== '' ? remarkVal.value.trim() : '-';

    const hi = benchmark + bs;
    const rl = hi - sightVal;

    const stationNum = surveyStations.length + 1;
    const stationName = remark !== '-' ? remark : `Station ${stationNum}`;

    const newRow = {
        station: stationName,
        bs: bs.toFixed(3),
        is: sightType === 'IS' ? sightVal.toFixed(3) : '-',
        fs: sightType === 'FS' ? sightVal.toFixed(3) : '-',
        hi: hi.toFixed(3),
        rl: rl.toFixed(3),
        remark: remark
    };

    surveyStations.push(newRow);
    renderSurveyTable();

    // Set benchmark to current RL if shifting level (CP / Change Point)
    if (sightType === 'FS') {
        document.getElementById('survey-benchmark').value = rl.toFixed(3);
        document.getElementById('survey-bs').value = '0.000'; // Reset BS for next setup
        showToast('Foresight Change Point. Benchmark RL updated to ' + rl.toFixed(3) + 'm');
    }

    calculateSurveyRL();
}

function renderSurveyTable() {
    const tbody = document.getElementById('survey-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    surveyStations.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${sanitizeHTML(row.station)}</strong></td>
            <td>${row.bs}</td>
            <td>${row.is}</td>
            <td>${row.fs}</td>
            <td>${row.hi}</td>
            <td><strong>${row.rl}</strong></td>
            <td><span style="color: var(--text-muted); font-size: 0.75rem;">${sanitizeHTML(row.remark)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function clearSurveyTable() {
    surveyStations = [];
    renderSurveyTable();
    showToast('Survey field book table cleared!');
}

// -------------------------------------------------------------
// 4. Water Tank Capacity Calculator
// -------------------------------------------------------------

function toggleTankInputs() {
    const shape = document.getElementById('tank-shape').value;
    const lenGroup = document.getElementById('tank-dim-len-group');
    const widGroup = document.getElementById('tank-dim-wid-group');
    const diaGroup = document.getElementById('tank-dim-dia-group');
    const badge = document.getElementById('tank-visualizer-badge');

    if (shape === 'rect') {
        if (lenGroup) lenGroup.style.display = 'block';
        if (widGroup) widGroup.style.display = 'block';
        if (diaGroup) diaGroup.style.display = 'none';
        if (badge) badge.innerText = 'Rectangular';
    } else {
        if (lenGroup) lenGroup.style.display = 'none';
        if (widGroup) widGroup.style.display = 'none';
        if (diaGroup) diaGroup.style.display = 'block';
        if (badge) badge.innerText = 'Circular';
    }
    calculateWaterTank();
}

function calculateWaterTank() {
    const shape = document.getElementById('tank-shape').value;
    const depth = parseFloat(document.getElementById('tank-depth').value) || 0;

    let volume = 0; // m³

    if (shape === 'rect') {
        const length = parseFloat(document.getElementById('tank-length').value) || 0;
        const width = parseFloat(document.getElementById('tank-width').value) || 0;
        volume = length * width * depth;
    } else {
        const diameter = parseFloat(document.getElementById('tank-diameter').value) || 0;
        volume = Math.PI * Math.pow(diameter / 2, 2) * depth;
    }

    const liters = volume * 1000;
    const cft = volume * 35.3147;
    const impGallons = liters * 0.219969;
    const usGallons = liters * 0.264172;

    const volRes = document.getElementById('tank-res-volume');
    const cftRes = document.getElementById('tank-res-cft');
    const litRes = document.getElementById('tank-res-liters');
    const galRes = document.getElementById('tank-res-gallons');

    if (volRes) volRes.innerHTML = `${volume.toFixed(3)}<span class="result-unit">m³</span>`;
    if (cftRes) cftRes.innerText = `~ ${cft.toFixed(2)} CFT`;
    if (litRes) litRes.innerHTML = `${Math.round(litRes ? liters : 0).toLocaleString('en-IN')}<span class="result-unit">Liters</span>`;
    if (galRes) galRes.innerText = `~ ${Math.round(impGallons).toLocaleString('en-IN')} Imperial Gal / ${Math.round(usGallons).toLocaleString('en-IN')} US Gal`;

    // Render interactive SVG
    drawWaterTankSVG(shape, depth);
}

function drawWaterTankSVG(shape, depth) {
    const svg = document.getElementById('tank-svg');
    if (!svg) return;

    svg.innerHTML = '';
    
    // Set SVG size
    svg.setAttribute('viewBox', '0 0 400 200');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // Fill percent (max out at 85% for visual margin)
    let fillPercent = Math.min((depth / 3) * 80, 80); // assume max nominal depth is 3m for drawing
    if (depth > 0 && fillPercent < 15) fillPercent = 15; // min visible level
    if (depth === 0) fillPercent = 0;

    const fillY = 160 - (fillPercent * 120 / 100);
    const fillHeight = fillPercent * 120 / 100;

    // Water Gradient Definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'waterGradient');
    grad.setAttribute('x1', '0%');
    grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '0%');
    grad.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'rgba(6, 182, 212, 0.4)');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'rgba(6, 182, 212, 0.85)');

    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    if (shape === 'rect') {
        // Draw 3D-like tank box outline
        const backWall = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        backWall.setAttribute('x', '100');
        backWall.setAttribute('y', '40');
        backWall.setAttribute('width', '200');
        backWall.setAttribute('height', '120');
        backWall.setAttribute('fill', 'rgba(255,255,255,0.03)');
        backWall.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        backWall.setAttribute('stroke-width', '1');
        svg.appendChild(backWall);

        if (fillHeight > 0) {
            // Draw Water fill
            const water = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            water.setAttribute('x', '101');
            water.setAttribute('y', fillY.toString());
            water.setAttribute('width', '198');
            water.setAttribute('height', fillHeight.toString());
            water.setAttribute('fill', 'url(#waterGradient)');
            svg.appendChild(water);
        }

        const frontWall = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        frontWall.setAttribute('x', '100');
        frontWall.setAttribute('y', '40');
        frontWall.setAttribute('width', '200');
        frontWall.setAttribute('height', '120');
        frontWall.setAttribute('fill', 'none');
        frontWall.setAttribute('stroke', 'var(--accent)');
        frontWall.setAttribute('stroke-width', '2');
        svg.appendChild(frontWall);

        // Add 3D perspective lines
        const lines = [
            [100, 40, 80, 20],
            [300, 40, 320, 20],
            [80, 20, 320, 20],
            [80, 20, 80, 140],
            [100, 160, 80, 140],
            [300, 160, 320, 140],
            [320, 20, 320, 140],
            [80, 140, 320, 140]
        ];

        lines.forEach(pts => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pts[0].toString());
            line.setAttribute('y1', pts[1].toString());
            line.setAttribute('x2', pts[2].toString());
            line.setAttribute('y2', pts[3].toString());
            line.setAttribute('stroke', 'rgba(255,255,255,0.2)');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-dasharray', '2,2');
            svg.appendChild(line);
        });

    } else {
        // Draw cylindrical tank outline
        const cylinderBack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        cylinderBack.setAttribute('d', 'M 140,40 A 60,15 0 0,0 260,40 v 120 a 60,15 0 0,1 -120,0 Z');
        cylinderBack.setAttribute('fill', 'rgba(255,255,255,0.03)');
        cylinderBack.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        cylinderBack.setAttribute('stroke-width', '1');
        svg.appendChild(cylinderBack);

        if (fillHeight > 0) {
            // Draw Water cylindrical fill
            const waterCylinder = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            waterCylinder.setAttribute('d', `M 141,${fillY} A 59,14 0 0,0 259,${fillY} v ${fillHeight} a 59,14 0 0,1 -118,0 Z`);
            waterCylinder.setAttribute('fill', 'url(#waterGradient)');
            svg.appendChild(waterCylinder);
        }

        const cylinderFront = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        cylinderFront.setAttribute('d', 'M 140,40 A 60,15 0 0,0 260,40 v 120 a 60,15 0 0,0 -120,0 Z');
        cylinderFront.setAttribute('fill', 'none');
        cylinderFront.setAttribute('stroke', 'var(--accent)');
        cylinderFront.setAttribute('stroke-width', '2');
        svg.appendChild(cylinderFront);

        // Cylinder top ellipse
        const topEllipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        topEllipse.setAttribute('cx', '200');
        topEllipse.setAttribute('cy', '40');
        topEllipse.setAttribute('rx', '60');
        topEllipse.setAttribute('ry', '15');
        topEllipse.setAttribute('fill', 'rgba(255,255,255,0.05)');
        topEllipse.setAttribute('stroke', 'var(--accent)');
        topEllipse.setAttribute('stroke-width', '2');
        svg.appendChild(topEllipse);
    }

    // Add depth percentage text
    const textVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textVal.setAttribute('x', '200');
    textVal.setAttribute('y', '190');
    textVal.setAttribute('text-anchor', 'middle');
    textVal.setAttribute('fill', 'var(--text-secondary)');
    textVal.setAttribute('font-size', '11px');
    textVal.setAttribute('font-weight', '600');
    textVal.textContent = `Water Level: ${depth.toFixed(2)}m (Max Nominal: 3.0m)`;
    svg.appendChild(textVal);
}

function addTankToBOQ() {
    const shape = document.getElementById('tank-shape').value;
    const depth = parseFloat(document.getElementById('tank-depth').value) || 0;
    const volRes = document.getElementById('tank-res-volume');
    const litRes = document.getElementById('tank-res-liters');
    const volumeText = volRes ? volRes.innerText : '0 m³';
    const capacityText = litRes ? litRes.innerText : '0 Liters';

    let dimsStr = '';

    if (shape === 'rect') {
        const length = parseFloat(document.getElementById('tank-length').value) || 0;
        const width = parseFloat(document.getElementById('tank-width').value) || 0;
        dimsStr = `Rectangular: ${length}m x ${width}m x ${depth}m (Depth)`;
    } else {
        const diameter = parseFloat(document.getElementById('tank-diameter').value) || 0;
        dimsStr = `Circular: Dia: ${diameter}m, Depth: ${depth}m`;
    }

    const item = {
        id: Date.now(),
        type: `Water Tank Storage (${shape.toUpperCase()})`,
        dims: dimsStr,
        details: `Volume: ${volumeText}, Total Capacity: ${capacityText}`,
        cost: '0'
    };

    boqReport.push(item);
    saveBOQReport();
    showToast('Water tank volume added to BOQ successfully!');
}

// -------------------------------------------------------------
// 5. Curing & Stripping Guide (IS 456 Calculator)
// -------------------------------------------------------------

function calculateCuringGuide() {
    const elementType = document.getElementById('curing-element-type').value;
    const cementType = document.getElementById('curing-cement-type').value;
    const weather = document.getElementById('curing-weather').value;

    let strippingTime = '';
    let strippingNote = '';
    let curingTime = '';
    let curingNote = '';

    // Stripping time calculations based on IS 456 Clauses
    if (elementType === 'wall-column-beam-side') {
        if (weather === 'normal') {
            strippingTime = '16 - 24 Hours';
            strippingNote = 'For walls, columns, and vertical faces of beams (temp ≥ 15°C).';
        } else {
            strippingTime = '24 - 36 Hours';
            strippingNote = 'Vertical formwork removal in cold/wet weather (temp < 15°C).';
        }
    } else if (elementType === 'slab-props-left') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '3 Days';
            strippingNote = 'Slab soffit formwork (props left under slab).';
        } else {
            strippingTime = '4 - 5 Days';
            strippingNote = 'Extended for blended cement or colder weather.';
        }
    } else if (elementType === 'beam-soffit-props-left') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '7 Days';
            strippingNote = 'Beam soffit formwork (props left under beam).';
        } else {
            strippingTime = '10 Days';
            strippingNote = 'Extended for blended cement or colder weather.';
        }
    } else if (elementType === 'slab-props-removal-under-4.5m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '7 Days';
            strippingNote = 'Props left under slab can be removed since span ≤ 4.5m.';
        } else {
            strippingTime = '10 Days';
            strippingNote = 'Extended for blended cement or colder weather (span ≤ 4.5m).';
        }
    } else if (elementType === 'slab-props-removal-over-4.5m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '14 Days';
            strippingNote = 'Props left under slab can be removed since span > 4.5m.';
        } else {
            strippingTime = '14 - 18 Days';
            strippingNote = 'Extended duration for blended cement or colder weather (span > 4.5m).';
        }
    } else if (elementType === 'beam-props-removal-under-6m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '14 Days';
            strippingNote = 'Props under beams & arches can be removed since span ≤ 6m.';
        } else {
            strippingTime = '18 - 21 Days';
            strippingNote = 'Extended for blended cement or colder weather (span ≤ 6m).';
        }
    } else if (elementType === 'beam-props-removal-over-6m') {
        if (cementType === 'opc' && weather === 'normal') {
            strippingTime = '21 Days';
            strippingNote = 'Props under beams & arches can be removed since span > 6m.';
        } else {
            strippingTime = '21 - 28 Days';
            strippingNote = 'Extended for blended cement or colder weather (span > 6m).';
        }
    }

    // Curing duration calculations based on IS 456 Clause 13.5
    if (cementType === 'opc') {
        if (weather === 'normal') {
            curingTime = '7 Days';
            curingNote = 'Minimum curing period for OPC under normal weather conditions.';
        } else {
            curingTime = '10 Days';
            curingNote = 'Extended curing for OPC under hot/dry weather or severe exposure.';
        }
    } else {
        // Blended/PPC cement
        if (weather === 'normal') {
            curingTime = '10 Days';
            curingNote = 'Minimum curing period for PPC/blended cements under normal conditions.';
        } else {
            curingTime = '14 Days';
            curingNote = 'Extended curing for PPC/blended cements under hot/dry or severe exposure.';
        }
    }

    // Update UI elements
    const strippingEl = document.getElementById('curing-guide-res-stripping');
    const strippingNoteEl = document.getElementById('curing-guide-res-stripping-note');
    const curingEl = document.getElementById('curing-guide-res-curing');
    const curingNoteEl = document.getElementById('curing-guide-res-curing-note');

    if (strippingEl) strippingEl.innerText = strippingTime;
    if (strippingNoteEl) strippingNoteEl.innerText = strippingNote;
    if (curingEl) curingEl.innerText = curingTime;
    if (curingNoteEl) curingNoteEl.innerText = curingNote;
}

// -------------------------------------------------------------
// Professional Profile Functionality
// -------------------------------------------------------------
function initProfile() {
    const profilePicContainer = document.querySelector('.profile-pic-container');
    const profileImageInput = document.getElementById('profile-image-input');
    const profilePreview = document.getElementById('profile-preview');
    const profilePlaceholderIcon = document.getElementById('profile-placeholder-icon');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const headerAvatarTrigger = document.getElementById('header-avatar-trigger');

    if (profilePicContainer && profileImageInput) {
        profilePicContainer.addEventListener('click', () => {
            profileImageInput.click();
        });
    }

    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Keep image files reasonable (e.g. limit to 1.5MB to prevent localstorage quota errors)
                if (file.size > 1.5 * 1024 * 1024) {
                    showToast("Please choose an image under 1.5MB to save storage space.", "error");
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    profilePreview.src = event.target.result;
                    profilePreview.style.display = 'block';
                    profilePlaceholderIcon.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', saveProfile);
    }

    if (headerAvatarTrigger) {
        headerAvatarTrigger.addEventListener('click', () => {
            switchTab('profile');
        });
    }

    loadProfile();
}

function updateHeaderAvatar(imageSrc) {
    const headerPreview = document.getElementById('header-avatar-preview');
    const headerIcon = document.getElementById('header-avatar-icon');
    if (headerPreview && headerIcon) {
        if (imageSrc) {
            headerPreview.src = imageSrc;
            headerPreview.style.display = 'block';
            headerIcon.style.display = 'none';
        } else {
            headerPreview.src = '';
            headerPreview.style.display = 'none';
            headerIcon.style.display = 'flex';
        }
    }
}

function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    const role = document.getElementById('profile-role').value;
    const institute = document.getElementById('profile-institute').value.trim();
    const preview = document.getElementById('profile-preview');
    
    let base64Image = '';
    if (preview && preview.src && preview.src.startsWith('data:image/')) {
        base64Image = preview.src;
    }

    const profileData = {
        name: name,
        role: role,
        institute: institute,
        image: base64Image
    };

    try {
        localStorage.setItem('structo_prof_profile', JSON.stringify(profileData));
        updateHeaderAvatar(base64Image);
        showToast("Profile details saved successfully!", "success");
    } catch (e) {
        console.error("Local storage save failed", e);
        showToast("Failed to save profile. Image might be too large.", "error");
    }
}

function loadProfile() {
    const nameInput = document.getElementById('profile-name');
    const roleSelect = document.getElementById('profile-role');
    const instituteInput = document.getElementById('profile-institute');
    const preview = document.getElementById('profile-preview');
    const icon = document.getElementById('profile-placeholder-icon');

    const profileDataStr = localStorage.getItem('structo_prof_profile');
    if (profileDataStr) {
        try {
            const profileData = JSON.parse(profileDataStr);
            if (nameInput) nameInput.value = profileData.name || '';
            if (roleSelect) roleSelect.value = profileData.role || '';
            if (instituteInput) instituteInput.value = profileData.institute || '';
            
            if (profileData.image && preview && icon) {
                preview.src = profileData.image;
                preview.style.display = 'block';
                icon.style.display = 'none';
            }
            updateHeaderAvatar(profileData.image || '');
        } catch (e) {
            console.error("Error parsing saved profile", e);
            updateHeaderAvatar('');
        }
    } else {
        updateHeaderAvatar('');
    }
}



