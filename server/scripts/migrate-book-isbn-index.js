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
      console.log('[migrate:isbn] MONGODB_URI khong co ten DB. Tam dung test.');
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

async function normalizeAllBooks(books) {
  const cursor = books.find({}, { projection: { _id: 1, isbn: 1, isbnNormalized: 1 } });
  const bulkOps = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;

    const normalized = normalizeIsbn(doc.isbn);
    const current = doc.isbnNormalized || null;

    if (normalized !== current) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              isbnNormalized: normalized,
              updatedAt: new Date(),
            },
          },
        },
      });
    }

    if (bulkOps.length >= 500) {
      await books.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    await books.bulkWrite(bulkOps, { ordered: false });
  }
}

async function resolveSameLibraryDuplicates(books) {
  const duplicateGroups = await books.aggregate([
    {
      $match: {
        isbnNormalized: { $type: 'string', $ne: '' },
        libraryId: { $exists: true },
      },
    },
    {
      $group: {
        _id: { libraryId: '$libraryId', isbnNormalized: '$isbnNormalized' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  if (duplicateGroups.length === 0) {
    console.log('[migrate:isbn] Khong co duplicate trong cung thu vien.');
    return;
  }

  console.log(`[migrate:isbn] Tim thay ${duplicateGroups.length} nhom duplicate. Dang xu ly...`);

  let touched = 0;
  for (const group of duplicateGroups) {
    const docs = await books.find(
      { _id: { $in: group.ids } },
      { projection: { _id: 1, updatedAt: 1, availableCopies: 1, createdAt: 1 } }
    ).toArray();

    docs.sort((a, b) => {
      const availableA = a.availableCopies || 0;
      const availableB = b.availableCopies || 0;
      if (availableB !== availableA) return availableB - availableA;

      const updatedA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const updatedB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (updatedB !== updatedA) return updatedB - updatedA;

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });

    const keeper = docs[0];
    const demoted = docs.slice(1);

    if (demoted.length > 0) {
      await books.updateMany(
        { _id: { $in: demoted.map((d) => d._id) } },
        {
          $set: {
            isbnNormalized: null,
            updatedAt: new Date(),
          },
        }
      );

      touched += demoted.length;
      console.log(
        `[migrate:isbn] Library=${group._id.libraryId} ISBN=${group._id.isbnNormalized} | keep=${keeper._id} | demoted=${demoted.length}`
      );
    }
  }

  console.log(`[migrate:isbn] Da demote ${touched} ban ghi duplicate.`);
}

async function rebuildIndexes(books) {
  const indexes = await books.indexes();

  if (indexes.some((idx) => idx.name === 'isbn_1')) {
    await books.dropIndex('isbn_1');
    console.log('[migrate:isbn] Da drop index cu isbn_1');
  }

  await books.createIndex(
    { libraryId: 1, isbnNormalized: 1 },
    {
      name: 'libraryId_1_isbnNormalized_1_unique_partial',
      unique: true,
      partialFilterExpression: {
        isbnNormalized: { $exists: true, $type: 'string' },
      },
    }
  );

  console.log('[migrate:isbn] Da dam bao index compound unique partial.');
}

async function run() {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error('MONGODB_URI khong ton tai trong server/.env');
  }

  const mongoUri = ensureDbName(rawUri);
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const books = db.collection('books');

  await normalizeAllBooks(books);
  await resolveSameLibraryDuplicates(books);
  await rebuildIndexes(books);

  console.log('[migrate:isbn] Hoan tat migration.');
}

run()
  .catch((error) => {
    console.error('[migrate:isbn] Loi:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
