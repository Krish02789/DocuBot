import { useState, useRef, useEffect } from "react";
import { Send, Search, Terminal } from "lucide-react";
import { ChatMessage, DocumentMeta } from "../App";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";

interface ChatPanelProps {
  document: DocumentMeta | null;
  messages: ChatMessage[];
  isTyping: boolean;
  onSendMessage: (msg: string) => void;
}

export function ChatPanel({ document, messages, isTyping, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !document) return;
    onSendMessage(input);
    setInput("");
  };

  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="z-10 flex flex-col items-center text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 border border-border">
            <Terminal className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-foreground">Awaiting Document</h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Upload a PDF in the left panel to initialize the workspace and begin extracting insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-6 md:p-8" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
          {messages.length === 0 ? (
            <div className="h-[40vh] flex flex-col items-center justify-center text-center opacity-50">
              <Search className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">Document Indexed</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                Ask any question about the contents of this document.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          
          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4 text-primary" />
              </div>
              <div className="flex bg-muted/30 border border-border rounded-2xl rounded-tl-sm px-5 py-4 min-h-[44px] items-center">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask a question about the document..."
            className="w-full bg-card border border-border rounded-xl px-4 py-4 pr-14 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none min-h-[56px] max-h-[200px]"
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-2 h-10 w-10 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-3">
          DocuBOT retrieves context directly from your uploaded PDF.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%] text-[15px] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <Terminal className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col gap-3 max-w-[85%]">
        <div className="bg-card border border-border text-card-foreground rounded-2xl rounded-tl-sm px-5 py-4 text-[15px] leading-relaxed shadow-sm">
          {message.content}
        </div>
        
        {message.sources && message.sources.length > 0 && (
          <Collapsible className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent hover:bg-muted/50 border-border/50 text-muted-foreground flex items-center gap-1.5">
                <Search className="w-3 h-3" />
                View {message.sources.length} Retrieved Sources
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {message.sources.map((source, idx) => (
                <div key={idx} className="bg-muted/30 border border-border/50 rounded-lg p-3 text-xs font-mono text-muted-foreground leading-relaxed">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1.5 font-sans font-medium">Source Chunk {idx + 1}</div>
                  {source}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
