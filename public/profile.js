import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

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

  // Get favorite genre (most common genre would require API calls, so we'll keep it simple)
  const favoriteGenre = "Mystery"; // Placeholder - you can enhance this

  // Update profile info
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("stat-books").textContent = totalBooks;
  document.getElementById("stat-rating").textContent = avgRating;
  document.getElementById("stat-genre").textContent = favoriteGenre;
});