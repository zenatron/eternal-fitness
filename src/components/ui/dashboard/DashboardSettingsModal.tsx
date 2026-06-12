'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
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

const springModal = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export default function DashboardSettingsModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: Props) {
  const [config, setConfig] = useState(currentConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const prefersReducedMotion = useReducedMotion();

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        <motion.div
          initial={
            prefersReducedMotion
              ? {}
              : { opacity: 0, scale: 0.94, y: 16 }
          }
          animate={
            prefersReducedMotion
              ? {}
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            prefersReducedMotion
              ? {}
              : { opacity: 0, scale: 0.94, y: 16 }
          }
          transition={springModal}
          className="relative forge-card shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-300">
            <h2 className="text-lg font-display font-bold text-surface-800 dark:text-white tracking-wide uppercase">
              Dashboard Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-700 dark:hover:text-surface-900 hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <p className="text-sm text-surface-500 dark:text-surface-600 mb-4">
              Drag to reorder tiles and toggle visibility.
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tiles">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
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
                                className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-300 cursor-grab transition-colors"
                              >
                                <Bars3Icon className="w-4 h-4 text-surface-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-surface-800 dark:text-white">
                                  {tile.name}
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-600">
                                  {tile.description}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleTile(tile.id)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  tile.enabled
                                    ? 'text-forge-600 bg-forge-50 dark:bg-forge-950/30'
                                    : 'text-surface-500 bg-surface-100 dark:bg-surface-300'
                                }`}
                                title={tile.enabled ? 'Hide' : 'Show'}
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
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 dark:border-surface-300 bg-surface-950 dark:bg-surface-200/50">
            <button
              onClick={() => {
                setConfig(DEFAULT_DASHBOARD_CONFIG);
                setHasChanges(true);
              }}
              className="text-sm text-surface-500 dark:text-surface-600 hover:text-surface-800 dark:hover:text-white transition-colors"
            >
              Reset to Default
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-display font-semibold tracking-wide uppercase border border-surface-300 dark:border-surface-400 text-surface-600 dark:text-surface-800 rounded-lg hover:bg-surface-950 dark:hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="px-4 py-2 text-sm font-display font-bold tracking-wide uppercase bg-forge-500 text-white rounded-lg hover:bg-forge-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
