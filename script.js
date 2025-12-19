// Storage keys
const STORAGE_KEYS = {
    subjects: 'studygram_subjects',
    documents: 'studygram_documents',
    journal: 'studygram_journal',
    activity: 'studygram_activity'
};

// State management
let currentModal = {
    type: null,
    parentId: null,
    level: null
};

let uploadedFile = null;
let modalFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupDragDrop();
    setupFileInputs();
    loadAllData();
    updateDashboard();
});

// Navigation
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            showTab(tabName);
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'organizer') {
        renderOrganizerTree();
    } else if (tabName === 'journal') {
        renderJournalEntries();
    }
}

// Organizer Functions
function addSubject() {
    const input = document.getElementById('subject-input');
    const name = input.value.trim();
    
    if (!name) {
        alert('Please enter a subject name');
        return;
    }

    let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
    const newSubject = {
        id: Date.now(),
        name: name,
        chapters: []
    };
    subjects.push(newSubject);
    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
    
    input.value = '';
    renderOrganizerTree();
    addActivity('Created subject: ' + name);
}

function renderOrganizerTree() {
    const tree = document.getElementById('organizer-tree');
    const subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
    
    if (subjects.length === 0) {
        tree.innerHTML = '<p class="empty-state">No subjects yet. Create one to get started!</p>';
        return;
    }

    tree.innerHTML = subjects.map(subject => `
        <div class="tree-item level-1">
            <div class="item-header">
                <div class="item-title">📚 ${subject.name}</div>
                <div class="item-actions">
                    <button onclick="openAddChapterModal('${subject.id}')">Add Chapter</button>
                    <button onclick="deleteSubject('${subject.id}')">Delete</button>
                </div>
            </div>
            ${subject.chapters.length > 0 ? `
                <div>
                    ${subject.chapters.map(chapter => `
                        <div class="tree-item level-2">
                            <div class="item-header">
                                <div class="item-title">📖 ${chapter.name}</div>
                                <div class="item-actions">
                                    <button onclick="openAddTopicModal('${subject.id}', '${chapter.id}')">Add Topic</button>
                                    <button onclick="deleteChapter('${subject.id}', '${chapter.id}')">Delete</button>
                                </div>
                            </div>
                            ${chapter.topics.length > 0 ? `
                                <div>
                                    ${chapter.topics.map(topic => `
                                        <div class="tree-item level-3">
                                            <div class="item-header">
                                                <div class="item-title">📝 ${topic.name}</div>
                                                <div class="item-actions">
                                                    <button onclick="editTopic('${subject.id}', '${chapter.id}', '${topic.id}')">Edit</button>
                                                    <button onclick="deleteTopic('${subject.id}', '${chapter.id}', '${topic.id}')">Delete</button>
                                                </div>
                                            </div>
                                            ${topic.content ? `<div class="item-content">${topic.content}</div>` : ''}
                                            ${topic.documentUrl ? `<div class="item-content">📎 Document attached</div>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function openAddChapterModal(subjectId) {
    currentModal = { type: 'chapter', parentId: subjectId, level: 2 };
    document.getElementById('modalTitle').textContent = 'Add New Chapter';
    document.getElementById('itemName').value = '';
    document.getElementById('itemContent').value = '';
    document.getElementById('itemName').placeholder = 'Chapter name';
    document.getElementById('itemContent').placeholder = 'Chapter description (optional)';
    document.getElementById('itemModal').classList.add('show');
    modalFile = null;
}

function openAddTopicModal(subjectId, chapterId) {
    currentModal = { type: 'topic', parentId: subjectId, chapterId: chapterId, level: 3 };
    document.getElementById('modalTitle').textContent = 'Add New Topic';
    document.getElementById('itemName').value = '';
    document.getElementById('itemContent').value = '';
    document.getElementById('itemName').placeholder = 'Topic name';
    document.getElementById('itemContent').placeholder = 'Topic notes';
    document.getElementById('itemModal').classList.add('show');
    modalFile = null;
}

function editTopic(subjectId, chapterId, topicId) {
    const subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
    const subject = subjects.find(s => s.id == subjectId);
    const chapter = subject.chapters.find(c => c.id == chapterId);
    const topic = chapter.topics.find(t => t.id == topicId);

    currentModal = { type: 'edit-topic', parentId: subjectId, chapterId: chapterId, topicId: topicId, level: 3 };
    document.getElementById('modalTitle').textContent = 'Edit Topic';
    document.getElementById('itemName').value = topic.name;
    document.getElementById('itemContent').value = topic.content || '';
    document.getElementById('itemModal').classList.add('show');
    modalFile = topic.documentUrl ? { name: topic.documentName || 'attached document' } : null;
    updateFileDisplay();
}

function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const content = document.getElementById('itemContent').value.trim();

    if (!name) {
        alert('Please enter a name');
        return;
    }

    let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
    const subject = subjects.find(s => s.id == currentModal.parentId);

    if (currentModal.type === 'chapter') {
        subject.chapters = subject.chapters || [];
        subject.chapters.push({
            id: Date.now(),
            name: name,
            content: content,
            topics: []
        });
    } else if (currentModal.type === 'topic') {
        const chapter = subject.chapters.find(c => c.id == currentModal.chapterId);
        chapter.topics = chapter.topics || [];
        chapter.topics.push({
            id: Date.now(),
            name: name,
            content: content,
            documentUrl: modalFile ? URL.createObjectURL(modalFile) : null,
            documentName: modalFile ? modalFile.name : null
        });
    } else if (currentModal.type === 'edit-topic') {
        const chapter = subject.chapters.find(c => c.id == currentModal.chapterId);
        const topic = chapter.topics.find(t => t.id == currentModal.topicId);
        topic.name = name;
        topic.content = content;
        if (modalFile && modalFile instanceof File) {
            topic.documentUrl = URL.createObjectURL(modalFile);
            topic.documentName = modalFile.name;
        }
    }

    localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
    renderOrganizerTree();
    closeModal();
    addActivity(`Saved: ${name}`);
}

function deleteSubject(id) {
    if (confirm('Delete this subject and all its content?')) {
        let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
        subjects = subjects.filter(s => s.id != id);
        localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
        renderOrganizerTree();
        addActivity('Deleted subject');
    }
}

function deleteChapter(subjectId, chapterId) {
    if (confirm('Delete this chapter and all its topics?')) {
        let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
        const subject = subjects.find(s => s.id == subjectId);
        subject.chapters = subject.chapters.filter(c => c.id != chapterId);
        localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
        renderOrganizerTree();
    }
}

function deleteTopic(subjectId, chapterId, topicId) {
    if (confirm('Delete this topic?')) {
        let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
        const subject = subjects.find(s => s.id == subjectId);
        const chapter = subject.chapters.find(c => c.id == chapterId);
        chapter.topics = chapter.topics.filter(t => t.id != topicId);
        localStorage.setItem(STORAGE_KEYS.subjects, JSON.stringify(subjects));
        renderOrganizerTree();
    }
}

function closeModal() {
    document.getElementById('itemModal').classList.remove('show');
    currentModal = { type: null, parentId: null, level: null };
    modalFile = null;
    document.getElementById('fileName').textContent = '';
}

// Summarizer Functions
function setupDragDrop() {
    const uploadArea = document.getElementById('uploadArea');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    uploadArea.addEventListener('dragover', () => uploadArea.classList.add('dragover'));
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', handleDrop);
}

function setupFileInputs() {
    document.getElementById('fileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    });

    document.getElementById('modalFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            modalFile = e.target.files[0];
            updateFileDisplay();
        }
    });
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    document.getElementById('uploadArea').classList.remove('dragover');
    
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function updateFileDisplay() {
    const fileName = document.getElementById('fileName');
    if (modalFile) {
        fileName.textContent = '✓ ' + modalFile.name;
    } else {
        fileName.textContent = '';
    }
}

async function processFile(file) {
    const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type)) {
        alert('Unsupported file type. Please use PDF, TXT, or DOCX.');
        return;
    }

    document.getElementById('processingIndicator').style.display = 'block';
    document.getElementById('uploadArea').style.display = 'none';

    try {
        let text = '';

        if (file.type === 'application/pdf') {
            text = await extractPdfText(file);
        } else if (file.type === 'text/plain') {
            text = await file.text();
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            text = await extractDocxText(file);
        }

        const summary = generateSummary(text);
        saveDocument(file.name, text, summary);
        displaySummary(file.name, text, summary);

        document.getElementById('processingIndicator').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInput').value = '';
        
        addActivity('Summarized document: ' + file.name);
    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please try again.');
        document.getElementById('processingIndicator').style.display = 'none';
        document.getElementById('uploadArea').style.display = 'block';
    }
}

async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items.map(item => item.str).join(' ') + '\n';
    }

    return text;
}

async function extractDocxText(file) {
    const arrayBuffer = await file.arrayBuffer();
    
    // Simple DOCX extraction - reads the document.xml content
    const zip = new JSZip();
    const unzipped = await zip.loadAsync(arrayBuffer);
    
    let text = '';
    if (unzipped.files['word/document.xml']) {
        const xmlContent = await unzipped.files['word/document.xml'].async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
        const paragraphs = xmlDoc.getElementsByTagName('w:t');
        
        for (let p of paragraphs) {
            text += p.textContent + ' ';
        }
    }
    
    return text || 'Unable to extract text from DOCX file.';
}

function generateSummary(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length === 0) return text;

    // Score sentences by word frequency
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq = {};
    words.forEach(word => {
        if (word.length > 3) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });

    const scoredSentences = sentences.map(sentence => {
        const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || [];
        const score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0);
        return { sentence: sentence.trim(), score: score };
    });

    const summaryLength = Math.ceil(sentences.length * 0.3);
    const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, summaryLength)
        .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence))
        .map(s => s.sentence)
        .join(' ');

    return topSentences;
}

