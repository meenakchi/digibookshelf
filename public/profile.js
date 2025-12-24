import { db } from "./firebase.js";
import { collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

// CHARACTER DATA
const characters = [
  { id: 'character1', name: 'Baddie', image: '/assets/character1.png' },
  { id: 'ninja', name: 'Ninja', image: '/assets/ninja.png' },
  { id: 'mage', name: 'Mage', image: '/assets/mage_f.png' },
  { id: 'girl', name: 'Green Girl', image: '/assets/greengirl.png' },
  { id: 'folk', name: 'Folk', image: '/assets/folk.png' },
  { id: 'warrior', name: 'Warrior', image: '/assets/warrior_f.png' },
];

// BOOK BOYFRIENDS DATA (matching tbr.js)
const BOOK_BOYFRIENDS = [
  { 
    id: 'malakai', 
    name: 'Kai Azer', 
    series: 'Powerless', 
    author: 'Lauren Roberts',
    sprite: '/assets/kaiazer.png' // Map to your character sprites
  },
  { 
    id: 'rhysand', 
    name: 'Rhysand', 
    series: 'ACOTAR', 
    author: 'Sarah J. Maas',
    sprite: '/assets/character1.png'
  },
  { 
    id: 'ravi', 
    name: 'Ravi Singh', 
    series: 'A good girl guide to murder', 
    author: 'Holly Jackson',
    sprite: '/assets/ravisingh.png'
  },
  { 
    id: 'azriel', 
    name: 'Azriel', 
    series: 'ACOTAR', 
    author: 'Sarah J. Maas',
    sprite: '/assets/folk.png'
  },
  { 
    id: 'aaron_warner', 
    name: 'Aaron Warner', 
    series: 'Shatter Me', 
    author: 'Tahereh Mafi',
    sprite: '/assets/warrior_f.png'
  },
  { 
    id: 'cardan', 
    name: 'Cardan', 
    series: 'The Cruel Prince', 
    author: 'Holly Black',
    sprite: '/assets/carden.png'
  },
  { 
    id: 'xaden', 
    name: 'Xaden Riorson', 
    series: 'Fourth Wing', 
    author: 'Rebecca Yarros',
    sprite: '/assets/xaden.png'
  },
  { 
    id: 'rowan', 
    name: 'Rowan Whitethorn', 
    series: 'Throne of Glass', 
    author: 'Sarah J. Maas',
    sprite: '/assets/ninja.png'
  },
    { 
    id: 'zade', 
    name: 'Zade Meadows', 
    series: 'Haunting adeline', 
    author: 'H.D Carlton',
    sprite: '/assets/zade.png'
  }

];

let currentCharacterIndex = 0;

// Load character from database
async function loadSavedCharacter(uid) {
  try {
    const docRef = doc(db, "users", uid, "profile", "character");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const savedChar = docSnap.data();
      const charIndex = characters.findIndex(c => c.id === savedChar.id);
      if (charIndex !== -1) {
        currentCharacterIndex = charIndex;
        updateCurrentCharacter();
      }
    } else {
      updateCurrentCharacter();
    }
  } catch (err) {
    console.error('Error loading character:', err);
    updateCurrentCharacter();
  }
}

// Update the main profile character display
function updateCurrentCharacter() {
  const char = characters[currentCharacterIndex];
  const currentCharImg = document.querySelector('#currentCharacter img');
  if (currentCharImg) {
    currentCharImg.src = char.image;
    currentCharImg.alt = char.name;
  }
}

// Update carousel display
function updateCarousel() {
  const char = characters[currentCharacterIndex];
  const carouselImg = document.querySelector('#carouselCharacter img');
  const charName = document.getElementById('characterName');
  
  if (carouselImg) {
    carouselImg.src = char.image;
    carouselImg.alt = char.name;
  }
  
  if (charName) {
    charName.textContent = char.name;
  }
}

