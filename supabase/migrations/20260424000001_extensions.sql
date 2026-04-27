-- Migration 01 — Extensões PG (ADR 0008 D15)
-- Idempotente: IF NOT EXISTS em todas as extensões.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
