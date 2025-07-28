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
  id: number;
  user: string;
  text: string;
};

export type CommentCategory = 'Purchase Intent' | 'Question' | 'General';

type CategorizedComments = {
  [key in CommentCategory]: Comment[];
};

const sampleComments = [
  'How much is this?',
  'I want to buy one!',
  'this is so cool',
  'what other colors do you have?',
  'lol',
  'can I get a discount?',
  'where do you ship to?',
  'great stream!',
  'take my money',
  'just ordered one',
  'is this available in Canada?',
  'this looks awesome',
  'can you show the back?',
  'I love this product',
  'how do I order?',
  'hello from Brazil!',
];

const sampleUsers: Record<string, UserProfile> = {};

function getSampleUser(username: string): UserProfile {
    if (sampleUsers[username]) {
        return sampleUsers[username];
    }
    const newUser: UserProfile = {
        username: username,
        avatar: `https://placehold.co/128x128.png`,
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
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null);

  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleCommentClick = (comment: Comment) => {
    setSelectedUser(getSampleUser(comment.user));
    setSelectedCommentId(comment.id);
  };

  const addComment = useCallback(async () => {
    const randomCommentText = sampleComments[Math.floor(Math.random() * sampleComments.length)];
    const randomUser = `user${Math.floor(Math.random() * 900) + 100}`;

    try {
      const result = await classifyComment({ comment: randomCommentText });
      const category: CommentCategory = (result.category === 'Purchase Intent' || result.category === 'Question') ? result.category : 'General';

      const newComment: Comment = {
        id: Date.now() + Math.random(),
        user: randomUser,
        text: randomCommentText,
      };

      setComments(prev => {
        const currentCategoryComments = prev[category] || [];
        const newCategoryComments = [newComment, ...currentCategoryComments].slice(0, 50);
        return {
          ...prev,
          [category]: newCategoryComments,
        };
      });

    } catch (error) {
      console.error("Error classifying comment:", error);
      setConnectionStatus('error');
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Failed to classify a comment. Check the console for details.",
      });
    }
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
    setConnectionStatus('connecting');
    setComments({ 'Purchase Intent': [], 'Question': [], 'General': [] });
    setSelectedUser(null);
    setSelectedCommentId(null);

    setTimeout(() => {
      setConnectionStatus('connected');
      toast({
        title: "Connected!",
        description: `Now monitoring comments for @${username}.`,
      });
    }, 1500);
  };

  const handleDisconnect = () => {
    setConnectionStatus('disconnected');
    toast({
        title: "Disconnected",
        description: "Live stream monitoring has stopped.",
      });
  };

  useEffect(() => {
    if (connectionStatus === 'connected') {
      intervalRef.current = setInterval(addComment, 2500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connectionStatus, addComment]);

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
