'use client';

import { useState, useEffect } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { ModalShell } from '@/components/ui/ModalShell';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
} from '@/types/dashboard-config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: DashboardConfig;
  onSave: (config: DashboardConfig) => void;
}

export default function DashboardSettingsModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: Props) {
  const [config, setConfig] = useState(currentConfig);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setConfig(currentConfig);
    setHasChanges(false);
  }, [currentConfig, isOpen]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;

    setConfig((prev) => {
      const tiles = [...prev.tiles];
      const [item] = tiles.splice(src, 1);
      tiles.splice(dst, 0, item);
      setHasChanges(true);
      return { ...prev, tiles: tiles.map((t, i) => ({ ...t, order: i })) };
    });
  };

  const toggleTile = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      tiles: prev.tiles.map((t) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t,
      ),
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(config);
    setHasChanges(false);
    onClose();
  };

  return (
    /*
     * Was a hand-rolled `fixed inset-0 z-50` div inside AppShell's `relative
     * z-10` <main>, so the bottom nav painted over its action row; and the
     * `if (!isOpen) return null` above the AnimatePresence meant the exit
     * animation could never run — the modal just vanished.
     *
     * ModalShell portals to <body>, handles the safe area, and pins the action
     * row outside the scroll region so Save is always reachable.
     */
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Dashboard Settings"
      subtitle="Drag to reorder tiles and toggle visibility"
      maxWidth="max-w-lg"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 border border-accent-500/25">
          <Squares2X2Icon className="h-5 w-5 text-accent-500" />
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setConfig(DEFAULT_DASHBOARD_CONFIG);
              setHasChanges(true);
            }}
            className="tap-control text-sm text-surface-500 dark:text-surface-600 hover:text-surface-800 dark:hover:text-white transition-colors"
          >
            Reset
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-tertiary tap-control">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="btn btn-primary tap-control disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      }
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tiles">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {config.tiles.map((tile, i) => (
                <Draggable key={tile.id} draggableId={tile.id} index={i}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-surface-950 dark:bg-surface-200 border border-surface-200 dark:border-surface-400 rounded-lg p-3 ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          {...provided.dragHandleProps}
                          // 44px hit area: the 16px grip icon was close to
                          // impossible to grab accurately with a thumb.
                          className="touch-target flex shrink-0 items-center justify-center rounded hover:bg-surface-800 dark:hover:bg-surface-300 cursor-grab transition-colors"
                          aria-label={`Reorder ${tile.name}`}
                        >
                          <Bars3Icon className="w-4 h-4 text-surface-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-50 dark:text-white">
                            {tile.name}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-600">
                            {tile.description}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleTile(tile.id)}
                          className={`touch-target flex shrink-0 items-center justify-center rounded-lg transition-colors ${
                            tile.enabled
                              ? 'text-accent-600 bg-accent-50 dark:bg-accent-950/30'
                              : 'text-surface-500 bg-surface-100 dark:bg-surface-300'
                          }`}
                          aria-label={`${tile.enabled ? 'Hide' : 'Show'} ${tile.name}`}
                        >
                          {tile.enabled ? (
                            <EyeIcon className="w-4 h-4" />
                          ) : (
                            <EyeSlashIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </ModalShell>
  );
}
