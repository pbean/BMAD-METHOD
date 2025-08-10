/**
 * Test Kiro Task Execution Integration
 */

const SpecGenerator = require('./spec-generator');

async function testKiroIntegration() {
  console.log('Testing Kiro Task Execution Integration...');
  
  const generator = new SpecGenerator();
  
  // Test 1: Generate Kiro-integrated tasks
  console.log('\n1. Testing Kiro-integrated task generation...');
  
  const mockStories = [
    {
      title: 'User Authentication System',
      userStory: 'As a user, I want to authenticate securely, so that I can access protected features',
      description: 'Implement complete user authentication with login, registration, and session management',
      acceptanceCriteria: [
        'User can register with email and password',
        'User can login with valid credentials',
        'User session is maintained across page refreshes',
        'User can logout and session is cleared'
      ],
      implementationTasks: [
        {
          title: 'Create authentication API endpoints',
          description: 'Implement /login, /register, /logout endpoints',
          agent: 'bmad-dev'
        },
        {
          title: 'Implement session management',
          description: 'Add JWT token handling and session storage',
          agent: 'bmad-dev'
        },
        {
          title: 'Create authentication UI components',
          description: 'Build login and registration forms',
          agent: 'bmad-dev'
        }
      ],
      type: 'backend',
      phase: 'implementation',
      epicNumber: 1,
      storyNumber: 1,
      dependencies: [],
      requirementRefs: ['1.1', '1.2', '1.3'],
      completionTriggers: [
        'Run authentication tests',
        'Verify security compliance'
      ]
    },
    {
      title: 'User Dashboard',
      userStory: 'As a logged-in user, I want to see my dashboard, so that I can view my account information',
      description: 'Create user dashboard with profile information and activity summary',
      acceptanceCriteria: [
        'Dashboard displays user profile information',
        'Dashboard shows recent activity',
        'Dashboard is responsive on all devices'
      ],
      implementationTasks: [
        {
          title: 'Create dashboard API endpoint',
          description: 'Implement /api/dashboard endpoint',
          agent: 'bmad-dev'
        },
        {
          title: 'Build dashboard UI component',
          description: 'Create responsive dashboard layout',
          agent: 'bmad-dev'
        }
      ],
      type: 'frontend',
      phase: 'implementation',
      epicNumber: 1,
      storyNumber: 2,
      dependencies: ['User Authentication System'],
      requires: ['auth-service', 'user-session'],
      requirementRefs: ['1.4', '1.5'],
      nextAction: 'Proceed to user profile management'
    }
  ];
  
  try {
    const integratedTasks = generator.generateKiroIntegratedTasks(mockStories, {
      addIntegrationMetadata: true,
      bmadVersion: '1.0.0',
      kiroVersion: '1.0.0'
    });
    
    if (integratedTasks && integratedTasks.length > 500) {
      console.log('✅ Kiro-integrated task generation successful');
      console.log(`   - Generated ${integratedTasks.length} characters`);
      console.log(`   - Contains integration metadata: ${integratedTasks.includes('BMad-Kiro Integration') ? '✅' : '❌'}`);
      console.log(`   - Contains agent invocation: ${integratedTasks.includes('Agent Invocation') ? '✅' : '❌'}`);
      console.log(`   - Contains completion triggers: ${integratedTasks.includes('Completion Triggers') ? '✅' : '❌'}`);
    } else {
      console.log('❌ Kiro-integrated task generation failed');
    }
    
  } catch (error) {
    console.error('❌ Kiro integration test failed:', error.message);
  }
  
  // Test 2: Generate task status configuration
  console.log('\n2. Testing task status configuration generation...');
  
  try {
    const statusConfig = generator.generateTaskStatusConfig(mockStories);
    
    if (statusConfig && statusConfig.statusTracking && statusConfig.workflowTriggers) {
      console.log('✅ Task status configuration successful');
      console.log(`   - Status tracking enabled: ${statusConfig.statusTracking.enabled ? '✅' : '❌'}`);
      console.log(`   - Workflow triggers: ${statusConfig.workflowTriggers.length} configured`);
      console.log(`   - Task states: ${statusConfig.taskStates.length} defined`);
    } else {
      console.log('❌ Task status configuration failed');
    }
    
  } catch (error) {
    console.error('❌ Task status config test failed:', error.message);
  }
  
  // Test 3: Generate task execution metadata
  console.log('\n3. Testing task execution metadata generation...');
  
  try {
    const metadata = generator.createTaskExecutionMetadata({
      version: '1.0.0'
    });
    
    if (metadata && metadata.includes('BMad-Kiro Task Integration') && metadata.includes('agentIntegration')) {
      console.log('✅ Task execution metadata successful');
      console.log(`   - Contains integration info: ${metadata.includes('bmad-kiro') ? '✅' : '❌'}`);
      console.log(`   - Contains context providers: ${metadata.includes('contextProviders') ? '✅' : '❌'}`);
    } else {
      console.log('❌ Task execution metadata failed');
    }
    
  } catch (error) {
    console.error('❌ Task execution metadata test failed:', error.message);
  }
  
  console.log('\nKiro Task Execution Integration testing complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testKiroIntegration().catch(console.error);
}

module.exports = testKiroIntegration;