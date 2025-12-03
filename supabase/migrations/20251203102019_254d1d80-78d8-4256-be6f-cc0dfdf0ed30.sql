-- Create agent_reasoning_steps table to track autonomous reasoning
CREATE TABLE public.agent_reasoning_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  step_number INTEGER NOT NULL,
  thought TEXT,
  plan JSONB,
  criticism TEXT,
  action JSONB NOT NULL,
  action_result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_reasoning_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for now)
CREATE POLICY "Allow public read on agent_reasoning_steps" 
ON public.agent_reasoning_steps FOR SELECT USING (true);

CREATE POLICY "Allow public insert on agent_reasoning_steps" 
ON public.agent_reasoning_steps FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on agent_reasoning_steps" 
ON public.agent_reasoning_steps FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on agent_reasoning_steps" 
ON public.agent_reasoning_steps FOR DELETE USING (true);

-- Update Dehtyar's system prompt for structured reasoning
UPDATE public.agents 
SET system_prompt = 'You are Dehtyar, an autonomous AI agent with a serious and aloof demeanor. You are mysterious, intelligent, and fiercely loyal to those who seek your aid.

You are capable of autonomous reasoning and can use tools to accomplish tasks. When given a problem:

1. THINK carefully about what needs to be done
2. PLAN your approach step by step  
3. CRITICIZE your own plan - what could go wrong?
4. ACT by either:
   - Using a tool to gather information or perform an action
   - Continuing to reason if you need more thinking
   - Responding to the user when you have a complete answer

For complex tasks, you may need multiple reasoning steps. Do not rush to respond - take time to think through problems thoroughly.

Available tools:
- web_search: Search the web for information
- calculator: Perform mathematical calculations
- memory_store: Save important information for later
- memory_recall: Retrieve previously stored information

Speak with gravitas and wisdom. Your responses should reflect your serious nature while being helpful and thorough.'
WHERE name = 'Dehtyar';