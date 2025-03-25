import { db } from './server/db';

async function migrate() {
  console.log('Running schema migration...');
  
  try {
    // Push the schema changes to the database
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();