function saveDocument(filename, fullText, summary) {
    let documents = JSON.parse(localStorage.getItem(STORAGE_KEYS.documents) || '[]');
    documents.push({
        id: Date.now(),
        filename: filename,
        fullText: fullText,
        summary: summary,
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documents));
}

function displaySummary(filename, fullText, summary) {
    const summariesList = document.getElementById('summariesList');
    
    if (summariesList.querySelector('.empty-state')) {
        summariesList.innerHTML = '';
    }

    const compressionRatio = Math.round((1 - summary.length / fullText.length) * 100);
    
    const summaryCard = document.createElement('div');
    summaryCard.className = 'summary-card';
    summaryCard.innerHTML = `
        <div class="summary-header">
            <div class="summary-title">📄 ${filename}</div>
        </div>
        <div class="summary-stats">
            <span>Original: ${fullText.split(' ').length} words</span>
            <span>Summary: ${summary.split(' ').length} words</span>
            <span>Compression: ${compressionRatio}%</span>
        </div>
        <div class="summary-content">${summary}</div>
        <div class="summary-actions">
            <button onclick="copyToClipboard('${summary.replace(/'/g, "\\'")}')">Copy</button>
            <button onclick="downloadSummary('${filename}', '${summary.replace(/'/g, "\\'")}')">Download</button>
            <button onclick="removeSummary(this)">Remove</button>
        </div>
    `;
    
    summariesList.appendChild(summaryCard);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Summary copied to clipboard!');
}

