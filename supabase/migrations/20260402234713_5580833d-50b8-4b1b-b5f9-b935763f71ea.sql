
-- Add read_at to messages for unread tracking
ALTER TABLE public.messages ADD COLUMN read_at timestamp with time zone DEFAULT NULL;

-- Allow participants to update messages (mark as read)
CREATE POLICY "参与者可以标记消息已读"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  )
  AND auth.uid() != sender_id
);
