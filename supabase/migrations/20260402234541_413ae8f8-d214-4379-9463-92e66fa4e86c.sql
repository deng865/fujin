
-- 创建会话表
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  last_message text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "参与者可以查看自己的会话"
ON public.conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "用户可以创建会话"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "参与者可以更新会话"
ON public.conversations FOR UPDATE
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- 创建消息表
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "会话参与者可以查看消息"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  )
);

CREATE POLICY "用户可以发送消息"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  )
);

-- 启用实时
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
