-- O Supabase expõe o schema public pela Data API (chave anon, que é pública).
-- RLS ligado e nenhuma policy = a API não lê nem grava nada.
-- O Prisma conecta como "postgres" (dono das tabelas) e não é afetado.
ALTER TABLE "Insumo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Movimentacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Produto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FichaItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
