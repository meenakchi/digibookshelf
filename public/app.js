/* ===============================
   Firebase imports
================================ */
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,    // ADD THIS
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const auth = getAuth();

/* ===============================
   DOM references
================================ */
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app");
const navbar = document.getElementById("navbar");
const logoutBtn = document.getElementById("logoutBtn");

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

const modal = document.getElementById("modal");
const modalContent = document.querySelector(".modal-content");

const shelvesContainer = document.getElementById("shelves-container");
const prevShelfBtn = document.getElementById("prevShelf");
const nextShelfBtn = document.getElementById("nextShelf");
/* ===============================
   AUTH ACTIONS
================================ */
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMsg = document.getElementById("authMsg");

// 1. LOGIN LOGIC
loginBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the UI switch automatically
  } catch (error) {
    authMsg.textContent = "Login failed: " + error.message;
    authMsg.style.color = "red";
  }
};

// 2. REGISTER LOGIC
registerBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authMsg.textContent = "Account created! Logging in...";
    authMsg.style.color = "green";
  } catch (error) {
    authMsg.textContent = "Registration failed: " + error.message;
    authMsg.style.color = "red";
  }
};
/* ===============================
   SHELF SYSTEM
================================ */
const shelfSlots = [
  { id: 1, left: "8%", top: "5%" },
  { id: 2, left: "15.5%", top: "5%" },
  { id: 3, left: "23%", top: "5%" },
  { id: 4, left: "85%", top: "5%" },
  { id: 5, left: "8%", top: "23.5%" },
  { id: 6, left: "15.5%", top: "23.5%" },
  { id: 7, left: "23%", top: "23.5%" },
  { id: 8, left: "70%", top: "42%" },
  { id: 9, left: "78%", top: "42%" },
  { id: 10, left: "85%", top: "42%" },
  { id: 11, left: "8%", top: "60%" },
  { id: 12, left: "15.5%", top: "60%" },
  { id: 13, left: "55%", top: "81%" },
  { id: 14, left: "30%", top: "23.5%" },
  { id: 15, left: "37%", top: "23.5%" },
  { id: 16, left: "44%", top: "23.5%" },
  { id: 17, left: "51%", top: "23.5%" },
];

let currentShelfIndex = 0;
let shelves = [];
let shelfOccupiedSlots = []; // array of sets for each shelf
let currentBookData = null;

/* ===============================
   AUTH
================================ */
logoutBtn.onclick = async () => {
  await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    navbar.classList.remove("hidden");

    // Load or create first shelf
    shelvesContainer.innerHTML = "";
    shelves = [];
    shelfOccupiedSlots = [];
    createNewShelf(); // create first shelf
    await loadUserBooks(user.uid);
    showShelf(0);
  } else {
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
    navbar.classList.add("hidden");
    shelvesContainer.innerHTML = "";
    shelves = [];
    shelfOccupiedSlots = [];
  }
});

/* ===============================
   SHELF NAVIGATION
================================ */
function createNewShelf() {
  const index = shelves.length;
  const shelfDiv = document.createElement("div");
  shelfDiv.classList.add("shelf");
  shelfDiv.style.display = "none";
  shelfDiv.dataset.index = index;
  shelfDiv.innerHTML = `
    <img src="../assets/bookshelf.png" class="shelf-image" alt="Bookshelf"/>
    <div class="books-layer" id="books-layer-${index}"></div>
  `;
  shelvesContainer.appendChild(shelfDiv);
  shelves.push(shelfDiv);
  shelfOccupiedSlots.push(new Set());
}

function showShelf(index) {
  shelves.forEach((shelf, i) => {
    shelf.style.display = i === index ? "block" : "none";
  });
  currentShelfIndex = index;
}

nextShelfBtn.onclick = () => {
  if (currentShelfIndex === shelves.length - 1) createNewShelf();
  showShelf(currentShelfIndex + 1);
};

prevShelfBtn.onclick = () => {
  if (currentShelfIndex > 0) showShelf(currentShelfIndex - 1);
};

