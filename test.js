const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'cv_analysis';

async function main() {
  try {
    // Parse CLI args: --field=STATUS_FIELD --value=STATUS_VALUE
    const args = process.argv.slice(2);
    const argMap = Object.fromEntries(args.map(a => {
      const [k, v] = a.replace(/^-+/, '').split('=');
      return [k, v];
    }));
    const field = argMap.field || 'hiringStatus';
    const value = argMap.value || 'Embaucé';
    const id = argMap.id;
    const duplicate = parseInt(argMap.duplicate || '0', 10);
    const preserveTokens = String(argMap.preserveTokens || 'false').toLowerCase() === 'true';
    const truncate = String(argMap.truncate || 'false').toLowerCase() === 'true';
    const seed = parseInt(argMap.seed || '0', 10);

    console.log('Connecting to server...');
    await client.connect();
    console.log('Connected successfully to server');

    const db = client.db(dbName);
    const collection = db.collection('candidats');

    if (truncate) {
      console.log('🧹 Truncating collection "candidats"...');
      const result = await collection.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} documents`);
    }

    if (seed > 0) {
      console.log(`🌱 Seeding ${seed} candidats (Embaucé, evalStatus=inactive)...`);
      const docs = [];
      for (let i = 1; i <= seed; i++) {
        docs.push({
          Nom: `TestNom${i}`,
          "Prénom": `TestPrenom${i}`,
          "Date de naissance": "-",
          "Adress Actuel": "-",
          "Post Actuel": "-",
          "Société": "-",
          "Date d'embauche": "",
          "Salaire net Actuel": "-",
          "Votre dernier diplome": "-",
          "Votre niveau de l'anglais technique": { Lu: "-", Ecrit: "-", Parlé: "-" },
          status: "Accepté",
          hiringStatus: "Embaucé",
          formStatus: "inactive",
          evalStatus: "inactive",
          evalAnswers: null,
          evalCorrection: null,
          evalScore: null,
          evalPdfPath: null,
          createdAt: new Date(),
        });
      }
      const res = await collection.insertMany(docs);
      console.log(`✅ Inserted ${res.insertedCount} seeded candidats`);
      return;
    }

    if (id && duplicate > 0) {
      const { ObjectId } = require('mongodb');
      const filter = ObjectId.isValid(id)
        ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
        : { _id: id };
      const base = await collection.findOne(filter);
      if (!base) {
        console.log('❌ Base candidate not found for duplication');
        return;
      }
      console.log(`📄 Duplicating candidate ${base.Nom} (${base._id}) x${duplicate}`);
      const docs = [];
      for (let i = 0; i < duplicate; i++) {
        const clone = { ...base };
        delete clone._id;
        clone.createdAt = new Date();
        if (!preserveTokens) {
          delete clone.formToken;
          delete clone.evalToken;
          delete clone.qualifiedFormPath;
          delete clone.evalPdfPath;
        }
        docs.push(clone);
      }
      const res = await collection.insertMany(docs);
      console.log(`✅ Inserted ${res.insertedCount} duplicates`);
      Object.values(res.insertedIds).forEach(newId => {
        console.log(` - new _id: ${newId}`);
      });
    } else if (id) {
      const { ObjectId } = require('mongodb');
      const filter = ObjectId.isValid(id)
        ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
        : { _id: id };
      console.log(`Finding candidate by id: ${id}`);
      const doc = await collection.findOne(filter);
      console.log(doc ? `✅ Found: ${doc.Nom} (${doc._id})` : '❌ Not found');
    } else {
      // Delete all documents matching field=value
      console.log(`Deleting all candidats where ${field} == "${value}" ...`);
      const result = await collection.deleteMany({ [field]: value });
      console.log(`✅ Deleted count: ${result.deletedCount}`);
      if (result.deletedCount === 0) {
        console.log('ℹ️ No matching records found.');
      }
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
