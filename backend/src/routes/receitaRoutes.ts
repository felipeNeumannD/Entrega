import { Router } from "express";
import { listar, buscarPorId, criar, atualizar, deletar } from "../controllers/receitaController.js";

const router = Router();

router.get("/",      listar);
router.get("/:id",   buscarPorId);
router.post("/",     criar);
router.put("/:id",   atualizar);
router.delete("/:id",deletar);

export default router;