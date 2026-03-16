/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function ensureDbName(uri) {
  try {
    const parsed = new URL(uri);
    const hasDbName = parsed.pathname && parsed.pathname !== '/' && parsed.pathname.trim() !== '';
    if (hasDbName) return uri;

    parsed.pathname = '/test';
    console.log('[seed] MONGODB_URI khong co ten DB. Tam dung test.');
    return parsed.toString();
  } catch {
    return uri;
  }
}

const libraryPayload = {
  name: 'Thu vien Seed Wishlist',
  code: 'WLST01',
  address: '123 Seed Street, Ho Chi Minh City',
  phone: '0900000000',
  email: 'wishlist-seed@library.local',
  status: 'active',
  workingHours: { open: '08:00', close: '17:00' },
  description: 'Library duoc tao tu script seed wishlist',
};

const booksPayload = [
  {
    isbn: '9786041234501',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    publishYear: 2008,
    category: 'Software Engineering',
    description: 'Sach nen co trong wishlist cho dev.',
    language: 'en',
    pageCount: 464,
    tags: ['wishlist-seed', 'clean-code', 'software'],
    location: 'A1-01',
    totalCopies: 5,
    availableCopies: 5,
    status: 'available',
  },
  {
    isbn: '9786041234502',
    title: 'Refactoring',
    author: 'Martin Fowler',
    publisher: 'Addison-Wesley',
    publishYear: 2018,
    category: 'Software Engineering',
    description: 'Tai ban Refactoring cho danh sach yeu thich.',
    language: 'en',
    pageCount: 448,
    tags: ['wishlist-seed', 'refactoring'],
    location: 'A1-02',
    totalCopies: 4,
    availableCopies: 4,
    status: 'available',
  },
  {
    isbn: '9786041234503',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt, David Thomas',
    publisher: 'Addison-Wesley',
    publishYear: 2019,
    category: 'Programming',
    description: 'Goi y hay de bo vao wishlist.',
    language: 'en',
    pageCount: 352,
    tags: ['wishlist-seed', 'pragmatic'],
    location: 'A1-03',
    totalCopies: 6,
    availableCopies: 6,
    status: 'available',
  },
  {
    isbn: '9786041234504',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    publisher: 'O\'Reilly Media',
    publishYear: 2017,
    category: 'System Design',
    description: 'Sach ve he thong du lieu cho wishlist.',
    language: 'en',
    pageCount: 616,
    tags: ['wishlist-seed', 'data', 'system-design'],
    location: 'A1-04',
    totalCopies: 3,
    availableCopies: 3,
    status: 'available',
  },
  {
    isbn: '9786041234505',
    title: 'Grokking Algorithms',
    author: 'Aditya Bhargava',
    publisher: 'Manning',
    publishYear: 2016,
    category: 'Algorithms',
    description: 'Sach co ban cho wishlist hoc thuat toan.',
    language: 'en',
    pageCount: 256,
    tags: ['wishlist-seed', 'algorithms'],
    location: 'A1-05',
    totalCopies: 7,
    availableCopies: 7,
    status: 'available',
  },
  {
    isbn: '9786041234506',
    title: 'System Design Interview',
    author: 'Alex Xu',
    publisher: 'ByteByteGo',
    publishYear: 2020,
    category: 'System Design',
    description: 'Sach phu hop de test wishlist + search.',
    language: 'en',
    pageCount: 322,
    tags: ['wishlist-seed', 'interview', 'system-design'],
    location: 'A1-06',
    totalCopies: 5,
    availableCopies: 5,
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

  await libraries.updateOne(
    { code: libraryPayload.code },
    {
      $set: {
        ...libraryPayload,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  const library = await libraries.findOne({ code: libraryPayload.code }, { projection: { _id: 1 } });
  if (!library || !library._id) {
    throw new Error('Khong tao/lay duoc library seed WLST01');
  }

  let upserted = 0;
  for (const item of booksPayload) {
    const result = await books.updateOne(
      { isbn: item.isbn },
      {
        $set: {
          ...item,
          libraryId: library._id,
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

  const seededBooks = await books
    .find({ tags: 'wishlist-seed' }, { projection: { _id: 1, title: 1, isbn: 1 } })
    .sort({ title: 1 })
    .toArray();

  console.log(`[seed] Hoan tat. Upsert moi: ${upserted}. Tong sach wishlist-seed: ${seededBooks.length}`);
  for (const b of seededBooks) {
    console.log(`- ${b._id} | ${b.title} | ${b.isbn}`);
  }
}

run()
  .catch((error) => {
    console.error('[seed] Loi:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
