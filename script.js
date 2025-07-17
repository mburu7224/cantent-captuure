// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_AnGX-RO7zfM_rCBopJmdv3BOVE4V-_o",
  authDomain: "media-app-a702b.firebaseapp.com",
  projectId: "media-app-a702b",
  storageBucket: "media-app-a702b.firebasestorage.app",
  messagingSenderId: "60484045851",
  appId: "1:60484045851:web:f1bb588c2d5edc177ffcbe",
  measurementId: "G-LPBXF7MLWF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// IndexedDB setup
let dbLocal;
const request = indexedDB.open("ContentCaptureDB", 1);

request.onerror = () => alert("IndexedDB failed");
request.onsuccess = () => {
  dbLocal = request.result;
  loadEvents();
};
request.onupgradeneeded = e => {
  dbLocal = e.target.result;
  dbLocal.createObjectStore("events", { keyPath: "id", autoIncrement: true });
};

// DOM Elements
const mainPage = document.getElementById("mainPage");
const detailPage = document.getElementById("detailPage");

const addEventBtn = document.getElementById("addEventBtn");
const eventModal = document.getElementById("eventModal");
const eventNameInput = document.getElementById("eventNameInput");
const eventDateInput = document.getElementById("eventDateInput");
const saveEventBtn = document.getElementById("saveEventBtn");
const cancelEventBtn = document.getElementById("cancelEventBtn");

const eventList = document.getElementById("eventList");
const eventHeader = document.getElementById("eventHeader");
const contentFormContainer = document.getElementById("contentFormContainer");

const addSegmentBtn = document.getElementById("addSegmentBtn");
const syncBtn = document.getElementById("syncBtn");
const backBtn = document.getElementById("backBtn");

let currentEvent = null;

// Modal controls
addEventBtn.onclick = () => eventModal.classList.remove("hidden");
cancelEventBtn.onclick = () => eventModal.classList.add("hidden");

// Save new event
saveEventBtn.onclick = () => {
  const name = eventNameInput.value.trim();
  const date = eventDateInput.value;

  if (!name || !date) return alert("Please fill all fields.");

  const tx = dbLocal.transaction("events", "readwrite");
  const store = tx.objectStore("events");
  store.add({ name, date, segments: [] });

  tx.oncomplete = () => {
    eventModal.classList.add("hidden");
    eventNameInput.value = "";
    eventDateInput.value = "";
    loadEvents();
  };
};

// Load events
function loadEvents() {
  eventList.innerHTML = "";
  const tx = dbLocal.transaction("events", "readonly");
  const store = tx.objectStore("events");
  const request = store.getAll();

  request.onsuccess = () => {
    request.result.forEach(event => {
      const li = document.createElement("li");
      li.textContent = `${event.date} — ${event.name}`;
      li.onclick = () => openEventDetail(event);
      eventList.appendChild(li);
    });
  };
}

// Open event
function openEventDetail(event) {
  currentEvent = event;
  mainPage.classList.add("hidden");
  detailPage.classList.remove("hidden");

  eventHeader.textContent = `Event: ${event.name} on ${event.date}`;
  contentFormContainer.innerHTML = "";

  (event.segments || []).forEach(segment => addContentForm(segment));
  if (event.segments.length === 0) addContentForm();
}

// Add segment
function addContentForm(data = {}) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("segment");

  wrapper.innerHTML = `
    <hr>
    <label>Content Type:</label>
    <select class="contentType">
      <option value="">Select Type</option>
      <option value="Sermon">Sermon</option>
      <option value="Song">Song</option>
      <option value="Announcement">Announcement</option>
      <option value="Testimony">Testimony</option>
      <option value="Other">Other</option>
    </select>

    <div class="time-row">
      <div>
        <label>Start Time:</label>
        <input type="time" class="startTime" value="${data.start || ""}" />
      </div>
      <div>
        <label>End Time:</label>
        <input type="time" class="endTime" value="${data.end || ""}" />
      </div>
    </div>

    <label>Title:</label>
    <input type="text" class="title" placeholder="Enter content title" value="${data.title || ""}" />

    <label>Topic:</label>
    <input type="text" class="topic" placeholder="Enter content topic" value="${data.topic || ""}" />

    <label>By (Author/Speaker):</label>
    <input type="text" class="by" placeholder="Enter author or speaker name" value="${data.by || ""}" />

    <label>Description:</label>
    <textarea class="description" placeholder="Provide a detailed description...">${data.description || ""}</textarea>
  `;

  wrapper.querySelector(".contentType").value = data.type || "";
  contentFormContainer.appendChild(wrapper);
}

// Save segments locally
function saveToLocal() {
  const segments = [];
  const wrappers = contentFormContainer.querySelectorAll(".segment");

  wrappers.forEach(w => {
    segments.push({
      type: w.querySelector(".contentType").value,
      start: w.querySelector(".startTime").value,
      end: w.querySelector(".endTime").value,
      title: w.querySelector(".title").value,
      topic: w.querySelector(".topic").value,
      by: w.querySelector(".by").value,
      description: w.querySelector(".description").value,
    });
  });

  const tx = dbLocal.transaction("events", "readwrite");
  const store = tx.objectStore("events");
  currentEvent.segments = segments;
  store.put(currentEvent);
}

// Buttons
addSegmentBtn.onclick = () => addContentForm();
backBtn.onclick = () => {
  saveToLocal();
  detailPage.classList.add("hidden");
  mainPage.classList.remove("hidden");
};
syncBtn.onclick = async () => {
  saveToLocal();
  try {
    for (const seg of currentEvent.segments) {
      await addDoc(collection(db, "segments"), {
        ...seg,
        eventDate: currentEvent.date,
        eventName: currentEvent.name,
        timestamp: new Date()
      });
    }
    alert("✅ Synced successfully!");
  } catch (e) {
    alert("❌ Sync failed: " + e.message);
  }
};