'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DashboardConfig, DashboardTileConfig, DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard-config';

interface DashboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: DashboardConfig;
  onSave: (config: DashboardConfig) => void;
}

interface SortableTileItemProps {
  tile: DashboardTileConfig;
  onToggle: (id: string) => void;
}



export default function DashboardSettingsModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: DashboardSettingsModalProps) {
  const [config, setConfig] = useState<DashboardConfig>(currentConfig);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setConfig(currentConfig);
    setHasChanges(false);
  }, [currentConfig, isOpen]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    setConfig((prev) => {
      const newTiles = [...prev.tiles];
      const [reorderedItem] = newTiles.splice(sourceIndex, 1);
      newTiles.splice(destinationIndex, 0, reorderedItem);

      // Update order indices
      const tilesWithOrder = newTiles.map((tile, index) => ({ ...tile, order: index }));

      setHasChanges(true);

      return {
        ...prev,
        tiles: tilesWithOrder,
      };
    });
  };

  const handleToggleTile = (tileId: string) => {
    setConfig((prev) => ({
      ...prev,
      tiles: prev.tiles.map((tile) =>
        tile.id === tileId ? { ...tile, enabled: !tile.enabled } : tile
      ),
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(config);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_DASHBOARD_CONFIG);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Cog6ToothIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Dashboard Settings
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize your dashboard layout and tiles
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Dashboard Tiles
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Drag to reorder tiles and toggle visibility. Changes will be saved to your profile.
                </p>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="dashboard-tiles">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {config.tiles.map((tile, index) => (
                          <Draggable
                            key={tile.id}
                            draggableId={tile.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${snapshot.isDragging ? 'opacity-75 shadow-lg' : ''}`}
                              >
                                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 shadow-sm transition-all duration-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                      >
                                        <Bars3Icon className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                          {tile.name}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {tile.description}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleToggleTile(tile.id)}
                                      className={`
                                        p-2 rounded-lg transition-all duration-200 flex items-center justify-center
                                        ${tile.enabled
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                          : 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500'
                                        }
                                      `}
                                      title={tile.enabled ? 'Hide tile' : 'Show tile'}
                                    >
                                      {tile.enabled ? (
                                        <EyeIcon className="h-5 w-5" />
                                      ) : (
                                        <EyeSlashIcon className="h-5 w-5" />
                                      )}
                                    </button>
                                  </div>
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
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Reset to Default
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
