import React, { useRef, useState } from 'react';
import {
  Upload,
  Film,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw,
  FileCode,
  AlertCircle,
  Plus,
  FolderOpen,
  Video,
  Link as LinkIcon,
} from 'lucide-react';
import { PlaylistItem } from '../types';
import { ShortcutsPanel } from './ShortcutsPanel';

interface PlaylistSidebarProps {
  playlist: PlaylistItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onDeleteItem: (id: string) => void;
  onResetItem: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onLinkVideo: (itemId: string, file: File) => void;
  onLinkXml: (itemId: string, file: File) => void;
}

export const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({
  playlist,
  activeItemId,
  onSelectItem,
  onFilesSelected,
  onDeleteItem,
  onResetItem,
  isOpen,
  onToggleOpen,
  onLinkVideo,
  onLinkXml,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const linkVideoInputRef = useRef<HTMLInputElement>(null);
  const linkXmlInputRef = useRef<HTMLInputElement>(null);
  const [targetItemIdForLink, setTargetItemIdForLink] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Dropped folders only hand over the folder itself, so walk inside them ourselves
  const readEntry = async (entry: any, out: File[]): Promise<void> => {
    if (entry.isFile) {
      const file: File = await new Promise((res, rej) => entry.file(res, rej));
      out.push(file);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      for (;;) {
        const batch: any[] = await new Promise((res, rej) => reader.readEntries(res, rej));
        if (batch.length === 0) break; // readEntries returns 100 at a time
        for (const child of batch) await readEntry(child, out);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items || []);
    const entries = items.map((i) => (i as any).webkitGetAsEntry?.()).filter(Boolean);
    if (entries.length > 0) {
      const files: File[] = [];
      for (const entry of entries) await readEntry(entry, files);
      if (files.length > 0) onFilesSelected(files);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const triggerLinkVideo = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetItemIdForLink(itemId);
    linkVideoInputRef.current?.click();
  };

  const triggerLinkXml = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetItemIdForLink(itemId);
    linkXmlInputRef.current?.click();
  };

  if (!isOpen) {
    return (
      <div className="w-12 border-r border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkPanel flex flex-col items-center py-4 space-y-4">
        <button
          onClick={onToggleOpen}
          title="Expand Playlist"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-studio-darkCard transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center space-y-2 overflow-y-auto">
          {playlist.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              title={`${idx + 1}. ${item.name}`}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                item.id === activeItemId
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                  : item.isCompleted
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-studio-darkCard dark:text-slate-400 hover:bg-slate-300'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-studio-darkBorder bg-slate-50 dark:bg-studio-darkPanel flex flex-col h-[calc(100vh-4rem)] select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-200 dark:border-studio-darkBorder flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Film className="w-4 h-4 text-cyan-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Rally Playlist ({playlist.length})
          </h2>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => folderInputRef.current?.click()}
            title="Open a whole folder of rallies"
            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-studio-darkCard dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Folder</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Add Video or XML"
            className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold flex items-center space-x-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onToggleOpen}
            title="Collapse Sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-studio-darkCard"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden Global File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/*,.xml,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(e.target.files);
        }}
      />

      {/* Hidden Folder Input: picks every file inside a folder */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      {/* Hidden Single Video Linker Input */}
      <input
        ref={linkVideoInputRef}
        type="file"
        accept="video/mp4,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && targetItemIdForLink) {
            onLinkVideo(targetItemIdForLink, e.target.files[0]);
            setTargetItemIdForLink(null);
          }
        }}
      />

      {/* Hidden Single XML Linker Input */}
      <input
        ref={linkXmlInputRef}
        type="file"
        accept=".xml,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && targetItemIdForLink) {
            onLinkXml(targetItemIdForLink, e.target.files[0]);
            setTargetItemIdForLink(null);
          }
        }}
      />

      {/* Drop Zone Area if Playlist Empty */}
      {playlist.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="m-4 flex-1 border-2 border-dashed border-slate-300 dark:border-studio-darkBorder rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/10 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Drag & Drop Video (.mp4) and/or XML
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs">
            Drop your match rally clips and skill annotations. Matching files auto-pair into a single rally!
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold flex items-center space-x-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Folder</span>
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex-1 overflow-y-auto p-2 space-y-2"
        >
          {playlist.map((item, idx) => {
            const isActive = item.id === activeItemId;
            const setEvents = item.events.filter((e) => e.skill === 'set');
            const setsAnnotatedCount = setEvents.filter((e) => e.setStyle && e.setDirection).length;
            const hasLanding = item.ballLanding.isAnnotated;
            const hasReferee = item.refereeActions.isAnnotated && item.refereeActions.pointWinner !== 'none';
            const hasVideo = !!item.videoFile;
            const hasXml = item.events.length > 0;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isActive
                    ? 'border-cyan-500/80 bg-cyan-500/10 dark:bg-cyan-950/20 shadow-sm shadow-cyan-500/10'
                    : 'border-slate-200 dark:border-studio-darkBorder bg-white dark:bg-studio-darkCard/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-200 dark:bg-studio-darkBorder text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </h3>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResetItem(item.id);
                      }}
                      title="Reset this rally's annotations"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-500 transition-opacity"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      title="Remove Rally"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Video & XML Status Link Badges */}
                <div className="mt-2 flex items-center space-x-1.5">
                  {/* Video status */}
                  {hasVideo ? (
                    <span className="flex items-center space-x-1 text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300 border border-cyan-300/40">
                      <Video className="w-2.5 h-2.5" />
                      <span>Video ({item.videoMetadata?.frameCount || 'ready'})</span>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => triggerLinkVideo(item.id, e)}
                      title="Click to link Video MP4 file for this match"
                      className="flex items-center space-x-1 text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 hover:bg-amber-200 border border-amber-400/40 transition-colors"
                    >
                      <LinkIcon className="w-2.5 h-2.5" />
                      <span>+ Link Video</span>
                    </button>
                  )}

                  {/* XML status */}
                  {hasXml ? (
                    <span className="flex items-center space-x-1 text-[9px] px-1.5 py-0.5 rounded font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40">
                      <FileCode className="w-2.5 h-2.5" />
                      <span>XML ({item.events.length} skills)</span>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => triggerLinkXml(item.id, e)}
                      title="Click to link XML skills for this match"
                      className="flex items-center space-x-1 text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 hover:bg-amber-200 border border-amber-400/40 transition-colors"
                    >
                      <LinkIcon className="w-2.5 h-2.5" />
                      <span>+ Link XML</span>
                    </button>
                  )}
                </div>

                {/* Progress Mini Badges */}
                <div className="mt-2 flex items-center space-x-1.5">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      setEvents.length === 0
                        ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        : setsAnnotatedCount === setEvents.length
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                    }`}
                  >
                    Set: {setsAnnotatedCount}/{setEvents.length}
                  </span>

                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      hasLanding
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    Landing: {hasLanding ? '✓' : '—'}
                  </span>

                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      hasReferee
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    Ref: {hasReferee ? '✓' : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact hotkeys, always visible on the left */}
      <ShortcutsPanel />

      {/* Bottom Drop Notice */}
      <div className="p-2 border-t border-slate-200 dark:border-studio-darkBorder bg-slate-100/50 dark:bg-studio-darkPanel text-[10px] text-center text-slate-400">
        Drop matching video & XML files together to auto-pair
      </div>
    </aside>
  );
};
