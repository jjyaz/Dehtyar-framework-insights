-- Create council_sessions table to track multi-agent conversations
CREATE TABLE public.council_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id),
  lead_agent_id UUID REFERENCES public.agents(id),
  active_agents UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  user_request TEXT NOT NULL,
  final_synthesis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.council_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for council_sessions
CREATE POLICY "Allow public read on council_sessions" ON public.council_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on council_sessions" ON public.council_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on council_sessions" ON public.council_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on council_sessions" ON public.council_sessions FOR DELETE USING (true);

-- Create agent_messages table for inter-agent communication
CREATE TABLE public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  council_session_id UUID REFERENCES public.council_sessions(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES public.agents(id),
  to_agent_id UUID REFERENCES public.agents(id),
  message_type TEXT NOT NULL DEFAULT 'response',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_messages
CREATE POLICY "Allow public read on agent_messages" ON public.agent_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on agent_messages" ON public.agent_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agent_messages" ON public.agent_messages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on agent_messages" ON public.agent_messages FOR DELETE USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.council_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;

-- Add council tools to agent_tools table
INSERT INTO public.agent_tools (name, description, parameters, implementation) VALUES
('summon_agent', 'Summon another agent to join the council for collaborative discussion. Use when the task benefits from multiple perspectives.', 
'{"type": "object", "properties": {"agent_name": {"type": "string", "description": "Name of agent to summon: Dohar (creative/chaotic), Dehto (oracle/strategic), or Diyar (action/bold)"}, "reason": {"type": "string", "description": "Why this agent is needed"}}, "required": ["agent_name", "reason"]}',
'council'),
('delegate_task', 'Delegate a specific subtask to a summoned agent. The agent will work on it and report back.',
'{"type": "object", "properties": {"agent_name": {"type": "string", "description": "Name of agent to delegate to"}, "task": {"type": "string", "description": "The specific task to delegate"}, "context": {"type": "string", "description": "Additional context for the task"}}, "required": ["agent_name", "task"]}',
'council'),
('request_insight', 'Ask a specific agent for their unique perspective or insight on a topic.',
'{"type": "object", "properties": {"agent_name": {"type": "string", "description": "Name of agent to ask"}, "topic": {"type": "string", "description": "Topic to get insight on"}}, "required": ["agent_name", "topic"]}',
'council'),
('synthesize_council', 'Synthesize all council contributions into a final cohesive response for the user.',
'{"type": "object", "properties": {"key_points": {"type": "array", "items": {"type": "string"}, "description": "Key points from council discussion"}, "recommendation": {"type": "string", "description": "Final synthesized recommendation"}}, "required": ["key_points", "recommendation"]}',
'council');