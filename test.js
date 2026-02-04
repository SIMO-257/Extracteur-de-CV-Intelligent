const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'cv_analysis';

async function main() {
  try {
    // Use connect method to connect to the server
    console.log('Connecting to server...');
    await client.connect();
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    const collection = db.collection('candidats');

    // Find all documents
    const findResult = await collection.find({}).sort({createdAt: -1}).limit(5).toArray();
    
    console.log('Found latest 5 documents =>');
    findResult.forEach(doc => {
        console.log(`\nName: ${doc.Nom} ${doc['Prénom']}`);
        console.log(`Link: ${doc.cvLink || 'NO LINK'}`);
        console.log(`ID: ${doc._id}`);
    });

    if (findResult.length > 0) {
        console.log(`\n✅ SUCCESS: Found ${findResult.length} records in the database!`);
        console.log("If you see this, the data IS there and accessible.");
    } else {
        console.log("\n⚠️ WARNING: Connected, but found 0 records.");
    }

  } catch (e) {
      console.error("\n❌ ERROR: Could not connect to MongoDB.");
      console.error(e.message);
  } finally {
    client.close();
  }
}

main()
  .catch(console.error);
