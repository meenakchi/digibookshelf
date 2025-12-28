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
   GENRE COLOR MAPPING
================================ */
const GENRE_COLORS = {
  'Fantasy': '#d1b3ff',      // Soft Lavender
  'Romance': '#ffb3c6',      // Existing Pink 
  'Mystery': '#a8d8d8',      // Mint Teal
  'Thriller': '#fa9b90ff',     // Muted Slate
  'Sci-Fi': '#bde0fe',       // Sky Blue
  'Horror': '#a68a8a',       // Dusty Rose/Brown
  'Contemporary': '#f9ebae', // Pale Butter Yellow
  'Historical': '#e2cfb6',   // Antique Parchment
  'Young Adult': '#ffc8dd',  // Bubblegum Pink
  'Non-Fiction': '#d4e1cc',  // Sage Green
  'Poetry': '#fbc4ab',       // Soft Apricota
  'Biography': '#c0d6df',    // Steel Blue
  'Other': '#d0d0d0'         // Light Grey
};
const GENRE_OPTIONS = Object.keys(GENRE_COLORS);

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
let swapSourceBook = null;  // GLOBAL now
let lastTapTime = 0;        // GLOBAL now

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
   GENRE SELECTOR MODAL
================================ */
function showGenreSelector(book) {
  const genreModal = document.createElement('div');
  genreModal.className = 'genre-selector-overlay';
  genreModal.innerHTML = `
    <div class="genre-selector-content">
      <h2 style="margin-bottom: 20px; color: #333;">Select Genre for "${book.title}"</h2>
      <div class="genre-grid">
        ${GENRE_OPTIONS.map(genre => `
          <button class="genre-option" data-genre="${genre}" style="background: ${GENRE_COLORS[genre]}">
            ${genre}
          </button>
        `).join('')}
      </div>
      <button class="cancel-genre" style="margin-top: 20px;">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(genreModal);
  
  genreModal.querySelectorAll('.genre-option').forEach(btn => {
    btn.onclick = async () => {
      const selectedGenre = btn.dataset.genre;
      await addBookToShelf({ ...book, genre: selectedGenre });
      genreModal.remove();
    };
  });
  
  genreModal.querySelector('.cancel-genre').onclick = () => genreModal.remove();
  genreModal.onclick = (e) => {
    if (e.target === genreModal) genreModal.remove();
  };
}

/* ===============================
   ADD BOOK (FIXED)
================================ */
async function addBookToShelf(book) {
  const user = auth.currentUser;
  if (!user) return;

  const occupied = shelfOccupiedSlots[currentShelfIndex];
  const freeSlot = shelfSlots.find(s => !occupied.has(s.id));

  if (!freeSlot) {
    alert("Shelf full!"); return;
  }

  const newBook = {
    title: book.title || "Unknown",
    author: book.author || "Unknown",
    coverUrl: book.cover || "",
    slotId: freeSlot.id,
    shelfIndex: Number(currentShelfIndex), // Force Number
    spineColor: GENRE_COLORS[book.genre] || '#d0d0d0',
    genre: book.genre || 'Other',
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

  // Remove any swap highlight from all books
  document.querySelectorAll(".book.swap-selected").forEach(el => {
    el.classList.remove("swap-selected");
  });
}
/* ===============================
   SWAP LOGIC (FIXED)
================================ */
async function swapBooks(bookA, bookB) {
  if (!bookA || !bookB || !auth.currentUser) return;
  
  // Guard against undefined values
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
  spine.style.position = "absolute"; // Ensure positioning is explicit
  spine.dataset.bookId = book.firestoreId;

  const shortTitle = book.title.length > 15
    ? book.title.substring(0, 15) + "..."
    : book.title;
  spine.textContent = shortTitle;

  /* ===============================
      DESKTOP DRAG & DROP
  ================================ */
  spine.draggable = true;

  spine.addEventListener("dragstart", () => {
    draggedBook = book;
    spine.style.opacity = "0.5";
  });

  spine.addEventListener("dragend", () => {
    spine.style.opacity = "1";
    draggedBook = null;
  });

  spine.addEventListener("dragover", e => e.preventDefault());

  spine.addEventListener("drop", async (e) => {
    e.preventDefault();
    if (!draggedBook || draggedBook.firestoreId === book.firestoreId) return;
    await swapBooks(draggedBook, book);
  });

  /* ===============================
      FIXED MOBILE DRAG & DROP
  ================================ */
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  spine.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    const rect = spine.getBoundingClientRect();
    
    // Calculate where inside the book the user touched
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    
    isDragging = false;
  }, { passive: true });

  spine.addEventListener("touchmove", e => {
    // Only prevent default if we've actually moved enough to be "dragging"
    if (e.touches.length > 0) {
      isDragging = true;
      if (e.cancelable) e.preventDefault(); 
      
      const touch = e.touches[0];
      
      // Move using fixed positioning to follow clientX/Y perfectly
      spine.style.position = "fixed";
      spine.style.zIndex = "1000";
      spine.style.left = (touch.clientX - offsetX) + "px";
      spine.style.top = (touch.clientY - offsetY) + "px";
      spine.style.opacity = "0.8";
    }
  }, { passive: false });

  spine.addEventListener("touchend", async e => {
    if (!isDragging) {
      // It was a tap, not a drag
      openModal(book);
      return;
    }

    const touch = e.changedTouches[0];
    
    // 1. Hide the spine temporarily so we can see what's UNDER it
    spine.style.display = "none";
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    spine.style.display = "block";

    // 2. Check if the element under the finger is another book
    const targetBookEl = dropTarget?.closest(".book");
    
    if (targetBookEl && targetBookEl.dataset.bookId !== book.firestoreId) {
      const otherBook = allUserBooks.find(b => b.firestoreId === targetBookEl.dataset.bookId);
      if (otherBook) {
        await swapBooks(book, otherBook);
      }
    } else {
      // 3. If no swap happened, snap back to original slot
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
   LOAD BOOKS (FIXED)
================================ */
async function loadUserBooks(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "books"));
  allUserBooks = [];
  
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    allUserBooks.push({
      ...data,
      firestoreId: docSnap.id,
      shelfIndex: data.shelfIndex ?? 0, // Ensure no undefined
      slotId: data.slotId ?? 1          // Ensure no undefined
    });
  });

  // Reset layers
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
  document.getElementById("modal-genre").textContent = book.genre || "Other";

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

async function changeGenre() {
  if (!currentBookData || !auth.currentUser) return;

  const genreModal = document.createElement('div');
  genreModal.className = 'genre-selector-overlay';
  genreModal.innerHTML = `
    <div class="genre-selector-content">
      <h2 style="margin-bottom: 20px; color: #333;">Change Genre</h2>
      <div class="genre-grid">
        ${GENRE_OPTIONS.map(genre => `
          <button class="genre-option" data-genre="${genre}" style="background: ${GENRE_COLORS[genre]}">
            ${genre}
          </button>
        `).join('')}
      </div>
      <button class="cancel-genre" style="margin-top: 20px;">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(genreModal);
  
  genreModal.querySelectorAll('.genre-option').forEach(btn => {
    btn.onclick = async () => {
      const newGenre = btn.dataset.genre;
      const user = auth.currentUser;
      
      await updateDoc(doc(db, "users", user.uid, "books", currentBookData.firestoreId), {
        genre: newGenre,
        spineColor: GENRE_COLORS[newGenre]
      });
      
      document.getElementById("modal-genre").textContent = newGenre;
      genreModal.remove();
      closeModal();
      await loadUserBooks(user.uid);
      showShelf(currentShelfIndex);
    };
  });
  
  genreModal.querySelector('.cancel-genre').onclick = () => genreModal.remove();
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
window.changeGenre = changeGenre;
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
    btn.onclick = () => showGenreSelector({
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