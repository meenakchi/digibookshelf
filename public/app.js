// Book data with proper positioning for your bookshelf
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

const books = [
  // Top shelf
  { title: "Fourth Wing", author: "Rebecca Yarros", color: "#d4a5a5", left: "8%", top: "5%" },
  { title: "ACOTAR", author: "Sarah J. Maas", color: "#a8d8d8", left: "15.5%", top: "5%" },
  { title: "The Silent Patient", author: "Alex Michaelides", color: "#d8d8a8", left: "85%", top: "5%" },
  
  // Second shelf
  { title: "Project Hail Mary", author: "Andy Weir", color: "#b8c8d8", left: "8%", top: "23.5%" },
  { title: "Circe", author: "Madeline Miller", color: "#d8b8a8", left: "15.5%", top: "23.5%" },
  { title: "The Midnight Library", author: "Matt Haig", color: "#c8d8b8", left: "23%", top: "23.5%" },
  
  // Third shelf
  { title: "Atomic Habits", author: "James Clear", color: "#a8b8c8", left: "85%", top: "42%" },
  { title: "Dune", author: "Frank Herbert", color: "#c8a898", left: "78%", top: "42%" },
  { title: "The Song of Achilles", author: "Madeline Miller", color: "#b8d8c8", left: "70%", top: "42%" },
  
  // Fourth shelf
  { title: "1984", author: "George Orwell", color: "#a89898", left: "8%", top: "60%" },
  { title: "Educated", author: "Tara Westover", color: "#c8b8a8", left: "15.5%", top: "60%" },
  
  // Bottom shelf
  { title: "The Seven Husbands", author: "Taylor Jenkins Reid", color: "#b8a8b8", left: "55%", top: "81%" },
  { title: "Where the Crawdads Sing", author: "Delia Owens", color: "#a8c8a8", left: "63%", top: "81%" },
];

const layer = document.getElementById("books-layer");
const modal = document.getElementById("modal");
const modalContent = document.querySelector(".modal-content");

// Create book elements
books.forEach(book => {
  const div = document.createElement("div");
  div.className = "book";
  div.style.background = book.color;
  div.style.left = book.left;
  div.style.top = book.top;
  div.textContent = book.title;
  
  div.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal(book);
  });
  
  layer.appendChild(div);
});

function openModal(book) {
  document.getElementById("modal-title").textContent = book.title;
  document.getElementById("modal-author").textContent = `by ${book.author}`;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

// Close modal when clicking on the backdrop (dark area)
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

// Prevent clicks inside modal content from closing
modalContent.addEventListener("click", (e) => {
  e.stopPropagation();
});

// Also allow ESC key to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

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

function addBookToShelf(book) {
  const spine = document.createElement("div");
  spine.className = "book";

  spine.style.background = randomSpineColor();
  spine.style.left = randomShelfX();
  spine.style.top = randomShelfY();

  spine.textContent = book.title;

  spine.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal({
      title: book.title,
      author: book.author
    });
  });

  layer.appendChild(spine);
}
function randomSpineColor() {
  const colors = ["#d4a5a5", "#a8d8d8", "#d8d8a8", "#c8b8a8", "#b8d8c8"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function randomShelfX() {
  return Math.floor(Math.random() * 70 + 10) + "%";
}

function randomShelfY() {
  const rows = ["5%", "23.5%", "42%", "60%", "81%"];
  return rows[Math.floor(Math.random() * rows.length)];
}
