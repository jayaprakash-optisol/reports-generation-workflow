import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, Sparkles, Upload, X, FileImage } from 'lucide-react';
import { useState, useRef } from 'react';
import { useCreateReport, useUploadReport } from '@/hooks/useReports';
import { ReportRequest } from '@/types/api';

const styles = ['Business', 'Research', 'Technical'];
const formats = ['PDF', 'DOCX', 'HTML'];

export function ReportForm() {
  const [title, setTitle] = useState('Q1 Performance Report');
  const [selectedStyle, setSelectedStyle] = useState('Business');
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['PDF']);
  const [instructions, setInstructions] = useState(
    'Keep it concise, data-driven, and executive-friendly.'
  );
  const [jsonData, setJsonData] = useState(`[
  { "month": "January", "revenue": 45000, "customers": 120 },
  { "month": "February", "revenue": 52000, "customers": 145 },
  { "month": "March", "revenue": 48000, "customers": 132 }
]`);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createReportMutation = useCreateReport();
  const uploadReportMutation = useUploadReport();

  const toggleFormat = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);

      // Generate previews for image files
      const newPreviews = new Map<string, string>();
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              newPreviews.set(file.name, reader.result as string);
              setFilePreviews(new Map(newPreviews));
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setFilePreviews(prev => {
      const newPreviews = new Map(prev);
      newPreviews.delete(fileName);
      return newPreviews;
    });
  };

  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleGenerateReport = async () => {
    if (!title.trim()) {
      return;
    }

    // If files are selected, use upload endpoint
    if (selectedFiles.length > 0) {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('title', title);
      formData.append('style', selectedStyle.toLowerCase());
      formData.append('outputFormats', selectedFormats.join(','));
      if (instructions) {
        formData.append('customPromptInstructions', instructions);
      }
      uploadReportMutation.mutate(formData);
    } else {
      // Use JSON endpoint
      let parsedData;
      try {
        parsedData = jsonData ? JSON.parse(jsonData) : [];
      } catch (error) {
        console.error('Invalid JSON:', error);
        return;
      }

      const request: ReportRequest = {
        data: [
          {
            type: 'structured',
            format: 'json',
            data: parsedData,
          },
        ],
        config: {
          title,
          style: selectedStyle.toLowerCase() as 'business' | 'research' | 'technical',
          outputFormats: selectedFormats as ('PDF' | 'DOCX' | 'HTML')[],
          customPromptInstructions: instructions || undefined,
        },
      };

      createReportMutation.mutate(request);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedStyle('Business');
    setSelectedFormats(['PDF']);
    setInstructions('');
    setJsonData('');
    setSelectedFiles([]);
    setFilePreviews(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Start a new report</h2>
        <p className="text-sm text-muted-foreground">
          Provide a title, choose style and outputs, and send JSON/text or upload files.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-foreground">
            Report title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
            placeholder="Enter report title..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Style</Label>
          <div className="flex gap-2">
            {styles.map(style => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  selectedStyle === style
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Output formats</Label>
        <div className="flex gap-2">
          {formats.map(format => (
            <button
              key={format}
              onClick={() => toggleFormat(format)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                selectedFormats.includes(format)
                  ? 'bg-secondary text-foreground border border-primary/50 shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
              }`}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions" className="text-sm font-medium text-foreground">
          Custom instructions
        </Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          className="bg-muted/50 border-border/50 focus:border-primary/50 transition-colors min-h-[80px] resize-none"
          placeholder="Add custom instructions..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="jsonData" className="text-sm font-medium text-foreground">
            Inline data (JSON or text)
          </Label>
          <Textarea
            id="jsonData"
            value={jsonData}
            onChange={e => setJsonData(e.target.value)}
            className="bg-muted/50 border-border/50 focus:border-primary/50 transition-colors min-h-[140px] font-mono text-xs resize-none"
            placeholder="Paste JSON data..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">File uploads</Label>
          <div className="border-2 border-dashed border-border/50 rounded-lg p-6 flex flex-col items-center justify-center min-h-[140px] hover:border-primary/30 transition-colors cursor-pointer bg-muted/20">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.json,.txt,.md,.xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx,.html,.rtf,.jpg,.jpeg,.png,.gif,.webp,.svg,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/html,application/rtf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              Choose files
            </button>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedFiles.length} file(s) selected
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              CSV, JSON, Excel, PDF, DOC, DOCX, PPT, PPTX, Images, Markdown, HTML, RTF, or text
            </p>
          </div>

          {/* File Preview Section */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedFiles.map(file => {
                  const preview = filePreviews.get(file.name);
                  const isImage = isImageFile(file);

                  return (
                    <div
                      key={file.name}
                      className="relative group border border-border/50 rounded-lg overflow-hidden bg-muted/30 hover:border-primary/50 transition-all duration-200"
                    >
                      {isImage && preview ? (
                        <div className="aspect-square relative">
                          <img
                            src={preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeFile(file.name)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-destructive/80 hover:bg-destructive text-white rounded-full p-1.5"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square flex flex-col items-center justify-center p-3 bg-muted/50">
                          <FileImage className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground text-center truncate w-full px-1">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatFileSize(file.size)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFile(file.name)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-destructive/80 hover:bg-destructive text-white rounded-full p-1"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="p-2 bg-muted/50">
                        <p className="text-xs text-foreground truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <Button
          onClick={handleGenerateReport}
          disabled={createReportMutation.isPending || uploadReportMutation.isPending || !title.trim()}
          className="glow-primary hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4 mr-2 animate-pulse-soft" />
          {createReportMutation.isPending || uploadReportMutation.isPending ? 'Generating...' : 'Generate report'}
        </Button>
        <Button
          variant="outline"
          onClick={resetForm}
          disabled={createReportMutation.isPending || uploadReportMutation.isPending}
          className="border-border/50 hover:bg-muted/50 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
          Reset form
        </Button>
      </div>
    </div>
  );
}
