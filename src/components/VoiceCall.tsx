import { useState, useEffect } from 'react';
import { Room } from 'livekit-client';
import {
  LiveKitRoom,
  AudioConference,
  ControlBar,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallProps {
  rideId: string;
  userName: string;
  onEndCall: () => void;
}

export const VoiceCall = ({ rideId, userName, onEndCall }: VoiceCallProps) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl] = useState('wss://your-livekit-server.com'); // 需要配置 LiveKit 服务器
  const { toast } = useToast();

  useEffect(() => {
    // 这里需要调用后端 API 获取 LiveKit token
    // 为了演示，使用模拟 token
    const fetchToken = async () => {
      try {
        // TODO: 实现获取 LiveKit token 的 API 调用
        // const response = await fetch('/api/get-livekit-token', {
        //   method: 'POST',
        //   body: JSON.stringify({ roomName: rideId, userName })
        // });
        // const data = await response.json();
        // setToken(data.token);
        
        toast({
          title: '提示',
          description: '需要配置 LiveKit 服务器才能使用语音通话功能',
          variant: 'default'
        });
      } catch (error) {
        console.error('Error fetching token:', error);
        toast({
          title: '错误',
          description: '无法连接到语音服务',
          variant: 'destructive'
        });
      }
    };

    fetchToken();
  }, [rideId, userName, toast]);

  if (!token) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">正在连接语音服务...</p>
        <Button onClick={onEndCall} variant="outline" className="mt-4">
          取消
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={onEndCall}
      >
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg">与 {userName} 通话中</h3>
            <p className="text-sm text-muted-foreground">房间: {rideId}</p>
          </div>
          
          <RoomAudioRenderer />
          <AudioConference />
          
          <div className="flex justify-center">
            <ControlBar 
              controls={{
                microphone: true,
                screenShare: false,
                camera: false,
                leave: true
              }}
            />
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onEndCall}
              variant="destructive"
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              结束通话
            </Button>
          </div>
        </div>
      </LiveKitRoom>
    </Card>
  );
};
