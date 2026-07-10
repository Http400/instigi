-- CreateTable
CREATE TABLE "training"."exercise_definitions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "metrics" JSONB NOT NULL,
    "allowed_entry_types" JSONB NOT NULL,
    "default_entry_type" VARCHAR(40) NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_definitions_user_id_idx" ON "training"."exercise_definitions"("user_id");

-- CreateIndex
CREATE INDEX "exercise_definitions_user_id_is_archived_idx" ON "training"."exercise_definitions"("user_id", "is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_definitions_user_id_name_key" ON "training"."exercise_definitions"("user_id", "name");
