/**
 * Performance tests for hook execution responsiveness and automation overhead
 * Tests the scalability and efficiency of hook generation and execution
 */

const path = require('path');
const fs = require('fs-extra');
const HookGenerator = require('../../hook-generator');

describe('Hook Execution Performance', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/performance');
  let hookGenerator;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    hookGenerator = new HookGenerator();
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Hook Generation Performance', () => {
    it('should generate hooks for large workflows efficiently', async () => {
      const largeWorkflow = {
        name: 'Large Scale Workflow',
        phases: Array.from({ length: 50 }, (_, i) => `phase-${i}`),
        agents: Array.from({ length: 20 }, (_, i) => `agent-${i}`),
        transitions: Array.from({ length: 100 }, (_, i) => ({
          from: `phase-${i % 50}`,
          to: `phase-${(i + 1) % 50}`,
          trigger: `trigger-${i}`,
          agent: `agent-${i % 20}`
        })),
        automations: Array.from({ length: 200 }, (_, i) => ({
          type: `automation-${i % 10}`,
          trigger: `trigger-${i}`,
          action: `action-${i}`,
          agent: `agent-${i % 20}`
        }))
      };

      const startTime = process.hrtime.bigint();
      const hooksPath = path.join(testOutputDir, 'large-workflow-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(largeWorkflow, hooksPath);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(success).toBe(true);
      
      // Should complete within 5 seconds for large workflow
      expect(executionTime).toBeLessThan(5000);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);
      }
    });

    it('should handle concurrent hook generation efficiently', async () => {
      const workflows = Array.from({ length: 10 }, (_, i) => ({
        name: `Concurrent Workflow ${i}`,
        phases: [`phase-${i}-1`, `phase-${i}-2`, `phase-${i}-3`],
        agents: [`agent-${i}-1`, `agent-${i}-2`],
        transitions: [
          { from: `phase-${i}-1`, to: `phase-${i}-2`, trigger: `trigger-${i}-1` },
          { from: `phase-${i}-2`, to: `phase-${i}-3`, trigger: `trigger-${i}-2` }
        ]
      }));

      const startTime = process.hrtime.bigint();

      const promises = workflows.map(async (workflow, index) => {
        const hooksPath = path.join(testOutputDir, `concurrent-hooks-${index}`);
        return await hookGenerator.generateHooksFromWorkflow(workflow, hooksPath);
      });

      const results = await Promise.all(promises);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toBe(true));

      // Should complete within 2 seconds for 10 concurrent workflows
      expect(executionTime).toBeLessThan(2000);
    });

    it('should optimize hook YAML generation for large configurations', () => {
      const largeHookConfig = {
        name: 'Large Hook Configuration',
        description: 'A hook with extensive configuration options',
        trigger: {
          type: 'file_change',
          pattern: '**/*.{js,ts,jsx,tsx,py,java,cpp,c,go,rs,php,rb,swift,kt}',
          exclude: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
          conditions: Array.from({ length: 20 }, (_, i) => `condition-${i}`)
        },
        action: {
          agent: 'comprehensive-agent',
          task: 'comprehensive-review',
          context: ['#File', '#Folder', '#Problems', '#Terminal', '#Git Diff', '#Codebase'],
          parameters: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`param-${i}`, `value-${i}`])
          ),
          environment: Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [`ENV_${i}`, `env-value-${i}`])
          )
        },
        metadata: {
          tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
          dependencies: Array.from({ length: 15 }, (_, i) => `dependency-${i}`),
          resources: Array.from({ length: 10 }, (_, i) => ({
            name: `resource-${i}`,
            type: `type-${i}`,
            config: Object.fromEntries(
              Array.from({ length: 5 }, (_, j) => [`config-${j}`, `config-value-${i}-${j}`])
            )
          }))
        }
      };

      const startTime = process.hrtime.bigint();
      const yaml = hookGenerator.generateHookYAML(largeHookConfig);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(yaml).toBeDefined();
      expect(yaml.length).toBeGreaterThan(1000);
      expect(yaml).toContain('name: "Large Hook Configuration"');

      // Should complete within 50ms for large configuration
      expect(executionTime).toBeLessThan(50);
    });

    it('should maintain performance with complex hook validation', () => {
      const complexHooks = Array.from({ length: 100 }, (_, i) => ({
        name: `Complex Hook ${i}`,
        description: `Complex hook configuration ${i}`,
        trigger: {
          type: ['file_change', 'git_commit', 'build_complete', 'manual'][i % 4],
          pattern: `**/*.{js,ts}`,
          conditions: Array.from({ length: 5 }, (_, j) => `condition-${i}-${j}`)
        },
        action: {
          agent: `agent-${i % 10}`,
          task: `task-${i}`,
          context: ['#File', '#Problems', '#Git Diff'],
          parameters: Object.fromEntries(
            Array.from({ length: 10 }, (_, j) => [`param-${j}`, `value-${i}-${j}`])
          )
        }
      }));

      const startTime = process.hrtime.bigint();

      const validationResults = complexHooks.map(hook => {
        return hookGenerator.validateHookConfiguration(hook);
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(validationResults).toHaveLength(100);
      validationResults.forEach(result => expect(typeof result).toBe('boolean'));

      // Should complete within 200ms for 100 complex validations
      expect(executionTime).toBeLessThan(200);
    });
  });

  describe('Hook Execution Responsiveness', () => {
    it('should simulate hook trigger responsiveness', async () => {
      const hookConfigurations = [
        {
          name: 'Fast File Change Hook',
          trigger: { type: 'file_change', pattern: '*.js' },
          expectedResponseTime: 10 // milliseconds
        },
        {
          name: 'Git Commit Hook',
          trigger: { type: 'git_commit' },
          expectedResponseTime: 50
        },
        {
          name: 'Build Complete Hook',
          trigger: { type: 'build_complete' },
          expectedResponseTime: 100
        },
        {
          name: 'Manual Hook',
          trigger: { type: 'manual' },
          expectedResponseTime: 5
        }
      ];

      for (const config of hookConfigurations) {
        const startTime = process.hrtime.bigint();
        
        // Simulate hook processing
        const hookYaml = hookGenerator.generateHookYAML({
          name: config.name,
          trigger: config.trigger,
          action: {
            agent: 'test-agent',
            task: 'test-task',
            context: ['#File']
          }
        });
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;

        expect(hookYaml).toBeDefined();
        expect(executionTime).toBeLessThan(config.expectedResponseTime);
      }
    });

    it('should handle high-frequency hook triggers without performance degradation', async () => {
      const highFrequencyHook = {
        name: 'High Frequency Hook',
        trigger: {
          type: 'file_change',
          pattern: '**/*.{js,ts}',
          throttle: '100ms'
        },
        action: {
          agent: 'dev-agent',
          task: 'quick-review',
          context: ['#File', '#Problems']
        }
      };

      const triggerCount = 1000;
      const executionTimes = [];

      for (let i = 0; i < triggerCount; i++) {
        const startTime = process.hrtime.bigint();
        
        // Simulate hook trigger processing
        const isValid = hookGenerator.validateHookConfiguration(highFrequencyHook);
        const yaml = hookGenerator.generateHookYAML(highFrequencyHook);
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        executionTimes.push(executionTime);
        
        expect(isValid).toBe(true);
        expect(yaml).toBeDefined();
      }

      // Calculate performance metrics
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      // Performance should remain consistent
      expect(avgTime).toBeLessThan(5); // Average under 5ms
      expect(maxTime).toBeLessThan(20); // Max under 20ms
      expect(maxTime / minTime).toBeLessThan(5); // Reasonable variance
    });

    it('should optimize hook dependency resolution', async () => {
      const dependentHooks = Array.from({ length: 50 }, (_, i) => ({
        name: `Hook ${i}`,
        dependencies: Array.from({ length: Math.min(i, 10) }, (_, j) => `Hook ${j}`),
        trigger: { type: 'file_change' },
        action: { agent: `agent-${i}`, task: `task-${i}` }
      }));

      const startTime = process.hrtime.bigint();

      // Simulate dependency resolution
      const resolvedHooks = dependentHooks.map(hook => {
        const resolvedDependencies = hook.dependencies.filter(dep => 
          dependentHooks.some(h => h.name === dep)
        );
        
        return {
          ...hook,
          resolvedDependencies,
          executionOrder: resolvedDependencies.length
        };
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(resolvedHooks).toHaveLength(50);
      resolvedHooks.forEach(hook => {
        expect(hook.resolvedDependencies).toBeDefined();
        expect(hook.executionOrder).toBeGreaterThanOrEqual(0);
      });

      // Should complete within 100ms for 50 hooks with dependencies
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Automation Overhead Analysis', () => {
    it('should measure overhead of hook automation system', async () => {
      const baselineOperations = Array.from({ length: 1000 }, (_, i) => ({
        operation: `operation-${i}`,
        data: `data-${i}`
      }));

      // Measure baseline performance without hooks
      const baselineStartTime = process.hrtime.bigint();
      const baselineResults = baselineOperations.map(op => {
        return { ...op, processed: true };
      });
      const baselineEndTime = process.hrtime.bigint();
      const baselineTime = Number(baselineEndTime - baselineStartTime) / 1000000;

      // Measure performance with hook processing
      const hooksStartTime = process.hrtime.bigint();
      const hookResults = baselineOperations.map(op => {
        // Simulate hook processing overhead
        const hookConfig = {
          name: `Hook for ${op.operation}`,
          trigger: { type: 'operation', pattern: op.operation },
          action: { agent: 'processor', task: 'process' }
        };
        
        const isValid = hookGenerator.validateHookConfiguration(hookConfig);
        return { ...op, processed: true, hookProcessed: isValid };
      });
      const hooksEndTime = process.hrtime.bigint();
      const hooksTime = Number(hooksEndTime - hooksStartTime) / 1000000;

      expect(baselineResults).toHaveLength(1000);
      expect(hookResults).toHaveLength(1000);

      // Hook overhead should be reasonable (less than 3x baseline)
      const overhead = hooksTime / baselineTime;
      expect(overhead).toBeLessThan(3);
    });

    it('should analyze memory overhead of hook system', () => {
      const initialMemory = process.memoryUsage();

      // Create many hook configurations
      const hooks = Array.from({ length: 1000 }, (_, i) => ({
        name: `Memory Test Hook ${i}`,
        trigger: {
          type: 'file_change',
          pattern: `**/*.{js,ts}`,
          conditions: Array.from({ length: 5 }, (_, j) => `condition-${i}-${j}`)
        },
        action: {
          agent: `agent-${i % 10}`,
          task: `task-${i}`,
          context: ['#File', '#Problems'],
          parameters: Object.fromEntries(
            Array.from({ length: 10 }, (_, j) => [`param-${j}`, `value-${i}-${j}`])
          )
        }
      }));

      // Process all hooks
      const processedHooks = hooks.map(hook => {
        const isValid = hookGenerator.validateHookConfiguration(hook);
        const yaml = hookGenerator.generateHookYAML(hook);
        return { hook, isValid, yaml: yaml.substring(0, 100) }; // Truncate to save memory
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(processedHooks).toHaveLength(1000);
      
      // Memory increase should be reasonable (less than 100MB for 1000 hooks)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should measure scalability of hook execution queuing', async () => {
      const queueSizes = [10, 50, 100, 500, 1000];
      const executionTimes = [];

      for (const queueSize of queueSizes) {
        const hookQueue = Array.from({ length: queueSize }, (_, i) => ({
          id: `hook-${i}`,
          priority: i % 5,
          config: {
            name: `Queued Hook ${i}`,
            trigger: { type: 'file_change' },
            action: { agent: `agent-${i % 10}`, task: `task-${i}` }
          }
        }));

        const startTime = process.hrtime.bigint();

        // Simulate hook queue processing
        const processedQueue = hookQueue
          .sort((a, b) => a.priority - b.priority) // Priority sorting
          .map(item => {
            const isValid = hookGenerator.validateHookConfiguration(item.config);
            return { ...item, processed: true, valid: isValid };
          });

        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        executionTimes.push(executionTime);

        expect(processedQueue).toHaveLength(queueSize);
      }

      // Execution time should scale sub-linearly (better than O(n²))
      const scalingFactors = [];
      for (let i = 1; i < executionTimes.length; i++) {
        const factor = executionTimes[i] / executionTimes[i - 1];
        const sizeRatio = queueSizes[i] / queueSizes[i - 1];
        scalingFactors.push(factor / sizeRatio);
      }

      // Scaling should be efficient (factors should be close to 1)
      const avgScalingFactor = scalingFactors.reduce((a, b) => a + b, 0) / scalingFactors.length;
      expect(avgScalingFactor).toBeLessThan(2);
    });
  });

  describe('Resource Optimization', () => {
    it('should optimize hook file I/O operations', async () => {
      const workflows = Array.from({ length: 20 }, (_, i) => ({
        name: `I/O Test Workflow ${i}`,
        phases: [`phase-${i}-1`, `phase-${i}-2`],
        agents: [`agent-${i}`],
        hooks: Array.from({ length: 5 }, (_, j) => ({
          name: `Hook ${i}-${j}`,
          trigger: { type: 'file_change' },
          action: { agent: `agent-${i}`, task: `task-${j}` }
        }))
      }));

      const startTime = process.hrtime.bigint();

      // Generate hooks for all workflows
      const results = [];
      for (const workflow of workflows) {
        const hooksPath = path.join(testOutputDir, `io-test-hooks-${workflow.name.replace(/\s+/g, '-')}`);
        const success = await hookGenerator.generateHooksFromWorkflow(workflow, hooksPath);
        results.push(success);
      }

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(20);
      results.forEach(result => expect(result).toBe(true));

      // Should complete within 3 seconds for 20 workflows with file I/O
      expect(executionTime).toBeLessThan(3000);

      // Verify files were created efficiently
      const createdDirectories = await Promise.all(
        workflows.map(async (workflow) => {
          const hooksPath = path.join(testOutputDir, `io-test-hooks-${workflow.name.replace(/\s+/g, '-')}`);
          return await fs.pathExists(hooksPath);
        })
      );

      expect(createdDirectories.every(exists => exists)).toBe(true);
    });

    it('should handle concurrent file operations without conflicts', async () => {
      const concurrentWorkflows = Array.from({ length: 10 }, (_, i) => ({
        name: `Concurrent Workflow ${i}`,
        phases: [`phase-${i}`],
        agents: [`agent-${i}`]
      }));

      const startTime = process.hrtime.bigint();

      // Generate hooks concurrently
      const promises = concurrentWorkflows.map(async (workflow, index) => {
        const hooksPath = path.join(testOutputDir, `concurrent-io-${index}`);
        return await hookGenerator.generateHooksFromWorkflow(workflow, hooksPath);
      });

      const results = await Promise.all(promises);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toBe(true));

      // Should complete within 2 seconds for concurrent operations
      expect(executionTime).toBeLessThan(2000);

      // Verify no file conflicts occurred
      for (let i = 0; i < 10; i++) {
        const hooksPath = path.join(testOutputDir, `concurrent-io-${i}`);
        expect(await fs.pathExists(hooksPath)).toBe(true);
      }
    });

    it('should optimize hook configuration serialization', () => {
      const complexConfigurations = Array.from({ length: 100 }, (_, i) => ({
        name: `Complex Config ${i}`,
        trigger: {
          type: 'file_change',
          pattern: `**/*.{js,ts,jsx,tsx}`,
          exclude: ['node_modules/**', 'dist/**'],
          conditions: Array.from({ length: 10 }, (_, j) => `condition-${i}-${j}`)
        },
        action: {
          agent: `agent-${i % 5}`,
          task: `task-${i}`,
          context: ['#File', '#Folder', '#Problems', '#Terminal', '#Git Diff'],
          parameters: Object.fromEntries(
            Array.from({ length: 20 }, (_, j) => [`param-${j}`, `value-${i}-${j}`])
          )
        }
      }));

      const startTime = process.hrtime.bigint();

      const serializedConfigs = complexConfigurations.map(config => {
        return hookGenerator.generateHookYAML(config);
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(serializedConfigs).toHaveLength(100);
      serializedConfigs.forEach(yaml => {
        expect(yaml).toBeDefined();
        expect(yaml.length).toBeGreaterThan(100);
      });

      // Should complete within 500ms for 100 complex serializations
      expect(executionTime).toBeLessThan(500);
    });
  });

  describe('Performance Regression Testing', () => {
    it('should maintain consistent performance across multiple runs', async () => {
      const testWorkflow = {
        name: 'Performance Test Workflow',
        phases: ['phase-1', 'phase-2', 'phase-3'],
        agents: ['agent-1', 'agent-2'],
        transitions: [
          { from: 'phase-1', to: 'phase-2', trigger: 'trigger-1' },
          { from: 'phase-2', to: 'phase-3', trigger: 'trigger-2' }
        ]
      };

      const runCount = 10;
      const executionTimes = [];

      for (let run = 0; run < runCount; run++) {
        const startTime = process.hrtime.bigint();
        
        const hooksPath = path.join(testOutputDir, `performance-run-${run}`);
        const success = await hookGenerator.generateHooksFromWorkflow(testWorkflow, hooksPath);
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        executionTimes.push(executionTime);
        expect(success).toBe(true);
      }

      // Calculate performance consistency metrics
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const minTime = Math.min(...executionTimes);
      const maxTime = Math.max(...executionTimes);
      const variance = executionTimes.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / executionTimes.length;
      const stdDev = Math.sqrt(variance);

      // Performance should be consistent across runs
      expect(stdDev / avgTime).toBeLessThan(0.5); // Coefficient of variation < 50%
      expect(maxTime / minTime).toBeLessThan(3); // Max should not be more than 3x min
    });

    it('should detect performance regressions in hook validation', () => {
      const baselineHook = {
        name: 'Baseline Hook',
        trigger: { type: 'file_change', pattern: '*.js' },
        action: { agent: 'test-agent', task: 'test-task' }
      };

      // Measure baseline performance
      const baselineIterations = 1000;
      const baselineStartTime = process.hrtime.bigint();
      
      for (let i = 0; i < baselineIterations; i++) {
        hookGenerator.validateHookConfiguration(baselineHook);
      }
      
      const baselineEndTime = process.hrtime.bigint();
      const baselineTime = Number(baselineEndTime - baselineStartTime) / 1000000;

      // Measure performance with more complex hook
      const complexHook = {
        ...baselineHook,
        trigger: {
          ...baselineHook.trigger,
          conditions: Array.from({ length: 50 }, (_, i) => `condition-${i}`),
          exclude: Array.from({ length: 20 }, (_, i) => `exclude-${i}`)
        },
        action: {
          ...baselineHook.action,
          parameters: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`param-${i}`, `value-${i}`])
          )
        }
      };

      const complexStartTime = process.hrtime.bigint();
      
      for (let i = 0; i < baselineIterations; i++) {
        hookGenerator.validateHookConfiguration(complexHook);
      }
      
      const complexEndTime = process.hrtime.bigint();
      const complexTime = Number(complexEndTime - complexStartTime) / 1000000;

      // Complex validation should not be more than 5x slower than baseline
      const performanceRatio = complexTime / baselineTime;
      expect(performanceRatio).toBeLessThan(5);
    });
  });
});