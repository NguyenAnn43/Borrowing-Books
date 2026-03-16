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
      console.log('[seed:wishlist] MONGODB_URI khong co ten DB. Tam dung test.');
    }
    return parsed.toString();
  } catch {
    return uri;
  }
}

async function run() {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) throw new Error('MONGODB_URI khong ton tai trong server/.env');

  const mongoUri = ensureDbName(rawUri);
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const users = db.collection('users');
  const books = db.collection('books');
  const wishlists = db.collection('wishlists');

  const user = await users.findOne({}, { projection: { _id: 1, email: 1 } });
  if (!user?._id) throw new Error('Khong tim thay user de seed wishlist');

  const pickedBooks = await books
    .find({}, { projection: { _id: 1, title: 1 } })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  if (!pickedBooks.length) throw new Error('Khong co sach de seed wishlist');

  let inserted = 0;
  for (const book of pickedBooks) {
    const result = await wishlists.updateOne(
      { userId: user._id, bookId: book._id },
      { $setOnInsert: { userId: user._id, bookId: book._id, createdAt: new Date() } },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
      await books.updateOne({ _id: book._id }, { $inc: { wishlistCount: 1 } });
    }
  }

  const total = await wishlists.countDocuments({ userId: user._id });
  console.log(`[seed:wishlist] User: ${user.email || user._id}`);
  console.log(`[seed:wishlist] Upsert moi: ${inserted}`);
  console.log(`[seed:wishlist] Tong wishlist cua user: ${total}`);
}

run()
  .catch((error) => {
    console.error('[seed:wishlist] Loi:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
