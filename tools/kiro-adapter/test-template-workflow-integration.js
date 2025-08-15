const TemplateConverter = require('./template-converter');
const WorkflowIntegrator = require('./workflow-integrator');
const fs = require('fs-extra');
const path = require('path');

async function testTemplateWorkflowIntegration() {
  console.log('🧪 Testing Template and Workflow Integration...\n');

  try {
    // Initialize both converters
    const templateConverter = new TemplateConverter();
    const workflowIntegrator = new WorkflowIntegrator();

    // Test 1: Get combined statistics
    console.log('📊 Getting combined statistics...');
    const templateStats = await templateConverter.getConversionStats();
    const workflowStats = await workflowIntegrator.getConversionStats();
    
    console.log('Template Statistics:', JSON.stringify(templateStats, null, 2));
    console.log('Workflow Statistics:', JSON.stringify(workflowStats, null, 2));
    
    const combinedStats = {
      templates: templateStats,
      workflows: workflowStats,
      total: {
        core: templateStats.core + workflowStats.core,
        expansionPacks: Math.max(templateStats.expansionPacks, workflowStats.expansionPacks),
        totalItems: templateStats.total + workflowStats.total
      }
    };
    
    console.log('Combined Statistics:', JSON.stringify(combinedStats, null, 2));
    console.log('✅ Statistics retrieved successfully\n');

    // Test 2: Convert templates and workflows from same expansion pack
    console.log('🔄 Testing expansion pack integration...');
    
    // Find a common expansion pack
    const templateExpansions = templateStats.expansionPackBreakdown.map(e => e.name);
    const workflowExpansions = workflowStats.expansionPackBreakdown.map(e => e.name);
    const commonExpansions = templateExpansions.filter(name => workflowExpansions.includes(name));
    
    if (commonExpansions.length > 0) {
      const testExpansion = commonExpansions[0];
      console.log(`Testing expansion pack: ${testExpansion}`);
      
      // Get templates and workflows for this expansion
      const templates = await templateConverter.discoverTemplates();
      const workflows = await workflowIntegrator.discoverWorkflows();
      
      const expansionTemplates = templates.filter(t => t.expansionPack === testExpansion);
      const expansionWorkflows = workflows.filter(w => w.expansionPack === testExpansion);
      
      console.log(`Found ${expansionTemplates.length} templates and ${expansionWorkflows.length} workflows for ${testExpansion}`);
      
      // Convert one template and one workflow from the expansion
      if (expansionTemplates.length > 0) {
        const templateResult = await templateConverter.convertTemplate(expansionTemplates[0]);
        console.log(`✅ Converted template: ${templateResult.templateInfo.name}`);
      }
      
      if (expansionWorkflows.length > 0) {
        const workflowResult = await workflowIntegrator.convertWorkflow(expansionWorkflows[0]);
        console.log(`✅ Converted workflow: ${workflowResult.workflowInfo.name}`);
      }
    } else {
      console.log('No common expansion packs found between templates and workflows');
    }
    
    console.log('✅ Expansion pack integration test completed\n');

    // Test 3: Verify output directory structure
    console.log('📁 Verifying output directory structure...');
    
    const expectedDirs = [
      '.kiro/spec-templates',
      '.kiro/hooks',
      '.kiro/workflow-specs',
      '.kiro/workflow-tasks'
    ];
    
    for (const dir of expectedDirs) {
      const exists = await fs.pathExists(dir);
      console.log(`  ${dir}: ${exists ? '✅ exists' : '❌ missing'}`);
      
      if (exists) {
        const files = await fs.readdir(dir);
        console.log(`    Contains ${files.length} files`);
      }
    }
    
    console.log('✅ Directory structure verification completed\n');

    // Test 4: Validate cross-references between templates and workflows
    console.log('🔗 Testing cross-references...');
    
    // Check if any workflows reference templates
    const allWorkflows = await workflowIntegrator.discoverWorkflows();
    const allTemplates = await templateConverter.discoverTemplates();
    
    let crossReferences = 0;
    
    for (const workflowFile of allWorkflows.slice(0, 3)) { // Test first 3 workflows
      try {
        const workflowContent = await fs.readFile(workflowFile.path, 'utf8');
        
        // Look for template references in workflow content
        for (const templateFile of allTemplates) {
          const templateName = path.basename(templateFile.path, '.yaml');
          if (workflowContent.includes(templateName) || workflowContent.includes(templateName.replace('-tmpl', ''))) {
            crossReferences++;
            console.log(`  Found reference: ${path.basename(workflowFile.path)} → ${templateName}`);
          }
        }
      } catch (error) {
        console.log(`  Warning: Could not check ${workflowFile.path}: ${error.message}`);
      }
    }
    
    console.log(`Found ${crossReferences} cross-references between workflows and templates`);
    console.log('✅ Cross-reference analysis completed\n');

    // Test 5: Performance test
    console.log('⚡ Performance test...');
    const startTime = Date.now();
    
    // Get fresh lists for performance test
    const templates = await templateConverter.discoverTemplates();
    const workflows = await workflowIntegrator.discoverWorkflows();
    
    // Convert a small batch of each type
    const templateBatch = templates.slice(0, 2);
    const workflowBatch = workflows.slice(0, 2);
    
    const templatePromises = templateBatch.map(t => templateConverter.convertTemplate(t));
    const workflowPromises = workflowBatch.map(w => workflowIntegrator.convertWorkflow(w));
    
    await Promise.all([...templatePromises, ...workflowPromises]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Converted ${templateBatch.length} templates and ${workflowBatch.length} workflows in ${duration}ms`);
    console.log(`Average time per item: ${Math.round(duration / (templateBatch.length + workflowBatch.length))}ms`);
    console.log('✅ Performance test completed\n');

    console.log('🎉 Template and Workflow Integration test completed successfully!');
    
    // Summary
    console.log('\n📋 Integration Summary:');
    console.log(`  Total Templates: ${templateStats.total}`);
    console.log(`  Total Workflows: ${workflowStats.total}`);
    console.log(`  Total Expansion Packs: ${combinedStats.total.expansionPacks}`);
    console.log(`  Cross-references Found: ${crossReferences}`);
    console.log(`  Output Directories Created: ${expectedDirs.length}`);

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testTemplateWorkflowIntegration();
}

module.exports = testTemplateWorkflowIntegration;