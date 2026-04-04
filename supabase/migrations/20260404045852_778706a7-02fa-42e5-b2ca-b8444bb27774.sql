
ALTER TABLE public.messages ADD COLUMN is_recalled boolean NOT NULL DEFAULT false;

-- Allow sender to update is_recalled on their own messages
CREATE POLICY "发送者可以撤回自己的消息"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);
