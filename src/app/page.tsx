
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { classifyComment } from '@/ai/flows/classify-comment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CommentColumn } from '@/components/comment-column';
import { ProfileColumn } from '@/components/profile-column';
import { ShoppingCart, HelpCircle, MessagesSquare, Rss, X } from 'lucide-react';
import type { UserProfile } from '@/components/profile-column';

type Comment = {
  id: string | number;
  user: string;
  text: string;
  profilePictureUrl?: string;
};

export type CommentCategory = 'Purchase Intent' | 'Question' | 'General';

type CategorizedComments = {
  [key in CommentCategory]: Comment[];
};

const sampleUsers: Record<string, UserProfile> = {};

function getSampleUser(username: string, profilePictureUrl?: string): UserProfile {
    if (sampleUsers[username]) {
        return sampleUsers[username];
    }
    const newUser: UserProfile = {
        username: username,
        avatar: profilePictureUrl || `https://placehold.co/128x128.png`,
        followers: Math.floor(Math.random() * 10000),
        following: Math.floor(Math.random() * 500),
        likes: Math.floor(Math.random() * 100000),
        bio: `Bio for ${username}. Lover of great products!`,
        purchaseHistory: Array.from({ length: Math.floor(Math.random() * 5) }, (_, i) => ({
            item: `Product ${i + 1}`,
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })),
    };
    sampleUsers[username] = newUser;
    return newUser;
}


export default function IxenPage() {
  const [username, setUsername] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [comments, setComments] = useState<CategorizedComments>({
    'Purchase Intent': [],
    'Question': [],
    'General': [],
  });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<number | string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  const handleCommentClick = (comment: Comment) => {
    setSelectedUser(getSampleUser(comment.user, comment.profilePictureUrl));
    setSelectedCommentId(comment.id);
  };

  const addComment = useCallback(async (commentData: any) => {
    try {
      const commentText = commentData.comment;
      if (!commentText) return;

      const result = await classifyComment({ comment: commentText });
      const category: CommentCategory = (result.category === 'Purchase Intent' || result.category === 'Question') ? result.category : 'General';

      const newComment: Comment = {
        id: commentData.msgId || `comment-${Date.now()}-${Math.random()}`,
        user: commentData.uniqueId,
        text: commentText,
        profilePictureUrl: commentData.profilePictureUrl
      };

      setComments(prev => {
        const currentCategoryComments = prev[category] || [];
        if (currentCategoryComments.some(c => c.id === newComment.id)) {
            return prev;
        }
        const newCategoryComments = [newComment, ...currentCategoryComments].slice(0, 50);
        return {
          ...prev,
          [category]: newCategoryComments,
        };
      });

    } catch (error) {
      console.error("Error classifying comment:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to classify a comment. Check the console for details.",
      });
    }
  }, [toast]);

  const handleDisconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionStatus('disconnected');
    toast({
        title: "Disconnected",
        description: "Live stream monitoring has stopped.",
      });
  }, [toast]);

  const handleConnect = () => {
    if (!username.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a TikTok username.",
      });
      return;
    }
    
    if (eventSourceRef.current) {
        handleDisconnect();
    }

    setConnectionStatus('connecting');
    setComments({ 'Purchase Intent': [], 'Question': [], 'General': [] });
    setSelectedUser(null);
    setSelectedCommentId(null);
    
    const sanitizedUsername = username.startsWith('@') ? username.substring(1) : username;
    const eventSource = new EventSource(`/api/tiktok?username=${sanitizedUsername}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
        setConnectionStatus('connected');
        toast({
            title: "Connected!",
            description: `Now monitoring comments for @${sanitizedUsername}.`,
        });
    });

    eventSource.addEventListener('comment', (event) => {
        const commentData = JSON.parse(event.data);
        addComment(commentData);
    });

    eventSource.addEventListener('disconnected', (event) => {
        const data = JSON.parse(event.data);
        setConnectionStatus('disconnected');
        toast({
            variant: 'destructive',
            title: 'Stream Ended',
            description: data.message || 'The TikTok live stream has ended.',
        });
        handleDisconnect();
    });

    eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        console.error("EventSource failed:", data.error);
        setConnectionStatus('error');
        toast({
            variant: "destructive",
            title: "Connection Failed",
            description: data.error || `Could not connect to @${sanitizedUsername}.`,
        });
        handleDisconnect();
    });

  };


  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">Connected</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Connecting...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'disconnected':
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  const isConnecting = connectionStatus === 'connecting';
  const isConnected = connectionStatus === 'connected';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-8 px-4 md:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Ixen</h1>
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Label htmlFor="username" className="sr-only">TikTok Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isConnected || isConnecting}
                className="pl-3"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>
            {isConnected ? (
              <Button variant="outline" onClick={handleDisconnect}>
                <X className="mr-2 h-4 w-4" /> Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  'Connecting...'
                ) : (
                  <>
                    <Rss className="mr-2 h-4 w-4" /> Connect
                  </>
                )}
              </Button>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProfileColumn user={selectedUser} />
          <CommentColumn
            title="Purchase Intent"
            comments={comments['Purchase Intent']}
            icon={<ShoppingCart className="text-accent" />}
            onCommentClick={handleCommentClick}
            selectedCommentId={selectedCommentId}
          />
          <CommentColumn
            title="Questions"
            comments={comments['Question']}
            icon={<HelpCircle className="text-primary" />}
            onCommentClick={handleCommentClick}
            selectedCommentId={selectedCommentId}
          />
          <CommentColumn
            title="General Chat"
            comments={comments['General']}
            icon={<MessagesSquare className="text-muted-foreground" />}
            onCommentClick={handleCommentClick}
            selectedCommentId={selectedCommentId}
          />
        </div>
      </main>
    </div>
  );
}
