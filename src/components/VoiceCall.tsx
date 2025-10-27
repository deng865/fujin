import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-react/dist/index.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhoneOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCallProps {
  rideId: string;
  userName: string;
  onEndCall: () => void;
}

export const VoiceCall = ({ rideId, userName, onEndCall }: VoiceCallProps) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchToken();
  }, [rideId, userName]);

  const fetchToken = async () => {
    try {
      setLoading(true);
      console.log('Fetching LiveKit token...');
      
      const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
        body: {
          roomName: rideId,
          participantName: userName
        }
      });

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      if (!data?.token || !data?.url) {
        throw new Error('Invalid response from server');
      }

      console.log('Token received successfully');
      setToken(data.token);
      setServerUrl(data.url);
      
      toast({
        title: '已连接',
        description: `正在与 ${userName} 建立通话连接`,
      });
    } catch (error) {
      console.error('Error fetching LiveKit token:', error);
      toast({
        title: '错误',
        description: '无法连接到语音服务，请稍后重试',
        variant: 'destructive'
      });
      onEndCall();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !token || !serverUrl) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">正在连接语音服务...</p>
        <Button onClick={onEndCall} variant="outline" className="mt-4">
          取消
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={() => {
          console.log('Disconnected from LiveKit');
          onEndCall();
        }}
        onConnected={() => {
          console.log('Connected to LiveKit');
          toast({
            title: '通话已建立',
            description: `与 ${userName} 的语音通话已连接`,
          });
        }}
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="font-semibold text-2xl mb-2">语音通话</h3>
            <p className="text-muted-foreground">{userName}</p>
            <p className="text-sm text-muted-foreground mt-1">房间: {rideId}</p>
          </div>

          <div className="py-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 bg-primary/30 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <RoomAudioRenderer />
          
          <div className="flex justify-center">
            <ControlBar
              variation="minimal"
              controls={{
                microphone: true,
                camera: false,
                screenShare: false,
                chat: false,
              }}
            />
          </div>

          <div className="flex justify-center">
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
        </div>
      </LiveKitRoom>
    </Card>
  );
};
