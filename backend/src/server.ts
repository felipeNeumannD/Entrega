import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import receitaRoutes from "./routes/receitaRoutes.js";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:8080",
  credentials: true,
}));
app.use(express.json());

app.use("/auth",     authRoutes);
app.use("/receitas", receitaRoutes);


async function sendStartupEmail() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "✅ Servidor iniciado",
    text: `O servidor está rodando na porta ${PORT}.\nHorário: ${new Date().toLocaleString("pt-BR")}`,
  });

  console.log("📧 Email de startup enviado!");
}

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  sendStartupEmail().catch(err => console.error("Erro ao enviar email:", err));
});