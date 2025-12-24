import { db } from "./firebase.js";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
let currentUser = null;
let tbrBooks = [];

// Rewards and book boyfriends data
const REWARDS = [
  { id: 'first_book', name: 'First Book', icon: 'https://win98icons.alexmeub.com/icons/png/file_lines-0.png', desc: 'Added your first book', requirement: 1 },
  { id: 'bookworm', name: 'Bookworm', icon: 'https://win98icons.alexmeub.com/icons/png/help_book_small-2.png', desc: 'Read 5 books', requirement: 5 },
  { id: 'scholar', name: 'Scholar', icon: 'https://win98icons.alexmeub.com/icons/png/directory_fonts-0.png', desc: 'Read 10 books', requirement: 10 },
  { id: 'week_streak', name: 'Week Warrior', icon: 'https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-4.png', desc: '7 day streak', requirement: 7 },
  { id: 'genre_explorer', name: 'Genre Explorer', icon: 'https://win98icons.alexmeub.com/icons/png/camera-0.png', desc: 'Read 3+ genres', requirement: 3 }
];

const BOOK_BOYFRIENDS = [
  { id: 'malakai', name: 'Kai Azer', series: 'Powerless', author: 'Lauren Roberts'},
  { id: 'rhysand', name: 'Rhysand', series: 'ACOTAR', author: 'Sarah J. Maas' },
  { id: 'azriel', name: 'Azriel', series: 'ACOTAR', author: 'Sarah J. Maas' },
  { id: 'aaron_warner', name: 'Aaron Warner', series: 'Shatter Me', author: 'Tahereh Mafi' },
  { id: 'cardan', name: 'Cardan', series: 'The Cruel Prince', author: 'Holly Black'},
  { id: 'xaden', name: 'Xaden Riorson', series: 'Fourth Wing', author: 'Rebecca Yarros' },
  { id: 'rowan', name: 'Rowan Whitethorn', series: 'Throne of Glass', author: 'Sarah J. Maas' },
  { id: 'ravi', name: 'Ravi Singh', series: 'Good girl guide to murder', author: 'Holly Jackson' },
  { id: 'julien', name: 'Julien', series: 'Caraval', author: 'Stephanie Garber' },
  { id: 'Jacks', name: 'Lord Jacks', series: 'Once upon a broken heart', author: 'Stephaine Garber' },
  { id: 'Zade', name: 'Zade Meadows', series: 'Haunting Adeline', author: 'H.D Carlton' },
  { id: 'percy', name: 'Percy Jackson', series: 'Percy & the olympians', author: 'Rick Riordan'},

];

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

document.getElementById('rewardsIcon').addEventListener('click', async () => {
  openWindow('rewardsWindow');
  await loadRewards();
});

