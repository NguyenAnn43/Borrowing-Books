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

const librariesPayload = [
  {
    name: 'Thu vien Demo Wishlist',
    code: 'WLST01',
    address: '123 Seed Street, Ho Chi Minh City',
    phone: '0900000000',
    email: 'wishlist-seed@library.local',
    status: 'active',
    workingHours: { open: '08:00', close: '17:00' },
    description: 'Library chinh cho du lieu demo',
  },
  {
    name: 'Thu vien Demo Branch',
    code: 'WLST02',
    address: '456 Branch Street, Ho Chi Minh City',
    phone: '0900000001',
    email: 'wishlist-seed-branch@library.local',
    status: 'active',
    workingHours: { open: '08:00', close: '17:00' },
    description: 'Library chi nhanh cho du lieu lien thu vien',
  },
];

const booksPayload = [
  {
    libraryCode: 'WLST01',
    isbn: '978-604-123-4501',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    publishYear: 2008,
    category: 'Software Engineering',
    description: 'Sach nen co trong wishlist cho dev.',
    language: 'en',
    pageCount: 464,
    tags: ['seed-book', 'clean-code', 'software'],
    location: 'A1-01',
    totalCopies: 5,
    availableCopies: 5,
    status: 'available',
  },
  {
    libraryCode: 'WLST02',
    isbn: '9786041234501',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    publishYear: 2008,
    category: 'Software Engineering',
    description: 'Cung ISBN o thu vien khac de test alternatives.',
    language: 'en',
    pageCount: 464,
    tags: ['seed-book', 'clean-code', 'software', 'cross-library'],
    location: 'B1-01',
    totalCopies: 3,
    availableCopies: 3,
    status: 'available',
  },
  {
    libraryCode: 'WLST01',
    isbn: '9786041234502',
    title: 'Refactoring',
    author: 'Martin Fowler',
    publisher: 'Addison-Wesley',
    publishYear: 2018,
    category: 'Software Engineering',
    description: 'Tai ban Refactoring cho danh sach yeu thich.',
    language: 'en',
    pageCount: 448,
    tags: ['seed-book', 'refactoring'],
    location: 'A1-02',
    totalCopies: 4,
    availableCopies: 4,
    status: 'available',
  },
  {
    libraryCode: 'WLST02',
    isbn: '9786041234506',
    title: 'System Design Interview',
    author: 'Alex Xu',
    publisher: 'ByteByteGo',
    publishYear: 2020,
    category: 'System Design',
    description: 'Sach phu hop de test wishlist + search.',
    language: 'en',
    pageCount: 322,
    tags: ['seed-book', 'interview', 'system-design'],
    location: 'B1-06',
    totalCopies: 5,
    availableCopies: 5,
    status: 'available',
  },
  {
    libraryCode: 'WLST01',
    isbn: '9786041234505',
    title: 'Grokking Algorithms',
    author: 'Aditya Bhargava',
    publisher: 'Manning',
    publishYear: 2016,
    category: 'Algorithms',
    description: 'Sach co ban cho wishlist hoc thuat toan.',
    language: 'en',
    pageCount: 256,
    tags: ['seed-book', 'algorithms'],
    location: 'A1-05',
    totalCopies: 7,
    availableCopies: 7,
    status: 'available',
  },
];

async function run() {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error('MONGODB_URI khong ton tai trong server/.env');
  }

  const mongoUri = ensureDbName(rawUri);
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const libraries = db.collection('libraries');
  const books = db.collection('books');

  for (const library of librariesPayload) {
    await libraries.updateOne(
      { code: library.code },
      {
        $set: {
          ...library,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  const libraryDocs = await libraries
    .find({ code: { $in: librariesPayload.map((item) => item.code) } }, { projection: { _id: 1, code: 1 } })
    .toArray();

  const libraryByCode = new Map(libraryDocs.map((item) => [item.code, item._id]));

  let upserted = 0;
  for (const item of booksPayload) {
    const { libraryCode, ...bookData } = item;

    const libraryId = libraryByCode.get(libraryCode);
    if (!libraryId) {
      throw new Error(`Khong tim thay library cho code ${libraryCode}`);
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

  const totalBooks = await books.countDocuments({ tags: 'seed-book' });
  console.log(`[seed:books] Hoan tat. Upsert moi: ${upserted}. Tong sach seed-book: ${totalBooks}`);
}

run()
  .catch((error) => {
    console.error('[seed:books] Loi:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