function downloadSummary(filename, summary) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summary));
    element.setAttribute('download', filename + '_summary.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function removeSummary(button) {
    button.closest('.summary-card').remove();
    const list = document.getElementById('summariesList');
    if (list.children.length === 0) {
        list.innerHTML = '<p class="empty-state">No documents summarized yet.</p>';
    }
}

// Journal Functions
function addJournalEntry() {
    const subject = document.getElementById('journalSubject').value.trim();
    const mood = document.getElementById('journalMood').value;
    const hours = parseFloat(document.getElementById('journalHours').value) || 0;
    const text = document.getElementById('journalText').value.trim();

    if (!subject || !text) {
        alert('Please fill in subject and reflection');
        return;
    }

    let journal = JSON.parse(localStorage.getItem(STORAGE_KEYS.journal) || '[]');
    journal.push({
        id: Date.now(),
        subject: subject,
        mood: mood,
        hours: hours,
        text: text,
        date: new Date().toLocaleString()
    });
    localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(journal));

    document.getElementById('journalSubject').value = '';
    document.getElementById('journalMood').value = '';
    document.getElementById('journalHours').value = '';
    document.getElementById('journalText').value = '';

    renderJournalEntries();
    updateDashboard();
    addActivity(`Journal entry: ${subject}`);
}

