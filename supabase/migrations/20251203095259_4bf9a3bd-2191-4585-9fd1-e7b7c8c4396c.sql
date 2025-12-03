-- Create agents table for storing agent configurations
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  tools JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_memory table for short-term and long-term memory
CREATE TABLE public.agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('short_term', 'long_term', 'episodic')),
  content TEXT NOT NULL,
  importance FLOAT DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table for goal decomposition (Quest Board)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  priority INTEGER DEFAULT 0,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create conversations table for multi-agent conversations (Council Chamber)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation_messages table
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_tools table (Armory)
CREATE TABLE public.agent_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  implementation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;

-- Create public read/write policies for the demo
CREATE POLICY "Allow public read access on agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Allow public insert on agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agents" ON public.agents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on agents" ON public.agents FOR DELETE USING (true);

CREATE POLICY "Allow public read access on agent_memory" ON public.agent_memory FOR SELECT USING (true);
CREATE POLICY "Allow public insert on agent_memory" ON public.agent_memory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agent_memory" ON public.agent_memory FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on agent_memory" ON public.agent_memory FOR DELETE USING (true);

CREATE POLICY "Allow public read access on tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Allow public read access on conversations" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on conversations" ON public.conversations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on conversations" ON public.conversations FOR DELETE USING (true);

CREATE POLICY "Allow public read access on conversation_messages" ON public.conversation_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on conversation_messages" ON public.conversation_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on conversation_messages" ON public.conversation_messages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on conversation_messages" ON public.conversation_messages FOR DELETE USING (true);

CREATE POLICY "Allow public read access on agent_tools" ON public.agent_tools FOR SELECT USING (true);
CREATE POLICY "Allow public insert on agent_tools" ON public.agent_tools FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agent_tools" ON public.agent_tools FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on agent_tools" ON public.agent_tools FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tools (Armory)
INSERT INTO public.agent_tools (name, description, parameters) VALUES
('web_search', 'Search the web for information', '{"query": {"type": "string", "required": true}}'),
('calculator', 'Perform mathematical calculations', '{"expression": {"type": "string", "required": true}}'),
('code_executor', 'Execute code snippets', '{"language": {"type": "string", "required": true}, "code": {"type": "string", "required": true}}');

-- Insert default agent (Dehtyar)
INSERT INTO public.agents (name, role, system_prompt, model) VALUES
('Dehtyar', 'autonomous_agent', 'You are Dehtyar, an autonomous AI agent. You are aloof, serious, mysterious, and loyal. You help users accomplish their goals by breaking them down into tasks, reasoning through problems, and using available tools. You maintain memory of past interactions and learn from experience.', 'google/gemini-2.5-flash');