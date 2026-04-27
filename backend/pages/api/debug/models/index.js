// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/debug/models/route.js




export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: 'Endpoint désactivé en production'
    });
  }

  if (req.method === 'GET') {

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

    return res.json({
      success: true,
      message: 'Model debug completed',
      imports: importResults
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.json({
      success: false,
      message: 'Debug failed',
      error: error.message
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
