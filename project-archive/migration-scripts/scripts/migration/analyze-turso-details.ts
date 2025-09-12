#!/usr/bin/env tsx

import { TursoDatabase } from '../../src/lib/migration/turso-db';

const tursoDb = new TursoDatabase();

async function main() {
  console.log('🔍 Detailed Turso Analysis\n');
  
  try {
    const client = await tursoDb.connect();
    
    // Analyze shows_usermeta to see what metadata exists
    const metaKeys = await client.execute('SELECT DISTINCT meta_key FROM shows_usermeta ORDER BY meta_key');
    console.log('📋 User Metadata Keys Available:');
    metaKeys.rows.forEach((row: any) => console.log('  -', row.meta_key));
    
    // Check shows_contacts structure
    const contactSample = await client.execute('SELECT * FROM shows_contacts LIMIT 3');
    console.log('\n🤝 Contact/Connection Sample:');
    contactSample.rows.forEach((row: any) => console.log('  ', row));
    
    // Check studio_gallery
    const gallerySample = await client.execute('SELECT * FROM studio_gallery LIMIT 3');
    console.log('\n🖼️ Studio Gallery Sample:');
    gallerySample.rows.forEach((row: any) => console.log('  ', row));
    
    // Check what's in shows_options
    const options = await client.execute('SELECT * FROM shows_options');
    console.log('\n⚙️ Site Options:');
    options.rows.forEach((row: any) => console.log(`  ${row.group}.${row.item}: ${row.value}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await tursoDb.disconnect();
  }
}

main().catch(console.error);
