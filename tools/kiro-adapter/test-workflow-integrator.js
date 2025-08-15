const WorkflowIntegrator = require('./workflow-integrator');
const fs = require('fs-extra');
const path = require('path');

async function testWorkflowIntegrator() {
  console.log('🧪 Testing WorkflowIntegrator...\n');

  try {
    const integrator = new WorkflowIntegrator();

    // Test 1: Get conversion statistics
    console.log('📊 Getting workflow statistics...');
    const stats = await integrator.getConversionStats();
    console.log('Statistics:', JSON.stringify(stats, null, 2));
    console.log('✅ Statistics retrieved successfully\n');

    // Test 2: Discover workflows
    console.log('🔍 Discovering workflows...');
    const workflows = await integrator.discoverWorkflows();
    console.log(`Found ${workflows.length} workflows:`);
    workflows.slice(0, 5).forEach(workflow => {
      console.log(`  - ${path.basename(workflow.path)} (${workflow.source}${workflow.expansionPack ? ` - ${workflow.expansionPack}` : ''})`);
    });
    if (workflows.length > 5) {
      console.log(`  ... and ${workflows.length - 5} more`);
    }
    console.log('✅ Workflow discovery successful\n');

    // Test 3: Convert a single workflow
    if (workflows.length > 0) {
      console.log('🔄 Converting first workflow...');
      const firstWorkflow = workflows[0];
      console.log(`Converting: ${path.basename(firstWorkflow.path)}`);
      
      const result = await integrator.convertWorkflow(firstWorkflow);
      console.log(`✅ Converted workflow: ${result.workflowInfo.name}`);
      
      // Show conversion details
      console.log('Conversion details:');
      console.log(`  - Hook: ${result.conversions.hook.path}`);
      console.log(`  - Spec: ${result.conversions.spec.path}`);
      console.log(`  - Tasks: ${result.conversions.tasks.path}`);
      console.log(`  - Requirements: ${result.conversions.spec.content.requirements.requirements.length}`);
      console.log(`  - Components: ${result.conversions.spec.content.design.components.length}`);
      console.log(`  - Tasks: ${result.conversions.spec.content.tasks.length}`);
      console.log();
    }

    // Test 4: Convert first 2 workflows (limited for testing)
    console.log('🔄 Converting first 2 workflows...');
    const limitedWorkflows = workflows.slice(0, 2);
    const results = {
      converted: [],
      errors: [],
      summary: { total: 0, successful: 0, failed: 0 }
    };

    results.summary.total = limitedWorkflows.length;

    for (const workflow of limitedWorkflows) {
      try {
        const result = await integrator.convertWorkflow(workflow);
        results.converted.push(result);
        results.summary.successful++;
        console.log(`✅ Converted: ${path.basename(workflow.path)}`);
      } catch (error) {
        results.errors.push({
          file: workflow,
          error: error.message
        });
        results.summary.failed++;
        console.log(`❌ Failed: ${path.basename(workflow.path)} - ${error.message}`);
      }
    }

    console.log('\n📋 Conversion Summary:');
    console.log(`  Total: ${results.summary.total}`);
    console.log(`  Successful: ${results.summary.successful}`);
    console.log(`  Failed: ${results.summary.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => {
        console.log(`  - ${path.basename(error.file.path)}: ${error.error}`);
      });
    }

    console.log('\n🎉 WorkflowIntegrator test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWorkflowIntegrator();
}

module.exports = testWorkflowIntegrator;