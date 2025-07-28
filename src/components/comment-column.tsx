'use client';

import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentCard } from "@/components/comment-card";

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

export function CommentColumn({ title, comments, icon, onCommentClick, selectedCommentId }: CommentColumnProps) {
  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] shadow-lg">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
          <span className="ml-auto text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md">{comments.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-3 p-4 pt-0">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onClick={() => onCommentClick(comment)}
                  isSelected={comment.id === selectedCommentId}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full pt-20">
                <p className="text-muted-foreground text-sm italic">Waiting for comments...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}