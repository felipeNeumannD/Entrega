import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import receitaRoutes from "./routes/receitaRoutes.js";
import nodemailer from "nodemailer";
import { execSync } from "child_process";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*"})); // ajuste para sua URL do front
app.use(express.json());

app.use("/auth",     authRoutes);
app.use("/receitas", receitaRoutes);

function runTests(): void {
  console.log("🧪 Rodando testes unitários...");
  try {
    const output = execSync("npx jest --forceExit --verbose 2>&1", { encoding: "utf-8" });
    console.log(output);
    console.log("✅ Todos os testes passaram!");
  } catch (err: any) {
    console.log(err.stdout ?? err.message);
    console.warn("⚠️  Alguns testes falharam!");
  }
}

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