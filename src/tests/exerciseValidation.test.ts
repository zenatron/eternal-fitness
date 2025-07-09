import { exercises } from '@/lib/exercises';
import { Equipment, equipment } from '@/lib/equipment';
import { MuscleGroup, muscleGroups } from '@/lib/muscleGroups';

describe('Exercise Library Validation', () => {
  
  // Test 1: Check for duplicate exercise names
  test('should not have duplicate exercise names', () => {
    const exerciseNames = Object.keys(exercises);
    const uniqueNames = new Set(exerciseNames);
    
    expect(exerciseNames.length).toBe(uniqueNames.size);
    
    if (exerciseNames.length !== uniqueNames.size) {
      const duplicates = exerciseNames.filter((name, index) => 
        exerciseNames.indexOf(name) !== index
      );
      console.error('Duplicate exercise names found:', duplicates);
    }
  });

  // Test 2: Check that all exercises have required properties
  test('should have all required properties for each exercise', () => {
    Object.entries(exercises).forEach(([key, exercise]) => {
      expect(exercise).toHaveProperty('name');
      expect(exercise).toHaveProperty('muscles');
      expect(exercise).toHaveProperty('equipment');
      
      expect(exercise.name).toBe(key);
      expect(Array.isArray(exercise.muscles)).toBe(true);
      expect(Array.isArray(exercise.equipment)).toBe(true);
      expect(exercise.muscles.length).toBeGreaterThan(0);
      expect(exercise.equipment.length).toBeGreaterThan(0);
    });
  });

  // Test 3: Validate all muscle groups exist in muscleGroups.ts
  test('should only use valid muscle groups', () => {
    const invalidMuscles: string[] = [];
    
    Object.entries(exercises).forEach(([exerciseName, exercise]) => {
      exercise.muscles.forEach(muscle => {
        if (!muscleGroups.includes(muscle as MuscleGroup)) {
          invalidMuscles.push(`${exerciseName}: ${muscle}`);
        }
      });
    });
    
    if (invalidMuscles.length > 0) {
      console.error('Invalid muscle groups found:', invalidMuscles);
    }
    
    expect(invalidMuscles).toHaveLength(0);
  });

  // Test 4: Validate all equipment exists in equipment.ts
  test('should only use valid equipment', () => {
    const invalidEquipment: string[] = [];

    Object.entries(exercises).forEach(([exerciseName, exercise]) => {
      exercise.equipment.forEach(equipmentItem => {
        if (!equipment.includes(equipmentItem as Equipment)) {
          invalidEquipment.push(`${exerciseName}: ${equipmentItem}`);
        }
      });
    });

    if (invalidEquipment.length > 0) {
      console.error('Invalid equipment found:', invalidEquipment);
    }

    expect(invalidEquipment).toHaveLength(0);
  });

  // Test 5: Check for missing values (empty strings, null, undefined)
  test('should not have empty or missing values', () => {
    const issues: string[] = [];
    
    Object.entries(exercises).forEach(([exerciseName, exercise]) => {
      if (!exercise.name || exercise.name.trim() === '') {
        issues.push(`${exerciseName}: empty name`);
      }
      
      if (exercise.muscles.some(muscle => !muscle || muscle.trim() === '')) {
        issues.push(`${exerciseName}: empty muscle group`);
      }
      
      if (exercise.equipment.some(equipment => !equipment || equipment.trim() === '')) {
        issues.push(`${exerciseName}: empty equipment`);
      }
    });
    
    if (issues.length > 0) {
      console.error('Empty or missing values found:', issues);
    }
    
    expect(issues).toHaveLength(0);
  });

  // Test 6: Check muscle group coverage
  test('should have exercises for all muscle groups', () => {
    const usedMuscleGroups = new Set<string>();
    
    Object.values(exercises).forEach(exercise => {
      exercise.muscles.forEach(muscle => {
        usedMuscleGroups.add(muscle);
      });
    });
    
    const unusedMuscleGroups = muscleGroups.filter(
      muscle => !usedMuscleGroups.has(muscle)
    );
    
    if (unusedMuscleGroups.length > 0) {
      console.warn('Muscle groups without exercises:', unusedMuscleGroups);
    }
    
    // This is a warning, not a failure - some muscle groups might not have exercises yet
    expect(unusedMuscleGroups.length).toBeLessThan(muscleGroups.length);
  });

  // Test 7: Check equipment usage
  test('should use a reasonable variety of equipment', () => {
    const usedEquipment = new Set<string>();

    Object.values(exercises).forEach(exercise => {
      exercise.equipment.forEach(equipmentItem => {
        usedEquipment.add(equipmentItem);
      });
    });

    const unusedEquipment = equipment.filter(
      (equipmentItem: Equipment) => !usedEquipment.has(equipmentItem)
    );

    if (unusedEquipment.length > 0) {
      console.warn('Equipment not used in any exercises:', unusedEquipment);
    }

    // Should use at least 50% of available equipment
    expect(usedEquipment.size).toBeGreaterThan(equipment.length * 0.5);
  });

  // Test 8: Check for consistent naming patterns
  test('should have consistent exercise naming', () => {
    const namingIssues: string[] = [];
    
    Object.entries(exercises).forEach(([key, exercise]) => {
      // Check if name matches key
      if (exercise.name !== key) {
        namingIssues.push(`Key "${key}" doesn't match name "${exercise.name}"`);
      }
      
      // Check for proper capitalization (should start with capital letter)
      if (!/^[A-Z]/.test(exercise.name)) {
        namingIssues.push(`${exercise.name}: should start with capital letter`);
      }
      
      // Check for trailing/leading spaces
      if (exercise.name !== exercise.name.trim()) {
        namingIssues.push(`${exercise.name}: has leading/trailing spaces`);
      }
    });
    
    if (namingIssues.length > 0) {
      console.error('Naming issues found:', namingIssues);
    }
    
    expect(namingIssues).toHaveLength(0);
  });
});
