/**
 * Performance tests for context loading with large codebases
 * Tests the scalability of context injection and mapping systems
 */

const path = require('path');
const fs = require('fs-extra');
const ContextInjector = require('../../context-injector');

describe('Context Loading Performance', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/performance');
  let contextInjector;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    contextInjector = new ContextInjector();
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Large Codebase Context Loading', () => {
    it('should handle context mapping for large numbers of context needs efficiently', () => {
      const startTime = process.hrtime.bigint();
      
      // Simulate large number of context needs
      const largeContextNeeds = Array.from({ length: 1000 }, (_, i) => {
        const contextTypes = [
          'current file', 'project structure', 'build issues', 'recent changes',
          'error messages', 'code repository', 'test results', 'dependencies',
          'configuration files', 'documentation'
        ];
        return contextTypes[i % contextTypes.length];
      });

      const contextMapping = contextInjector.mapBMadContextToKiro(largeContextNeeds);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      expect(contextMapping).toBeDefined();
      expect(contextMapping.mapped).toBeDefined();
      expect(contextMapping.unmapped).toBeDefined();
      
      // Should complete within 100ms for 1000 context needs
      expect(executionTime).toBeLessThan(100);
      
      // Should properly deduplicate
      const uniqueMapped = [...new Set(contextMapping.mapped)];
      expect(uniqueMapped.length).toBeLessThanOrEqual(10); // Max number of Kiro context types
    });

    it('should optimize context injection for multiple agents simultaneously', async () => {
      const startTime = process.hrtime.bigint();
      
      // Simulate multiple agents requesting context simultaneously
      const agents = Array.from({ length: 50 }, (_, i) => ({
        id: `agent-${i}`,
        type: ['dev', 'qa', 'architect', 'pm'][i % 4],
        contextNeeds: [
          'current file', 'project structure', 'build issues',
          'recent changes', 'error messages'
        ]
      }));

      const contextPromises = agents.map(async (agent) => {
        const contextRequest = {
          agentId: agent.type,
          taskType: 'development',
          contextNeeds: agent.contextNeeds
        };
        return await contextInjector.handleDynamicContextLoading(contextRequest);
      });

      const results = await Promise.all(contextPromises);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.requiredContext).toBeDefined();
      });

      // Should complete within 500ms for 50 concurrent agents
      expect(executionTime).toBeLessThan(500);
    });

    it('should handle memory efficiently with large context datasets', () => {
      const initialMemory = process.memoryUsage();
      
      // Create large context datasets
      const largeContextSets = Array.from({ length: 100 }, (_, i) => {
        return Array.from({ length: 100 }, (_, j) => `context-${i}-${j}`);
      });

      const results = largeContextSets.map(contextSet => {
        return contextInjector.mapBMadContextToKiro(contextSet);
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(results).toHaveLength(100);
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should scale context fallback provision linearly', async () => {
      const testSizes = [10, 50, 100, 500];
      const executionTimes = [];

      for (const size of testSizes) {
        const missingContext = Array.from({ length: size }, (_, i) => `#Context${i}`);
        
        const startTime = process.hrtime.bigint();
        const fallback = await contextInjector.provideFallbackContext(missingContext);
        const endTime = process.hrtime.bigint();
        
        const executionTime = Number(endTime - startTime) / 1000000;
        executionTimes.push(executionTime);

        expect(fallback).toBeDefined();
        expect(fallback.fallbackInstructions).toHaveLength(size);
      }

      // Execution time should scale roughly linearly
      // Check that larger datasets don't have exponential growth
      const ratio1 = executionTimes[1] / executionTimes[0]; // 50/10
      const ratio2 = executionTimes[2] / executionTimes[1]; // 100/50
      const ratio3 = executionTimes[3] / executionTimes[2]; // 500/100

      // Ratios should be relatively consistent (within 3x of each other)
      expect(Math.max(ratio1, ratio2, ratio3) / Math.min(ratio1, ratio2, ratio3)).toBeLessThan(3);
    });
  });

  describe('Context Injection Performance', () => {
    it('should inject context into large agent content efficiently', () => {
      // Create large agent content
      const largeAgentContent = Array.from({ length: 1000 }, (_, i) => 
        `# Section ${i}\n\nThis is section ${i} of the agent content with detailed instructions and capabilities.`
      ).join('\n\n');

      const startTime = process.hrtime.bigint();
      
      const injectedContent = contextInjector.injectAutomaticContextReferences(largeAgentContent, 'dev');
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(injectedContent).toBeDefined();
      expect(injectedContent.length).toBeGreaterThan(largeAgentContent.length);
      expect(injectedContent).toContain('## Context Awareness');

      // Should complete within 50ms for large content
      expect(executionTime).toBeLessThan(50);
    });

    it('should handle batch context injection efficiently', () => {
      const agentContents = Array.from({ length: 100 }, (_, i) => ({
        id: `agent-${i}`,
        content: `# Agent ${i}\n\nI am agent ${i} with specific capabilities.`,
        type: ['dev', 'qa', 'architect', 'pm'][i % 4]
      }));

      const startTime = process.hrtime.bigint();
      
      const results = agentContents.map(agent => {
        return contextInjector.injectAutomaticContextReferences(agent.content, agent.type);
      });
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toContain('## Context Awareness');
      });

      // Should complete within 200ms for 100 agents
      expect(executionTime).toBeLessThan(200);
    });

    it('should optimize repeated context mapping operations', () => {
      const commonContextNeeds = ['current file', 'project structure', 'build issues'];
      
      const startTime = process.hrtime.bigint();
      
      // Perform the same mapping operation many times
      const results = Array.from({ length: 1000 }, () => {
        return contextInjector.mapBMadContextToKiro(commonContextNeeds);
      });
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(1000);
      results.forEach(result => {
        expect(result.mapped).toEqual(results[0].mapped); // Should be consistent
      });

      // Should complete within 100ms for 1000 repeated operations
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during repeated operations', () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations that could potentially leak memory
      for (let i = 0; i < 1000; i++) {
        const contextNeeds = Array.from({ length: 10 }, (_, j) => `context-${i}-${j}`);
        const mapping = contextInjector.mapBMadContextToKiro(contextNeeds);
        
        // Force garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle concurrent context operations without resource contention', async () => {
      const concurrentOperations = 50;
      const operationsPerThread = 100;

      const startTime = process.hrtime.bigint();
      
      const promises = Array.from({ length: concurrentOperations }, async (_, i) => {
        const results = [];
        for (let j = 0; j < operationsPerThread; j++) {
          const contextNeeds = [`context-${i}-${j}`, 'current file', 'build issues'];
          const mapping = contextInjector.mapBMadContextToKiro(contextNeeds);
          results.push(mapping);
        }
        return results;
      });

      const allResults = await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(allResults).toHaveLength(concurrentOperations);
      allResults.forEach(results => {
        expect(results).toHaveLength(operationsPerThread);
      });

      // Should complete within 1 second for 5000 total operations
      expect(executionTime).toBeLessThan(1000);
    });

    it('should efficiently handle context caching and invalidation', () => {
      const contextNeeds = ['current file', 'project structure', 'build issues'];
      
      // First operation - should establish any caching
      const startTime1 = process.hrtime.bigint();
      const result1 = contextInjector.mapBMadContextToKiro(contextNeeds);
      const endTime1 = process.hrtime.bigint();
      const firstTime = Number(endTime1 - startTime1) / 1000000;

      // Subsequent operations - should benefit from caching
      const startTime2 = process.hrtime.bigint();
      for (let i = 0; i < 100; i++) {
        const result = contextInjector.mapBMadContextToKiro(contextNeeds);
        expect(result.mapped).toEqual(result1.mapped);
      }
      const endTime2 = process.hrtime.bigint();
      const cachedTime = Number(endTime2 - startTime2) / 1000000;

      // Cached operations should be significantly faster
      const averageCachedTime = cachedTime / 100;
      expect(averageCachedTime).toBeLessThan(firstTime);
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme context loads without failure', async () => {
      const extremeContextNeeds = Array.from({ length: 10000 }, (_, i) => {
        const baseContexts = [
          'current file', 'project structure', 'build issues', 'recent changes',
          'error messages', 'code repository', 'test results', 'dependencies'
        ];
        return `${baseContexts[i % baseContexts.length]}-${i}`;
      });

      const startTime = process.hrtime.bigint();
      
      let result;
      expect(() => {
        result = contextInjector.mapBMadContextToKiro(extremeContextNeeds);
      }).not.toThrow();
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(result).toBeDefined();
      expect(result.mapped).toBeDefined();
      expect(result.unmapped).toBeDefined();

      // Should complete within 1 second even for extreme loads
      expect(executionTime).toBeLessThan(1000);
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedLoadDuration = 5000; // 5 seconds
      const operationInterval = 10; // Every 10ms
      const expectedOperations = sustainedLoadDuration / operationInterval;
      
      let operationCount = 0;
      const executionTimes = [];

      const startTime = Date.now();
      
      while (Date.now() - startTime < sustainedLoadDuration) {
        const opStartTime = process.hrtime.bigint();
        
        const contextNeeds = ['current file', 'build issues', `operation-${operationCount}`];
        const result = contextInjector.mapBMadContextToKiro(contextNeeds);
        
        const opEndTime = process.hrtime.bigint();
        const opTime = Number(opEndTime - opStartTime) / 1000000;
        
        executionTimes.push(opTime);
        operationCount++;
        
        expect(result).toBeDefined();
        
        // Small delay to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, operationInterval));
      }

      // Should have completed expected number of operations
      expect(operationCount).toBeGreaterThan(expectedOperations * 0.8); // Allow 20% variance

      // Performance should remain consistent (no significant degradation)
      const firstQuarter = executionTimes.slice(0, Math.floor(executionTimes.length / 4));
      const lastQuarter = executionTimes.slice(-Math.floor(executionTimes.length / 4));
      
      const avgFirstQuarter = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const avgLastQuarter = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      
      // Performance degradation should be minimal (less than 2x slower)
      expect(avgLastQuarter / avgFirstQuarter).toBeLessThan(2);
    });

    it('should recover gracefully from resource exhaustion scenarios', async () => {
      // Simulate resource exhaustion by creating many large objects
      const largeObjects = [];
      
      try {
        // Create objects until we approach memory limits
        for (let i = 0; i < 1000; i++) {
          largeObjects.push(new Array(100000).fill(`data-${i}`));
        }
      } catch (error) {
        // Expected to hit memory limits
      }

      // Context operations should still work despite resource pressure
      const contextNeeds = ['current file', 'project structure', 'build issues'];
      
      let result;
      expect(() => {
        result = contextInjector.mapBMadContextToKiro(contextNeeds);
      }).not.toThrow();

      expect(result).toBeDefined();
      expect(result.mapped).toBeDefined();

      // Clean up
      largeObjects.length = 0;
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Performance Benchmarking', () => {
    it('should meet performance benchmarks for typical usage patterns', () => {
      const benchmarks = [
        {
          name: 'Small context set (5 items)',
          contextNeeds: ['current file', 'build issues', 'recent changes', 'project structure', 'error messages'],
          expectedTime: 5 // milliseconds
        },
        {
          name: 'Medium context set (20 items)',
          contextNeeds: Array.from({ length: 20 }, (_, i) => `context-item-${i}`),
          expectedTime: 15
        },
        {
          name: 'Large context set (100 items)',
          contextNeeds: Array.from({ length: 100 }, (_, i) => `context-item-${i}`),
          expectedTime: 50
        }
      ];

      benchmarks.forEach(benchmark => {
        const startTime = process.hrtime.bigint();
        const result = contextInjector.mapBMadContextToKiro(benchmark.contextNeeds);
        const endTime = process.hrtime.bigint();
        
        const executionTime = Number(endTime - startTime) / 1000000;
        
        expect(result).toBeDefined();
        expect(executionTime).toBeLessThan(benchmark.expectedTime);
      });
    });

    it('should provide performance metrics for monitoring', () => {
      const contextNeeds = ['current file', 'project structure', 'build issues'];
      const iterations = 1000;
      const executionTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        const result = contextInjector.mapBMadContextToKiro(contextNeeds);
        const endTime = process.hrtime.bigint();
        
        const executionTime = Number(endTime - startTime) / 1000000;
        executionTimes.push(executionTime);
        
        expect(result).toBeDefined();
      }

      // Calculate performance metrics
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const minTime = Math.min(...executionTimes);
      const maxTime = Math.max(...executionTimes);
      const medianTime = executionTimes.sort((a, b) => a - b)[Math.floor(executionTimes.length / 2)];

      // Performance should be consistent
      expect(avgTime).toBeLessThan(5); // Average under 5ms
      expect(maxTime).toBeLessThan(20); // Max under 20ms
      expect(maxTime / minTime).toBeLessThan(10); // Variance should be reasonable
    });
  });
});