import { useState, useRef, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { useDeleteDocument, useChatWithDocument, ChatMessage as ApiChatMessage } from "@workspace/api-client-react";

const queryClient = new QueryClient();

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

export type DocumentMeta = {
  docId: string;
  filename: string;
  totalChunks: number;
};

function DocuBotWorkspace() {
  const { toast } = useToast();
  const [document, setDocument] = useState<DocumentMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const deleteDocMutation = useDeleteDocument();
  const chatMutation = useChatWithDocument();

  const handleUploadSuccess = (meta: DocumentMeta) => {
    setDocument(meta);
    setMessages([]);
    toast({
      title: "Document ready",
      description: `${meta.filename} has been processed into ${meta.totalChunks} searchable chunks.`,
    });
  };

  const handleDeleteDocument = async () => {
    if (!document) return;
    try {
      await deleteDocMutation.mutateAsync({ docId: document.docId });
      setDocument(null);
      setMessages([]);
      toast({
        title: "Document removed",
        description: "The document and its data have been cleared.",
      });
    } catch (err) {
      toast({
        title: "Failed to delete document",
        description: "An error occurred while removing the document.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!document || !content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const history: ApiChatMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await chatMutation.mutateAsync({
        data: {
          docId: document.docId,
          message: content,
          history
        }
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.answer,
        sources: res.sources,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      toast({
        title: "Failed to get response",
        description: "An error occurred while communicating with the assistant.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans">
      <Sidebar 
        document={document} 
        onUploadSuccess={handleUploadSuccess} 
        onDeleteDocument={handleDeleteDocument} 
        isDeleting={deleteDocMutation.isPending}
      />
      <ChatPanel 
        document={document} 
        messages={messages} 
        isTyping={isTyping} 
        onSendMessage={handleSendMessage} 
      />
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DocuBotWorkspace />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