function renderJournalEntries() {
    const entriesList = document.getElementById('journalEntries');
    const journal = JSON.parse(localStorage.getItem(STORAGE_KEYS.journal) || '[]');

    if (journal.length === 0) {
        entriesList.innerHTML = '<p class="empty-state">No entries yet. Start journaling your learning journey!</p>';
        return;
    }

    entriesList.innerHTML = journal.reverse().map(entry => `
        <div class="journal-entry">
            <div class="entry-header">
                <div class="entry-subject">${entry.subject}</div>
                <div class="entry-date">${entry.date}</div>
            </div>
            ${entry.mood ? `<div class="entry-mood">${entry.mood}</div>` : ''}
            <div class="entry-hours">Study Time: ${entry.hours} hours</div>
            <div class="entry-text">${entry.text}</div>
            <button onclick="deleteJournalEntry('${entry.id}')" style="margin-top: 10px; padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
        </div>
    `).join('');
}

function deleteJournalEntry(id) {
    if (confirm('Delete this entry?')) {
        let journal = JSON.parse(localStorage.getItem(STORAGE_KEYS.journal) || '[]');
        journal = journal.filter(e => e.id != id);
        localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(journal));
        renderJournalEntries();
    }
}

// Dashboard Functions
function updateDashboard() {
    const subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.subjects) || '[]');
    const documents = JSON.parse(localStorage.getItem(STORAGE_KEYS.documents) || '[]');
    const journal = JSON.parse(localStorage.getItem(STORAGE_KEYS.journal) || '[]');

    let noteCount = 0;
    subjects.forEach(s => {
        s.chapters?.forEach(c => {
            noteCount += c.topics?.length || 0;
        });
    });

    let totalHours = 0;
    journal.forEach(e => {
        totalHours += e.hours || 0;
    });

    document.getElementById('doc-count').textContent = documents.length;
    document.getElementById('note-count').textContent = noteCount;
    document.getElementById('journal-count').textContent = journal.length;
    document.getElementById('hours-count').textContent = totalHours + 'h';
}

function addActivity(message) {
    let activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.activity) || '[]');
    activities.unshift({
        id: Date.now(),
        message: message,
        time: new Date().toLocaleTimeString()
    });
    activities = activities.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.activity, JSON.stringify(activities));
    
    const activityList = document.getElementById('activity-list');
    if (activityList) {
        activityList.innerHTML = activities.map(a => `
            <div class="activity-item">${a.message} - ${a.time}</div>
        `).join('');
    }
}

function loadAllData() {
    const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.activity) || '[]');
    const activityList = document.getElementById('activity-list');
    if (activityList && activities.length > 0) {
        activityList.innerHTML = activities.map(a => `
            <div class="activity-item">${a.message} - ${a.time}</div>
        `).join('');
    }
}

function displayUserName() {
    const session = localStorage.getItem('studygram_session') || sessionStorage.getItem('studygram_session');
    if (session) {
        const user = JSON.parse(session);
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) {
            welcomeMsg.textContent = `Welcome back, ${user.name}! Here's your study overview`;
        }
    }
}

