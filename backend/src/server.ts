import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import receitaRoutes from "./routes/receitaRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" })); // ajuste para sua URL do front
app.use(express.json());

app.use("/auth",     authRoutes);
app.use("/receitas", receitaRoutes);

app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));