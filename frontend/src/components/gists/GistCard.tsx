import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit3, Trash2, FileCode, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Gist } from '@/types/gist';

export interface GistCardProps {
  gist: Gist;
  isOwner?: boolean;
  onDeleteClick?: (gist: Gist) => void;
}

export const GistCard: React.FC<GistCardProps> = ({
  gist,
  isOwner = true,
  onDeleteClick,
}) => {
  const navigate = useNavigate();

  // First 3-4 lines of content for clean preview
  const contentPreview = gist.content
    ? gist.content.split('\n').slice(0, 4).join('\n')
    : '(empty gist)';

  return (
    <Card
      variant="default"
      className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-card dark:hover:shadow-card-dark group"
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* Header: Title + ID / Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <h3
              onClick={() => navigate(`/gists/${gist.id}`)}
              className="text-sm font-semibold text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              title={gist.title}
            >
              {gist.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
              #{gist.id}
            </span>
            {!isOwner && (
              <Badge variant="purple" size="sm">
                <Shield className="w-3 h-3 mr-1 inline" />
                Shared
              </Badge>
            )}
          </div>
        </div>

        {/* Content Snippet */}
        <div
          onClick={() => navigate(`/gists/${gist.id}`)}
          className="cursor-pointer rounded-lg p-3 bg-slate-50 dark:bg-[#080b12] border border-slate-100 dark:border-slate-800/80 font-mono text-[11px] text-slate-600 dark:text-slate-400 overflow-hidden line-clamp-4 whitespace-pre-wrap select-none"
        >
          {contentPreview}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => navigate(`/gists/${gist.id}`)}
          className="text-xs"
        >
          View
        </Button>

        {isOwner && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/gists/${gist.id}/edit`)}
              className="text-xs"
              title="Edit Gist"
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
              onClick={() => onDeleteClick?.(gist)}
              className="text-xs hover:text-red-600 dark:hover:text-red-400"
              title="Delete Gist"
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GistCard;
