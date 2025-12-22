import { db } from "./firebase.js";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
let currentUser = null;
let tbrBooks = [];

// Logout handler
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadTBRBooks();
});

// Window dragging
let activeWindow = null;
let offsetX = 0;
let offsetY = 0;

document.querySelectorAll('.window-title-bar').forEach(titleBar => {
  titleBar.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('window-btn')) return;
    
    activeWindow = titleBar.parentElement;
    const rect = activeWindow.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    activeWindow.style.zIndex = 100;
  });
});

document.addEventListener('mousemove', (e) => {
  if (!activeWindow) return;
  
  const x = e.clientX - offsetX;
  const y = e.clientY - offsetY;
  
  activeWindow.style.left = Math.max(0, x) + 'px';
  activeWindow.style.top = Math.max(0, y) + 'px';
});

document.addEventListener('mouseup', () => {
  if (activeWindow) {
    activeWindow.style.zIndex = 10;
    activeWindow = null;
  }
});

// Icon click handlers
document.getElementById('tbrListIcon').addEventListener('click', () => {
  openWindow('tbrWindow');
});

document.getElementById('reviewsIcon').addEventListener('click', async () => {
  openWindow('reviewsWindow');
  await loadReviews();
});

// Window functions
function openWindow(windowId) {
  const win = document.getElementById(windowId);
  win.classList.add('active');
  win.style.zIndex = 100;
}

window.closeWindow = function(windowId) {
  const win = document.getElementById(windowId);
  win.classList.remove('active');
};

// Load TBR books from Firestore
async function loadTBRBooks() {
  if (!currentUser) return;
  
  const tbrRef = collection(db, "users", currentUser.uid, "tbr");
  const snapshot = await getDocs(tbrRef);
  
  tbrBooks = [];
  snapshot.forEach(doc => {
    tbrBooks.push({ id: doc.id, ...doc.data() });
  });
  
  renderTBRList();
}

// Render TBR list
function renderTBRList() {
  const container = document.getElementById('tbrListContainer');
  
  if (tbrBooks.length === 0) {
    container.innerHTML = '<div class="empty-state">Your TBR list is empty!<br>Add some books below ✿</div>';
    return;
  }
  
  container.innerHTML = tbrBooks.map(book => `
    <div class="tbr-item">
      <div class="tbr-item-info">
        <div class="tbr-item-title">${book.title}</div>
        <div class="tbr-item-author">by ${book.author}</div>
      </div>
      <div class="tbr-item-actions">
        <button class="retro-btn" onclick="removeFromTBR('${book.id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

// Add book to TBR
window.addToTBR = async function() {
  const title = document.getElementById('tbrTitle').value.trim();
  const author = document.getElementById('tbrAuthor').value.trim();
  
  if (!title || !author) {
    alert('Please enter both title and author!');
    return;
  }
  
  if (!currentUser) return;
  
  await addDoc(collection(db, "users", currentUser.uid, "tbr"), {
    title,
    author,
    addedAt: new Date()
  });
  
  document.getElementById('tbrTitle').value = '';
  document.getElementById('tbrAuthor').value = '';
  
  await loadTBRBooks();
};

// Remove book from TBR
window.removeFromTBR = async function(bookId) {
  if (!currentUser) return;
  
  await deleteDoc(doc(db, "users", currentUser.uid, "tbr", bookId));
  await loadTBRBooks();
};

// Load reviews from Google Books + Open Library fallback
async function loadReviews() {
  const reviewsContainer = document.getElementById('reviewsContainer');
  const avgRatingEl = document.getElementById('avgRating');
  const totalReviewsEl = document.getElementById('totalReviews');

  if (tbrBooks.length === 0) {
    reviewsContainer.innerHTML =
      '<div class="empty-state">Add books to your TBR list first!</div>';
    avgRatingEl.textContent = '0.0';
    totalReviewsEl.textContent = '0';
    return;
  }

  reviewsContainer.innerHTML =
    '<div class="empty-state">Loading reviews...</div>';

  let allRatings = [];
  let allReviews = [];

  for (const book of tbrBooks) {
    try {
      // ---------- GOOGLE BOOKS ----------
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          book.title + ' ' + book.author
        )}`
      );
      const googleData = await googleRes.json();

      let rating = null;
      let ratingsCount = 0;
      let description = 'No description available';

      if (googleData.items && googleData.items.length > 0) {
        const info = googleData.items[0].volumeInfo;

        if (typeof info.averageRating === 'number') {
          rating = info.averageRating;
          ratingsCount = info.ratingsCount || 0;
        }

        if (info.description) {
          description = info.description.substring(0, 150) + '...';
        }
      }

      // ---------- OPEN LIBRARY FALLBACK ----------
      if (rating === null) {
        const openRes = await fetch(
          `https://openlibrary.org/search.json?title=${encodeURIComponent(
            book.title
          )}&author=${encodeURIComponent(book.author)}`
        );
        const openData = await openRes.json();

        if (openData.docs && openData.docs.length > 0) {
          const doc = openData.docs[0];

          if (typeof doc.ratings_average === 'number') {
            rating = doc.ratings_average;
            ratingsCount = doc.ratings_count || 0;
          }
        }
      }

      // ---------- COLLECT DATA ----------
      if (typeof rating === 'number') {
        allRatings.push(rating);
      }

      allReviews.push({
        title: book.title,
        rating: rating ?? 'N/A',
        ratingsCount,
        description
      });

    } catch (err) {
      console.error('Error loading reviews for', book.title, err);
    }
  }

  // ---------- AVERAGE (NO NaN EVER) ----------
  const sum = allRatings.reduce((total, r) => total + Number(r), 0);
  const avgRating = allRatings.length
    ? (sum / allRatings.length).toFixed(1)
    : '0.0';

  avgRatingEl.textContent = avgRating;
  totalReviewsEl.textContent = allRatings.length;

  // ---------- RENDER ----------
  reviewsContainer.innerHTML = allReviews.map(review => `
    <div class="review-item">
      <div class="review-book-title">${review.title}</div>
      <div class="review-text">${review.description}</div>
      <div class="review-meta">
        <span class="review-rating">★ ${review.rating}</span>
        <span>${review.ratingsCount} ratings</span>
      </div>
    </div>
  `).join('');
}
