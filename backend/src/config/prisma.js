import dns from "dns";
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not defined.");
}

const databaseUrl = new URL(connectionString);
const databaseHost = databaseUrl.hostname;
const databasePort = Number(databaseUrl.port || 5432);
const databaseName = databaseUrl.pathname.replace("/", "");

const ipv4Addresses = await dns.promises.resolve4(databaseHost);

if (ipv4Addresses.length === 0) {
  throw new Error(`No IPv4 address found for ${databaseHost}`);
}

const selectedAddress = ipv4Addresses[0];

console.log("Database host:", databaseHost);
console.log("Database port:", databasePort);
console.log("Database name:", databaseName);
console.log("Available IPv4 addresses:", ipv4Addresses);
console.log("Using IPv4 address:", selectedAddress);

const pool = new Pool({
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),

  // IMPORTANT:
  // Connect directly to the selected IPv4 address.
  host: selectedAddress,
  port: databasePort,
  database: databaseName,

  // Keep the Neon hostname for TLS/SNI.
  ssl: {
    servername: databaseHost,
    rejectUnauthorized: true,
  },

  max: 10,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

pool.on("error", (error) => {
  console.error("PostgreSQL pool error:", error);
});

export default pool;
