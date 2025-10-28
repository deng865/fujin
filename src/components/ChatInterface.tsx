import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatMessageSchema } from '@/lib/validation';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: any;
  created_at: string;
  read_at: string | null;
}

interface ChatInterfaceProps {
  rideId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  onStartCall?: () => void;
}

export const ChatInterface = ({
  rideId,
  currentUserId,
  otherUserId,
  otherUserName,
  onStartCall
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === otherUserId || newMsg.sender_id === currentUserId) {
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, currentUserId, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('ride_id', rideId)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: '错误',
        description: '无法加载聊天记录',
        variant: 'destructive'
      });
      return;
    }

    setMessages((data || []) as Message[]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Validate input with zod
    const validation = chatMessageSchema.safeParse({
      message: newMessage
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: '验证失败',
        description: firstError.message,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('chats')
      .insert({
        ride_id: rideId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message: {
          text: validation.data.message,
          type: 'text'
        }
      });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: '错误',
        description: '发送消息失败',
        variant: 'destructive'
      });
    } else {
      setNewMessage('');
    }
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">与 {otherUserName} 的聊天</h3>
        {onStartCall && (
          <Button
            onClick={onStartCall}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Phone className="w-4 h-4" />
            语音通话
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{msg.message.text}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={loading}
        />
        <Button
          onClick={sendMessage}
          disabled={loading || !newMessage.trim()}
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
