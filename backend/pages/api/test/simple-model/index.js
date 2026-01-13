// Force dynamic rendering (no static generation at build time)

// backend/app/api/test/simple-model/route.js
//
/*

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}*/
export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    console.log('=== SIMPLE MODEL TEST ===');
    
    // Test step by step
    const { DataTypes } = require('sequelize');
    const sequelize = require('../../../../config/database');
    
    console.log('✅ Sequelize and DataTypes imported');
    console.log('✅ Database config loaded');
    
    // Test importing the model function
    const principaleModelFunction = require('../../../../models/principale');
    console.log('✅ Principale model function imported, type:', typeof principaleModelFunction);
    
    // Test calling the function
    console.log('Calling principale model function...');
    const principaleModels = principaleModelFunction(sequelize, DataTypes);
    console.log('✅ Principale models initialized, type:', typeof principaleModels);
    console.log('Principale model keys:', Object.keys(principaleModels || {}));
    
    // Test accessing a specific model
    if (principaleModels && principaleModels.RoleEnum) {
      console.log('✅ RoleEnum model exists');
      
      // Test a simple query
      const count = await principaleModels.RoleEnum.count();
      console.log('RoleEnum count:', count);
    } else {
      console.log('❌ RoleEnum model not found');
    }
    
    return res.json({
      success: true,
      message: 'Model test completed',
      principaleKeys: Object.keys(principaleModels || {}),
      hasRoleEnum: !!(principaleModels && principaleModels.RoleEnum)
    });
    
  } catch (error) {
    console.error('Model test failed:', error);
    return res.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
