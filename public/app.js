/* ===============================
   Firebase imports
================================ */
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

/* ===============================
   COLOR GENERATION UTILITY
   Uses deterministic colors based on book title
================================ */

// Simple hash function to convert string to number
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate color based on book title (same book = same color)
function getColorFromTitle(title) {
  const pastels = [
    '#ffb3c6', // pink
    '#cdb4db', // lavender
    '#bde0fe', // sky blue
    '#a8d8d8', // mint
    '#ffc8dd', // rose
    '#f9ebae', // butter yellow
    '#e2cfb6', // parchment
    '#c0d6df', // steel blue
    '#fbc4ab', // apricot
    '#d4e1cc', // sage
    '#d1b3ff', // soft purple
    '#fa9b90', // coral
    '#ffcfd2', // light coral
    '#b8e0d2', // teal
    '#d6eadf', // mint cream
    '#eac4d5', // mauve
    '#f7d9c4', // peach
    '#fae3d9', // blush
    '#c9ada7', // dusty rose
    '#a8dadc', // powder blue
  ];
  
  const hash = hashString(title);
  const index = hash % pastels.length;
  return pastels[index];
}

// Main function to get spine color
async function getSpineColorFromCover(coverUrl, title) {
  // Use deterministic color based on title
  // This ensures same book always gets same color
  return getColorFromTitle(title);
}

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
let draggedBook = null;
let touchStartBook = null;
let longPressTimer = null;
let swapSourceBook = null;
let lastTapTime = 0;

/* ===============================
   AUTH ACTIONS
================================ */
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMsg = document.getElementById("authMsg");

loginBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    authMsg.textContent = "Login failed: " + error.message;
    authMsg.style.color = "red";
  }
};

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
   SHELF SYSTEM - FIXED SPACING
================================ */

const shelfSlots = [
  { id: 1, left: "8%", top: "6%" },
  { id: 2, left: "15%", top: "6%" },
  { id: 4, left: "85%", top: "6%" },
  { id: 3, left: "78%", top: "6%" },
  { id: 5, left: "8%", top: "25%" },
  { id: 6, left: "15%", top: "25%" },
  { id: 7, left: "22%", top: "25%" },
  { id: 8, left: "29%", top: "25%" },
  { id: 9, left: "36%", top: "25%" },
  { id: 10, left: "43%", top: "25%" },
  { id: 11, left: "50%", top: "25%" },
  { id: 11, left: "57%", top: "25%" },
  { id: 11, left: "64%", top: "25%" },
  { id: 11, left: "71%", top: "25%" },
  { id: 11, left: "78%", top: "25%" },
  { id: 11, left: "85%", top: "25%" },
  { id: 12, left: "85%", top: "42%" },
  { id: 13, left: "78%", top: "42%" },
  { id: 14, left: "71%", top: "42%" },
  { id: 15, left: "64%", top: "42%" },
  { id: 16, left: "57%", top: "42%" },
  { id: 17, left: "50%", top: "42%" },
  { id: 22, left: "43%", top: "42%" },
  { id: 23, left: "36%", top: "42%" },
  { id: 24, left: "29%", top: "42%" },
  { id: 18, left: "8%", top: "60%" },
  { id: 19, left: "12%", top: "60%" },
  { id: 25, left: "64%", top: "60%" },
  { id: 26, left: "57%", top: "60%" },
  { id: 27, left: "50%", top: "60%" },
  { id: 28, left: "43%", top: "60%" },
  { id: 29, left: "36%", top: "60%" },
  { id: 30, left: "29%", top: "60%" },
  { id: 20, left: "50%", top: "81%" },
  { id: 21, left: "59%", top: "81%" },
];

let currentShelfIndex = 0;
let shelves = [];
let shelfOccupiedSlots = [];
let currentBookData = null;
let allUserBooks = [];

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

    shelvesContainer.innerHTML = "";
    shelves = [];
    shelfOccupiedSlots = [];
    createNewShelf();
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
   ADD BOOK - WITH COLOR EXTRACTION