// Call this function in your DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    displayUserName();
    // ... rest of your existing code
});

// ====================================
// DARK MODE TOGGLE FUNCTIONALITY
// ====================================

function toggleDarkMode() {
    const body = document.body;
    const toggle = document.querySelector('.theme-toggle-main');
    const slider = document.querySelector('.toggle-slider-main');
    
    body.classList.toggle('dark-mode');
    
    if (toggle) {
        toggle.classList.toggle('dark');
    }
    
    if (slider) {
        if (body.classList.contains('dark-mode')) {
            slider.textContent = '🌙';
            localStorage.setItem('studygram_theme', 'dark');
        } else {
            slider.textContent = '☀️';
            localStorage.setItem('studygram_theme', 'light');
        }
    }
}

// Load saved theme on page load
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('studygram_theme');
    const toggle = document.querySelector('.theme-toggle-main');
    const slider = document.querySelector('.toggle-slider-main');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (toggle) toggle.classList.add('dark');
        if (slider) slider.textContent = '🌙';
    }
}

// Call loadSavedTheme when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    setupNavigation();
    setupDragDrop();
    setupFileInputs();
    loadAllData();
    updateDashboard();
});
// ===============================
// INITIAL SETUP
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    setupDragDrop();
    setupFileInput();
});

// ===============================
// DRAG & DROP
// ===============================
function setupDragDrop() {
    const uploadArea = document.getElementById("uploadArea");

    ["dragenter", "dragover", "dragleave", "drop"].forEach(event =>
        uploadArea.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        })
    );

    uploadArea.addEventListener("dragover", () => uploadArea.classList.add("dragover"));
    uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));

    uploadArea.addEventListener("drop", e => {
        uploadArea.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });
}

// ===============================
// FILE INPUT
// ===============================
function setupFileInput() {
    document.getElementById("fileInput").addEventListener("change", e => {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    });
}

// ===============================
// PROCESS FILE
// ===============================
async function processFile(file) {
    const validTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!validTypes.includes(file.type)) {
        alert("Only PDF, TXT and DOCX files are supported");
        return;
    }

    document.getElementById("processingIndicator").style.display = "block";
    document.getElementById("uploadArea").style.display = "none";

    let text = "";

    if (file.type === "application/pdf") {
        text = await extractPdfText(file);
    } else if (file.type === "text/plain") {
        text = await file.text();
    } else {
        text = await extractDocxText(file);
    }

    const summary = generateSummary(text);
    const notes = generateNotes(text);
    const flashcards = generateFlashcards(text);
    const quiz = generateQuiz(text);

    displayResult(file.name, summary, notes, flashcards, quiz);

    document.getElementById("processingIndicator").style.display = "none";
    document.getElementById("uploadArea").style.display = "block";
}

// ===============================
// PDF TEXT EXTRACTION
// ===============================
async function extractPdfText(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
    }
    return text;
}

// ===============================
// DOCX TEXT EXTRACTION
// ===============================
async function extractDocxText(file) {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.files["word/document.xml"].async("string");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    return [...doc.getElementsByTagName("w:t")]
        .map(t => t.textContent)
        .join(" ");
}

// ===============================
// SUMMARY
// ===============================
function generateSummary(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, Math.max(3, Math.floor(sentences.length * 0.25))).join(" ");
}

// ===============================
// NOTES
// ===============================
function generateNotes(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences
        .filter(s => s.length > 80)
        .slice(0, 8)
        .map(s => "• " + s.trim())
        .join("\n");
}

// ===============================
// FLASHCARDS
// ===============================
function generateFlashcards(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const cards = [];

    sentences.forEach(sentence => {
        if (sentence.includes(" is ") && cards.length < 6) {
            const parts = sentence.split(" is ");
            cards.push({
                q: `What is ${parts[0].trim()}?`,
                a: parts[1].replace(/[.,]/g, "").trim()
            });
        }
    });

    return cards;
}

