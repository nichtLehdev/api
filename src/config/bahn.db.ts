import load_dotenv from "dotenv"
load_dotenv.config()

export const BahnDbConfig = {
    host: process.env.BAHN_DB_HOST,
    user: process.env.BAHN_DB_USER,
    password: process.env.BAHN_DB_PASS,
    database: process.env.BAHN_DB_NAME,
    port: 3306,
    connectionLimit: 10,
    connectionTimeout: 60000
}