================================ */
async function addBookToShelf(book) {
  const user = auth.currentUser;
  if (!user) return;

  const occupied = shelfOccupiedSlots[currentShelfIndex];
  const freeSlot = shelfSlots.find(s => !occupied.has(s.id));

  if (!freeSlot) {
    alert("Shelf full!"); return;
  }

  // Extract color from book title (deterministic)
  const spineColor = await getSpineColorFromCover(book.cover, book.title);

  const newBook = {
    title: book.title || "Unknown",
    author: book.author || "Unknown",
    coverUrl: book.cover || "",
    slotId: freeSlot.id,
    shelfIndex: Number(currentShelfIndex),
    spineColor: spineColor,
    rating: 0
  };

  const docRef = await addDoc(collection(db, "users", user.uid, "books"), newBook);
  await updateDoc(docRef, { firestoreId: docRef.id });
  await loadUserBooks(user.uid);
  showNotification("✨ Book added!");
}

function showNotification(message) {
  const notif = document.createElement("div");
  notif.className = "center-notification";
  notif.textContent = message;
  document.body.appendChild(notif);
  createConfetti();
  requestAnimationFrame(() => notif.classList.add("show"));
  setTimeout(() => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 400);
  }, 1800);
}

function createConfetti() {
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.backgroundColor = randomConfettiColor();
    confetti.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2000);
  }
}

function randomConfettiColor() {
  const colors = ["#ffb3c6", "#cdb4db", "#bde0fe", "#ffc8dd", "#a2d2ff"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function clearSwapSelection() {
  swapSourceBook = null;
  document.querySelectorAll(".book.swap-selected").forEach(el => {
    el.classList.remove("swap-selected");
  });
}

/* ===============================
   SWAP LOGIC
================================ */
async function swapBooks(bookA, bookB) {
  if (!bookA || !bookB || !auth.currentUser) return;
  
  const sA = bookA.shelfIndex ?? 0;
  const sB = bookB.shelfIndex ?? 0;
  const idA = bookA.slotId;
  const idB = bookB.slotId;

  const user = auth.currentUser;
  try {
    const batchUpdates = [
      updateDoc(doc(db, "users", user.uid, "books", bookA.firestoreId), {
        slotId: idB,
        shelfIndex: sB
      }),
      updateDoc(doc(db, "users", user.uid, "books", bookB.firestoreId), {
        slotId: idA,
        shelfIndex: sA
      })
    ];

    await Promise.all(batchUpdates);
    await loadUserBooks(user.uid);
    showNotification(" Books rearranged!");
  } catch (err) {
    console.error("Swap failed:", err);
  }
}

function renderSpine(book, slot, shelfIndex) {
  const shelfLayer = document.getElementById(`books-layer-${shelfIndex}`);
  const spine = document.createElement("div");

  spine.className = "book";
  spine.style.background = book.spineColor;
  spine.style.left = slot.left;
  spine.style.top = slot.top;
  spine.style.position = "absolute";
  spine.dataset.bookId = book.firestoreId;

  const shortTitle = book.title.length > 15
    ? book.title.substring(0, 15) + "..."
    : book.title;
  spine.textContent = shortTitle;

  /* ===============================
      DESKTOP INTERACTION
  ================================ */
  let dragStarted = false;
  
  spine.draggable = true;

  spine.addEventListener("dragstart", (e) => {
    dragStarted = true;
    draggedBook = book;
    spine.style.opacity = "0.5";
  });

  spine.addEventListener("dragend", (e) => {
    spine.style.opacity = "1";
    draggedBook = null;
    
    setTimeout(() => {
      dragStarted = false;
    }, 100);
  });

  spine.addEventListener("dragover", e => e.preventDefault());

  spine.addEventListener("drop", async (e) => {
    e.preventDefault();
    if (!draggedBook || draggedBook.firestoreId === book.firestoreId) return;
    await swapBooks(draggedBook, book);
  });

  spine.addEventListener("click", (e) => {
    if (!dragStarted) {
      openModal(book);
    }
  });

  /* ===============================
      MOBILE TOUCH INTERACTION
  ================================ */
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  spine.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    const rect = spine.getBoundingClientRect();
    
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    
    isDragging = false;
  }, { passive: true });

  spine.addEventListener("touchmove", e => {
    if (e.touches.length > 0) {
      isDragging = true;
      if (e.cancelable) e.preventDefault(); 
      
      const touch = e.touches[0];
      
      spine.style.position = "fixed";
      spine.style.zIndex = "1000";
      spine.style.left = (touch.clientX - offsetX) + "px";
      spine.style.top = (touch.clientY - offsetY) + "px";
      spine.style.opacity = "0.8";
    }
  }, { passive: false });

  spine.addEventListener("touchend", async e => {
    if (!isDragging) {
      openModal(book);
      return;
    }

    const touch = e.changedTouches[0];
    
    spine.style.display = "none";
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    spine.style.display = "block";

    const targetBookEl = dropTarget?.closest(".book");
    
    if (targetBookEl && targetBookEl.dataset.bookId !== book.firestoreId) {
      const otherBook = allUserBooks.find(b => b.firestoreId === targetBookEl.dataset.bookId);
      if (otherBook) {
        await swapBooks(book, otherBook);
      }
    } else {
      spine.style.position = "absolute";
      spine.style.left = slot.left;
      spine.style.top = slot.top;
      spine.style.zIndex = "1";
      spine.style.opacity = "1";
    }
    
    isDragging = false;
  });

  shelfLayer.appendChild(spine);
}

