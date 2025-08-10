/**
 * Test Spec Generator
 * Tests the spec generation functionality
 */

const SpecGenerator = require('./spec-generator');
const path = require('path');
const fs = require('fs-extra');

async function testSpecGenerator() {
  console.log('Testing Spec Generator...');
  
  const generator = new SpecGenerator();
  
  // Test 1: Generate spec from existing workflow
  console.log('\n1. Testing workflow to spec generation...');
  
  const workflowPath = path.join(__dirname, '../../bmad-core/workflows/greenfield-fullstack.yaml');
  const specOutputPath = path.join(__dirname, 'test-output/test-spec');
  
  try {
    // Clean up any existing test output
    await fs.remove(specOutputPath);
    
    const success = await generator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
    
    if (success) {
      console.log('✅ Workflow to spec generation successful');
      
      // Check if files were created
      const requirementsExists = await fs.pathExists(path.join(specOutputPath, 'requirements.md'));
      const designExists = await fs.pathExists(path.join(specOutputPath, 'design.md'));
      const tasksExists = await fs.pathExists(path.join(specOutputPath, 'tasks.md'));
      
      console.log(`   - requirements.md: ${requirementsExists ? '✅' : '❌'}`);
      console.log(`   - design.md: ${designExists ? '✅' : '❌'}`);
      console.log(`   - tasks.md: ${tasksExists ? '✅' : '❌'}`);
      
      if (requirementsExists) {
        const reqContent = await fs.readFile(path.join(specOutputPath, 'requirements.md'), 'utf8');
        console.log(`   - requirements.md length: ${reqContent.length} characters`);
      }
      
    } else {
      console.log('❌ Workflow to spec generation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Test 2: Test PRD template conversion
  console.log('\n2. Testing PRD template conversion...');
  
  try {
    const prdTemplatePath = path.join(__dirname, '../../bmad-core/templates/prd-tmpl.yaml');
    const prdContent = await fs.readFile(prdTemplatePath, 'utf8');
    const yaml = require('js-yaml');
    const prdTemplate = yaml.load(prdContent);
    
    const requirements = generator.createRequirementsFromPRD(prdTemplate);
    
    if (requirements && requirements.length > 100) {
      console.log('✅ PRD template conversion successful');
      console.log(`   - Generated ${requirements.length} characters`);
    } else {
      console.log('❌ PRD template conversion failed or too short');
    }
    
  } catch (error) {
    console.error('❌ PRD template test failed:', error.message);
  }
  
  // Test 3: Test Architecture template conversion
  console.log('\n3. Testing Architecture template conversion...');
  
  try {
    const archTemplatePath = path.join(__dirname, '../../bmad-core/templates/architecture-tmpl.yaml');
    const archContent = await fs.readFile(archTemplatePath, 'utf8');
    const yaml = require('js-yaml');
    const archTemplate = yaml.load(archContent);
    
    const design = generator.createDesignFromArchitecture(archTemplate);
    
    if (design && design.length > 100) {
      console.log('✅ Architecture template conversion successful');
      console.log(`   - Generated ${design.length} characters`);
    } else {
      console.log('❌ Architecture template conversion failed or too short');
    }
    
  } catch (error) {
    console.error('❌ Architecture template test failed:', error.message);
  }
  
  // Test 4: Test story conversion
  console.log('\n4. Testing story conversion...');
  
  try {
    const mockStories = [
      {
        title: 'User Authentication',
        userStory: 'As a user, I want to authenticate securely, so that I can access the application',
        description: 'Implement user login and registration',
        acceptanceCriteria: ['User can register with email', 'User can login with credentials', 'User can logout securely'],
        implementationTasks: [
          { title: 'Create login form', acceptanceCriteria: 2 },
          { title: 'Implement auth service', acceptanceCriteria: 1 },
          { title: 'Add logout functionality', acceptanceCriteria: 3 }
        ],
        type: 'backend',
        phase: 'implementation',
        epicNumber: 1,
        storyNumber: 1,
        requirementRefs: ['1.1', '1.2']
      },
      {
        title: 'Dashboard Display',
        userStory: 'As a user, I want to see my dashboard, so that I can view key metrics',
        description: 'Create user dashboard with key metrics',
        acceptanceCriteria: ['Dashboard shows user data', 'Metrics are updated in real-time'],
        implementationTasks: [
          { title: 'Create dashboard component', description: 'Build React dashboard component' },
          { title: 'Implement data fetching', description: 'Add API calls for metrics' },
          { title: 'Add real-time updates', description: 'Implement WebSocket connection' }
        ],
        type: 'frontend',
        phase: 'implementation',
        epicNumber: 1,
        storyNumber: 2,
        dependencies: ['User Authentication'],
        requires: ['auth-service'],
        requirementRefs: ['1.3', '1.4']
      }
    ];
    
    const tasks = generator.createTasksFromStories(mockStories);
    
    if (tasks && tasks.length > 100) {
      console.log('✅ Story conversion successful');
      console.log(`   - Generated ${tasks.length} characters`);
    } else {
      console.log('❌ Story conversion failed or too short');
    }
    
    // Test enhanced dependency mapping
    const tasksWithDeps = generator.createTasksWithDependencyMapping(mockStories);
    
    if (tasksWithDeps && tasksWithDeps.length > tasks.length) {
      console.log('✅ Dependency mapping successful');
      console.log(`   - Enhanced version: ${tasksWithDeps.length} characters`);
    } else {
      console.log('❌ Dependency mapping failed');
    }
    
  } catch (error) {
    console.error('❌ Story conversion test failed:', error.message);
  }

  // Test 5: Test story template conversion
  console.log('\n5. Testing story template conversion...');
  
  try {
    const storyTemplatePath = path.join(__dirname, '../../bmad-core/templates/story-tmpl.yaml');
    const storyContent = await fs.readFile(storyTemplatePath, 'utf8');
    const yaml = require('js-yaml');
    const storyTemplate = yaml.load(storyContent);
    
    const tasks = generator.createTasksFromStoryTemplate(storyTemplate);
    
    if (tasks && tasks.length > 100) {
      console.log('✅ Story template conversion successful');
      console.log(`   - Generated ${tasks.length} characters`);
    } else {
      console.log('❌ Story template conversion failed or too short');
      console.log(`   - Generated content length: ${tasks ? tasks.length : 'null'}`);
      if (tasks && tasks.length < 200) {
        console.log(`   - Content preview: ${tasks.substring(0, 100)}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Story template test failed:', error.message);
  }
  
  console.log('\nSpec Generator testing complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSpecGenerator().catch(console.error);
}

module.exports = testSpecGenerator;