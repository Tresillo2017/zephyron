-- ML Feedback table for self-improving track recognition
-- Stores community corrections paired with audio context for prompt improvement

CREATE TABLE ml_feedback (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  detection_id TEXT,
  feedback_type TEXT NOT NULL,
  original_prediction TEXT,
  corrected_value TEXT,
  audio_segment_r2_key TEXT,
  processed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE,
  FOREIGN KEY (detection_id) REFERENCES detections(id) ON DELETE SET NULL
);

CREATE INDEX idx_ml_feedback_processed ON ml_feedback(processed);
CREATE INDEX idx_ml_feedback_set ON ml_feedback(set_id);
CREATE INDEX idx_ml_feedback_type ON ml_feedback(feedback_type);

-- ML prompt templates table for storing evolving prompts
CREATE TABLE ml_prompts (
  id TEXT PRIMARY KEY,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  accuracy_score REAL,
  sample_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_prompts_active ON ml_prompts(prompt_type, is_active);

-- Detection jobs table for tracking ML pipeline progress
CREATE TABLE detection_jobs (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  total_segments INTEGER DEFAULT 0,
  completed_segments INTEGER DEFAULT 0,
  detections_found INTEGER DEFAULT 0,
  model_version TEXT,
  prompt_version INTEGER,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_detection_jobs_set ON detection_jobs(set_id);
CREATE INDEX idx_detection_jobs_status ON detection_jobs(status);
