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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app");
const authMsg = document.getElementById("authMsg");
const navbar = document.getElementById("navbar");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

registerBtn.onclick = async () => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
  } catch (err) {
    authMsg.textContent = err.message;
  }
};

loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
  } catch (err) {
    authMsg.textContent = err.message;
  }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
};

onAuthStateChanged(auth, user => {
  if (user) {
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
    navbar.classList.remove("hidden");
    loadUserBooks(user.uid);
  } else {
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
    navbar.classList.add("hidden");
    layer.innerHTML = "";
    occupiedSlots.clear();
  }
});

/* ===============================
   DOM references
================================ */
const layer = document.getElementById("books-layer");
const modal = document.getElementById("modal");
const modalContent = document.querySelector(".modal-content");

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

/* ===============================
   SHELF SLOT SYSTEM
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
  { id: 14, left: "63%", top: "81%" },
];

const occupiedSlots = new Set();
let currentBookData = null; // Store current book info for rating updates

/* ===============================
   MODAL LOGIC
================================ */
async function openModal(book) {
  currentBookData = book;
  
  // Set basic info
  document.getElementById("modal-title").textContent = book.title;
  document.getElementById("modal-author").textContent = book.author;
  document.getElementById("modal-cover").src = book.coverUrl || "";
  
  // Set rating
  const rating = book.rating || 0;
  updateStarDisplay(rating);
  
  // Fetch additional data from Google Books API
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(book.title + " " + book.author)}`
    );
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const bookInfo = data.items[0].volumeInfo;
      
      // Genre/Categories
      const genre = bookInfo.categories?.[0] || "Unknown";
      document.getElementById("modal-genre").textContent = genre;
      
      // More books by author
      fetchMoreByAuthor(book.author);
    }
  } catch (err) {
    console.error("Error fetching book details:", err);
  }
  
  modal.classList.remove("hidden");
}

async function fetchMoreByAuthor(author) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author)}&maxResults=4`
    );
    const data = await res.json();
    
    const container = document.getElementById("modal-more-books");
    container.innerHTML = "";
    
    if (data.items) {
      data.items.forEach(item => {
        const info = item.volumeInfo;
        const img = document.createElement("img");
        img.src = info.imageLinks?.thumbnail || "";
        img.className = "more-book-cover";
        img.title = info.title;
        container.appendChild(img);
      });
    }
  } catch (err) {
    console.error("Error fetching more books:", err);
  }
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
  
  // Update in Firestore
  const booksRef = collection(db, "users", user.uid, "books");
  const snapshot = await getDocs(booksRef);
  
  snapshot.forEach(async (document) => {
    const bookData = document.data();
    if (bookData.title === currentBookData.title) {
      await updateDoc(doc(db, "users", user.uid, "books", document.id), {
        rating: stars
      });
      currentBookData.rating = stars;
    }
  });
  
  updateStarDisplay(stars);
}

function closeModal() {
  modal.classList.add("hidden");
  currentBookData = null;
}

// Make closeModal available globally for the duck onclick
window.closeModal = closeModal;

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

modalContent.addEventListener("click", (e) => {
  e.stopPropagation();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

/* ===============================
   SEARCH (Google Books API)
================================ */
searchBtn.addEventListener("click", searchBooks);

async function searchBooks() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchResults.innerHTML = "Searching...";

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`
  );
  const data = await res.json();

  renderResults(data.items || []);
}

function renderResults(items) {
  searchResults.innerHTML = "";

  items.slice(0, 8).forEach(item => {
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

    btn.onclick = () => {
      addBookToShelf({
        title: info.title,
        author: info.authors?.[0] || "Unknown",
        cover: info.imageLinks?.thumbnail || "",
      });
    };

    card.append(img, title, author, btn);
    searchResults.appendChild(card);
  });
}

/* ===============================
   ADD BOOK → FIRESTORE + SHELF
================================ */
async function addBookToShelf(book) {
  const user = auth.currentUser;
  if (!user) return;

  const freeSlot = shelfSlots.find(slot => !occupiedSlots.has(slot.id));
  if (!freeSlot) {
    alert("Your bookshelf is full!");
    return;
  }

  const spineColor = randomSpineColor();
  occupiedSlots.add(freeSlot.id);

  await addDoc(
    collection(db, "users", user.uid, "books"),
    {
      title: book.title,
      author: book.author,
      coverUrl: book.cover,
      slotId: freeSlot.id,
      spineColor,
      rating: 0
    }
  );

  renderSpine(
    { ...book, spineColor, coverUrl: book.cover, rating: 0 },
    freeSlot
  );
}

/* ===============================
   RENDER SPINE
================================ */
function renderSpine(book, slot) {
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

  layer.appendChild(spine);
}

/* ===============================
   LOAD BOOKS FROM FIRESTORE
================================ */
async function loadUserBooks(uid) {
  layer.innerHTML = "";
  occupiedSlots.clear();

  const snapshot = await getDocs(
    collection(db, "users", uid, "books")
  );

  snapshot.forEach(doc => {
    const book = doc.data();
    const slot = shelfSlots.find(s => s.id === book.slotId);
    if (!slot) return;

    occupiedSlots.add(book.slotId);
    renderSpine(book, slot);
  });
}

/* ===============================
   UTIL
================================ */
function randomSpineColor() {
  const colors = ["#d4a5a5", "#a8d8d8", "#d8d8a8", "#c8b8a8", "#b8d8c8"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Make setRating available globally for onclick
window.setRating = setRating;