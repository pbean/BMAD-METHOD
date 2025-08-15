const TemplateConverter = require('./template-converter');
const fs = require('fs-extra');
const path = require('path');

async function testTemplateConverter() {
  console.log('🧪 Testing TemplateConverter...\n');

  try {
    const converter = new TemplateConverter();

    // Test 1: Get conversion statistics
    console.log('📊 Getting conversion statistics...');
    const stats = await converter.getConversionStats();
    console.log('Statistics:', JSON.stringify(stats, null, 2));
    console.log('✅ Statistics retrieved successfully\n');

    // Test 2: Discover templates
    console.log('🔍 Discovering templates...');
    const templates = await converter.discoverTemplates();
    console.log(`Found ${templates.length} templates:`);
    templates.slice(0, 5).forEach(template => {
      console.log(`  - ${template.path} (${template.source}${template.expansionPack ? ` - ${template.expansionPack}` : ''})`);
    });
    if (templates.length > 5) {
      console.log(`  ... and ${templates.length - 5} more`);
    }
    console.log('✅ Template discovery successful\n');

    // Test 3: Convert a single template
    if (templates.length > 0) {
      console.log('🔄 Converting first template...');
      const firstTemplate = templates[0];
      console.log(`Converting: ${firstTemplate.path}`);
      
      const result = await converter.convertTemplate(firstTemplate);
      console.log(`✅ Converted to: ${result.outputPath}`);
      
      // Show some details about the conversion
      console.log('Conversion details:');
      console.log(`  - Requirements: ${result.kiroSpec.requirements.requirements.length}`);
      console.log(`  - Components: ${result.kiroSpec.design.components.length}`);
      console.log(`  - Data Models: ${result.kiroSpec.design.dataModels.length}`);
      console.log(`  - Tasks: ${result.kiroSpec.tasks.length}`);
      console.log();
    }

    // Test 4: Convert all templates (limited for testing)
    console.log('🔄 Converting first 3 templates...');
    const limitedTemplates = templates.slice(0, 3);
    const results = {
      converted: [],
      errors: [],
      summary: { total: 0, successful: 0, failed: 0 }
    };

    results.summary.total = limitedTemplates.length;

    for (const template of limitedTemplates) {
      try {
        const result = await converter.convertTemplate(template);
        results.converted.push(result);
        results.summary.successful++;
        console.log(`✅ Converted: ${path.basename(template.path)}`);
      } catch (error) {
        results.errors.push({
          file: template,
          error: error.message
        });
        results.summary.failed++;
        console.log(`❌ Failed: ${path.basename(template.path)} - ${error.message}`);
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

    console.log('\n🎉 TemplateConverter test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testTemplateConverter();
}

module.exports = testTemplateConverter;