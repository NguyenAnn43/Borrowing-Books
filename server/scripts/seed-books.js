/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function ensureDbName(uri) {
  try {
    const parsed = new URL(uri);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/test';
      console.log('[seed:books] MONGODB_URI khong co ten DB. Tam dung test.');
    }
    return parsed.toString();
  } catch {
    return uri;
  }
}

function normalizeIsbn(isbn) {
  if (!isbn || typeof isbn !== 'string') return null;
  const normalized = isbn.trim().toUpperCase().replace(/-/g, '').replace(/\s+/g, '');
  return normalized || null;
}

const booksPayload = [
  {
    libraryCode: 'LIBC01',
    isbn: '978-604-001-0001',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=900&auto=format&fit=crop',
    publisher: 'Prentice Hall',
    publishYear: 2017,
    category: 'Cong nghe thong tin',
    description: 'Sach ve kien truc phan mem.',
    language: 'en',
    pageCount: 432,
    tags: ['seed-book', 'architecture'],
    location: 'A1-01',
    price: 210000,
    totalCopies: 6,
    availableCopies: 6,
  },
  {
    libraryCode: 'LIBC01',
    isbn: '978-604-001-0002',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    coverImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=900&auto=format&fit=crop',
    publisher: "O'Reilly Media",
    publishYear: 2017,
    category: 'Cong nghe thong tin',
    description: 'Sach ve he thong du lieu lon.',
    language: 'en',
    pageCount: 616,
    tags: ['seed-book', 'data'],
    location: 'A1-02',
    price: 320000,
    totalCopies: 4,
    availableCopies: 4,
  },
  {
    libraryCode: 'LIBC02',
    isbn: '978-604-001-0001',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    coverImage: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=900&auto=format&fit=crop',
    publisher: 'Prentice Hall',
    publishYear: 2017,
    category: 'Cong nghe thong tin',
    description: 'Ban sao lien thu vien cua Clean Architecture.',
    language: 'en',
    pageCount: 432,
    tags: ['seed-book', 'architecture', 'cross-library'],
    location: 'B1-05',
    price: 210000,
    totalCopies: 3,
    availableCopies: 3,
  },
  {
    libraryCode: 'LIBC02',
    isbn: '978-604-001-0003',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas',
    coverImage: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=900&auto=format&fit=crop',
    publisher: 'Addison-Wesley',
    publishYear: 2019,
    category: 'Cong nghe thong tin',
    description: 'Sach nen doc cho lap trinh vien.',
    language: 'en',
    pageCount: 352,
    tags: ['seed-book', 'programming'],
    location: 'B1-07',
    price: 185000,
    totalCopies: 5,
    availableCopies: 5,
  },
  {
    libraryCode: 'LIBC03',
    isbn: '978-604-001-0004',
    title: 'Grokking Algorithms',
    author: 'Aditya Bhargava',
    coverImage: 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?q=80&w=900&auto=format&fit=crop',
    publisher: 'Manning',
    publishYear: 2016,
    category: 'Cong nghe thong tin',
    description: 'Nhap mon thuat toan de hieu.',
    language: 'en',
    pageCount: 256,
    tags: ['seed-book', 'algorithms'],
    location: 'C1-03',
    price: 165000,
    totalCopies: 7,
    availableCopies: 7,
  },
  {
    libraryCode: 'LIBC03',
    isbn: '978-604-001-0005',
    title: 'Refactoring',
    author: 'Martin Fowler',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=900&auto=format&fit=crop',
    publisher: 'Addison-Wesley',
    publishYear: 2018,
    category: 'Cong nghe thong tin',
    description: 'Huong dan cai tien ma nguon.',
    language: 'en',
    pageCount: 448,
    tags: ['seed-book', 'refactoring'],
    location: 'C1-04',
    price: 295000,
    totalCopies: 4,
    availableCopies: 4,
  },
];

async function run() {
  const rawUri = process.env.MONGODB_URI || process.env.DB_URI;
  if (!rawUri) {
    throw new Error('MONGODB_URI hoac DB_URI khong ton tai trong server/.env');
  }

  const mongoUri = ensureDbName(rawUri);
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const libraries = db.collection('libraries');
  const books = db.collection('books');

  const libraryCodes = [...new Set(booksPayload.map((item) => item.libraryCode))];
  const libraryDocs = await libraries
    .find({ code: { $in: libraryCodes } }, { projection: { _id: 1, code: 1 } })
    .toArray();

  const libraryByCode = new Map(libraryDocs.map((item) => [item.code, item._id]));

  const missingCodes = libraryCodes.filter((code) => !libraryByCode.has(code));
  if (missingCodes.length > 0) {
    throw new Error(`Khong tim thay library theo code: ${missingCodes.join(', ')}. Hay chay seed:libraries truoc.`);
  }

  let upserted = 0;
  for (const payload of booksPayload) {
    const { libraryCode, ...bookData } = payload;
    const libraryId = libraryByCode.get(libraryCode);
    if (!libraryId) {
      throw new Error(`Khong tim thay libraryId cho code ${libraryCode}`);
    }

    const normalizedIsbn = normalizeIsbn(bookData.isbn);
    const filter = normalizedIsbn
      ? { libraryId, isbnNormalized: normalizedIsbn }
      : { libraryId, title: bookData.title, author: bookData.author };

    const result = await books.updateOne(
      filter,
      {
        $set: {
          ...bookData,
          isbnNormalized: normalizedIsbn,
          libraryId,
          status: bookData.availableCopies > 0 ? 'available' : 'unavailable',
          wishlistCount: 0,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) upserted += 1;
  }

  const total = await books.countDocuments({ tags: 'seed-book' });
  console.log(`[seed:books] Hoan tat. Upsert moi: ${upserted}. Tong sach seed-book: ${total}`);
}

run()
  .catch((error) => {
    console.error('[seed:books] Loi:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
