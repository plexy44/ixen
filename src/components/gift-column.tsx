
'use client';

import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GiftIcon, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type Gift = {
  id: number | string;
  user: string;
  giftName: string;
  count: number;
  profilePictureUrl?: string;
};

interface GiftCardProps {
  gift: Gift;
  onClick: () => void;
}

function GiftCard({ gift, onClick }: GiftCardProps) {
  return (
    <Card
      onClick={onClick}
      className="p-3 bg-card/50 hover:bg-card transition-colors duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={gift.profilePictureUrl} alt={gift.user} />
          <AvatarFallback>{gift.user.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm text-primary">{gift.user}</p>
          <p className="text-sm text-foreground/90">Sent a {gift.giftName} x{gift.count}</p>
        </div>
      </div>
    </Card>
  );
}

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <PackageOpen className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-md font-semibold">No Gifts Yet</p>
        <p className="text-xs text-muted-foreground mt-1">Gifts will appear here.</p>
    </div>
);

interface GiftColumnProps {
  gifts: Gift[];
  onGiftClick: (gift: Gift) => void;
}

export function GiftColumn({ gifts, onGiftClick }: GiftColumnProps) {
  return (
    <Card className="flex flex-col h-full shadow-lg">
      <CardHeader className="flex-shrink-0 py-4">
        <CardTitle className="flex items-center gap-2 text-md">
          <GiftIcon className="text-pink-500" />
          Gifts
          <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{gifts.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full">
            {gifts.length > 0 ? (
                <div className="flex flex-col gap-2 p-4 pt-0">
                    {gifts.map((gift) => (
                        <GiftCard
                        key={gift.id}
                        gift={gift}
                        onClick={() => onGiftClick(gift)}
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
