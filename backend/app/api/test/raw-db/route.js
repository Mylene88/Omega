// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/test/raw-db/route.js
import { NextResponse } from 'next/server';
const { Pool } = require('pg');

export async function GET(request) {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Testing raw database connection...');
    
    const client = await pool.connect();
    
    try {
      // Test the exact table you showed in the screenshot
      const result = await client.query('SELECT * FROM urbanisme.procedure_enum ORDER BY id LIMIT 10');
      
      console.log('Raw query result:', result.rows);
      
      return NextResponse.json({
        success: true,
        message: 'Raw database connection successful',
        data: result.rows,
        count: result.rowCount
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Raw database test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Raw database connection failed',
      error: error.message
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}