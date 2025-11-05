// backend/app/api/debug/models/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('=== MODEL DEBUG ===');
    
    // Test imports
    let importResults = {};
    
    try {
      const { principale } = await import('../../../../models/principale');
      importResults.principale = {
        imported: true,
        keys: Object.keys(principale),
        hasRoleEnum: !!principale.RoleEnum
      };
      console.log('Principale import:', importResults.principale);
    } catch (err) {
      importResults.principale = { imported: false, error: err.message };
      console.error('Principale import failed:', err);
    }
    
    try {
      const { urbanisme } = await import('../../../../models/urbanisme');
      importResults.urbanisme = {
        imported: true,
        keys: Object.keys(urbanisme),
        hasProcedureEnum: !!urbanisme.ProcedureEnum
      };
      console.log('Urbanisme import:', importResults.urbanisme);
    } catch (err) {
      importResults.urbanisme = { imported: false, error: err.message };
      console.error('Urbanisme import failed:', err);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Model debug completed',
      imports: importResults
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      message: 'Debug failed',
      error: error.message
    }, { status: 500 });
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