// Load and display boyfriends collection
async function loadBoyfriends(uid) {
  const showcase = document.getElementById('boyfriendsShowcase');
  if (!showcase) return;

  try {
    // Get user's books
    const booksSnapshot = await getDocs(collection(db, "users", uid, "books"));
    const books = [];
    booksSnapshot.forEach(doc => books.push(doc.data()));

    // Get unlocked boyfriends
    const boyfriendsRef = doc(db, "users", uid, "boyfriends", "data");
    const boyfriendsDoc = await getDoc(boyfriendsRef);
    
    let unlockedBoyfriends = new Set();
    if (boyfriendsDoc.exists()) {
      unlockedBoyfriends = new Set(boyfriendsDoc.data().unlocked || []);
    }

    // Check which boyfriends should be unlocked
    for (const boyfriend of BOOK_BOYFRIENDS) {
      const hasReadSeries = books.some(book => 
        book.author?.toLowerCase().includes(boyfriend.author.toLowerCase()) ||
        book.title?.toLowerCase().includes(boyfriend.series.toLowerCase())
      );
      
      if (hasReadSeries && !unlockedBoyfriends.has(boyfriend.id)) {
        unlockedBoyfriends.add(boyfriend.id);
      }
    }

    // Save updated unlocked boyfriends
    await setDoc(boyfriendsRef, {
      unlocked: Array.from(unlockedBoyfriends)
    }, { merge: true });

    // Render boyfriends showcase
    showcase.innerHTML = BOOK_BOYFRIENDS.map(boyfriend => {
      const isUnlocked = unlockedBoyfriends.has(boyfriend.id);
      return `
        <div class="boyfriend-display ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="boyfriend-platform"></div>
          <div class="boyfriend-sprite ${isUnlocked ? '' : 'locked'}">
            <img src="${boyfriend.sprite}" alt="${boyfriend.name}" />
          </div>
          <div class="boyfriend-label">
            ${boyfriend.name}
            ${!isUnlocked ? '<div class="boyfriend-unlock-hint">Read ' + boyfriend.series + '</div>' : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading boyfriends:', err);
    showcase.innerHTML = '<div class="empty-state">Error loading collection</div>';
  }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Toggle character selector visibility
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => {
      const selector = document.getElementById('characterSelector');
      const wasHidden = selector.classList.contains('hidden');
      selector.classList.toggle('hidden');
      
      if (wasHidden) {
        setTimeout(() => {
          updateCarousel();
        }, 10);
      }
    });
  }

  // Previous character
  const prevBtn = document.getElementById('prevChar');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCharacterIndex = (currentCharacterIndex - 1 + characters.length) % characters.length;
      updateCarousel();
    });
  }

  // Next character
  const nextBtn = document.getElementById('nextChar');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCharacterIndex = (currentCharacterIndex + 1) % characters.length;
      updateCarousel();
    });
  }

  // Select character and save
  const selectBtn = document.getElementById('selectCharBtn');
  if (selectBtn) {
    selectBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) return;

      const selectedChar = characters[currentCharacterIndex];
      
      try {
        await setDoc(doc(db, "users", user.uid, "profile", "character"), {
          id: selectedChar.id,
          name: selectedChar.name,
          image: selectedChar.image,
          updatedAt: new Date()
        });
        
        updateCurrentCharacter();
        document.getElementById('characterSelector').classList.add('hidden');
        alert('Character saved! ♡');
      } catch (err) {
        console.error('Error saving character:', err);
        alert('Failed to save character');
      }
    });
  }
});

// Main auth state handler
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Load saved character
  await loadSavedCharacter(user.uid);

  // Load boyfriends collection
  await loadBoyfriends(user.uid);

  // Get user's books to calculate stats
  const booksSnapshot = await getDocs(collection(db, "users", user.uid, "books"));
  const books = [];
  booksSnapshot.forEach(doc => books.push(doc.data()));

  // Calculate stats
  const totalBooks = books.length;
  const ratedBooks = books.filter(b => b.rating > 0);
  const avgRating = ratedBooks.length > 0 
    ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
    : "0.0";

  // Get favorite genre (most common genre)
  const genreCounts = {};
  books.forEach(book => {
    if (book.genres && book.genres.length > 0) {
      book.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  let favoriteGenre = "Mystery";
  let maxCount = 0;
  for (const [genre, count] of Object.entries(genreCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteGenre = genre;
    }
  }

  // Update profile info
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("stat-books").textContent = totalBooks;
  document.getElementById("stat-rating").textContent = avgRating;
  document.getElementById("stat-genre").textContent = favoriteGenre;
});