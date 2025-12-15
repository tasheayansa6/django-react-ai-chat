import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  MessageSquare,
  Zap,
  MessageSquarePlus,
  Copy,
  Check,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { Badge } from "@/components/ui/badge";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

export interface IChat {
  id: string;
  title: string;
  created_at: string;
  message_count?: number;
  last_message?: string;
}

const API = "http://127.0.0.1:8000";

// ------------------ Copy Button for Chat URL ------------------
const CopyChatButton = ({ chatId }: { chatId: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const chatURL = `${window.location.origin}/chats/${chatId}`;
    
    try {
      await navigator.clipboard.writeText(chatURL);
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn(
        "ml-2 h-8 w-8 p-0 transition-all duration-200",
        copied ? "bg-green-100 text-green-600 border-green-200" : "hover:bg-muted"
      )}
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy chat URL"}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
};

// Fetch all chats from API
const getAllChatsFallback = async (): Promise<IChat[]> => {
  try {
    const [todayRes, yesterdayRes, sevenDaysRes] = await Promise.all([
      axios.get(`${API}/todays_chats/`),
      axios.get(`${API}/yesterdays_chats/`),
      axios.get(`${API}/seven_days_chats/`),
    ]);

    const allChats = [
      ...(Array.isArray(todayRes.data) ? todayRes.data : []),
      ...(Array.isArray(yesterdayRes.data) ? yesterdayRes.data : []),
      ...(Array.isArray(sevenDaysRes.data) ? sevenDaysRes.data : []),
    ];

    // Remove duplicates by ID
    const uniqueChats = allChats.reduce((acc: IChat[], chat) => {
      if (!acc.find((c) => c.id === chat.id)) {
        acc.push(chat);
      }
      return acc;
    }, []);

    return uniqueChats;
  } catch (error) {
    console.error("Error fetching chats:", error);
    return [];
  }
};

const createChat = async (): Promise<{ chat_id: string; title: string }> => {
  const res = await axios.post(`${API}/prompt_gpt/`, {
    chat_id: "new",
    content: "Hello, let's start a new conversation",
  });
  return {
    chat_id: res.data.chat_id,
    title: res.data.title || "New Chat",
  };
};

// Categorize chats by date
const categorizeChatsByDate = (chats: IChat[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentChats: IChat[] = [];
  const yesterdaysChats: IChat[] = [];
  const sevenDaysChats: IChat[] = [];

  chats.forEach((chat) => {
    const chatDate = new Date(chat.created_at);
    const chatDateOnly = new Date(
      chatDate.getFullYear(),
      chatDate.getMonth(),
      chatDate.getDate()
    );

    if (chatDateOnly.getTime() === today.getTime()) {
      recentChats.push(chat);
    } else if (chatDateOnly.getTime() === yesterday.getTime()) {
      yesterdaysChats.push(chat);
    } else if (chatDateOnly >= sevenDaysAgo && chatDateOnly < yesterday) {
      sevenDaysChats.push(chat);
    }
  });

  const sortByDate = (a: IChat, b: IChat) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  return {
    recentChats: recentChats.sort(sortByDate),
    yesterdaysChats: yesterdaysChats.sort(sortByDate),
    sevenDaysChats: sevenDaysChats.sort(sortByDate),
  };
};

const mainNav = [
  { title: "Home", url: "/", icon: Home },
  { title: "Inbox", url: "#", icon: Inbox },
  { title: "Calendar", url: "#", icon: Calendar },
  { title: "Search", url: "#", icon: Search },
  { title: "Settings", url: "#", icon: Settings },
];

// ------------------ AppSidebar Component ------------------
export function AppSidebar() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: allChats = [], isLoading, refetch } = useQuery({
    queryKey: ["allChats"],
    queryFn: getAllChatsFallback,
    retry: 2,
  });

  const { recentChats, yesterdaysChats, sevenDaysChats } = categorizeChatsByDate(allChats);

  const { mutate: newChat, isPending } = useMutation({
    mutationFn: createChat,
    onSuccess: (data) => {
      // Create chat object with current date
      const chatObj: IChat = {
        id: data.chat_id,
        title: data.title,
        created_at: new Date().toISOString(),
        message_count: 2, // Initial message count (user + assistant)
      };

      // Update cache by adding new chat to all chats
      queryClient.setQueryData(["allChats"], (old: IChat[] = []) => [chatObj, ...old]);

      // Navigate to the new chat
      navigate(`/chats/${data.chat_id}`);

      // Refetch to get updated data from server
      setTimeout(() => refetch(), 500);
    },
    onError: (err) => {
      console.error("Error creating chat:", err);
      alert("Failed to create chat. Check the server.");
    },
  });

  const cleanTitle = (title: string) => {
    if (!title) return "Untitled Chat";
    const t = title.trim();
    // Remove surrounding quotes if present
    if ((t[0] === '"' && t[t.length - 1] === '"') || 
        (t[0] === "'" && t[t.length - 1] === "'")) {
      return t.slice(1, -1);
    }
    return t;
  };

  const renderChats = (chats: IChat[]) =>
    chats.map((chat) => (
      <SidebarMenuItem key={chat.id} className="flex justify-between items-center group">
        <div className="flex-1">
          <NavLink to={`/chats/${chat.id}`}>
            {({ isActive }) => (
              <SidebarMenuButton
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-md transition cursor-pointer w-full",
                  isActive ? "bg-muted" : "hover:bg-muted"
                )}
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1">{cleanTitle(chat.title)}</span>
                {chat.message_count && chat.message_count > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground flex-shrink-0">
                    ({chat.message_count})
                  </span>
                )}
              </SidebarMenuButton>
            )}
          </NavLink>
        </div>
        <CopyChatButton chatId={chat.id} />
      </SidebarMenuItem>
    ));

  return (
    <Sidebar className="bg-background text-foreground border-r">
      <SidebarContent className="flex flex-col justify-between h-full">
        <div>
          {/* Main Menu */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground uppercase px-4 pt-4 pb-2">
              Main Menu
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0.5">
                Pro
              </Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted rounded-md transition"
                      >
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* New Chat Button */}
          <div className="px-4 pt-4">
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              onClick={() => newChat()}
              disabled={isPending}
            >
              <MessageSquarePlus className="w-4 h-4" />
              {isPending ? "Creating..." : "New Chat"}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <p className="px-4 pt-4 text-xs text-muted-foreground">Loading chats...</p>
          )}

          {/* Today's Chats */}
          {recentChats.length > 0 && (
            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase px-4 pb-2">
                Today ({recentChats.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderChats(recentChats)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Yesterday's Chats */}
          {yesterdaysChats.length > 0 && (
            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase px-4 pb-2">
                Yesterday ({yesterdaysChats.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderChats(yesterdaysChats)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Last 7 Days Chats */}
          {sevenDaysChats.length > 0 && (
            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase px-4 pb-2">
                Last 7 Days ({sevenDaysChats.length})
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderChats(sevenDaysChats)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* No Chats Message */}
          {!isLoading && allChats.length === 0 && (
            <div className="px-4 pt-6 text-sm text-muted-foreground text-center">
              No chats yet. Click "New Chat" to start!
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="p-4 border-t">
          <Link
            to="#"
            className="flex items-center justify-between bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              New
            </Badge>
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}