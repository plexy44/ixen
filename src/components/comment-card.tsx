'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

type Comment = {
  id: number;
  user: string;
  text: string;
};

interface CommentCardProps {
  comment: Comment;
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <Card className="p-3 bg-card/50 hover:bg-card transition-colors duration-200">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{comment.user.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm text-primary">{comment.user}</p>
          <p className="text-sm text-foreground/90">{comment.text}</p>
        </div>
      </div>
    </Card>
  );
}
