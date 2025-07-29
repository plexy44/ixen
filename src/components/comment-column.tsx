
'use client';

import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentCard } from "@/components/comment-card";
import { MessageSquareOff } from 'lucide-react';

type Comment = {
  id: number | string;
  user: string;
  text: string;
  profilePictureUrl?: string;
};

interface CommentColumnProps {
  title: string;
  comments: Comment[];
  icon: ReactNode;
  onCommentClick: (comment: Comment) => void;
  selectedCommentId: number | string | null;
}

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <MessageSquareOff className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-md font-semibold">No Comments Yet</p>
        <p className="text-xs text-muted-foreground mt-1">Comments will appear here.</p>
    </div>
);

export function CommentColumn({ title, comments, icon, onCommentClick, selectedCommentId }: CommentColumnProps) {
  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader className="flex-shrink-0 py-4">
        <CardTitle className="flex items-center gap-2 text-md">
          {icon}
          {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{comments.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full">
          {comments.length > 0 ? (
            <div className="flex flex-col gap-2 p-4 pt-0">
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onClick={() => onCommentClick(comment)}
                  isSelected={comment.id === selectedCommentId}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