/* ===============================
   LOAD BOOKS
================================ */
async function loadUserBooks(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "books"));
  allUserBooks = [];
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    allUserBooks.push({
      ...data,
      firestoreId: docSnap.id,
      shelfIndex: data.shelfIndex ?? 0,
      slotId: data.slotId ?? 1
    });
  });

  shelves.forEach((_, idx) => {
    const layer = document.getElementById(`books-layer-${idx}`);
    if (layer) layer.innerHTML = '';
    shelfOccupiedSlots[idx] = new Set();
  });

  allUserBooks.forEach(book => {
    const sIdx = book.shelfIndex;
    while (sIdx >= shelves.length) createNewShelf();
    const slot = shelfSlots.find(s => s.id === book.slotId);
    if (slot) {
      shelfOccupiedSlots[sIdx].add(slot.id);
      renderSpine(book, slot, sIdx);
    }
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
  
  // Show current spine color
  const colorPreview = document.getElementById("modal-color-preview");
  if (colorPreview) {
    colorPreview.style.background = book.spineColor || '#d0d0d0';
  }

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
  await updateDoc(doc(db, "users", user.uid, "books", currentBookData.firestoreId), { 
    rating: stars 
  });
  
  currentBookData.rating = stars;
  updateStarDisplay(stars);
}

async function changeColor() {
  if (!currentBookData || !auth.currentUser) return;

  const newColor = prompt("Enter a color (e.g., #ff69b4, rgb(255,105,180), or pink):");
  if (!newColor) return;

  const user = auth.currentUser;
  
  await updateDoc(doc(db, "users", user.uid, "books", currentBookData.firestoreId), {
    spineColor: newColor
  });
  
  closeModal();
  await loadUserBooks(user.uid);
  showShelf(currentShelfIndex);
}

async function deleteBook() {
  if (!currentBookData || !auth.currentUser) return;
  
  if (!confirm(`Delete "${currentBookData.title}" from your shelf?`)) return;

  const user = auth.currentUser;
  await deleteDoc(doc(db, "users", user.uid, "books", currentBookData.firestoreId));
  
  closeModal();
  await loadUserBooks(user.uid);
  showShelf(currentShelfIndex);
  showNotification("📖 Book removed from shelf");
}

function closeModal() {
  modal.classList.add("hidden");
  currentBookData = null;
}

window.setRating = setRating;
window.closeModal = closeModal;
window.changeColor = changeColor;
window.deleteBook = deleteBook;

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

    const title = document.createElement("div"); 
    title.textContent = info.title;
    
    const author = document.createElement("div"); 
    author.textContent = info.authors?.[0] || "Unknown";

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.log("✅ Service Worker registered"))
      .catch(err => console.error("❌ SW failed", err));
  });
}