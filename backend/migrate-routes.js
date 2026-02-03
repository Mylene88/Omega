// Script de migration des routes App Router vers Pages Router
const fs = require('fs');
const path = require('path');

// Convertit le code App Router vers Pages Router
function convertAppRouterToPagesRouter(content, routePath) {
  // Supprimer l'export dynamic
  content = content.replace(/export const dynamic = ['"]force-dynamic['"];?\n?/g, '');
  content = content.replace(/export const revalidate = \d+;?\n?/g, '');

  // Remplacer les imports NextResponse
  content = content.replace(/import \{ NextResponse \} from ['"]next\/server['"];?\n?/g, '');

  // Remplacer les imports avec @/backend par des chemins relatifs
  // routePath contient maintenant le chemin complet (ex: pages/api/auth/login)
  // Le fichier final sera index.js dans ce dossier
  // Donc pour pages/api/auth/login/index.js, il faut remonter 4 niveaux
  const depth = routePath.split('/').length;
  const backPath = '../'.repeat(depth);
  // Matcher @/backend/ et @/backend (avec ou sans slash final)
  content = content.replace(/@\/backend\//g, backPath);
  content = content.replace(/@\/backend(?!\/)/g, backPath.slice(0, -1)); // Sans slash final, on enlève le dernier /

  // Extraire toutes les fonctions HTTP (GET, POST, PUT, DELETE, PATCH, OPTIONS)
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  const extractedMethods = [];

  for (const method of httpMethods) {
    const regex = new RegExp(`export async function ${method}\\([^)]*\\)\\s*{([\\s\\S]*?)\\n}(?=\\n|$)`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      extractedMethods.push({
        method,
        body: match[1]
      });
    }
  }

  if (extractedMethods.length === 0) {
    console.log(`⚠️  Aucune méthode HTTP trouvée dans ${routePath}`);
    return null;
  }

  // Construire le handler Pages Router
  let handler = `export default async function handler(req, res) {\n`;

  for (let i = 0; i < extractedMethods.length; i++) {
    const { method, body } = extractedMethods[i];
    const condition = i === 0 ? 'if' : 'else if';

    handler += `  ${condition} (req.method === '${method}') {\n`;

    // Convertir le corps de la fonction
    let convertedBody = body;

    // Remplacer request par req
    convertedBody = convertedBody.replace(/\brequest\b/g, 'req');

    // Remplacer req.json() par req.body
    convertedBody = convertedBody.replace(/await req\.json\(\)/g, 'req.body');

    // Remplacer new URL(req.url) pattern par req.query
    // Gérer const { searchParams } = new URL(req.url);
    convertedBody = convertedBody.replace(/const\s*{\s*searchParams\s*}\s*=\s*new URL\(req\.url\);?/g, '// Query params available in req.query');
    // Remplacer searchParams.get('param') par req.query.param
    convertedBody = convertedBody.replace(/searchParams\.get\(['"]([^'"]+)['"]\)/g, "req.query.$1");

    // Remplacer req.headers.get('...') par req.headers['...']
    convertedBody = convertedBody.replace(/req\.headers\.get\(['"]([^'"]+)['"]\)/g, "req.headers['$1']");

    // Remplacer NextResponse.json(...) par res.status(...).json(...)
    // D'abord les cas avec status explicite
    convertedBody = convertedBody.replace(/return NextResponse\.json\(([^,]+),\s*\{\s*status:\s*([^}]+)\s*\}\)/g, 'return res.status($2).json($1)');
    // Ensuite les simples res.json() avec status dans body
    convertedBody = convertedBody.replace(/return res\.json\(([^,]+),\s*\{\s*status:\s*([^}]+)\s*\}\)/g, 'return res.status($2).json($1)');
    // Les cas simples sans status
    convertedBody = convertedBody.replace(/return NextResponse\.json\(([^)]+)\)/g, 'return res.json($1)');

    // Remplacer new NextResponse(null, { status: ... })
    convertedBody = convertedBody.replace(/return new NextResponse\(null,\s*\{\s*status:\s*([^}]+)\s*\}\)/g, 'return res.status($1).end()');

    // Remplacer res.setHeader pour Retry-After
    convertedBody = convertedBody.replace(/headers:\s*\{[\s\S]*?['"]Retry-After['"]:([^}]+)\}/g, (match, value) => {
      return `/* Set header before return: res.setHeader('Retry-After', ${value.trim()}); */`;
    });

    handler += convertedBody;
    handler += `\n  }\n`;
  }

  // Ajouter un cas par défaut
  handler += `  else {\n`;
  handler += `    return res.status(405).json({ success: false, error: 'Method not allowed' });\n`;
  handler += `  }\n`;
  handler += `}\n`;

  // Garder les imports et le reste du code (sauf les exports de fonctions HTTP)
  let finalContent = content;

  // Supprimer toutes les fonctions export async function
  for (const method of httpMethods) {
    finalContent = finalContent.replace(new RegExp(`export async function ${method}\\([^)]*\\)\\s*{[\\s\\S]*?\\n}(?=\\n|$)`, 'g'), '');
  }

  // Ajouter le handler à la fin
  finalContent += '\n' + handler;

  return finalContent;
}

// Convertir le chemin App Router vers Pages Router
function convertPath(appPath) {
  // app_backup/api/users/[id]/route.js → pages/api/users/[id].js
  let pagesPath = appPath
    .replace('app/api/', 'pages/api/')
    .replace('/route.js', '.js');

  // Si le chemin se termine par /route.js dans un dossier sans [id],
  // on convertit en fichier avec le nom du dossier parent
  if (pagesPath.endsWith('/.js')) {
    const parts = pagesPath.split('/');
    const folderName = parts[parts.length - 2];
    parts[parts.length - 1] = `${folderName}.js`;
    pagesPath = parts.join('/');
  }

  return pagesPath;
}

// Fonction principale de migration
function migrateRoutes() {
  const appApiDir = path.join(__dirname, 'app', 'api');
  const pagesApiDir = path.join(__dirname, 'pages', 'api');

  // Trouver tous les fichiers route.js
  function findRouteFiles(dir, baseDir = dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        files = files.concat(findRouteFiles(fullPath, baseDir));
      } else if (item.name === 'route.js') {
        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }

    return files;
  }

  const routeFiles = findRouteFiles(appApiDir);
  console.log(`🔍 Trouvé ${routeFiles.length} fichiers de routes à migrer\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const relPath of routeFiles) {
    const appPath = path.join(appApiDir, relPath);
    const content = fs.readFileSync(appPath, 'utf8');

    // Déterminer le chemin relatif pour les imports
    // Le fichier sera dans pages/api/xxx/index.js, donc on compte le nombre de niveaux
    const routePath = relPath.replace('/route.js', '').replace(/\\/g, '/');
    // Ajouter pages/api/ pour calculer la profondeur correcte
    const fullPath = 'pages/api/' + routePath;

    // Convertir le contenu
    const convertedContent = convertAppRouterToPagesRouter(content, fullPath);

    if (!convertedContent) {
      console.log(`⏭️  Ignoré: ${relPath}`);
      skipCount++;
      continue;
    }

    // Déterminer le chemin de destination
    // app_backup/api/statut/route.js → pages/api/statut/index.js
    // app_backup/api/statut/[id]/route.js → pages/api/statut/[id].js
    let pagesPath = relPath.replace(/\/route\.js$/, '/index.js');

    const destPath = path.join(pagesApiDir, pagesPath);

    try {
      // Créer les dossiers si nécessaire
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Écrire le fichier
      fs.writeFileSync(destPath, convertedContent, 'utf8');
      console.log(`✅ Migré: ${relPath} → ${pagesPath}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Erreur lors de la migration de ${relPath}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ⏭️  Ignorés: ${skipCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   📝 Total: ${routeFiles.length}`);
}

// Exécuter la migration
try {
  migrateRoutes();
  console.log('\n🎉 Migration terminée !');
} catch (error) {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
}
