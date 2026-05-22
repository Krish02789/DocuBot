import { useState, useRef, DragEvent } from "react";
import { UploadCloud, FileText, Trash2, Loader2, Database } from "lucide-react";
import { DocumentMeta } from "../App";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  document: DocumentMeta | null;
  onUploadSuccess: (meta: DocumentMeta) => void;
  onDeleteDocument: () => void;
  isDeleting: boolean;
}

export function Sidebar({ document, onUploadSuccess, onDeleteDocument, isDeleting }: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      await processFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      await processFile(e.target.files[0]);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF document.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      onUploadSuccess({
        docId: data.docId,
        filename: data.filename,
        totalChunks: data.totalChunks,
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading and processing your document.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-[35%] min-w-[320px] max-w-[450px] border-r border-border bg-card/40 flex flex-col p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <Database className="w-3.5 h-3.5" />
          </div>
          DocuBOT
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Intelligent research workspace. Upload a PDF to extract insights.
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        {!document ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              flex-1 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
            `}
          >
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
            />
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <h3 className="font-medium text-foreground">Processing Document</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                  Extracting text, chunking, and generating embeddings...
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UploadCloud className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground">Upload a PDF</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                  Drag and drop your file here or click to browse
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate" title={document.filename}>
                    {document.filename}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {document.totalChunks} chunks
                    </span>
                    <span className="text-xs text-muted-foreground">Vectorized</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={onDeleteDocument}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Remove Document
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
