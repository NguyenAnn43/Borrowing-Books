# Sample MongoDB data (mongosh)

This script inserts sample libraries and books into the `borrowing_books` database.

```js
use borrowing_books

const now = new Date();

const libraryResult = db.libraries.insertMany([
  {
    name: "Central City Library",
    code: "CCL",
    address: "12 Main Street, Central City",
    phone: "+84-28-1234-5678",
    email: "hello@ccl.example",
    status: "active",
    workingHours: { open: "08:00", close: "18:00" },
    description: "Main public library in Central City.",
    createdAt: now,
    updatedAt: now
  },
  {
    name: "Tech University Library",
    code: "TUL",
    address: "99 Innovation Ave, District 1",
    phone: "+84-28-8888-2222",
    email: "library@tul.example",
    status: "active",
    workingHours: { open: "07:30", close: "19:00" },
    description: "Academic library focused on engineering and technology.",
    createdAt: now,
    updatedAt: now
  },
  {
    name: "Westside Community Library",
    code: "WCL",
    address: "45 River Road, Westside",
    phone: "+84-28-7777-1111",
    email: "contact@wcl.example",
    status: "active",
    workingHours: { open: "08:30", close: "17:30" },
    description: "Community library with family reading programs.",
    createdAt: now,
    updatedAt: now
  }
]);

const libraryIds = Object.values(libraryResult.insertedIds);

const booksResult = db.books.insertMany([
  {
    isbn: "978-0132350884",
    title: "Clean Code",
    author: "Robert C. Martin",
    publisher: "Prentice Hall",
    publishYear: 2008,
    category: "Software",
    description: "A handbook of agile software craftsmanship.",
    coverImage: "https://images.example/clean-code.jpg",
    language: "en",
    pageCount: 464,
    tags: ["clean code", "programming", "best practices"],
    location: "A1-01",
    libraryId: libraryIds[1],
    totalCopies: 8,
    availableCopies: 6,
    status: "available",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-0201616224",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt, David Thomas",
    publisher: "Addison-Wesley",
    publishYear: 1999,
    category: "Software",
    description: "Practical advice for software developers.",
    coverImage: "https://images.example/pragmatic-programmer.jpg",
    language: "en",
    pageCount: 352,
    tags: ["software", "career", "craft"],
    location: "A1-02",
    libraryId: libraryIds[1],
    totalCopies: 5,
    availableCopies: 2,
    status: "available",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-0262033848",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    publisher: "MIT Press",
    publishYear: 2009,
    category: "Computer Science",
    description: "Classic algorithms textbook.",
    coverImage: "https://images.example/algorithms.jpg",
    language: "en",
    pageCount: 1312,
    tags: ["algorithms", "data structures"],
    location: "A2-01",
    libraryId: libraryIds[1],
    totalCopies: 4,
    availableCopies: 0,
    status: "unavailable",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-0140449136",
    title: "The Odyssey",
    author: "Homer",
    publisher: "Penguin Classics",
    publishYear: 2003,
    category: "Literature",
    description: "Epic Greek poem about Odysseus's journey.",
    coverImage: "https://images.example/odyssey.jpg",
    language: "en",
    pageCount: 560,
    tags: ["classic", "mythology"],
    location: "B1-10",
    libraryId: libraryIds[0],
    totalCopies: 10,
    availableCopies: 7,
    status: "available",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-0061120084",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    publisher: "Harper Perennial",
    publishYear: 2006,
    category: "Literature",
    description: "A novel about justice and empathy in the American South.",
    coverImage: "https://images.example/mockingbird.jpg",
    language: "en",
    pageCount: 336,
    tags: ["classic", "novel"],
    location: "B1-12",
    libraryId: libraryIds[0],
    totalCopies: 7,
    availableCopies: 5,
    status: "available",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-0553213119",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publisher: "Bantam Classics",
    publishYear: 1983,
    category: "Literature",
    description: "Romantic novel of manners.",
    coverImage: "https://images.example/pride-prejudice.jpg",
    language: "en",
    pageCount: 279,
    tags: ["romance", "classic"],
    location: "B2-02",
    libraryId: libraryIds[2],
    totalCopies: 6,
    availableCopies: 4,
    status: "available",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-0345391803",
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
    publisher: "Del Rey",
    publishYear: 1995,
    category: "Science Fiction",
    description: "Comedy sci-fi adventure across the universe.",
    coverImage: "https://images.example/hitchhikers-guide.jpg",
    language: "en",
    pageCount: 224,
    tags: ["sci-fi", "humor"],
    location: "C1-04",
    libraryId: libraryIds[2],
    totalCopies: 9,
    availableCopies: 9,
    status: "available",
    createdAt: now,
    updatedAt: now
  },
  {
    isbn: "978-1119457893",
    title: "Design Thinking",
    author: "Michael Lewrick",
    publisher: "Wiley",
    publishYear: 2018,
    category: "Business",
    description: "Hands-on guide to design thinking and innovation.",
    coverImage: "https://images.example/design-thinking.jpg",
    language: "en",
    pageCount: 292,
    tags: ["innovation", "design"],
    location: "D2-01",
    libraryId: libraryIds[0],
    totalCopies: 3,
    availableCopies: 1,
    status: "available",
    createdAt: now,
    updatedAt: now
  }
]);

print(`Inserted ${libraryResult.insertedCount} libraries and ${booksResult.insertedCount} books.`);
```
