-- Create chats table for storing chat messages
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create policies for chat access
CREATE POLICY "Users can view chats they are part of"
ON public.chats
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.chats
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON public.chats
FOR UPDATE
USING (auth.uid() = sender_id);

-- Create index for better performance
CREATE INDEX idx_chats_ride_id ON public.chats(ride_id);
CREATE INDEX idx_chats_sender_receiver ON public.chats(sender_id, receiver_id);
CREATE INDEX idx_chats_created_at ON public.chats(created_at DESC);

-- Enable realtime for chats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;