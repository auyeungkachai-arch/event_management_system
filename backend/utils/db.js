const { MongoClient, ObjectId } = require("mongodb");

process.env.MONGODB_URI =
  "mongodb+srv://dbuser8z1kcn:Kars12312!@docdb-cluster-20260920-0808.global.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000";

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://localhost:27017";
}

// 1. 建立 MongoClient 實例
const client = new MongoClient(process.env.MONGODB_URI);

// 2. 進行連線 (Promise)
const clientPromise = client.connect();

async function connectToDB() {
  const connectedClient = await clientPromise;
  return connectedClient.db("bookingsDB");
}

async function shutdown() {
  try {
    // 關閉 client 連線
    await client.close();
  } catch (err) {
    console.error("Error closing MongoDB connection:", err);
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

module.exports = { connectToDB, ObjectId };
