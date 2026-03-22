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
      console.log('[seed:libraries] MONGODB_URI khong co ten DB. Tam dung test.');
    }
    return parsed.toString();
  } catch {
    return uri;
  }
}

const librariesPayload = [
  {
    name: 'Thu vien Trung tam Co so 1',
    code: 'LIBC01',
    address: '01 Nguyen Van Linh, Quan 7, TP.HCM',
    phone: '0901000001',
    email: 'libc01@library.local',
    status: 'active',
    workingHours: { open: '08:00', close: '17:00' },
    description: 'Thu vien trung tam co so 1',
  },
  {
    name: 'Thu vien Co so 2',
    code: 'LIBC02',
    address: '99 Le Loi, Quan 1, TP.HCM',
    phone: '0901000002',
    email: 'libc02@library.local',
    status: 'active',
    workingHours: { open: '08:00', close: '17:30' },
    description: 'Thu vien co so 2',
  },
  {
    name: 'Thu vien Co so 3',
    code: 'LIBC03',
    address: '15 Tran Hung Dao, Thu Duc, TP.HCM',
    phone: '0901000003',
    email: 'libc03@library.local',
    status: 'active',
    workingHours: { open: '07:30', close: '17:00' },
    description: 'Thu vien co so 3',
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

  let upserted = 0;
  for (const library of librariesPayload) {
    const result = await libraries.updateOne(
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

    if (result.upsertedCount > 0) upserted += 1;
  }

  const total = await libraries.countDocuments({ code: { $in: librariesPayload.map((item) => item.code) } });
  console.log(`[seed:libraries] Hoan tat. Upsert moi: ${upserted}. Tong thu vien trong bo seed: ${total}`);
}

run()
  .catch((error) => {
    console.error('[seed:libraries] Loi:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
