import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChatInterface } from '@/components/ChatInterface';
import { VoiceCall } from '@/components/VoiceCall';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';

interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export default function RideChat() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [ride, setRide] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    fetchData();
  }, [rideId]);

  const fetchData = async () => {
    try {
      // Get current user
      const userResult = await supabase.auth.getUser();
      const user = userResult.data.user;
      
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUser(user);

      if (!rideId) return;

      // Get ride details - only select specific fields
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('user_id, title, ride_type')
        .eq('id', rideId)
        .single();

      if (rideError || !rideData) {
        toast({
          title: '错误',
          description: '无法加载行程信息',
          variant: 'destructive'
        });
        navigate('/search');
        return;
      }

      setRide(rideData);

      // Get other user profile
      const otherUserId = rideData.user_id !== user.id 
        ? rideData.user_id 
        : null;

      if (!otherUserId) {
        toast({
          title: '错误',
          description: '无法找到聊天对象',
          variant: 'destructive'
        });
        return;
      }

      // Fetch only non-sensitive profile fields (excludes phone/wechat for privacy)
      // Query profiles directly with only safe columns selected
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', otherUserId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Set the profile data (type safe now)
      if (profileData) {
        setOtherUser({
          id: profileData.id,
          name: profileData.name,
          avatar_url: profileData.avatar_url
        });
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    }
  };

  if (!currentUser || !ride || !otherUser) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>

        {inCall ? (
          <VoiceCall
            rideId={rideId!}
            userName={otherUser.name || '用户'}
            onEndCall={() => setInCall(false)}
          />
        ) : (
          <ChatInterface
            rideId={rideId!}
            currentUserId={currentUser.id}
            otherUserId={otherUser.id}
            otherUserName={otherUser.name || '用户'}
            onStartCall={() => setInCall(true)}
          />
        )}
      </div>
    </div>
  );
}
