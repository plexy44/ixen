'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Comment = {
  id: number | string;
  user: string;
  text: string;
  profilePictureUrl?: string;
};

interface CommentCardProps {
  comment: Comment;
  onClick: () => void;
  isSelected: boolean;
}

export function CommentCard({ comment, onClick, isSelected }: CommentCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 bg-card/50 hover:bg-card transition-colors duration-200 cursor-pointer",
        isSelected && "bg-primary/20 border-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profilePictureUrl} alt={comment.user} />
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