
'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, WifiOff, Loader } from "lucide-react";
import type { ConnectionStatus } from "@/app/page";

export type LiveComment = {
  id: string | number;
  user: string;
  text: string;
  profilePictureUrl?: string;
};

interface LiveChatColumnProps {
  liveComments: LiveComment[];
  connectionStatus: ConnectionStatus;
}

const EmptyState = ({ status }: { status: ConnectionStatus }) => {
    let icon, message, subtext;

    switch (status) {
        case 'connecting':
            icon = <Loader className="h-12 w-12 text-muted-foreground animate-spin" />;
            message = "Connecting...";
            subtext = "Attempting to connect to the live stream.";
            break;
        case 'error':
            icon = <WifiOff className="h-12 w-12 text-destructive" />;
            message = "Connection Failed";
            subtext = "Could not connect to the user. They may not be live.";
            break;
        case 'disconnected':
        default:
            icon = <WifiOff className="h-12 w-12 text-muted-foreground" />;
            message = "Not Connected";
            subtext = "Enter a username and connect to a live stream.";
            break;
    }
    
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {icon}
            <p className="mt-4 text-lg font-semibold">{message}</p>
            <p className="text-sm text-muted-foreground mt-1">{subtext}</p>
        </div>
    );
};


export function LiveChatColumn({ liveComments, connectionStatus }: LiveChatColumnProps) {
  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader  className="flex-shrink-0 py-4">
        <CardTitle className="flex items-center gap-2 text-md">
          <MessageCircle className="text-primary" />
          Live Chat Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full">
            {connectionStatus === 'connected' ? (
                <div className="flex flex-col-reverse gap-3 p-4">
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
                        <div className="flex items-center justify-center h-full pt-20">
                            <p className="text-muted-foreground text-sm italic">Waiting for comments...</p>
                        </div>
                    )}
                </div>
            ) : (
                <EmptyState status={connectionStatus} />
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
