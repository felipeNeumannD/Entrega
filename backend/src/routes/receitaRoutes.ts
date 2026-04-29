import { Router } from "express";
import { listar, buscarPorId, criar, atualizar, deletar, pdf } from "../controllers/receitaController.js";

const router = Router();

router.get("/",      listar);
router.get("/:id",   buscarPorId);
router.post("/",     criar);
router.put("/:id",   atualizar);
router.delete("/:id",deletar);
router.get('/pdf', pdf )

export default router;