# Code Style Guidelines

## General Principles

- **Consistency**: Follow established patterns throughout the codebase
- **Readability**: Write code that is easy to understand and maintain
- **Type Safety**: Leverage TypeScript for compile-time error detection
- **Performance**: Consider performance implications of code decisions
- **Security**: Follow secure coding practices and input validation

## TypeScript Standards

### Naming Conventions

- **Variables and Functions**: camelCase (`userName`, `getUserById`)
- **Classes and Interfaces**: PascalCase (`UserService`, `TaskInterface`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)
- **Enums**: PascalCase with descriptive values (`TaskStatus.IN_PROGRESS`)
- **Files**: kebab-case for components (`user-profile.tsx`), camelCase for utilities (`dateUtils.ts`)

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Use type aliases for unions and computed types
type TaskStatus = 'todo' | 'in_progress' | 'done';
type UserWithTasks = User & { tasks: Task[] };

// Always define return types for functions
function getUserById(id: string): Promise<User | null> {
  // implementation
}

// Use generic constraints when appropriate
function updateEntity<T extends { id: string }>(entity: T, updates: Partial<T>): T {
  return { ...entity, ...updates };
}
```

## React Component Standards

### Component Structure

```typescript
// Functional components with TypeScript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  onEdit, 
  className = '' 
}) => {
  // Hooks at the top
  const [isEditing, setIsEditing] = useState(false);
  const { mutate: updateUser } = useUpdateUser();

  // Event handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    onEdit?.(user);
  }, [user, onEdit]);

  // Early returns for loading/error states
  if (!user) {
    return <div>Loading...</div>;
  }

  // Main render
  return (
    <div className={`user-card ${className}`}>
      {/* Component content */}
    </div>
  );
};

export default UserCard;
```

### Hooks Usage

```typescript
// Custom hooks for reusable logic
function useTaskFilters() {
  const [filters, setFilters] = useState<TaskFilters>({});
  
  const updateFilter = useCallback((key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return { filters, updateFilter, clearFilters };
}

// Use dependency arrays correctly
useEffect(() => {
  fetchTasks(projectId);
}, [projectId]); // Include all dependencies

// Memoize expensive calculations
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => a.priority.localeCompare(b.priority));
}, [tasks]);
```

## Backend Code Standards

### Service Layer Pattern

```typescript
// Service classes for business logic
class TaskService {
  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService
  ) {}

  async createTask(data: CreateTaskInput, userId: string): Promise<Task> {
    // Validate input
    const validatedData = createTaskSchema.parse(data);
    
    // Check permissions
    await this.validateProjectAccess(validatedData.projectId, userId);
    
    // Create task
    const task = await this.prisma.task.create({
      data: {
        ...validatedData,
        creatorId: userId,
      },
      include: {
        project: true,
        assignee: true,
      },
    });

    // Send notifications
    if (task.assigneeId) {
      await this.notificationService.sendTaskAssignment(task);
    }

    return task;
  }

  private async validateProjectAccess(projectId: string, userId: string): Promise<void> {
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!membership) {
      throw new AuthorizationError('Access denied to project');
    }
  }
}
```

### Error Handling

```typescript
// Custom error classes
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// Error handling in controllers
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: { message: error.message }
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error:', error);
  
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' }
  });
});
```

## Database and Prisma Standards

### Schema Design

```prisma
// Use descriptive model names
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  firstName String   @map("first_name")
  lastName  String   @map("last_name")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relationships with descriptive names
  ownedProjects Project[] @relation("ProjectOwner")
  assignedTasks Task[]    @relation("TaskAssignee")

  @@map("users")
}

// Use enums for constrained values
enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}
```

### Query Patterns

```typescript
// Use select to limit returned fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
  where: {
    emailVerified: true,
  },
});

// Use include for related data
const taskWithDetails = await prisma.task.findUnique({
  where: { id: taskId },
  include: {
    project: {
      select: { name: true, id: true },
    },
    assignee: {
      select: { firstName: true, lastName: true, email: true },
    },
    comments: {
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    },
  },
});
```

## Testing Standards

### Unit Tests

```typescript
// Descriptive test names
describe('TaskService', () => {
  describe('createTask', () => {
    it('should create a task with valid data and send notifications', async () => {
      // Arrange
      const taskData = {
        title: 'Test Task',
        projectId: 'project-1',
        assigneeId: 'user-1',
      };
      const creatorId = 'creator-1';

      // Act
      const result = await taskService.createTask(taskData, creatorId);

      // Assert
      expect(result).toMatchObject(taskData);
      expect(notificationService.sendTaskAssignment).toHaveBeenCalledWith(result);
    });

    it('should throw AuthorizationError when user lacks project access', async () => {
      // Arrange
      const taskData = { title: 'Test', projectId: 'restricted-project' };
      
      // Act & Assert
      await expect(
        taskService.createTask(taskData, 'unauthorized-user')
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
```

### Integration Tests

```typescript
// Test API endpoints
describe('POST /api/tasks', () => {
  it('should create a task and return 201', async () => {
    const taskData = {
      title: 'Integration Test Task',
      projectId: testProject.id,
    };

    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send(taskData)
      .expect(201);

    expect(response.body.data).toMatchObject(taskData);
  });
});
```

## Code Formatting

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### ESLint Rules

```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

## Import Organization

```typescript
// External libraries first
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// Internal modules by proximity
import { TaskService } from '../services/TaskService';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

// Types last
import type { Task, User } from '../types';
```

## Comments and Documentation

```typescript
/**
 * Creates a new task and sends notifications to assignees
 * @param taskData - The task data to create
 * @param userId - ID of the user creating the task
 * @returns Promise resolving to the created task
 * @throws {ValidationError} When task data is invalid
 * @throws {AuthorizationError} When user lacks project access
 */
async function createTask(taskData: CreateTaskInput, userId: string): Promise<Task> {
  // Implementation details that need explanation
  // Use comments sparingly for complex business logic
}

// TODO: Add support for task templates
// FIXME: Handle edge case when assignee is deleted
// NOTE: This function assumes project permissions are already validated
```