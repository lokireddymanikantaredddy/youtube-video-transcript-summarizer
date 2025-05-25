let transcript = '';
let isDragging = false;
let offsetX, offsetY;

// Initialize the sidebar
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const copyBtn = document.getElementById('copyTranscript');
    const modeToggle = document.getElementById('modeToggle');
    const closeBtn = document.getElementById('close');
    const header = document.querySelector('.header');

    // Load saved position
    loadPosition();

    // Apply initial theme
    const savedTheme = localStorage.getItem('darkMode') === 'true';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme !== null ? savedTheme : systemDark;
    applyTheme(initialTheme);
    modeToggle.checked = initialTheme;

    // Setup event listeners
    copyBtn.addEventListener('click', handleCopy);
    modeToggle.addEventListener('change', handleThemeToggle);
    closeBtn.addEventListener('click', handleClose);
    setupDragHandlers(sidebar, header);

    // Listen for transcript updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'setTranscript') {
            transcript = request.transcript;
            document.getElementById('transcript').textContent = transcript;
        }
    });
}

// Apply theme changes
function applyTheme(isDark) {
    const sidebar = document.getElementById('sidebar');
    const transcriptEl = document.getElementById('transcript');
    
    if (isDark) {
        sidebar.classList.add('dark-mode');
        transcriptEl.style.backgroundColor = '#2e2e2e';
        transcriptEl.style.color = '#f1f1f1';
        transcriptEl.style.borderColor = '#444';
        localStorage.setItem('darkMode', 'true');
    } else {
        sidebar.classList.remove('dark-mode');
        transcriptEl.style.backgroundColor = '#f5f5f5';
        transcriptEl.style.color = '#333';
        transcriptEl.style.borderColor = '#e0e0e0';
        localStorage.setItem('darkMode', 'false');
    }
}

// Handle copy button click
function handleCopy() {
    const copyBtn = document.getElementById('copyTranscript');
    navigator.clipboard.writeText(transcript)
        .then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Transcript';
            }, 2000);
        })
        .catch(err => {
            console.error('Copy failed:', err);
            copyBtn.textContent = 'Error!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Transcript';
            }, 2000);
        });
}

// Handle theme toggle
function handleThemeToggle() {
    applyTheme(this.checked);
}

// Handle close button
function handleClose() {
    document.getElementById('sidebar').style.display = 'none';
    // Alternatively, you could send a message to close the window
    // window.close();
}

// Setup drag handlers
function setupDragHandlers(sidebar, header) {
    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'close' || e.target.id === 'modeToggle' || e.target.classList.contains('slider')) return;
        
        isDragging = true;
        const rect = sidebar.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        sidebar.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        sidebar.style.left = `${e.clientX - offsetX}px`;
        sidebar.style.top = `${e.clientY - offsetY}px`;
        sidebar.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            sidebar.style.cursor = 'default';
            document.body.style.userSelect = '';
            savePosition();
        }
    });
}

// Save sidebar position
function savePosition() {
    const sidebar = document.getElementById('sidebar');
    const rect = sidebar.getBoundingClientRect();
    localStorage.setItem('sidebarPosition', JSON.stringify({
        left: rect.left,
        top: rect.top
    }));
}

// Load sidebar position
function loadPosition() {
    const sidebar = document.getElementById('sidebar');
    const savedPos = localStorage.getItem('sidebarPosition');
    if (savedPos) {
        const { left, top } = JSON.parse(savedPos);
        sidebar.style.left = `${left}px`;
        sidebar.style.top = `${top}px`;
        sidebar.style.right = 'auto';
    }
}



// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSidebar);