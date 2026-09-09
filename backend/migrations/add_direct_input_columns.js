const mysql = require('mysql2/promise');

async function addDirectInputColumns() {
  let connection;
  try {
    console.log('Adding direct_input columns to matches table...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ef_matchday'
    });

    // Check if direct_input column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ef_matchday' 
      AND TABLE_NAME = 'matches' 
      AND COLUMN_NAME = 'direct_input'
    `);

    if (columns.length === 0) {
      console.log('Adding direct_input column...');
      await connection.execute(`
        ALTER TABLE matches 
        ADD COLUMN direct_input BOOLEAN DEFAULT FALSE AFTER edited_by
      `);
      console.log('direct_input column added');
    } else {
      console.log('direct_input column already exists');
    }

    // Check if submitted_by column exists
    const [submittedByColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ef_matchday' 
      AND TABLE_NAME = 'matches' 
      AND COLUMN_NAME = 'submitted_by'
    `);

    if (submittedByColumns.length === 0) {
      console.log('Adding submitted_by column...');
      await connection.execute(`
        ALTER TABLE matches 
        ADD COLUMN submitted_by INT DEFAULT NULL AFTER direct_input
      `);
      console.log('submitted_by column added');
    } else {
      console.log('submitted_by column already exists');
    }

    // Add foreign key for submitted_by if it doesn't exist
    const [foreignKeys] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'ef_matchday' 
      AND TABLE_NAME = 'matches' 
      AND COLUMN_NAME = 'submitted_by' 
      AND CONSTRAINT_NAME != 'PRIMARY'
    `);

    if (foreignKeys.length === 0) {
      console.log('Adding foreign key for submitted_by...');
      await connection.execute(`
        ALTER TABLE matches 
        ADD FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('Foreign key added');
    } else {
      console.log('Foreign key already exists');
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addDirectInputColumns();
