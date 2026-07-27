-- CreateTable
CREATE TABLE "exercise_entries" (
    "id" TEXT NOT NULL,
    "session_exercise_id" TEXT NOT NULL,
    "entry_type" VARCHAR(40) NOT NULL,
    "values" JSONB NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_entries_session_exercise_id_position_idx" ON "exercise_entries"("session_exercise_id", "position");

-- AddForeignKey
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
