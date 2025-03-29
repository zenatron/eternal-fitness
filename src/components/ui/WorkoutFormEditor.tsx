import { useState, useRef, useEffect } from 'react';
import { exercises } from '@/lib/exercises';
import { motion } from 'framer-motion';
import { 
  PlusCircleIcon, 
  TrashIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon,
  Bars2Icon,
  CalendarDaysIcon,
  StarIcon as StarOutline 
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { Exercise } from '@/types/workout';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Generate a simple unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// Simple sortable exercise item component
function SortableItem({
  id, 
  children
}: {
  id: string, 
  children: (props: { 
    attributes: any; 
    listeners: any; 
    isDragging: boolean 
  }) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({id});
  
  return (
    <div 
      ref={setNodeRef} 
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        position: isDragging ? 'relative' : undefined
      }}
    >
      {children({attributes, listeners, isDragging})}
    </div>
  );
}

interface WorkoutFormEditorProps {
  initialWorkoutName?: string;
  initialExercises?: Exercise[];
  initialScheduledDate?: string;
  initialFavorite?: boolean;
  mode: 'create' | 'edit';
  workoutId?: string;
  onSaveSuccess?: () => void;
  headerElement: React.ReactNode;
}

export default function WorkoutFormEditor({
  initialWorkoutName = '',
  initialExercises = [],
  initialScheduledDate = '',
  initialFavorite = false,
  mode,
  workoutId,
  onSaveSuccess,
  headerElement
}: WorkoutFormEditorProps) {
  const [workoutName, setWorkoutName] = useState(initialWorkoutName);
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>(initialExercises);
  const [scheduledDate, setScheduledDate] = useState(initialScheduledDate);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredExercises, setFilteredExercises] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<{ useMetric: boolean } | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/profile')
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        const data = await response.json()
        setUserProfile(data)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
    fetchUserProfile()
  }, [])

  // Update state if initialValues change (e.g. when data loads)
  useEffect(() => {
    if (initialWorkoutName) {
      setWorkoutName(initialWorkoutName);
    }
    if (initialExercises.length > 0) {
      setWorkoutExercises(initialExercises);
    }
    if (initialScheduledDate) {
      setScheduledDate(initialScheduledDate);
    }
    setIsFavorite(initialFavorite);
  }, [initialWorkoutName, initialExercises, initialScheduledDate, initialFavorite]);

  // Simple sensors configuration with activation constraints to improve usability
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Adding a small delay to prevent accidental drags
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      }
    }),
    useSensor(TouchSensor, {
      // Similar settings for touch
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      }
    })
  );

  // Filter exercises based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExercises([]);
      setShowResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = Object.entries(exercises)
      .filter(([key, exercise]) => {
        const exerciseData = exercise as { name: string; muscles: string[]; equipment: string[] };
        const nameMatch = exerciseData.name.toLowerCase().includes(query);
        const muscleMatch = exerciseData.muscles.some((muscle: string) => 
          muscle.toLowerCase().includes(query)
        );
        const equipmentMatch = exerciseData.equipment.some((item: string) => 
          item.toLowerCase().includes(query)
        );
        return nameMatch || muscleMatch || equipmentMatch;
      })
      .map(([key]) => key)
      .slice(0, 10); // Limit to 10 results

    setFilteredExercises(filtered);
    setShowResults(true);
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredExercises.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredExercises.length) {
          const selectedExercise = filteredExercises[selectedIndex];
          addExercise(selectedExercise);
          setSearchQuery('');
          setShowResults(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        break;
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add a new exercise to the workout
  const addExercise = (exerciseKey: string) => {
    const exerciseDetails = exercises[exerciseKey as keyof typeof exercises];
    const newExercise: Exercise = {
      id: generateId(),
      name: exerciseDetails.name,
      muscles: exerciseDetails.muscles,
      equipment: exerciseDetails.equipment,
      createdAt: new Date(),
      updatedAt: new Date(),
      sets: [
        {
          id: generateId(),
          workoutId: workoutId || generateId(),
          reps: 0,
          weight: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          exercises: []
        }
      ]
    };
    
    setWorkoutExercises([...workoutExercises, newExercise]);
    setSearchQuery('');
    setShowResults(false);
  };

  // Add a new set to an exercise
  const addSet = (exerciseIndex: number) => {
    const updatedExercises = [...workoutExercises];
    const exercise = updatedExercises[exerciseIndex];
    
    if (!exercise) return;
    
    exercise.sets = [
      ...(exercise.sets || []),
      {
        id: generateId(),
        workoutId: workoutId || generateId(),
        reps: 0,
        weight: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercises: []
      }
    ];
    
    setWorkoutExercises(updatedExercises);
  };

  // Remove an exercise from the workout
  const removeExercise = (exerciseIndex: number) => {
    const updatedExercises = [...workoutExercises];
    updatedExercises.splice(exerciseIndex, 1);
    setWorkoutExercises(updatedExercises);
  };

  // Remove a set from an exercise
  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...workoutExercises];
    const exercise = updatedExercises[exerciseIndex];
    
    if (!exercise || !exercise.sets) return;
    
    exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
    setWorkoutExercises(updatedExercises);
  };

  // Move a set up or down
  const moveSet = (exerciseIndex: number, setIndex: number, direction: 'up' | 'down') => {
    const updatedExercises = [...workoutExercises];
    const exercise = updatedExercises[exerciseIndex];
    
    if (!exercise || !exercise.sets) return;
    
    const newIndex = direction === 'up' ? setIndex - 1 : setIndex + 1;
    
    if (newIndex < 0 || newIndex >= exercise.sets.length) return;
    
    const updatedSets = [...exercise.sets];
    const [movedSet] = updatedSets.splice(setIndex, 1);
    updatedSets.splice(newIndex, 0, movedSet);
    
    exercise.sets = updatedSets;
    setWorkoutExercises(updatedExercises);
  };

  // Update set details (reps, weight)
  const updateSet = (
    exerciseIndex: number, 
    setIndex: number, 
    field: 'reps' | 'weight', 
    value: any
  ) => {
    const updatedExercises = [...workoutExercises];
    const exercise = updatedExercises[exerciseIndex];
    
    if (!exercise || !exercise.sets) return;
    
    exercise.sets = exercise.sets.map((set, i) => {
      if (i === setIndex) {
        return { ...set, [field]: value };
      }
      return set;
    });
    
    setWorkoutExercises(updatedExercises);
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {    
      setWorkoutExercises((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
                
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex);
        }
        
        return items;
      });
    }
  };

  // Validate and save the workout
  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      setSaveMessage('Please enter a workout name');
      return;
    }

    if (workoutExercises.length === 0) {
      setSaveMessage('Please add at least one exercise');
      return;
    }

    // Validate that all sets have values > 0
    for (const exercise of workoutExercises) {
      if (!exercise.sets || exercise.sets.length === 0) {
        setSaveMessage(`Please add at least one set to ${exercise.name}`);
        return;
      }

      for (const set of exercise.sets) {
        if (set.reps <= 0) {
          setSaveMessage(`Please enter reps for ${exercise.name}`);
          return;
        }
      }
    }

    setIsSaving(true);
    const endpoint = mode === 'create' 
      ? '/api/workout/create' 
      : `/api/workout/${workoutId}`;
    
    const method = mode === 'create' ? 'POST' : 'PUT';

    try {
      // Format the data for the API
      const formattedExercises = workoutExercises.map(exercise => ({
        name: exercise.name,
        muscles: exercise.muscles,
        equipment: exercise.equipment,
        sets: exercise.sets || []
      }));

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workoutName,
          exercises: formattedExercises,
          scheduledDate: scheduledDate || undefined,
          favorite: isFavorite
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save workout');
      }

      setSaveMessage('Workout saved successfully!');
      
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        // Wait a moment to show success message
        setTimeout(() => {
          router.push('/workouts');
        }, 100);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to save workout'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - Passed in from parent */}
        {headerElement}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <form>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="workout-name" className="form-item-heading">Workout Name</label>
                <button 
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-1 transition-colors focus:outline-none`}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  {isFavorite ? (
                    <StarSolid className="h-6 w-6 text-amber-400" />
                  ) : (
                    <StarOutline className="h-6 w-6 text-gray-400 hover:text-amber-400" />
                  )}
                </button>
              </div>
              <input
                id="workout-name"
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="e.g., Monday Upper Body"
                className="form-input"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-secondary mb-1">
                Schedule Workout (Optional)
              </label>
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-primary" />
                <input
                  type="date"
                  id="scheduledDate"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <p className="text-xs text-secondary mt-1">
                Setting a date will add this to your upcoming workouts
              </p>
            </div>

            {/* Exercise Selector */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Add Exercises
              </h2>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative" ref={searchRef}>
                  <label htmlFor="exercise-search" className="form-item-heading">Search Exercises</label>
                  <input
                    id="exercise-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by name, muscle, or equipment..."
                    className="form-input"
                  />
                  
                  {showResults && filteredExercises.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                      {filteredExercises.map((key, index) => {
                        const exercise = exercises[key as keyof typeof exercises];
                        return (
                          <button
                            key={key}
                            onClick={() => addExercise(key)}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {exercise.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {exercise.muscles.join(', ')} • {exercise.equipment.join(', ')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Exercise List */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Your Workout Plan{" "}
                <span className="text-gray-500 dark:text-gray-400 font-normal text-sm">
                  ({workoutExercises.length} exercises)
                </span>
              </h2>

              {workoutExercises.length === 0 ? (
                <div className="text-center p-10 border border-dashed rounded-lg text-gray-500 dark:text-gray-400">
                  <p>No exercises added yet. Start building your workout by adding exercises above.</p>
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={workoutExercises.map(exercise => exercise.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-6">
                      {workoutExercises.map((exercise, exerciseIndex) => {
                        return (
                          <SortableItem 
                            key={exercise.id} 
                            id={exercise.id}
                          >
                            {({attributes, listeners, isDragging}) => (
                              <div className={`
                                bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden
                                ${isDragging ? 'ring-2 ring-blue-500 shadow-lg' : ''}
                              `}>
                                {/* Exercise Header - Only this part is draggable */}
                                <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-600">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="cursor-grab p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors" 
                                      {...attributes} 
                                      {...listeners}
                                      title="Drag to reorder"
                                    >
                                      <Bars2Icon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                      {exercise.name}
                                    </h3>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => removeExercise(exerciseIndex)}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
                                    aria-label="Remove exercise"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                </div>
                                
                                {/* Sets Section */}
                                <div className="p-4">
                                  <div className="mb-3 grid grid-cols-3 gap-3">
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Set</div>
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Reps</div>
                                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">Weight ({userProfile?.useMetric ? 'kg' : 'lbs'})</div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {exercise.sets?.map((set, setIndex) => (
                                      <div 
                                        key={`set-${exercise.id}-${setIndex}`}
                                        className="grid grid-cols-3 gap-3 items-center p-3 rounded-lg bg-white dark:bg-gray-800/50"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="flex space-x-1">
                                            {/* Up/Down controls instead of drag-and-drop for sets */}
                                            {setIndex > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => moveSet(exerciseIndex, setIndex, 'up')}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                aria-label="Move set up"
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                              </button>
                                            )}
                                            {setIndex < (exercise.sets?.length || 0) - 1 && (
                                              <button
                                                type="button"
                                                onClick={() => moveSet(exerciseIndex, setIndex, 'down')}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                aria-label="Move set down"
                                              >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                          <span className="text-gray-700 dark:text-gray-300 ml-1">
                                            Set {setIndex + 1}
                                          </span>
                                          {(exercise.sets?.length || 0) > 1 && (
                                            <button 
                                              type="button"
                                              onClick={() => removeSet(exerciseIndex, setIndex)}
                                              className="text-red-500 hover:text-red-700 transition-colors"
                                              aria-label="Remove set"
                                            >
                                              <TrashIcon className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>
                                        <div>
                                          <input
                                            type="number"
                                            min="0"
                                            value={set.reps || ''}
                                            onChange={(e) => updateSet(
                                              exerciseIndex, 
                                              setIndex, 
                                              'reps', 
                                              parseInt(e.target.value) || 0
                                            )}
                                            className="form-input"
                                            aria-label="Reps"
                                          />
                                        </div>
                                        <div>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={set.weight || ''}
                                            onChange={(e) => updateSet(
                                              exerciseIndex, 
                                              setIndex, 
                                              'weight', 
                                              parseFloat(e.target.value) || 0
                                            )}
                                            className="form-input"
                                            aria-label="Weight"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <button 
                                    type="button"
                                    onClick={() => addSet(exerciseIndex)}
                                    className="btn btn-secondary text-sm mt-4 inline-flex items-center gap-1"
                                  >
                                    <PlusCircleIcon className="h-4 w-4" />
                                    Add Set
                                  </button>
                                </div>
                              </div>
                            )}
                          </SortableItem>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Save Button */}
              {workoutExercises.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  {saveMessage && (
                    <div className={`p-4 mb-4 rounded-lg flex items-center gap-3 ${
                      saveMessage.includes('success') 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                      {saveMessage.includes('success') 
                        ? <CheckCircleIcon className="h-5 w-5" /> 
                        : <ExclamationCircleIcon className="h-5 w-5" />
                      }
                      <span>{saveMessage}</span>
                    </div>
                  )}
                  
                  <button 
                    type="button"
                    onClick={saveWorkout} 
                    className="btn btn-tertiary w-full py-3 text-lg inline-flex items-center justify-center gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-white"></div>
                        {mode === 'create' ? 'Saving Workout...' : 'Updating Workout...'}
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-6 w-6" />
                        {mode === 'create' ? 'Save Workout' : 'Update Workout'}
                        <span className="font-normal text-sm">
                          ({workoutExercises.length} exercises)
                        </span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 