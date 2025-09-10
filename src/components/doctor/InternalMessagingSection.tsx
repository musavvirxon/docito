import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Search, Plus, Users, Clock, Paperclip } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  lastMessage: Message;
  unreadCount: number;
  type: "direct" | "group";
  groupName?: string;
}

const InternalMessagingSection = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>("1");
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [conversations] = useState<Conversation[]>([
    {
      id: "1",
      participants: [
        { id: "nurse1", name: "Jennifer Adams", role: "Nurse", avatar: "/api/placeholder/40/40" },
        { id: "doctor1", name: "Dr. Sarah Johnson", role: "Doctor" }
      ],
      lastMessage: {
        id: "m1",
        senderId: "nurse1",
        senderName: "Jennifer Adams",
        senderRole: "Nurse",
        content: "Patient in room 302 is ready for consultation",
        timestamp: "2024-01-20T14:30:00Z",
        read: false
      },
      unreadCount: 2,
      type: "direct"
    },
    {
      id: "2",
      participants: [
        { id: "admin1", name: "Michael Brown", role: "Admin", avatar: "/api/placeholder/40/40" },
        { id: "doctor1", name: "Dr. Sarah Johnson", role: "Doctor" }
      ],
      lastMessage: {
        id: "m2",
        senderId: "admin1",
        senderName: "Michael Brown",
        senderRole: "Admin",
        content: "Schedule update for next week has been sent",
        timestamp: "2024-01-20T13:15:00Z",
        read: true
      },
      unreadCount: 0,
      type: "direct"
    },
    {
      id: "3",
      participants: [
        { id: "doctor1", name: "Dr. Sarah Johnson", role: "Doctor" },
        { id: "doctor2", name: "Dr. Robert Smith", role: "Doctor" },
        { id: "nurse1", name: "Jennifer Adams", role: "Nurse" },
        { id: "receptionist1", name: "Lisa Wilson", role: "Receptionist" }
      ],
      lastMessage: {
        id: "m3",
        senderId: "doctor2",
        senderName: "Dr. Robert Smith",
        senderRole: "Doctor",
        content: "Team meeting scheduled for tomorrow at 9 AM",
        timestamp: "2024-01-20T12:00:00Z",
        read: true
      },
      unreadCount: 0,
      type: "group",
      groupName: "Cardiology Team"
    }
  ]);

  const [messages] = useState<Record<string, Message[]>>({
    "1": [
      {
        id: "m1-1",
        senderId: "nurse1",
        senderName: "Jennifer Adams",
        senderRole: "Nurse",
        content: "Good morning Dr. Johnson! Patient in room 302 has arrived early",
        timestamp: "2024-01-20T14:00:00Z",
        read: true
      },
      {
        id: "m1-2",
        senderId: "doctor1",
        senderName: "Dr. Sarah Johnson",
        senderRole: "Doctor",
        content: "Thanks Jennifer! I'll be there in 10 minutes. Any pre-visit vitals?",
        timestamp: "2024-01-20T14:15:00Z",
        read: true
      },
      {
        id: "m1-3",
        senderId: "nurse1",
        senderName: "Jennifer Adams",
        senderRole: "Nurse",
        content: "Blood pressure 140/90, pulse 72, temperature normal. Patient seems anxious.",
        timestamp: "2024-01-20T14:25:00Z",
        read: true
      },
      {
        id: "m1-4",
        senderId: "nurse1",
        senderName: "Jennifer Adams",
        senderRole: "Nurse",
        content: "Patient in room 302 is ready for consultation",
        timestamp: "2024-01-20T14:30:00Z",
        read: false
      }
    ],
    "2": [
      {
        id: "m2-1",
        senderId: "admin1",
        senderName: "Michael Brown",
        senderRole: "Admin",
        content: "Schedule update for next week has been sent",
        timestamp: "2024-01-20T13:15:00Z",
        read: true
      }
    ],
    "3": [
      {
        id: "m3-1",
        senderId: "doctor2",
        senderName: "Dr. Robert Smith",
        senderRole: "Doctor",
        content: "Team meeting scheduled for tomorrow at 9 AM",
        timestamp: "2024-01-20T12:00:00Z",
        read: true
      }
    ]
  });

  const selectedConversationData = conversations.find(c => c.id === selectedConversation);
  const selectedMessages = selectedConversation ? messages[selectedConversation] || [] : [];

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    // Here you would typically send the message to your backend
    console.log("Sending message:", messageInput);
    setMessageInput("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === "group") {
      return conversation.groupName || "Group Chat";
    }
    // For direct messages, show the other participant's name
    const otherParticipant = conversation.participants.find(p => p.id !== "doctor1");
    return otherParticipant?.name || "Unknown";
  };

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.type === "group") {
      return `${conversation.participants.length} members`;
    }
    const otherParticipant = conversation.participants.find(p => p.id !== "doctor1");
    return otherParticipant?.role || "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Internal Messages
              </CardTitle>
              <p className="text-muted-foreground">Communicate with clinic staff and team members</p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="group">Groups</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-3">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conversation.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        {conversation.type === "group" ? (
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                        ) : (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conversation.participants.find(p => p.id !== "doctor1")?.avatar} />
                            <AvatarFallback>
                              {conversation.participants.find(p => p.id !== "doctor1")?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-medium truncate ${
                            conversation.unreadCount > 0 ? "text-foreground" : "text-foreground"
                          }`}>
                            {getConversationName(conversation)}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(conversation.lastMessage.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-1">
                          {getConversationSubtitle(conversation)}
                        </p>
                        
                        <p className={`text-sm truncate ${
                          conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}>
                          {conversation.lastMessage.senderName}: {conversation.lastMessage.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message View */}
        <Card className="lg:col-span-2">
          {selectedConversationData ? (
            <>
              {/* Conversation Header */}
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  {selectedConversationData.type === "group" ? (
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversationData.participants.find(p => p.id !== "doctor1")?.avatar} />
                      <AvatarFallback>
                        {selectedConversationData.participants.find(p => p.id !== "doctor1")?.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div>
                    <h3 className="font-medium">{getConversationName(selectedConversationData)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getConversationSubtitle(selectedConversationData)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-4">
                    {selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.senderId === "doctor1" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {message.senderName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`flex-1 max-w-[70%] ${
                          message.senderId === "doctor1" ? "text-right" : ""
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{message.senderName}</span>
                            <Badge variant="outline" className="text-xs">{message.senderRole}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          
                          <div className={`rounded-lg p-3 ${
                            message.senderId === "doctor1"
                              ? "bg-primary text-primary-foreground ml-auto"
                              : "bg-muted"
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button onClick={handleSendMessage} size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Select a conversation</h3>
                <p className="text-sm">Choose a conversation from the left to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default InternalMessagingSection;