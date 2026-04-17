-- Adiciona índices compostos para acelerar listagens hot-path.
-- Complaint: filtra por (condominiumId, status) ordenando por createdAt DESC.
-- Notification: filtra por (userId, read) ordenando por createdAt DESC (badge unread).

CREATE INDEX IF NOT EXISTS "complaints_condominium_id_status_created_at_idx"
  ON "complaints" ("condominium_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "notifications_user_id_read_created_at_idx"
  ON "notifications" ("user_id", "read", "created_at");
