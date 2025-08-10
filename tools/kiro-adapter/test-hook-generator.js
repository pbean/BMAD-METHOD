/**
 * Test Hook Generator Implementation
 * Tests the HookGenerator class functionality
 */

const HookGenerator = require('./hook-generator');
const fs = require('fs-extra');
const path = require('path');

async function testHookGenerator() {
  console.log('Testing HookGenerator implementation...\n');

  const generator = new HookGenerator({
    preserveOriginal: false, // Don't create backups for tests
    validateOutput: true
  });

  try {
    // Test 1: Generate story progression hooks
    console.log('1. Testing story progression hooks generation...');
    const storyHooks = await generator.generateStoryProgressionHooks({
      devStoryLocation: 'docs/stories',
      specLocation: '.kiro/specs'
    });
    
    console.log(`   Generated ${storyHooks.length} story progression hooks`);
    storyHooks.forEach(hook => {
      console.log(`   - ${hook.name}: ${hook.description}`);
    });

    // Test 2: Generate code review hooks
    console.log('\n2. Testing code review hooks generation...');
    const reviewHooks = await generator.createCodeReviewHooks({
      codePatterns: ['src/**/*.{js,ts}', 'lib/**/*.js'],
      reviewAgent: 'bmad-qa',
      autoReview: true
    });
    
    console.log(`   Generated ${reviewHooks.length} code review hooks`);
    reviewHooks.forEach(hook => {
      console.log(`   - ${hook.name}: ${hook.description}`);
    });

    // Test 3: Generate documentation update hooks
    console.log('\n3. Testing documentation update hooks generation...');
    const docHooks = await generator.createDocumentationUpdateHooks({
      prdLocation: 'docs/prd.md',
      architectureLocation: 'docs/architecture',
      specLocation: '.kiro/specs'
    });
    
    console.log(`   Generated ${docHooks.length} documentation update hooks`);
    docHooks.forEach(hook => {
      console.log(`   - ${hook.name}: ${hook.description}`);
    });

    // Test 4: Generate git integration hooks
    console.log('\n4. Testing git integration hooks generation...');
    const gitHooks = await generator.createGitIntegrationHooks({
      storyLocation: 'docs/stories',
      branchPattern: 'feature/*',
      autoUpdateStatus: true
    });
    
    console.log(`   Generated ${gitHooks.length} git integration hooks`);
    gitHooks.forEach(hook => {
      console.log(`   - ${hook.name}: ${hook.description}`);
    });

    // Test 5: Generate manual control hooks
    console.log('\n5. Testing manual control hooks generation...');
    const manualHooks = await generator.createManualControlHooks({
      storyLocation: 'docs/stories',
      prdLocation: 'docs/prd.md',
      architectureLocation: 'docs/architecture',
      enableDebugHooks: true
    });
    
    console.log(`   Generated ${manualHooks.length} manual control hooks`);
    manualHooks.forEach(hook => {
      console.log(`   - ${hook.name}: ${hook.description}`);
    });

    // Test 6: Generate complete workflow hooks
    console.log('\n6. Testing complete workflow hooks generation...');
    const allHooks = await generator.generateWorkflowHooks({
      devStoryLocation: 'docs/stories',
      specLocation: '.kiro/specs',
      prdLocation: 'docs/prd.md',
      architectureLocation: 'docs/architecture',
      branchPattern: 'feature/*',
      enableDebugHooks: true
    });
    
    console.log(`   Generated ${allHooks.length} total workflow hooks`);

    // Test 7: Save hooks to test directory
    console.log('\n7. Testing hook saving...');
    const testOutputDir = path.join(__dirname, 'test-output', 'hooks');
    
    // Ensure test output directory exists
    await fs.ensureDir(testOutputDir);
    
    const saveSuccess = await generator.saveHooks(allHooks, testOutputDir);
    console.log(`   Save operation ${saveSuccess ? 'succeeded' : 'failed'}`);
    
    if (saveSuccess) {
      const savedFiles = await fs.readdir(testOutputDir);
      console.log(`   Saved files: ${savedFiles.join(', ')}`);
      
      // Test reading one of the saved files
      if (savedFiles.length > 0) {
        const sampleFile = path.join(testOutputDir, savedFiles[0]);
        const content = await fs.readFile(sampleFile, 'utf8');
        console.log(`   Sample hook content preview:\n${content.substring(0, 200)}...`);
      }
    }

    // Test 8: Validate hook structure
    console.log('\n8. Testing hook structure validation...');
    const sampleHook = allHooks[0];
    const requiredFields = ['name', 'description', 'trigger', 'action', 'metadata'];
    const hasAllFields = requiredFields.every(field => sampleHook.hasOwnProperty(field));
    console.log(`   Hook structure validation: ${hasAllFields ? 'PASSED' : 'FAILED'}`);
    
    if (hasAllFields) {
      console.log('   Required fields present:', requiredFields.join(', '));
      console.log('   Sample hook trigger type:', sampleHook.trigger.type);
      console.log('   Sample hook agent:', sampleHook.action.agent);
    }

    console.log('\n✅ All tests completed successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testHookGenerator()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testHookGenerator };