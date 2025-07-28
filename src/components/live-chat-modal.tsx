'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "./ui/badge";

export type LiveComment = {
  id: string | number;
  user: string;
  text: string;
  profilePictureUrl?: string;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface LiveChatModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  username: string;
  liveComments: LiveComment[];
  connectionStatus: ConnectionStatus;
}

const StatusIndicator = ({ status }: { status: ConnectionStatus }) => {
    switch (status) {
        case 'connected':
            return <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div><span className="text-green-400 text-sm">Connected</span></div>;
        case 'connecting':
            return <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-yellow-500 animate-spin"></div><span className="text-yellow-400 text-sm">Connecting...</span></div>;
        case 'error':
            return <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500"></div><span className="text-red-400 text-sm">Error</span></div>;
        case 'disconnected':
        default:
            return <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-gray-500"></div><span className="text-gray-400 text-sm">Disconnected</span></div>;
    }
};

export function LiveChatModal({ isOpen, onOpenChange, username, liveComments, connectionStatus }: LiveChatModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-3/4 flex flex-col bg-card/90 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Live Chat Feed</DialogTitle>
            <StatusIndicator status={connectionStatus} />
          </div>
          <DialogDescription>
            Unfiltered comments from @{username.startsWith('@') ? username.substring(1) : username}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow rounded-md border p-2">
            <div className="flex flex-col-reverse gap-3">
                {liveComments.length > 0 ? liveComments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 p-2 rounded-lg bg-background/50 animate-in fade-in-20 slide-in-from-bottom-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.profilePictureUrl} alt={comment.user} />
                            <AvatarFallback>{comment.user.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold text-sm text-primary">{comment.user}</p>
                            <p className="text-sm text-foreground/90">{comment.text}</p>
                        </div>
                    </div>
                )) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground italic">
                        {connectionStatus === 'connecting' && <p>Attempting to connect to live stream...</p>}
                        {connectionStatus === 'connected' && <p>Waiting for comments...</p>}
                        {connectionStatus === 'error' && <p>Could not connect. The user may not be live.</p>}
                        {connectionStatus === 'disconnected' && <p>Stream disconnected.</p>}
                    </div>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
