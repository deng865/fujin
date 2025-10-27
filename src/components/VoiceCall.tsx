import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallProps {
  rideId: string;
  userName: string;
  onEndCall: () => void;
}

export const VoiceCall = ({ rideId, userName, onEndCall }: VoiceCallProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => {
      setIsConnected(true);
      toast({
        title: '已连接',
        description: `正在与 ${userName} 通话`,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [userName, toast]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? '已取消静音' : '已静音',
      description: isMuted ? '对方现在可以听到你的声音' : '对方暂时听不到你的声音',
    });
  };

  return (
    <Card className="p-8">
      <div className="space-y-6 text-center">
        <div>
          <h3 className="font-semibold text-2xl mb-2">
            {isConnected ? '通话中' : '正在连接...'}
          </h3>
          <p className="text-muted-foreground">{userName}</p>
          <p className="text-sm text-muted-foreground mt-1">房间: {rideId}</p>
        </div>

        {isConnected && (
          <div className="py-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 bg-primary/30 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Button
            onClick={toggleMute}
            variant={isMuted ? 'destructive' : 'outline'}
            size="lg"
            className="gap-2"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isMuted ? '取消静音' : '静音'}
          </Button>
          
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <PhoneOff className="w-5 h-5" />
            结束通话
          </Button>
        </div>

        <div className="text-sm text-muted-foreground mt-4">
          <p>💡 提示：此为演示版本</p>
          <p className="mt-1">完整语音功能需要配置 LiveKit 服务器或使用 OpenAI Realtime API</p>
        </div>
      </div>
    </Card>
  );
};
