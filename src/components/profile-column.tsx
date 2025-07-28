
'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Users, Heart, ShoppingBag } from "lucide-react";
import { Separator } from "./ui/separator";

export type UserProfile = {
  username: string;
  avatar: string;
  followers: number;
  following: number;
  likes: number;
  bio: string;
  purchaseHistory: { item: string; date: string }[];
};

interface ProfileColumnProps {
  user: UserProfile | null;
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
    <div className="flex items-center gap-3 rounded-lg bg-card p-3">
        <div className="rounded-md bg-muted p-2">
            {icon}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value.toLocaleString()}</p>
        </div>
    </div>
);

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <User className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-semibold">Select a User</p>
        <p className="text-sm text-muted-foreground mt-1">Click a comment or gift to display profile information.</p>
    </div>
);

export function ProfileColumn({ user }: ProfileColumnProps) {
  return (
    <Card className="flex flex-col h-[80vh] md:h-[calc(100vh-12rem)] shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="text-primary" />
          User Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        {user ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 border-4 border-primary">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-primary">@{user.username}</h2>
                <p className="text-muted-foreground text-sm">{user.bio}</p>
              </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Users className="h-6 w-6 text-primary" />} label="Followers" value={user.followers} />
                <StatCard icon={<Users className="h-6 w-6 text-muted-foreground" />} label="Following" value={user.following} />
                <StatCard icon={<Heart className="h-6 w-6 text-destructive" />} label="Likes" value={user.likes} />
                <StatCard icon={<ShoppingBag className="h-6 w-6 text-accent" />} label="Purchases" value={user.purchaseHistory.length} />
            </div>

            <Separator />

            <div>
                <h3 className="text-md font-semibold mb-2">Purchase History</h3>
                <div className="flex flex-col gap-2">
                    {user.purchaseHistory.length > 0 ? user.purchaseHistory.map((purchase, index) => (
                        <div key={index} className="flex justify-between items-center bg-card p-2 rounded-md">
                            <p className="text-sm">{purchase.item}</p>
                            <p className="text-xs text-muted-foreground">{purchase.date}</p>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground italic">No purchase history.</p>
                    )}
                </div>
            </div>

          </div>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}
