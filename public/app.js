// Book data with proper positioning for your bookshelf
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
  
  div.onclick = (e) => {
    e.stopPropagation();
    openModal(book);
  };
  
  layer.appendChild(div);
});

function openModal(book) {
  modal.classList.remove("hidden");
  document.getElementById("modal-title").textContent = book.title;
  document.getElementById("modal-author").textContent = `by ${book.author}`;
}

// Close modal when clicking on the backdrop (not the content)
modal.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
};

// Prevent clicks on modal content from closing the modal
modalContent.onclick = (e) => {
  e.stopPropagation();
};