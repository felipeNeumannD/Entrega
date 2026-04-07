import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
// if (!process.env.DB_HOST || !process.env.DB_USER) {
//   throw new Error("Variáveis de ambiente não definidas");
// }
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "receitas_db",
    waitForConnections: true,
    connectionLimit: 10,
});
export default pool;
//# sourceMappingURL=db.js.map