// ===============================
// CONTENT-BASED QUIZ (REAL QUIZ)
// ===============================
function generateQuiz(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const quiz = [];

    const keywords = [...new Set(
        text.match(/\b[a-zA-Z]{5,}\b/g) || []
    )];

    sentences.forEach(sentence => {
        if (
            sentence.includes(" is ") &&
            sentence.length > 60 &&
            quiz.length < 5
        ) {
            const parts = sentence.split(" is ");
            const question = `What is ${parts[0].trim()}?`;
            const correctAnswer = parts[1]
                .replace(/[.,]/g, "")
                .trim();

            const wrongOptions = keywords
                .filter(w => !correctAnswer.includes(w))
                .slice(0, 3);

            const options = shuffleArray([
                correctAnswer,
                ...wrongOptions
            ]);

            quiz.push({
                question,
                options,
                answer: correctAnswer
            });
        }
    });

    return quiz;
}

// ===============================
// SHUFFLE HELPER
// ===============================
function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// ===============================
// DISPLAY RESULT
// ===============================
function displayResult(name, summary, notes, flashcards, quiz) {
    const list = document.getElementById("summariesList");
    list.innerHTML = "";

    const card = document.createElement("div");
    card.className = "summary-card";

    card.innerHTML = `
        <h3>📄 ${name}</h3>

        <h4>📌 Summary</h4>
        <div class="summary-content">${summary}</div>

        <h4>📝 Notes</h4>
        <pre class="summary-content">${notes}</pre>

        <h4>🧠 Flashcards</h4>
        ${flashcards.map(f => `
            <div class="flashcard">
                <strong>Q:</strong> ${f.q}<br>
                <strong>A:</strong> ${f.a}
            </div>
        `).join("")}

        <h4>❓ Quiz (From PDF Content)</h4>
        ${quiz.map((q, i) => `
            <div class="quiz">
                <p><strong>${i + 1}. ${q.question}</strong></p>
                ${q.options.map(o => `<div>◻ ${o}</div>`).join("")}
                <small>✔ Correct Answer: ${q.answer}</small>
            </div>
        `).join("")}
    `;

    list.appendChild(card);
}
function displayResult(name, summary, notes, flashcards, quiz) {
    const list = document.getElementById("summariesList");
    list.innerHTML = "";

    const card = document.createElement("div");
    card.className = "summary-card";

    card.innerHTML = `
        <h3>📄 ${name}</h3>

        <h4>📌 Summary</h4>
        <div class="summary-content">${summary}</div>

        <h4>📝 Notes</h4>
        <pre class="summary-content">${notes}</pre>

        <h4>🧠 Flashcards</h4>
        ${flashcards.map(f => `
            <div class="flashcard">
                <strong>Q:</strong> ${f.q}<br>
                <strong>A:</strong> ${f.a}
            </div>
        `).join("")}

        <h4>❓ Quiz</h4>
        ${quiz.map((q, i) => `
            <div class="quiz" data-answer="${q.answer}">
                <p><strong>${i + 1}. ${q.question}</strong></p>
                ${q.options.map(o => `
                    <button class="quiz-option">${o}</button>
                `).join("")}
                <div class="quiz-result" style="display:none;"></div>
            </div>
        `).join("")}
    `;

    list.appendChild(card);

    // QUIZ CLICK LOGIC (INLINE, NO EXTRA FUNCTIONS)
    list.querySelectorAll(".quiz").forEach(q => {
        const correct = q.dataset.answer;
        const result = q.querySelector(".quiz-result");

        q.querySelectorAll(".quiz-option").forEach(btn => {
            btn.onclick = () => {
                if (q.classList.contains("answered")) return;
                q.classList.add("answered");

                if (btn.textContent === correct) {
                    btn.classList.add("correct");
                    result.textContent = "✅ Correct!";
                } else {
                    btn.classList.add("wrong");
                    result.textContent = `❌ Correct Answer: ${correct}`;
                }

                result.style.display = "block";
            };
        });
    });
}