/* ===============================
   ADD BOOK TO SHELF
================================ */
async function addBookToShelf(book) {
  const user = auth.currentUser;
  if (!user) return;

  const occupied = shelfOccupiedSlots[currentShelfIndex];
  const freeSlot = shelfSlots.find(s => !occupied.has(s.id));

  if (!freeSlot) {
    alert("Current shelf is full! Click → to create a new shelf.");
    return;
  }

  const spineColor = randomSpineColor();
  occupied.add(freeSlot.id);

  // Store in Firestore
  await addDoc(
    collection(db, "users", user.uid, "books"),
    {
      title: book.title,
      author: book.author,
      coverUrl: book.cover,
      slotId: freeSlot.id,
      shelfIndex: currentShelfIndex,
      spineColor,
      rating: 0
    }
  );

  renderSpine(
    { ...book, spineColor, coverUrl: book.cover, rating: 0 },
    freeSlot,
    currentShelfIndex
  );
}

/* ===============================
   RENDER SPINE
================================ */
function renderSpine(book, slot, shelfIndex) {
  const shelfLayer = document.getElementById(`books-layer-${shelfIndex}`);
  const spine = document.createElement("div");
  spine.className = "book";
  spine.style.background = book.spineColor;
  spine.style.left = slot.left;
  spine.style.top = slot.top;
  spine.textContent = book.title;

  spine.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal(book);
  });

  shelfLayer.appendChild(spine);
}

/* ===============================
   LOAD USER BOOKS FROM FIRESTORE
================================ */
async function loadUserBooks(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "books"));
  snapshot.forEach(docSnap => {
    const book = docSnap.data();
    const shelfIdx = book.shelfIndex ?? 0;

    // Ensure shelf exists
    while (shelfIdx >= shelves.length) createNewShelf();

    const occupied = shelfOccupiedSlots[shelfIdx];
    const slot = shelfSlots.find(s => s.id === book.slotId);
    if (!slot) return;

    occupied.add(slot.id);
    renderSpine(book, slot, shelfIdx);
  });
}

/* ===============================
   MODAL & RATING LOGIC
================================ */
async function openModal(book) {
  currentBookData = book;
  
  document.getElementById("modal-title").textContent = book.title;
  document.getElementById("modal-author").textContent = book.author;
  document.getElementById("modal-cover").src = book.coverUrl || "";

  updateStarDisplay(book.rating || 0);
  modal.classList.remove("hidden");
}

function updateStarDisplay(rating) {
  for (let i = 1; i <= 5; i++) {
    const star = document.getElementById(`star-${i}`);
    if (i <= rating) {
      star.textContent = "★";
      star.classList.add("filled");
    } else {
      star.textContent = "☆";
      star.classList.remove("filled");
    }
  }
}

async function setRating(stars) {
  if (!currentBookData || !auth.currentUser) return;

  const user = auth.currentUser;
  const snapshot = await getDocs(collection(db, "users", user.uid, "books"));

  snapshot.forEach(async docSnap => {
    const data = docSnap.data();
    if (data.title === currentBookData.title && data.shelfIndex === currentShelfIndex) {
      await updateDoc(doc(db, "users", user.uid, "books", docSnap.id), { rating: stars });
      currentBookData.rating = stars;
    }
  });

  updateStarDisplay(stars);
}

function closeModal() {
  modal.classList.add("hidden");
  currentBookData = null;
}

window.setRating = setRating;
window.closeModal = closeModal;

modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
modalContent.addEventListener("click", e => e.stopPropagation());
document.addEventListener("keydown", e => { if(e.key==="Escape") closeModal(); });

/* ===============================
   SEARCH LOGIC
================================ */
searchBtn.addEventListener("click", searchBooks);

async function searchBooks() {
  const query = searchInput.value.trim();
  if (!query) return;
  searchResults.innerHTML = "Searching...";

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  renderResults(data.items || []);
}

function renderResults(items) {
  searchResults.innerHTML = "";
  items.slice(0,8).forEach(item => {
    const info = item.volumeInfo;
    const card = document.createElement("div");
    card.className = "result-card";

    const img = document.createElement("img");
    img.src = info.imageLinks?.thumbnail || "";

    const title = document.createElement("div"); title.textContent = info.title;
    const author = document.createElement("div"); author.textContent = info.authors?.[0] || "Unknown";

    const btn = document.createElement("button");
    btn.textContent = "Add to shelf";
    btn.onclick = () => addBookToShelf({
      title: info.title,
      author: info.authors?.[0] || "Unknown",
      cover: info.imageLinks?.thumbnail || ""
    });

    card.append(img, title, author, btn);
    searchResults.appendChild(card);
  });
}

/* ===============================
   UTILS
================================ */
function randomSpineColor() {
  const colors = ["#d4a5a5","#a8d8d8","#d8d8a8","#c8b8a8","#b8d8c8"];
  return colors[Math.floor(Math.random() * colors.length)];
}