document.getElementById('boyfriendsIcon').addEventListener('click', async () => {
  openWindow('boyfriendsWindow');
  await loadBoyfriends();
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

  const sum = allRatings.reduce((total, r) => total + Number(r), 0);
  const avgRating = allRatings.length
    ? (sum / allRatings.length).toFixed(1)
    : '0.0';

  avgRatingEl.textContent = avgRating;
  totalReviewsEl.textContent = allRatings.length;

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

// Load and display rewards
async function loadRewards() {
  if (!currentUser) return;

  const booksSnapshot = await getDocs(collection(db, "users", currentUser.uid, "books"));
  const books = [];
  booksSnapshot.forEach(doc => books.push(doc.data()));

  const rewardsRef = doc(db, "users", currentUser.uid, "rewards", "data");
  const rewardsDoc = await getDoc(rewardsRef);
  
  let streak = 0;
  let lastVisit = null;
  let unlockedRewards = new Set();

  if (rewardsDoc.exists()) {
    const data = rewardsDoc.data();
    lastVisit = data.lastVisit?.toDate();
    streak = data.streak || 0;
    unlockedRewards = new Set(data.unlocked || []);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lastVisit) {
    const lastDate = new Date(lastVisit);
    lastDate.setHours(0, 0, 0, 0);
    const dayDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      streak++;
    } else if (dayDiff > 1) {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  await setDoc(rewardsRef, {
    streak,
    lastVisit: new Date(),
    unlocked: Array.from(unlockedRewards)
  }, { merge: true });

  const totalBooks = books.length;
  const genres = new Set();
  books.forEach(book => {
    if (book.genres) {
      book.genres.forEach(g => genres.add(g));
    }
  });

  REWARDS.forEach(reward => {
    let shouldUnlock = false;

    switch(reward.id) {
      case 'first_book':
        shouldUnlock = totalBooks >= 1;
        break;
      case 'bookworm':
        shouldUnlock = totalBooks >= 5;
        break;
      case 'scholar':
        shouldUnlock = totalBooks >= 10;
        break;
      case 'week_streak':
        shouldUnlock = streak >= 7;
        break;
      case 'genre_explorer':
        shouldUnlock = genres.size >= 3;
        break;
    }

    if (shouldUnlock && !unlockedRewards.has(reward.id)) {
      unlockedRewards.add(reward.id);
    }
  });

  await setDoc(rewardsRef, {
    streak,
    lastVisit: new Date(),
    unlocked: Array.from(unlockedRewards)
  }, { merge: true });

  document.getElementById('currentStreak').textContent = `${streak} days`;

 // Replace the rendering part of your loadRewards function with this:
const rewardsContainer = document.getElementById('rewardsContainer');
rewardsContainer.innerHTML = REWARDS.map(reward => {
  // Check directly against the Set you defined earlier in the function
  const isAchieved = unlockedRewards.has(reward.id); 
  
  return `
    <div class="tbr-item ${isAchieved ? '' : 'locked'}">
      <div class="tbr-item-info">
        <div class="tbr-item-title">
          <img src="${reward.icon}" style="width:16px; height:16px; margin-right:5px; image-rendering:pixelated;">
          ${reward.name}
        </div>
        <div class="tbr-item-author">${reward.desc}</div>
      </div>
      <div class="tbr-item-actions">
        ${isAchieved 
          ? '<span class="status-tag">Achieved!</span>' 
          : `<span class="status-tag" style="color:#808080;">Locked</span>`}
      </div>
    </div>
  `;
}).join('');
}

// Load and display book boyfriends
async function loadBoyfriends() {
  if (!currentUser) return;

  const booksSnapshot = await getDocs(collection(db, "users", currentUser.uid, "books"));
  const books = [];
  booksSnapshot.forEach(doc => books.push(doc.data()));

  const boyfriendsRef = doc(db, "users", currentUser.uid, "boyfriends", "data");
  const boyfriendsDoc = await getDoc(boyfriendsRef);
  
  let unlockedBoyfriends = new Set();
  if (boyfriendsDoc.exists()) {
    unlockedBoyfriends = new Set(boyfriendsDoc.data().unlocked || []);
  }

  for (const boyfriend of BOOK_BOYFRIENDS) {
    const hasReadSeries = books.some(book => 
      book.author?.toLowerCase().includes(boyfriend.author.toLowerCase()) ||
      book.title?.toLowerCase().includes(boyfriend.series.toLowerCase())
    );
    
    if (hasReadSeries && !unlockedBoyfriends.has(boyfriend.id)) {
      unlockedBoyfriends.add(boyfriend.id);
    }
  }

  await setDoc(boyfriendsRef, {
    unlocked: Array.from(unlockedBoyfriends)
  }, { merge: true });

  const boyfriendsContainer = document.getElementById('boyfriendsContainer');
// Locate the loadBoyfriends function in tbr.js and update the mapping:
boyfriendsContainer.innerHTML = BOOK_BOYFRIENDS.map(boyfriend => {
  const isUnlocked = unlockedBoyfriends.has(boyfriend.id);
  return `
    <div class="tbr-item ${isUnlocked ? '' : 'locked'}">
      <div class="tbr-item-info">
        <div class="tbr-item-title">${boyfriend.name}</div>
        <div class="tbr-item-author">Series: ${boyfriend.series}</div>
      </div>
      <div class="tbr-item-actions">
        ${isUnlocked 
          ? '<span class="status-tag">Unlocked!</span>' 
          : '<button class="retro-btn" disabled>Locked</button>'}
      </div>
    </div>
  `;
}).join('');
}