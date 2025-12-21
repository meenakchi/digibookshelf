/* ===============================
   Firebase imports
================================ */
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
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
    logoutBtn.classList.remove("hidden");

    loadUserBooks(user.uid);
  } else {
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
    logoutBtn.classList.add("hidden");

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
   SHELF SLOT SYSTEM (IMPORTANT)
================================ */
const shelfSlots = [
  // Top shelf
  { id: 1, left: "8%", top: "5%" },
  { id: 2, left: "15.5%", top: "5%" },
  { id: 3, left: "23%", top: "5%" },
  { id: 4, left: "85%", top: "5%" },

  // Second shelf
  { id: 5, left: "8%", top: "23.5%" },
  { id: 6, left: "15.5%", top: "23.5%" },
  { id: 7, left: "23%", top: "23.5%" },

  // Third shelf
  { id: 8, left: "70%", top: "42%" },
  { id: 9, left: "78%", top: "42%" },
  { id: 10, left: "85%", top: "42%" },

  // Fourth shelf
  { id: 11, left: "8%", top: "60%" },
  { id: 12, left: "15.5%", top: "60%" },

  // Bottom shelf
  { id: 13, left: "55%", top: "81%" },
  { id: 14, left: "63%", top: "81%" },
];

const occupiedSlots = new Set();

/* ===============================
   MODAL LOGIC
================================ */
function openModal(book) {
  document.getElementById("modal-title").textContent = book.title;
  document.getElementById("modal-author").textContent = `by ${book.author}`;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

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
      spineColor
    }
  );

  renderSpine(
    { ...book, spineColor },
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
