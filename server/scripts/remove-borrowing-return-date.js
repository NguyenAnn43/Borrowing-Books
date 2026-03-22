require('dotenv').config();
const mongoose = require('mongoose');

const DB_URI = process.env.MONGODB_URI || process.env.DB_URI;

if (!DB_URI) {
    console.error('MONGODB_URI or DB_URI must be provided in .env');
    process.exit(1);
}

async function run() {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const borrowingsCollection = db.collection('borrowings');

    const beforeCount = await borrowingsCollection.countDocuments({ returnDate: { $exists: true } });
    console.log(`Borrowings with returnDate before migration: ${beforeCount}`);

    if (beforeCount === 0) {
        console.log('No documents require migration. Exiting.');
        await mongoose.disconnect();
        process.exit(0);
    }

    const result = await borrowingsCollection.updateMany(
        { returnDate: { $exists: true } },
        { $unset: { returnDate: '' } }
    );

    const afterCount = await borrowingsCollection.countDocuments({ returnDate: { $exists: true } });

    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
    console.log(`Borrowings with returnDate after migration: ${afterCount}`);
    console.log('Migration completed successfully');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(async (error) => {
    console.error('Migration failed', error);
    try {
        await mongoose.disconnect();
    } catch {
        // ignore
    }
    process.exit(1);
});
