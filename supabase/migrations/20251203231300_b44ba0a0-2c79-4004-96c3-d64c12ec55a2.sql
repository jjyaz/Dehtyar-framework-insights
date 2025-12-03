-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new columns to agent_memory table for enhanced memory
ALTER TABLE public.agent_memory 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS memory_category text DEFAULT 'episodic',
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS decay_factor double precision DEFAULT 1.0;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding ON public.agent_memory 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_agent_memory_category ON public.agent_memory (memory_category);

-- Add check constraint for valid memory categories
ALTER TABLE public.agent_memory 
ADD CONSTRAINT valid_memory_category 
CHECK (memory_category IN ('episodic', 'semantic', 'procedural'));

-- Function to update access count and last_accessed when memory is retrieved
CREATE OR REPLACE FUNCTION public.update_memory_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  NEW.last_accessed = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;