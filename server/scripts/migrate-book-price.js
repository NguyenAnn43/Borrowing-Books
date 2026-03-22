require('dotenv').config();
const mongoose = require('mongoose');

const DB_URI = process.env.MONGODB_URI || process.env.DB_URI;

if (!DB_URI) {
    console.error('MONGODB_URI or DB_URI must be provided in .env');
    process.exit(1);
}

mongoose.connect(DB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        const db = mongoose.connection.db;
        const booksCollection = db.collection('books');
        
        const result = await booksCollection.updateMany(
            { price: { $exists: false } },
            { $set: { price: 0 } }
        );
        
        console.log(`Books Matched: ${result.matchedCount}`);
        console.log(`Books Modified (Price set to 0): ${result.modifiedCount}`);
        
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Migration failed', err);
        process.exit(1);
    });
